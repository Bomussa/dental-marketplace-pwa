import { describe, expect, it } from "vitest";
import { conversionRate, parseCustomerChoiceAnalytics } from "@/lib/customer-choice-analytics";

describe("customer choice analytics", () => {
  it("parses a valid aggregate payload", () => {
    const parsed = parseCustomerChoiceAnalytics({
      window_days: 7,
      since: "2026-08-08T00:00:00Z",
      generated_at: "2026-08-15T00:00:00Z",
      timezone: "Asia/Qatar",
      metrics: {
        total_events: 12,
        unique_sessions: 3,
        searches: 4,
        booking_clicks: 2,
        login_required: 1,
        booking_successes: 1,
        booking_failures: 0,
        location_requested: 2,
        location_acquired: 1,
        location_denied: 1,
        searches_with_location: 1,
        last_event_at: "2026-08-14T23:59:00Z",
      },
      top_treatments: [{ id: "t1", name_ar: "تنظيف", name_en: "Cleaning", searches: 4 }],
      top_variants: [{ id: "v1", name_ar: "تنظيف عادي", name_en: "Standard", treatment_name_ar: "تنظيف", searches: 4 }],
      appointment_preferences: [{ preference: "today", searches: 3 }],
      weekday_searches: [{ iso_day: 6, searches: 4 }],
      hourly_searches: [{ hour: 1, searches: 4 }],
      recent_events: [{ event_name: "search_submitted", created_at: "2026-08-14T23:59:00Z", treatment_name_ar: "تنظيف", variant_name_ar: "تنظيف عادي" }],
    });

    expect(parsed.metrics.searches).toBe(4);
    expect(parsed.top_treatments[0]?.name_ar).toBe("تنظيف");
    expect(parsed.weekday_searches[0]).toEqual({ iso_day: 6, searches: 4 });
  });

  it("defaults malformed or missing values instead of inventing metrics", () => {
    const parsed = parseCustomerChoiceAnalytics({
      window_days: 999,
      metrics: { searches: -4, booking_clicks: "bad" },
      top_treatments: [{ id: "", name_ar: "", searches: 99 }],
      hourly_searches: [{ hour: 99, searches: 2 }],
    });

    expect(parsed.window_days).toBe(90);
    expect(parsed.metrics.searches).toBe(0);
    expect(parsed.metrics.booking_clicks).toBe(0);
    expect(parsed.top_treatments).toEqual([]);
    expect(parsed.hourly_searches[0]).toEqual({ hour: 23, searches: 2 });
  });

  it("calculates conversion rates safely", () => {
    expect(conversionRate(1, 3)).toBe(33.3);
    expect(conversionRate(0, 10)).toBe(0);
    expect(conversionRate(10, 0)).toBe(0);
  });
});
