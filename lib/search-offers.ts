import { createClient } from "@/lib/supabase/server";
import type { SearchOffer } from "@/lib/models";

export type WhenPreference = "earliest" | "today" | "tomorrow";

export type LiveSearchInput = {
  variant: string;
  lat: number | null;
  lng: number | null;
  radius: number;
  when: WhenPreference;
};

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
      p_lat: input.lat,
      p_lng: input.lng,
      p_radius_km: input.radius,
    }),
  ]);

  const allOffers = (data ?? []) as SearchOffer[];
  const todayKey = qatarDate(new Date());
  const tomorrowKey = qatarDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const offers = allOffers.filter((offer) => {
    if (input.when === "earliest") return true;
    if (!offer.earliest_slot_at) return false;
    const key = qatarDate(new Date(offer.earliest_slot_at));
    return input.when === "today" ? key === todayKey : key === tomorrowKey;
  });

  return {
    variant,
    offers,
    error: error ? error.message : null,
  };
}
