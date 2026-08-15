"use client";

function idempotencyStorageKey(offerId: string, slotId: string, patientProfileId = "default") {
  return `asnani_booking_intent_v2:${offerId}:${slotId}:${patientProfileId}`;
}

export function bookingIntentKey(offerId: string, slotId: string, patientProfileId = "default") {
  const storageKey = idempotencyStorageKey(offerId, slotId, patientProfileId);
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const next = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearBookingIntent(offerId: string, slotId: string, patientProfileId = "default") {
  try {
    window.sessionStorage.removeItem(idempotencyStorageKey(offerId, slotId, patientProfileId));
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }
}
