"use client";

function idempotencyStorageKey(offerId: string, slotId: string) {
  return `asnani_booking_intent_v1:${offerId}:${slotId}`;
}

export function bookingIntentKey(offerId: string, slotId: string) {
  const storageKey = idempotencyStorageKey(offerId, slotId);
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

export function clearBookingIntent(offerId: string, slotId: string) {
  try {
    window.sessionStorage.removeItem(idempotencyStorageKey(offerId, slotId));
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }
}
