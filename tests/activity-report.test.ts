import { describe, expect, it } from "vitest";
import { activityReportLabel, parseActivityReport } from "@/lib/activity-report";

const validReport = {
  scope: "platform",
  clinic_id: null,
  period_start: "2026-08-01",
  period_end: "2026-08-31",
  granularity: "daily",
  timezone: "Asia/Qatar",
  generated_at: "2026-08-19T10:00:00+03:00",
  total_clinics: 10,
  active_clinics: 8,
  total_patients: 45,
  total_bookings: 80,
  new_clinics_in_period: 2,
  new_patients_in_period: 12,
  new_bookings_in_period: 18,
  buckets: [{
    bucket_start: "2026-08-01T00:00:00+03:00",
    bucket_end: "2026-08-02T00:00:00+03:00",
    new_clinics: 1,
    new_patients: 2,
    new_bookings: 3,
    confirmed_bookings: 2,
    attended_bookings: 1,
    completed_bookings: 1,
    closed_without_completion: 0,
  }],
};

describe("activity report", () => {
  it("accepts a complete Qatar-time report without patient-identifying fields", () => {
    const report = parseActivityReport(validReport);
    expect(report?.timezone).toBe("Asia/Qatar");
    expect(report?.buckets[0]?.new_bookings).toBe(3);
    expect(Object.keys(report?.buckets[0] ?? {})).not.toContain("patient_name");
  });

  it("rejects incomplete reports and scope mismatches", () => {
    expect(parseActivityReport({ ...validReport, timezone: "UTC" })).toBeNull();
    expect(parseActivityReport({ ...validReport, scope: "clinic", clinic_id: null })).toBeNull();
    expect(parseActivityReport({ ...validReport, buckets: [{ ...validReport.buckets[0], new_patients: -1 }] })).toBeNull();
  });

  it("renders bilingual aggregation labels", () => {
    expect(activityReportLabel("ar", "hourly")).toBe("بالساعة");
    expect(activityReportLabel("en", "monthly")).toBe("Monthly");
  });
});
