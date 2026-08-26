import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search-query";
import { sortSearchOffers } from "@/lib/search-offers";
import type { SearchOffer } from "@/lib/models";

function offer(overrides: Partial<SearchOffer>): SearchOffer {
  return {
    offer_id: "11111111-1111-4111-8111-111111111111",
    clinic_id: "22222222-2222-4222-8222-222222222222",
    clinic_name: "Clinic",
    branch_id: "33333333-3333-4333-8333-333333333333",
    branch_name: "Branch",
    area: null,
    branch_address: null,
    branch_latitude: null,
    branch_longitude: null,
    variant_id: "44444444-4444-4444-8444-444444444444",
    price_type: "fixed",
    min_minor: 10000,
    max_minor: 10000,
    currency: "QAR",
    price_scope: null,
    included_items: [],
    excluded_items: [],
    materials: [],
    visit_count: 1,
    follow_up_terms: null,
    scope_confirmed_at: null,
    duration_minutes: 30,
    clinic_attested_at: null,
    last_verified_at: null,
    distance_km: 5,
    open_now: true,
    earliest_slot_id: null,
    earliest_slot_at: "2026-08-20T06:00:00.000Z",
    earliest_practitioner_id: null,
    earliest_practitioner_name: null,
    earliest_practitioner_gender: null,
    rating_avg: 4,
    review_count: 10,
    ...overrides,
  };
}

describe("parseSearchQuery", () => {
  it("uses one shared validation contract for the page and API inputs", () => {
    const parsed = parseSearchQuery({
      variant: ["44444444-4444-4444-8444-444444444444", "ignored"],
      radius: "25",
      when: "tomorrow",
      sort: "rating",
      practitioner_gender: "female",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ radius: 25, when: "tomorrow", sort: "rating", practitioner_gender: "female" });
  });

  it("rejects an invalid appointment preference instead of silently changing it", () => {
    expect(parseSearchQuery({ variant: "44444444-4444-4444-8444-444444444444", when: "next_month" }).success).toBe(false);
  });

  it("rejects a practitioner-gender filter outside the supported values", () => {
    expect(parseSearchQuery({ variant: "44444444-4444-4444-8444-444444444444", practitioner_gender: "other" }).success).toBe(false);
  });
});

describe("sortSearchOffers", () => {
  it("keeps balanced distinct from price-first when a stronger all-round option exists", () => {
    const cheapest = offer({ offer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", clinic_name: "Cheapest", min_minor: 10000, distance_km: 18, rating_avg: 2, earliest_slot_at: "2026-08-25T06:00:00.000Z" });
    const balanced = offer({ offer_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", clinic_name: "Balanced", min_minor: 18000, distance_km: 1, rating_avg: 5, earliest_slot_at: "2026-08-20T06:00:00.000Z" });

    expect(sortSearchOffers([cheapest, balanced], "price")[0]?.offer_id).toBe(cheapest.offer_id);
    expect(sortSearchOffers([cheapest, balanced], "balanced")[0]?.offer_id).toBe(balanced.offer_id);
  });
});
