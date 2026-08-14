import type { Json } from "@/lib/database.types";

export type CustomerChoiceAnalytics = {
  window_days: number;
  since: string | null;
  generated_at: string | null;
  timezone: string;
  metrics: {
    total_events: number;
    unique_sessions: number;
    searches: number;
    booking_clicks: number;
    login_required: number;
    booking_successes: number;
    booking_failures: number;
    location_requested: number;
    location_acquired: number;
    location_denied: number;
    searches_with_location: number;
    last_event_at: string | null;
  };
  top_treatments: Array<{ id: string; name_ar: string; name_en: string; searches: number }>;
  top_variants: Array<{ id: string; name_ar: string; name_en: string; treatment_name_ar: string; searches: number }>;
  appointment_preferences: Array<{ preference: string; searches: number }>;
  weekday_searches: Array<{ iso_day: number; searches: number }>;
  hourly_searches: Array<{ hour: number; searches: number }>;
  recent_events: Array<{
    event_name: string;
    created_at: string;
    treatment_name_ar: string | null;
    variant_name_ar: string | null;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asCount(value: unknown): number {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

export function conversionRate(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function parseCustomerChoiceAnalytics(value: Json | null): CustomerChoiceAnalytics {
  const root = asRecord(value);
  const metrics = asRecord(root.metrics);

  return {
    window_days: Math.min(Math.max(asCount(root.window_days) || 7, 1), 90),
    since: asNullableString(root.since),
    generated_at: asNullableString(root.generated_at),
    timezone: asString(root.timezone, "Asia/Qatar"),
    metrics: {
      total_events: asCount(metrics.total_events),
      unique_sessions: asCount(metrics.unique_sessions),
      searches: asCount(metrics.searches),
      booking_clicks: asCount(metrics.booking_clicks),
      login_required: asCount(metrics.login_required),
      booking_successes: asCount(metrics.booking_successes),
      booking_failures: asCount(metrics.booking_failures),
      location_requested: asCount(metrics.location_requested),
      location_acquired: asCount(metrics.location_acquired),
      location_denied: asCount(metrics.location_denied),
      searches_with_location: asCount(metrics.searches_with_location),
      last_event_at: asNullableString(metrics.last_event_at),
    },
    top_treatments: asArray(root.top_treatments).map((item) => {
      const row = asRecord(item);
      return { id: asString(row.id), name_ar: asString(row.name_ar), name_en: asString(row.name_en), searches: asCount(row.searches) };
    }).filter((row) => row.id && row.name_ar),
    top_variants: asArray(root.top_variants).map((item) => {
      const row = asRecord(item);
      return {
        id: asString(row.id),
        name_ar: asString(row.name_ar),
        name_en: asString(row.name_en),
        treatment_name_ar: asString(row.treatment_name_ar),
        searches: asCount(row.searches),
      };
    }).filter((row) => row.id && row.name_ar),
    appointment_preferences: asArray(root.appointment_preferences).map((item) => {
      const row = asRecord(item);
      return { preference: asString(row.preference, "unknown"), searches: asCount(row.searches) };
    }),
    weekday_searches: asArray(root.weekday_searches).map((item) => {
      const row = asRecord(item);
      return { iso_day: Math.min(Math.max(asCount(row.iso_day), 1), 7), searches: asCount(row.searches) };
    }),
    hourly_searches: asArray(root.hourly_searches).map((item) => {
      const row = asRecord(item);
      return { hour: Math.min(Math.max(asCount(row.hour), 0), 23), searches: asCount(row.searches) };
    }),
    recent_events: asArray(root.recent_events).map((item) => {
      const row = asRecord(item);
      return {
        event_name: asString(row.event_name),
        created_at: asString(row.created_at),
        treatment_name_ar: asNullableString(row.treatment_name_ar),
        variant_name_ar: asNullableString(row.variant_name_ar),
      };
    }).filter((row) => row.event_name && row.created_at),
  };
}
