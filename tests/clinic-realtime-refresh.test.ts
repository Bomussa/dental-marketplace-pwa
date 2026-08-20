import { describe, expect, it } from "vitest";
import { isClinicBookingNotification } from "@/lib/clinic-realtime-refresh";

describe("isClinicBookingNotification", () => {
  it("accepts only booking_requested notification payloads", () => {
    expect(isClinicBookingNotification({ new: { event_type: "booking_requested" } })).toBe(true);
    expect(isClinicBookingNotification({ new: { event_type: "booking_confirmed" } })).toBe(false);
  });

  it("fails closed for incomplete or malformed realtime payloads", () => {
    expect(isClinicBookingNotification({ new: null })).toBe(false);
    expect(isClinicBookingNotification({ new: "booking_requested" })).toBe(false);
    expect(isClinicBookingNotification({ new: {} })).toBe(false);
  });
});
