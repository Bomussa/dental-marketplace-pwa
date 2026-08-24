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
  const [radius, setRadius] = useState<1 | 5 | 10 | 25 | 50>(10);
  const [sort, setSort] = useState<"balanced" | "price" | "distance" | "rating" | "soonest">("balanced");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const availableVariants = useMemo(() => variants.filter((v) => v.catalog_id === treatmentId), [variants, treatmentId]);
  const effectiveVariant = variantId || availableVariants[0]?.id || "";
  const quickTreatments = treatments.slice(0, 6);

  function selectTreatment(nextTreatmentId: string) {
    setTreatmentId(nextTreatmentId);
    setVariantId("");
    trackChoice({ event_name: "treatment_selected", treatment_id: nextTreatmentId });
  }

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
      choice_value: { when, sort, radius_km: radius, location_used: Boolean(lat && lng) },
    });
  }

  return (
    <form action="/results" onSubmit={submitSearch} className="grid gap-4" aria-label={t["search.aria"]}>
      <fieldset className="mobile-treatment-rail" aria-label={t["home.browseTreatments"]}>
        <legend className="sr-only">{t["home.browseTreatments"]}</legend>
        {quickTreatments.map((treatment) => {
          const selected = treatment.id === treatmentId;
          const treatmentName = locale === "ar" ? treatment.name_ar : treatment.name_en;
          return <button key={treatment.id} type="button" className={`mobile-treatment-rail__item ${selected ? "mobile-treatment-rail__item--active" : ""}`} aria-pressed={selected} onClick={() => selectTreatment(treatment.id)}><span className="mobile-treatment-rail__icon"><ToothIcon size={19} /></span><span>{treatmentName}</span></button>;
        })}
      </fieldset>
      <div className="comparison-form grid gap-3 p-3 sm:p-3.5 lg:grid-cols-[1.03fr_1.16fr_.78fr_.72fr_.8fr_auto] lg:items-stretch">
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><ToothIcon size={17}/></span>{t["search.treatment"]}</span>
          <select name="treatment" value={treatmentId} onChange={(e) => selectTreatment(e.target.value)} required className="comparison-field__select">
            {treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{locale === "ar" ? treatment.name_ar : treatment.name_en}</option>)}
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><SearchIcon size={17}/></span>{t["search.variant"]}</span>
          <select name="variant" value={effectiveVariant} onChange={(e) => { const next = e.target.value; setVariantId(next); trackChoice({ event_name: "variant_selected", treatment_id: treatmentId || undefined, variant_id: next }); }} required className="comparison-field__select">
            {availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{locale === "ar" ? variant.name_ar : variant.name_en}</option>)}
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><CalendarIcon size={17}/></span>{t["search.appointment"]}</span>
          <select name="when" value={when} onChange={(e) => { const next = e.target.value as "earliest" | "today" | "tomorrow"; setWhen(next); trackChoice({ event_name: "appointment_preference_selected", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined, choice_value: { when: next } }); }} className="comparison-field__select">
            <option value="earliest">{t["search.earliest"]}</option><option value="today">{t["search.today"]}</option><option value="tomorrow">{t["search.tomorrow"]}</option>
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><LocationIcon size={17}/></span>{t["search.radius"]}</span>
          <select name="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value) as 1 | 5 | 10 | 25 | 50)} className="comparison-field__select">
            {[1, 5, 10, 25, 50].map((value) => <option key={value} value={value}>{value} {t["search.kilometres"]}</option>)}
          </select>
        </label>
        <label className="comparison-field">
          <span className="comparison-field__label"><span className="comparison-field__icon"><SlidersIcon size={17}/></span>{t["search.sort"]}</span>
          <select name="sort" value={sort} onChange={(e) => setSort(e.target.value as "balanced" | "price" | "distance" | "rating" | "soonest")} className="comparison-field__select">
            <option value="balanced">{t["search.sort.balanced"]}</option><option value="price">{t["search.sort.price"]}</option><option value="distance">{t["search.sort.distance"]}</option><option value="rating">{t["search.sort.rating"]}</option><option value="soonest">{t["search.sort.soonest"]}</option>
          </select>
        </label>
        <div className="flex items-stretch">
          <Button type="submit" disabled={!effectiveVariant} className="comparison-submit w-full gap-2.5 px-7 lg:min-w-44"><SearchIcon size={19}/><span>{t["search.results"]}</span></Button>
        </div>
      </div>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="flex min-h-10 flex-wrap items-center justify-center gap-3 px-1 lg:justify-start">
        <button type="button" onClick={locate} className="location-control">
          <LocationIcon size={17}/>{geoState === "loading" ? t["search.locating"] : geoState === "ok" ? t["search.locationUsed"] : t["search.useLocation"]}
        </button>
        {geoState === "ok" && <span role="status" aria-live="polite" className="text-[.78rem] font-bold text-slate-500">{t["search.locationPrivacy"]}</span>}
        {geoState === "error" && <span role="status" aria-live="polite" className="text-[.78rem] font-bold text-amber-700">{t["search.locationUnavailable"]}</span>}
      </div>
    </form>
  );
}
