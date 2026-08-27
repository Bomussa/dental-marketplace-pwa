"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchOffer, Treatment, TreatmentVariant } from "@/lib/models";
import { Button } from "@/components/ui";
import { CalendarIcon, LocationIcon, SearchIcon, SlidersIcon, ToothIcon } from "@/components/icons";
import { trackChoice } from "@/lib/choice-events.client";
import { getDictionary, type Locale } from "@/lib/i18n";

type WhenPreference = "earliest" | "today" | "tomorrow";
type SearchSort = "balanced" | "price" | "distance" | "rating" | "soonest";
type PractitionerGender = "" | "female" | "male";

type PreviewState = "idle" | "loading" | "ready" | "error";

export const FEATURED_TREATMENT_CODES = [
  "whitening",
  "root_canal",
  "composite_filling",
  "tooth_extraction",
  "scaling",
] as const;

export function getFeaturedTreatments(treatments: Treatment[]) {
  const treatmentsByCode = new Map(treatments.map((treatment) => [treatment.code, treatment]));
  const featured = FEATURED_TREATMENT_CODES
    .map((code) => treatmentsByCode.get(code))
    .filter((treatment): treatment is Treatment => Boolean(treatment));

  return featured.length > 0 ? featured : treatments.slice(0, 5);
}

type SearchPreview = {
  offers: SearchOffer[];
  count: number;
};

function searchHref({ variant, when, radius, sort, practitionerGender, lat, lng }: { variant: string; when: WhenPreference; radius: number; sort: SearchSort; practitionerGender: PractitionerGender; lat: string; lng: string }) {
  const query = new URLSearchParams({ variant, when, radius: String(radius), sort, practitioner_gender: practitionerGender, lat, lng });
  return `/results?${query.toString()}`;
}

function formatPrice(offer: SearchOffer, locale: Locale) {
  if (offer.min_minor == null) return locale === "ar" ? "راجع السعر" : "View price";
  const amount = new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en-QA", { maximumFractionDigits: 0 }).format(offer.min_minor / 100);
  if (offer.price_type === "range" && offer.max_minor != null) {
    const maximum = new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en-QA", { maximumFractionDigits: 0 }).format(offer.max_minor / 100);
    return `${amount}–${maximum} ${offer.currency}`;
  }
  return `${offer.price_type === "from" ? (locale === "ar" ? "من " : "From ") : ""}${amount} ${offer.currency}`;
}

function formatDistance(offer: SearchOffer, locale: Locale) {
  if (offer.distance_km == null) return null;
  const distance = new Intl.NumberFormat(locale === "ar" ? "ar-QA" : "en-QA", { maximumFractionDigits: 1 }).format(offer.distance_km);
  return locale === "ar" ? `${distance} كم` : `${distance} km`;
}

function formatAvailability(offer: SearchOffer, locale: Locale) {
  if (!offer.earliest_slot_at) return null;
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Qatar" }).format(new Date(offer.earliest_slot_at));
  return locale === "ar" ? `أقرب موعد ${date}` : `Earliest ${date}`;
}

export function SearchForm({ treatments, variants, locale }: { treatments: Treatment[]; variants: TreatmentVariant[]; locale: Locale }) {
  const t = getDictionary(locale);
  const featuredTreatments = getFeaturedTreatments(treatments);
  const [treatmentId, setTreatmentId] = useState(featuredTreatments[0]?.id ?? treatments[0]?.id ?? "");
  const [variantId, setVariantId] = useState("");
  const [when, setWhen] = useState<WhenPreference>("earliest");
  const [radius, setRadius] = useState<1 | 5 | 10 | 25 | 50>(10);
  const [sort, setSort] = useState<SearchSort>("balanced");
  const [practitionerGender, setPractitionerGender] = useState<PractitionerGender>("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [preview, setPreview] = useState<SearchPreview>({ offers: [], count: 0 });
  const availableVariants = useMemo(() => variants.filter((variant) => variant.catalog_id === treatmentId), [variants, treatmentId]);
  const effectiveVariant = variantId || availableVariants[0]?.id || "";
  const resultHref = effectiveVariant ? searchHref({ variant: effectiveVariant, when, radius, sort, practitionerGender, lat, lng }) : "/#start-compare";
  const selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId);
  const selectedVariant = availableVariants.find((variant) => variant.id === effectiveVariant);
  const isArabic = locale === "ar";

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
      (position) => {
        setLat(position.coords.latitude.toFixed(3));
        setLng(position.coords.longitude.toFixed(3));
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
      choice_value: { when, sort, practitioner_gender: practitionerGender || null, radius_km: radius, location_used: Boolean(lat && lng) },
    });
  }

  useEffect(() => {
    if (!effectiveVariant) return;

    const controller = new AbortController();
    const requestHref = `/api/search?${new URLSearchParams({ variant: effectiveVariant, when, radius: String(radius), sort, practitioner_gender: practitionerGender, lat, lng }).toString()}`;
    fetch(requestHref, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("search_unavailable");
        return response.json() as Promise<SearchPreview>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setPreview({ offers: data.offers ?? [], count: data.count ?? 0 });
        setPreviewState("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setPreview({ offers: [], count: 0 });
        setPreviewState("error");
      });

    return () => controller.abort();
  }, [effectiveVariant, when, radius, sort, practitionerGender, lat, lng]);

  const visiblePreview = effectiveVariant ? preview : { offers: [], count: 0 };
  const visiblePreviewState: PreviewState = effectiveVariant ? previewState : "idle";
  const featuredOffer = visiblePreview.offers[0];
  const treatmentName = selectedTreatment ? (isArabic ? selectedTreatment.name_ar : selectedTreatment.name_en) : "";
  const variantName = selectedVariant ? (isArabic ? selectedVariant.name_ar : selectedVariant.name_en) : "";

  return (
    <form action="/results" onSubmit={submitSearch} className="reference-search" aria-label={t["search.aria"]}>
      {featuredOffer && (
        <article className="reference-match-card" aria-labelledby="reference-match-title">
          <div className="reference-match-card__glow" aria-hidden="true" />
          <div className="reference-match-card__copy">
            <p>{isArabic ? "أفضل عرض متاح وفق بحثك" : "Best available offer for your search"}</p>
            <h2 id="reference-match-title">{featuredOffer.clinic_name}</h2>
            <span>{variantName || treatmentName}</span>
            <div className="reference-match-card__facts">
              {formatDistance(featuredOffer, locale) && <span>{formatDistance(featuredOffer, locale)}</span>}
              {formatAvailability(featuredOffer, locale) && <span>{formatAvailability(featuredOffer, locale)}</span>}
              {featuredOffer.rating_avg != null && <span>{isArabic ? `تقييم ${featuredOffer.rating_avg}` : `Rating ${featuredOffer.rating_avg}`}</span>}
            </div>
            <a href={resultHref} className="reference-match-card__cta">{isArabic ? "راجع العرض والحجز" : "Review offer & book"}<span aria-hidden="true">←</span></a>
          </div>
          <div className="reference-match-card__seal" aria-label={featuredOffer.open_now ? (isArabic ? "العيادة مفتوحة الآن" : "Clinic open now") : (isArabic ? "عرض متاح" : "Offer available")}>
            <ToothIcon size={28} />
            <strong>{featuredOffer.open_now ? (isArabic ? "متاح" : "Open") : (isArabic ? "عرض" : "Offer")}</strong>
          </div>
        </article>
      )}
      {!featuredOffer && (
        <article className="reference-match-card reference-match-card--empty" aria-labelledby="reference-match-empty-title">
          <div className="reference-match-card__glow" aria-hidden="true" />
          <div className="reference-match-card__copy">
            <p>{isArabic ? "مطابقة تعتمد على بيانات العيادات الفعلية" : "Matching based on real clinic data"}</p>
            <h2 id="reference-match-empty-title">{isArabic ? "ابدأ مقارنة علاجك بثقة" : "Start your treatment comparison with confidence"}</h2>
            <span>{variantName || treatmentName || (isArabic ? "اختر نوع العلاج لعرض الخيارات المتاحة" : "Choose a treatment type to see available options")}</span>
            <a href={resultHref} className="reference-match-card__cta">{isArabic ? "استكشف الخيارات المتاحة" : "Explore available options"}<span aria-hidden="true">←</span></a>
          </div>
          <div className="reference-match-card__seal" aria-label={isArabic ? "ابدأ المقارنة" : "Start comparison"}>
            <ToothIcon size={28} />
            <strong>{isArabic ? "ابحث" : "Search"}</strong>
          </div>
        </article>
      )}

      <div className="reference-search__query">
        <label className="reference-search__treatment">
          <span className="sr-only">{t["search.treatment"]}</span>
          <ToothIcon size={21} aria-hidden="true" />
          <select name="treatment" value={treatmentId} onChange={(event) => selectTreatment(event.target.value)} required>
            {treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{isArabic ? treatment.name_ar : treatment.name_en}</option>)}
          </select>
          <SearchIcon size={20} aria-hidden="true" />
        </label>
      </div>

      <div className="reference-search__filters" aria-label={isArabic ? "تصفية المقارنة" : "Comparison filters"}>
        <label className="reference-filter"><span className="sr-only">{t["search.appointment"]}</span><CalendarIcon size={16} /><select name="when" value={when} onChange={(event) => { const next = event.target.value as WhenPreference; setWhen(next); trackChoice({ event_name: "appointment_preference_selected", treatment_id: treatmentId || undefined, variant_id: effectiveVariant || undefined, choice_value: { when: next } }); }}><option value="earliest">{t["search.earliest"]}</option><option value="today">{t["search.today"]}</option><option value="tomorrow">{t["search.tomorrow"]}</option></select></label>
        <label className="reference-filter"><span className="sr-only">{t["search.sort"]}</span><SlidersIcon size={16} /><select name="sort" value={sort} onChange={(event) => setSort(event.target.value as SearchSort)}><option value="balanced">{t["search.sort.balanced"]}</option><option value="price">{t["search.sort.price"]}</option><option value="distance">{t["search.sort.distance"]}</option><option value="rating">{t["search.sort.rating"]}</option><option value="soonest">{t["search.sort.soonest"]}</option></select></label>
        <label className="reference-filter"><span className="sr-only">{t["search.practitionerGender"]}</span><ToothIcon size={16} /><select name="practitioner_gender" value={practitionerGender} onChange={(event) => setPractitionerGender(event.target.value as PractitionerGender)}><option value="">{t["search.anyPractitioner"]}</option><option value="female">{t["search.femalePractitioner"]}</option><option value="male">{t["search.malePractitioner"]}</option></select></label>
        <label className="reference-filter"><span className="sr-only">{t["search.radius"]}</span><LocationIcon size={16} /><select name="radius" value={radius} onChange={(event) => setRadius(Number(event.target.value) as 1 | 5 | 10 | 25 | 50)}>{[1, 5, 10, 25, 50].map((value) => <option key={value} value={value}>{value} {t["search.kilometres"]}</option>)}</select></label>
        <label className="reference-filter reference-filter--variant"><span className="sr-only">{t["search.variant"]}</span><SearchIcon size={16} /><select name="variant" value={effectiveVariant} onChange={(event) => { const next = event.target.value; setVariantId(next); trackChoice({ event_name: "variant_selected", treatment_id: treatmentId || undefined, variant_id: next }); }} required>{availableVariants.map((variant) => <option key={variant.id} value={variant.id}>{isArabic ? variant.name_ar : variant.name_en}</option>)}</select></label>
      </div>

      <fieldset className="reference-treatment-rail" aria-label={t["home.featuredTreatments"]}>
        <legend className="reference-section-title"><span>{t["home.featuredTreatments"]}</span><small>{t["home.featuredTreatmentsNote"]}</small></legend>
        <div className="reference-treatment-rail__items">
          {featuredTreatments.map((treatment) => {
            const selected = treatment.id === treatmentId;
            const treatmentLabel = isArabic ? treatment.name_ar : treatment.name_en;
            return <button key={treatment.id} type="button" className={`reference-treatment ${selected ? "reference-treatment--active" : ""}`} aria-pressed={selected} onClick={() => selectTreatment(treatment.id)}><span><ToothIcon size={23} /></span><b>{treatmentLabel}</b></button>;
          })}
        </div>
      </fieldset>

      <div className="reference-search__actions">
        <Button type="submit" disabled={!effectiveVariant} className="reference-primary-action"><SearchIcon size={19}/><span>{t["search.results"]}</span></Button>
        <button type="button" onClick={locate} className="reference-location-action"><LocationIcon size={17}/>{geoState === "loading" ? t["search.locating"] : geoState === "ok" ? t["search.locationUsed"] : t["search.useLocation"]}</button>
      </div>
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      {geoState === "ok" && <span role="status" aria-live="polite" className="reference-search__status">{t["search.locationPrivacy"]}</span>}
      {geoState === "error" && <span role="status" aria-live="polite" className="reference-search__status reference-search__status--warning">{t["search.locationUnavailable"]}</span>}

      <section className="reference-offers" aria-live="polite" aria-busy={visiblePreviewState === "loading"}>
        <div className="reference-section-title"><span>{isArabic ? "أقرب النتائج إليك" : "Closest results for you"}</span>{visiblePreviewState === "ready" && <small>{visiblePreview.count}</small>}</div>
        {visiblePreviewState === "loading" && <div className="reference-offers__loading"><span /><span /><span /></div>}
        {visiblePreviewState === "ready" && visiblePreview.offers.length > 0 && (
          <div className="reference-offers__list">
            {visiblePreview.offers.slice(0, 3).map((offer) => <a key={offer.offer_id} href={resultHref} className="reference-offer-row"><span className="reference-offer-row__mark" aria-hidden="true">{offer.clinic_name.trim().slice(0, 1)}</span><span className="reference-offer-row__copy"><strong>{offer.clinic_name}</strong><small>{[formatDistance(offer, locale), offer.rating_avg != null ? (isArabic ? `تقييم ${offer.rating_avg}` : `Rating ${offer.rating_avg}`) : null].filter(Boolean).join(" · ") || offer.branch_name}</small></span><span className="reference-offer-row__price">{formatPrice(offer, locale)}</span></a>)}
          </div>
        )}
        {visiblePreviewState === "ready" && visiblePreview.offers.length === 0 && <p className="reference-offers__empty">{isArabic ? "لا توجد عروض مطابقة الآن. غيّر العلاج أو الموعد لمتابعة المقارنة." : "No matching offers are available now. Change treatment or timing to continue."}</p>}
        {visiblePreviewState === "error" && <p className="reference-offers__empty">{isArabic ? "تعذر تحديث العروض الآن. يمكنك متابعة المقارنة من زر النتائج." : "Offers could not be refreshed. You can continue from the results button."}</p>}
      </section>
    </form>
  );
}
