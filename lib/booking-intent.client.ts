"use client";

const memoryBookingIntentKeys = new Map<string, string>();

function idempotencyStorageKey(offerId: string, slotId: string, patientProfileId = "default") {
  return `asnani_booking_intent_v2:${offerId}:${slotId}:${patientProfileId}`;
}

export function bookingIntentKey(offerId: string, slotId: string, patientProfileId = "default") {
  const storageKey = idempotencyStorageKey(offerId, slotId, patientProfileId);
  const memoryStored = memoryBookingIntentKeys.get(storageKey);

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
      memoryBookingIntentKeys.set(storageKey, stored);
      return stored;
    }
  } catch {
    if (memoryStored) return memoryStored;
    const next = crypto.randomUUID();
    memoryBookingIntentKeys.set(storageKey, next);
    return next;
  }

  if (memoryStored) return memoryStored;

  const next = crypto.randomUUID();
  memoryBookingIntentKeys.set(storageKey, next);
  try {
    window.sessionStorage.setItem(storageKey, next);
  } catch {
    // Keep the in-memory key so retries in this page session remain idempotent.
  }
  return next;
}

export function clearBookingIntent(offerId: string, slotId: string, patientProfileId = "default") {
  const storageKey = idempotencyStorageKey(offerId, slotId, patientProfileId);
  memoryBookingIntentKeys.delete(storageKey);
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }
}
