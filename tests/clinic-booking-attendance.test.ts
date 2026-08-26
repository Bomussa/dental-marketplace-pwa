import { describe, expect, it } from "vitest";
import { clinicBookingAttendanceState, latestClinicAttendanceByBooking } from "@/lib/clinic-booking-attendance";

describe("clinic booking attendance state", () => {
  it("selects the event with the greatest sequence number for each booking", () => {
    const latest = latestClinicAttendanceByBooking([
      { booking_id: "booking-a", event_type: "attendance_reversed", sequence_no: 1 },
      { booking_id: "booking-a", event_type: "checked_in", sequence_no: 2 },
      { booking_id: "booking-b", event_type: "checked_in", sequence_no: 3 },
    ]);

    expect(latest.get("booking-a")?.event_type).toBe("checked_in");
    expect(latest.get("booking-b")?.sequence_no).toBe(3);
  });

  it("keeps completion unavailable when the attendance read failed or is stale", () => {
    expect(clinicBookingAttendanceState({ booking_id: "booking-a", event_type: "checked_in", sequence_no: 1 }, true)).toBe("unavailable");
    expect(clinicBookingAttendanceState({ booking_id: "booking-a", event_type: "attendance_reversed", sequence_no: 2 }, false)).toBe("out_of_sync");
    expect(clinicBookingAttendanceState({ booking_id: "booking-a", event_type: "checked_in", sequence_no: 3 }, false)).toBe("available");
  });
});
