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

function normalized(value: number, values: number[], fallback: number) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length || !Number.isFinite(value)) return fallback;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return min === max ? 0 : (value - min) / (max - min);
}

function balancedScore(offer: SearchOffer, offers: SearchOffer[]) {
  const prices = offers.map((item) => nullableNumber(item.min_minor));
  const distances = offers.map((item) => nullableNumber(item.distance_km));
  const ratings = offers.map((item) => ratingValue(item.rating_avg));
  const appointmentTimes = offers.map((item) => nullableTime(item.earliest_slot_at));
  const priceScore = normalized(nullableNumber(offer.min_minor), prices, 1);
  const distanceScore = normalized(nullableNumber(offer.distance_km), distances, 0.5);
  const ratingPenalty = 1 - normalized(ratingValue(offer.rating_avg), ratings, 0.5);
  const appointmentScore = normalized(nullableTime(offer.earliest_slot_at), appointmentTimes, 1);

  return (priceScore * 0.35) + (ratingPenalty * 0.25) + (appointmentScore * 0.25) + (distanceScore * 0.15);
}

export function sortSearchOffers(offers: SearchOffer[], sort: SearchSort) {
  const ordered = [...offers];
  if (sort !== "balanced") return ordered.sort(compareOffers(sort));

  const fallback = compareOffers("price");
  return ordered.sort((a, b) => balancedScore(a, offers) - balancedScore(b, offers) || fallback(a, b));
}

function qatarDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
    }),
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
