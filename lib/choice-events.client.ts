"use client";

export type ChoiceEventName =
  | "treatment_selected"
  | "variant_selected"
  | "appointment_preference_selected"
  | "location_requested"
  | "location_acquired"
  | "location_denied"
  | "search_submitted"
  | "offer_booking_clicked"
  | "booking_login_required"
  | "booking_succeeded"
  | "booking_failed";

type ChoiceValue = Record<string, string | number | boolean | null>;

type TrackChoiceInput = {
  event_name: ChoiceEventName;
  treatment_id?: string;
  variant_id?: string;
  offer_id?: string;
  slot_id?: string;
  choice_value?: ChoiceValue;
};

let memorySessionId: string | null = null;

function getSessionId() {
  if (memorySessionId) return memorySessionId;
  try {
    const stored = window.sessionStorage.getItem("asnani_choice_session_v1");
    if (stored) return (memorySessionId = stored);
  } catch {
    // sessionStorage may be unavailable in hardened/private browser modes.
  }
  const next = crypto.randomUUID();
  memorySessionId = next;
  try { window.sessionStorage.setItem("asnani_choice_session_v1", next); } catch {}
  return next;
}

export function trackChoice(input: TrackChoiceInput) {
  if (typeof window === "undefined") return;
  const payload = {
    event_id: crypto.randomUUID(),
    session_id: getSessionId(),
    page_path: window.location.pathname,
    ...input,
    choice_value: input.choice_value ?? {},
  };
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === "function") {
    const accepted = navigator.sendBeacon("/api/choices", new Blob([body], { type: "application/json" }));
    if (accepted) return;
  }

  void fetch("/api/choices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body,
  }).catch(() => undefined);
}
