import {
  CHOICE_EVENT_WINDOW_SECONDS,
  choiceRequestBodyIsTooLarge,
  choiceRequestClientKey,
  choiceRequestOriginIsAllowed,
  MAX_CHOICE_EVENTS_PER_WINDOW,
  readChoiceRequestTextWithinLimit,
} from "@/lib/choice-event-guard";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { choiceEventSchema } from "@/lib/validation";
import { jsonNoStore } from "@/lib/api-response";

export async function POST(request: Request) {
  if (!choiceRequestOriginIsAllowed(request)) return jsonNoStore({ error: "forbidden_origin" }, 403);
  if (choiceRequestBodyIsTooLarge(request)) return jsonNoStore({ error: "choice_event_too_large" }, 413);

  let rateAllowed;
  try {
    rateAllowed = await consumeRateLimit({
      scope: "choice_event",
      subject: choiceRequestClientKey(request),
      maxRequests: MAX_CHOICE_EVENTS_PER_WINDOW,
      windowSeconds: CHOICE_EVENT_WINDOW_SECONDS,
    });
  } catch {
    return jsonNoStore({ error: "choice_event_protection_unavailable" }, 503);
  }

  if (!rateAllowed) {
    return jsonNoStore(
      { error: "choice_event_rate_limited" },
      429,
      { "retry-after": String(CHOICE_EVENT_WINDOW_SECONDS) },
    );
  }

  const raw = await readChoiceRequestTextWithinLimit(request).catch(() => "");
  if (raw === null) return jsonNoStore({ error: "choice_event_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return jsonNoStore({ error: "invalid_choice_event" }, 400);
  }

  const parsed = choiceEventSchema.safeParse(payload);
  if (!parsed.success) return jsonNoStore({ error: "invalid_choice_event" }, 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return jsonNoStore({ error: "choice_event_not_recorded" }, 503);
  }

  let insertError: { code?: string } | null;
  try {
    ({ error: insertError } = await withOperationalTimeout(admin.from("customer_choice_events").insert(parsed.data)));
  } catch {
    return jsonNoStore({ error: "choice_event_not_recorded" }, 503);
  }
  if (insertError?.code === "23505") return jsonNoStore({ ok: true, duplicate: true }, 200);
  if (insertError) {
    console.error("choice_event_insert_failed", { code: insertError.code });
    return jsonNoStore({ error: "choice_event_not_recorded" }, 503);
  }

  return jsonNoStore({ ok: true }, 201);
}
