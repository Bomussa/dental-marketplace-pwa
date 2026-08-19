import type { PriceScope } from "@/lib/price-scope";

export type Treatment = {
  id: string;
  code: string;
  category: string;
  name_ar: string;
  name_en: string;
};

export type TreatmentVariant = {
  id: string;
  catalog_id: string;
  variant_key: string;
  name_ar: string;
  name_en: string;
};

export type SearchOffer = {
  offer_id: string;
  clinic_id: string;
  clinic_name: string;
  branch_id: string;
  branch_name: string;
  area: string | null;
  branch_latitude: number | null;
  branch_longitude: number | null;
  variant_id: string;
  price_type: "fixed" | "from" | "range" | "package" | "consultation_required" | string;
  min_minor: number | null;
  max_minor: number | null;
  currency: string;
  price_scope: PriceScope | null;
  included_items: unknown;
  excluded_items: unknown;
  materials: unknown;
  visit_count: number | null;
  follow_up_terms: string | null;
  scope_confirmed_at: string | null;
  duration_minutes: number;
  clinic_attested_at: string | null;
  last_verified_at: string | null;
  distance_km: number | null;
  open_now: boolean;
  earliest_slot_id: string | null;
  earliest_slot_at: string | null;
  rating_avg: number | string | null;
  review_count: number;
};
