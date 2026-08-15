import { NextResponse } from "next/server";
import {
  CHOICE_EVENT_WINDOW_SECONDS,
  choiceRequestBodyIsTooLarge,
  choiceRequestClientKey,
  choiceRequestOriginIsAllowed,
  MAX_CHOICE_EVENTS_PER_WINDOW,
  readChoiceRequestTextWithinLimit,
} from "@/lib/choice-event-guard";
import { consumeRateLimit } from "@/lib/operations.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { choiceEventSchema } from "@/lib/validation";

function json(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  if (!choiceRequestOriginIsAllowed(request)) return json({ error: "forbidden_origin" }, 403);
  if (choiceRequestBodyIsTooLarge(request)) return json({ error: "choice_event_too_large" }, 413);

  let rateAllowed;
  try {
    rateAllowed = await consumeRateLimit({
      scope: "choice_event",
      subject: choiceRequestClientKey(request),
      maxRequests: MAX_CHOICE_EVENTS_PER_WINDOW,
      windowSeconds: CHOICE_EVENT_WINDOW_SECONDS,
    });
  } catch {
    return json({ error: "choice_event_protection_unavailable" }, 503);
  }

  if (!rateAllowed) {
    return json(
      { error: "choice_event_rate_limited" },
      429,
      { "retry-after": String(CHOICE_EVENT_WINDOW_SECONDS) },
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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "choice_event_not_recorded" }, 503);
  }

  const { error } = await admin.from("customer_choice_events").insert(parsed.data);
  if (error?.code === "23505") return json({ ok: true, duplicate: true }, 200);
  if (error) {
    console.error("choice_event_insert_failed", { code: error.code });
    return json({ error: "choice_event_not_recorded" }, 503);
  }

  return json({ ok: true }, 201);
}
