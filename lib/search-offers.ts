import { OPERATIONAL_RPC_TIMEOUT_MS } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import type { SearchOffer } from "@/lib/models";

export type WhenPreference = "earliest" | "today" | "tomorrow";
export type SearchSort = "balanced" | "price" | "distance" | "rating" | "soonest";

export type LiveSearchInput = {
  variant: string;
  lat: number | null;
  lng: number | null;
  radius: number;
  when: WhenPreference;
  sort: SearchSort;
};

type NormalizationRange = { min: number; max: number } | null;

const qatarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Qatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function nullableNumber(value: number | null) { return value ?? Number.POSITIVE_INFINITY; }
function nullableTime(value: string | null) { return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY; }
function ratingValue(value: number | string | null) { return value == null ? Number.NEGATIVE_INFINITY : Number(value); }

function compareOffers(sort: Exclude<SearchSort, "balanced">) {
  return (a: SearchOffer, b: SearchOffer) => {
    const byPrice = nullableNumber(a.min_minor) - nullableNumber(b.min_minor);
    const byDistance = nullableNumber(a.distance_km) - nullableNumber(b.distance_km);
    const byRating = ratingValue(b.rating_avg) - ratingValue(a.rating_avg);
    const bySoonest = nullableTime(a.earliest_slot_at) - nullableTime(b.earliest_slot_at);
    const byName = a.clinic_name.localeCompare(b.clinic_name, "en");
    if (sort === "price") return byPrice || byDistance || byRating || bySoonest || byName;
    if (sort === "distance") return byDistance || byPrice || byRating || bySoonest || byName;
    if (sort === "rating") return byRating || byPrice || byDistance || bySoonest || byName;
    return bySoonest || byPrice || byDistance || byRating || byName;
  };
}

function normalizationRange(values: number[]): NormalizationRange {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

function normalize(value: number, range: NormalizationRange, fallback: number) {
  if (!range || !Number.isFinite(value)) return fallback;
  return range.min === range.max ? 0 : (value - range.min) / (range.max - range.min);
}

function balancedScores(offers: SearchOffer[]) {
  const priceRange = normalizationRange(offers.map((offer) => nullableNumber(offer.min_minor)));
  const distanceRange = normalizationRange(offers.map((offer) => nullableNumber(offer.distance_km)));
  const ratingRange = normalizationRange(offers.map((offer) => ratingValue(offer.rating_avg)));
  const appointmentRange = normalizationRange(offers.map((offer) => nullableTime(offer.earliest_slot_at)));

  return new Map(offers.map((offer) => {
    const priceScore = normalize(nullableNumber(offer.min_minor), priceRange, 1);
    const distanceScore = normalize(nullableNumber(offer.distance_km), distanceRange, 0.5);
    const ratingPenalty = 1 - normalize(ratingValue(offer.rating_avg), ratingRange, 0.5);
    const appointmentScore = normalize(nullableTime(offer.earliest_slot_at), appointmentRange, 1);
    const score = (priceScore * 0.35) + (ratingPenalty * 0.25) + (appointmentScore * 0.25) + (distanceScore * 0.15);
    return [offer.offer_id, score] as const;
  }));
}

export function sortSearchOffers(offers: SearchOffer[], sort: SearchSort) {
  const ordered = [...offers];
  if (sort !== "balanced") return ordered.sort(compareOffers(sort));

  const scores = balancedScores(offers);
  const fallback = compareOffers("price");
  return ordered.sort((a, b) => (scores.get(a.offer_id) ?? 0) - (scores.get(b.offer_id) ?? 0) || fallback(a, b));
}

function qatarDate(date: Date) {
  return qatarDateFormatter.format(date);
}

export async function searchLiveOffers(input: LiveSearchInput) {
  const supabase = await createClient();
  const [{ data: variant }, { data, error }] = await Promise.all([
    supabase.from("treatment_variants").select("name_ar,name_en").eq("id", input.variant).single(),
    supabase.rpc("search_dental_offers", {
      p_variant_id: input.variant,
      p_lat: input.lat ?? undefined,
      p_lng: input.lng ?? undefined,
      p_radius_km: input.radius,
    }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS)),
  ]);

  const allOffers = (data ?? []) as SearchOffer[];
  const todayKey = qatarDate(new Date());
  const tomorrowKey = qatarDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const matchesWhen = allOffers.filter((offer) => {
    if (input.when === "earliest") return true;
    if (!offer.earliest_slot_at) return false;
    const key = qatarDate(new Date(offer.earliest_slot_at));
    return input.when === "today" ? key === todayKey : key === tomorrowKey;
  });

  return {
    variant,
    offers: sortSearchOffers(matchesWhen, input.sort),
    error: error ? error.message : null,
  };
}
