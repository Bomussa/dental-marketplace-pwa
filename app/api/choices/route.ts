import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  choiceRequestBodyIsTooLarge,
  choiceRequestClientKey,
  choiceRequestOriginIsAllowed,
  consumeChoiceEventRateLimit,
  readChoiceRequestTextWithinLimit,
} from "@/lib/choice-event-guard";
import { choiceEventSchema } from "@/lib/validation";

function analyticsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("SUPABASE_PUBLIC_ENV_MISSING");
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function json(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  if (!choiceRequestOriginIsAllowed(request)) return json({ error: "forbidden_origin" }, 403);
  if (choiceRequestBodyIsTooLarge(request)) return json({ error: "choice_event_too_large" }, 413);

  const rate = consumeChoiceEventRateLimit(choiceRequestClientKey(request));
  if (!rate.allowed) {
    return json(
      { error: "choice_event_rate_limited" },
      429,
      { "retry-after": String(rate.retryAfterSeconds) },
    );
  }

  const raw = await readChoiceRequestTextWithinLimit(request).catch(() => "");
  if (raw === null) return json({ error: "choice_event_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "invalid_choice_event" }, 400);
  }

  const parsed = choiceEventSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "invalid_choice_event" }, 400);

  let error;
  try {
    ({ error } = await analyticsClient().from("customer_choice_events").insert(parsed.data));
  } catch (clientError) {
    console.error("choice_event_client_unavailable", { code: clientError instanceof Error ? clientError.message : "UNKNOWN" });
    return json({ error: "choice_event_not_recorded" }, 503);
  }
  if (error?.code === "23505") return json({ ok: true, duplicate: true }, 200);
  if (error) {
    console.error("choice_event_insert_failed", { code: error.code, message: error.message });
    return json({ error: "choice_event_not_recorded" }, 503);
  }
  return json({ ok: true }, 201);
}
