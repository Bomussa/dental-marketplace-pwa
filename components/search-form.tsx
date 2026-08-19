"use client";

import { useMemo, useState } from "react";
import type { Treatment, TreatmentVariant } from "@/lib/models";
import { Button } from "@/components/ui";
import { CalendarIcon, LocationIcon, SearchIcon, SlidersIcon, ToothIcon } from "@/components/icons";
import { trackChoice } from "@/lib/choice-events.client";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SearchForm({ treatments, variants, locale }: { treatments: Treatment[]; variants: TreatmentVariant[]; locale: Locale }) {
  const t = getDictionary(locale);
  const [treatmentId, setTreatmentId] = useState(treatments[0]?.id ?? "");
  const [variantId, setVariantId] = useState("");
  const [when, setWhen] = useState<"earliest" | "today" | "tomorrow">("earliest");
  const [sort, setSort] = useState<"balanced" | "price" | "distance" | "rating" | "soonest">("balanced");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const availableVariants = useMemo(() => variants.filter((v) => v.catalog_id === treatmentId), [variants, treatmentId]);
  const effectiveVariant = variantId || availableVariants[0]?.id || "";

  function locate() {
    trackChoice({ event_name: "location_requested", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined });
    if (!navigator.geolocation) {
      setGeoState("error");
      trackChoice({ event_name: "location_denied", choice_value: { reason: "unsupported" } });
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(3));
        setLng(pos.coords.longitude.toFixed(3));
        setGeoState("ok");
        trackChoice({ event_name: "location_acquired", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined, choice_value: { precision: "rounded_3dp" } });
      },
      () => {
        setGeoState("error");
        trackChoice({ event_name: "location_denied", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined, choice_value: { reason: "permission_or_timeout" } });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  }

  function submitSearch() {
    trackChoice({
      event_name: "search_submitted",
      treatment_id: treatmentId || undefined,
      variant_id: effectiveVariant || undefined,
      choice_value: { when, sort, radius_km: 10, location_used: Boolean(lat && lng) },
    });
  }

  return (
    <form action="/results" onSubmit={submitSearch} className="grid gap-3.5" aria-label={t["search.aria"]}>
      <div className="comparison-form grid gap-2.5 p-2.5 lg:grid-cols-[1.04fr_1.16fr_.78fr_.78fr_auto] lg:items-stretch">
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><ToothIcon size={16}/></span>{t["search.treatment"]}</span>
          <select name="treatment" value={treatmentId} onChange={(e) => { const next = e.target.value; setTreatmentId(next); setVariantId(""); trackChoice({ event_name: "treatment_selected", treatment_id: next }); }} required className="comparison-field__select">
            {treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{locale === "ar" ? treatment.name_ar : treatment.name_en}</option>)}
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><SearchIcon size={16}/></span>{t["search.variant"]}</span>
          <select name="variant" value={effectiveVariant} onChange={(e) => { const next = e.target.value; setVariantId(next); trackChoice({ event_name: "variant_selected", treatment_id: treatmentId || undefined, variant_id: next }); }} required className="comparison-field__select">
            {availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{locale === "ar" ? variant.name_ar : variant.name_en}</option>)}
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><CalendarIcon size={16}/></span>{t["search.appointment"]}</span>
          <select name="when" value={when} onChange={(e) => { const next = e.target.value as "earliest" | "today" | "tomorrow"; setWhen(next); trackChoice({ event_name: "appointment_preference_selected", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined, choice_value: { when: next } }); }} className="comparison-field__select">
            <option value="earliest">{t["search.earliest"]}</option><option value="today">{t["search.today"]}</option><option value="tomorrow">{t["search.tomorrow"]}</option>
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><SlidersIcon size={16}/></span>{t["search.sort"]}</span>
          <select name="sort" value={sort} onChange={(e) => setSort(e.target.value as "balanced" | "price" | "distance" | "rating" | "soonest")} className="comparison-field__select">
            <option value="balanced">{t["search.sort.balanced"]}</option><option value="price">{t["search.sort.price"]}</option><option value="distance">{t["search.sort.distance"]}</option><option value="rating">{t["search.sort.rating"]}</option><option value="soonest">{t["search.sort.soonest"]}</option>
          </select>
        </label>
        <div className="flex items-stretch">
          <Button type="submit" disabled={!effectiveVariant} className="comparison-submit w-full gap-2.5 px-6 lg:min-w-40"><SearchIcon size={18}/><span>{t["search.results"]}</span></Button>
        </div>
      </div>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="radius" value="10" />
      <div className="flex min-h-9 flex-wrap items-center justify-center gap-2.5 px-1 lg:justify-start">
        <button type="button" onClick={locate} className="location-control">
          <LocationIcon size={16}/>{geoState === "loading" ? t["search.locating"] : geoState === "ok" ? t["search.locationUsed"] : t["search.useLocation"]}
        </button>
        {geoState === "ok" && <span className="text-[11px] font-bold text-slate-500">{t["search.locationPrivacy"]}</span>}
        {geoState === "error" && <span className="text-[11px] font-bold text-amber-700">{t["search.locationUnavailable"]}</span>}
      </div>
    </form>
  );
}
