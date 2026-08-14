import { describe, expect, it } from "vitest";
import { conversionRate, parseCustomerChoiceAnalytics } from "@/lib/customer-choice-analytics";

describe("customer choice analytics", () => {
  it("parses a valid aggregate payload including cohort metrics", () => {
    const parsed = parseCustomerChoiceAnalytics({
      window_days: 7,
      since: "2026-08-08T00:00:00Z",
      generated_at: "2026-08-15T00:00:00Z",
      timezone: "Asia/Qatar",
      metrics: {
        total_events: 12,
        unique_sessions: 3,
        searches: 3,
        search_sessions: 2,
        booking_clicks: 3,
        booking_click_sessions: 2,
        login_required: 1,
        login_required_sessions: 1,
        booking_successes: 2,
        booking_success_sessions: 2,
        booking_failures: 0,
        booking_failure_sessions: 0,
        location_requested: 2,
        location_requested_sessions: 2,
        location_acquired: 1,
        location_acquired_sessions: 1,
        location_denied: 1,
        location_denied_sessions: 1,
        searches_with_location: 2,
        searches_with_location_sessions: 1,
        search_to_click_sessions: 1,
        click_to_success_sessions: 2,
        search_to_success_sessions: 1,
        location_request_to_acquired_sessions: 1,
        last_event_at: "2026-08-14T23:59:00Z",
      },
      top_treatments: [{ id: "t1", name_ar: "تنظيف", name_en: "Cleaning", searches: 3, search_sessions: 2 }],
      top_variants: [{ id: "v1", name_ar: "تنظيف عادي", name_en: "Standard", treatment_name_ar: "تنظيف", searches: 3, search_sessions: 2 }],
      appointment_preferences: [{ preference: "today", searches: 3, search_sessions: 2 }],
      weekday_searches: [{ iso_day: 6, searches: 3, search_sessions: 2 }],
      hourly_searches: [{ hour: 1, searches: 3, search_sessions: 2 }],
      recent_events: [{ event_name: "search_submitted", created_at: "2026-08-14T23:59:00Z", treatment_name_ar: "تنظيف", variant_name_ar: "تنظيف عادي" }],
    });

    expect(parsed.metrics.search_sessions).toBe(2);
    expect(parsed.metrics.search_to_click_sessions).toBe(1);
    expect(parsed.top_treatments[0]).toMatchObject({ name_ar: "تنظيف", searches: 3, search_sessions: 2 });
    expect(parsed.weekday_searches[0]).toEqual({ iso_day: 6, searches: 3, search_sessions: 2 });
  });

  it("defaults malformed or missing values instead of inventing metrics", () => {
    const parsed = parseCustomerChoiceAnalytics({
      window_days: 999,
      metrics: { searches: -4, booking_clicks: "bad", search_to_click_sessions: -5 },
      top_treatments: [{ id: "", name_ar: "", searches: 99, search_sessions: 88 }],
      hourly_searches: [{ hour: 99, searches: 2, search_sessions: 1 }],
    });

    expect(parsed.window_days).toBe(90);
    expect(parsed.metrics.searches).toBe(0);
    expect(parsed.metrics.booking_clicks).toBe(0);
    expect(parsed.metrics.search_to_click_sessions).toBe(0);
    expect(parsed.top_treatments).toEqual([]);
    expect(parsed.hourly_searches[0]).toEqual({ hour: 23, searches: 2, search_sessions: 1 });
  });

  it("calculates bounded conversion rates safely", () => {
    expect(conversionRate(1, 3)).toBe(33.3);
    expect(conversionRate(0, 10)).toBe(0);
    expect(conversionRate(10, 0)).toBe(0);
    expect(conversionRate(4, 3)).toBe(100);
  });
});
