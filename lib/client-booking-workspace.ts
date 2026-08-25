export const clientBookingViews = ["attention", "upcoming", "history"] as const;

export type ClientBookingView = (typeof clientBookingViews)[number];

export function parseClientBookingView(value: string | undefined): ClientBookingView {
  return value === "upcoming" || value === "history" ? value : "attention";
}

export function parseClientBookingPage(value: string | undefined): number {
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, 10_000);
}

export function clientBookingStatusTone(status: string): "green" | "amber" | "red" | "slate" {
  if (status === "confirmed" || status === "checked_in" || status === "completed") return "green";
  if (status === "clinic_cancelled" || status === "patient_cancelled" || status === "failed" || status === "no_show") return "red";
  if (status === "pending_hold" || status === "pending_clinic_confirmation") return "amber";
  return "slate";
}
