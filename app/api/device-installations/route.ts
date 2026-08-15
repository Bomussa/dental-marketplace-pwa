import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deviceInstallationSchema } from "@/lib/validation";
import { consumeRateLimit, registerDeviceInstallation } from "@/lib/operations.server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = deviceInstallationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات التثبيت غير صالحة" }, { status: 400 });

  let installationRateAllowed;
  try {
    installationRateAllowed = await consumeRateLimit({
      scope: "device_installation",
      subject: parsed.data.installation_id,
      maxRequests: 60,
      windowSeconds: 60 * 60,
    });
  } catch {
    return NextResponse.json({ error: "خدمة حماية التثبيت غير متاحة مؤقتًا" }, { status: 503 });
  }
  if (!installationRateAllowed) {
    return NextResponse.json(
      { error: "تم تجاوز عدد محاولات التثبيت المسموح به مؤقتًا." },
      { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } },
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
    return NextResponse.json({ error: "تعذر تحديث التثبيت" }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
