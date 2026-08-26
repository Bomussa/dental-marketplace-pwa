export type ClinicBookingAttendanceEvent = {
  booking_id: string;
  event_type: string;
  sequence_no: number;
};

export type ClinicBookingAttendanceState = "available" | "unavailable" | "out_of_sync";

export function latestClinicAttendanceByBooking(events: readonly ClinicBookingAttendanceEvent[]): Map<string, ClinicBookingAttendanceEvent> {
  const latest = new Map<string, ClinicBookingAttendanceEvent>();
  for (const event of events) {
    const current = latest.get(event.booking_id);
    if (!current || event.sequence_no > current.sequence_no) latest.set(event.booking_id, event);
  }
  return latest;
}

export function clinicBookingAttendanceState(
  latestAttendanceEvent: ClinicBookingAttendanceEvent | undefined,
  unavailable: boolean,
): ClinicBookingAttendanceState {
  if (unavailable) return "unavailable";
  return latestAttendanceEvent?.event_type === "checked_in" ? "available" : "out_of_sync";
}
