import { NextResponse } from "next/server";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestClientKey,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { createClient } from "@/lib/supabase/server";
import { deviceInstallationSchema } from "@/lib/validation";
import { consumeRateLimit, registerDeviceInstallation } from "@/lib/operations.server";

const MAX_DEVICE_INSTALLATION_BYTES = 4 * 1024;
const DEVICE_INSTALLATION_CLIENT_WINDOW_SECONDS = 60;
const MAX_DEVICE_INSTALLATIONS_PER_CLIENT_WINDOW = 20;
const DEVICE_INSTALLATION_ID_WINDOW_SECONDS = 60 * 60;
const MAX_DEVICE_INSTALLATIONS_PER_ID_WINDOW = 60;

function json(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  if (!publicWriteRequestOriginIsAllowed(request)) return json({ error: "forbidden_origin" }, 403);
  if (publicWriteRequestBodyIsTooLarge(request, MAX_DEVICE_INSTALLATION_BYTES)) {
    return json({ error: "device_installation_too_large" }, 413);
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_DEVICE_INSTALLATION_BYTES).catch(() => "");
  if (raw === null) return json({ error: "device_installation_too_large" }, 413);

  let body: unknown = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "بيانات التثبيت غير صالحة" }, 400);
  }

  const parsed = deviceInstallationSchema.safeParse(body);
  if (!parsed.success) return json({ error: "بيانات التثبيت غير صالحة" }, 400);

  let clientRateAllowed;
  let installationRateAllowed;
  try {
    [clientRateAllowed, installationRateAllowed] = await Promise.all([
      consumeRateLimit({
        scope: "device_installation",
        subject: `client:${publicWriteRequestClientKey(request)}`,
        maxRequests: MAX_DEVICE_INSTALLATIONS_PER_CLIENT_WINDOW,
        windowSeconds: DEVICE_INSTALLATION_CLIENT_WINDOW_SECONDS,
      }),
      consumeRateLimit({
        scope: "device_installation",
        subject: `installation:${parsed.data.installation_id}`,
        maxRequests: MAX_DEVICE_INSTALLATIONS_PER_ID_WINDOW,
        windowSeconds: DEVICE_INSTALLATION_ID_WINDOW_SECONDS,
      }),
    ]);
  } catch {
    return json({ error: "خدمة حماية التثبيت غير متاحة مؤقتًا" }, 503);
  }

  if (!clientRateAllowed || !installationRateAllowed) {
    const retryAfter = !clientRateAllowed ? DEVICE_INSTALLATION_CLIENT_WINDOW_SECONDS : DEVICE_INSTALLATION_ID_WINDOW_SECONDS;
    return json(
      { error: "تم تجاوز عدد محاولات التثبيت المسموح به مؤقتًا." },
      429,
      { "retry-after": String(retryAfter) },
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const accountId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  try {
    await registerDeviceInstallation({
      accountId,
      installationId: parsed.data.installation_id,
      deviceLabel: parsed.data.device_label,
      platform: parsed.data.platform,
      browser: parsed.data.browser,
      deviceClass: parsed.data.device_class,
      appVersion: parsed.data.app_version,
    });
  } catch (error) {
    console.error("device_installation_upsert_failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return json({ error: "تعذر تحديث التثبيت" }, 503);
  }

  return json({ ok: true }, 200);
}
