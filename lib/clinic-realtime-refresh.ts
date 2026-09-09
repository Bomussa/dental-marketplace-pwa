export function isClinicBookingNotification(payload: { new: unknown }) {
  if (!payload.new || typeof payload.new !== "object") return false;
  return (payload.new as { event_type?: unknown }).event_type === "booking_requested";
}
