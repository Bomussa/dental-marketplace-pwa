import type { Locale } from "@/lib/i18n";
import { PRICE_SCOPE_KEYS, parsePriceScope, type PriceScopeKey, type PriceScopeStatus } from "@/lib/price-scope";

const copy = {
  ar: {
    title: "نطاق السعر المؤكد من العيادة",
    registration: "التسجيل", examination: "الفحص", xray: "الأشعة", diagnostics: "تحاليل/تشخيص", anesthesia: "التخدير", laboratory: "المختبر", medications: "الدواء",
    included: "مشمول", excluded: "غير مشمول", assessment_required: "بعد التقييم", not_applicable: "لا ينطبق",
    includedItems: "تفاصيل مشمولة", excludedItems: "تفاصيل غير مشمولة", visits: "زيارات مشمولة", followUp: "المتابعة", noExtra: "لا توجد بنود إضافية معلنة.",
  },
  en: {
    title: "Clinic-confirmed price scope",
    registration: "Registration", examination: "Examination", xray: "X-rays", diagnostics: "Diagnostics/tests", anesthesia: "Anaesthesia", laboratory: "Laboratory", medications: "Medication",
    included: "Included", excluded: "Not included", assessment_required: "After assessment", not_applicable: "Not applicable",
    includedItems: "Additional inclusions", excludedItems: "Additional exclusions", visits: "Included visits", followUp: "Follow-up", noExtra: "No additional items declared.",
  },
} as const;

type ScopeOffer = { price_scope: unknown; included_items: unknown; excluded_items: unknown; visit_count: number | null; follow_up_terms: string | null };

function stringItems(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function statusClass(status: PriceScopeStatus) {
  return status === "included" ? "price-scope-status--included" : status === "excluded" ? "price-scope-status--excluded" : status === "assessment_required" ? "price-scope-status--assessment" : "price-scope-status--na";
}

export function PriceScopeSummary({ offer, locale }: { offer: ScopeOffer; locale: Locale }) {
  const scope = parsePriceScope(offer.price_scope);
  if (!scope) return null;
  const labels = copy[locale];
  const inclusions = stringItems(offer.included_items);
  const exclusions = stringItems(offer.excluded_items);
  return <section className="price-scope-summary" aria-label={labels.title}>
    <h3 className="price-scope-summary__title">{labels.title}</h3>
    <div className="price-scope-summary__grid">{PRICE_SCOPE_KEYS.map((key) => <div key={key} className={`price-scope-status ${statusClass(scope[key])}`}><span>{labels[key as PriceScopeKey]}</span><strong>{labels[scope[key]]}</strong></div>)}</div>
    {(inclusions.length > 0 || exclusions.length > 0 || offer.visit_count || offer.follow_up_terms) && <div className="price-scope-summary__details">
      {inclusions.length > 0 && <div><span>{labels.includedItems}</span><p>{inclusions.join(" · ")}</p></div>}
      {exclusions.length > 0 && <div><span>{labels.excludedItems}</span><p>{exclusions.join(" · ")}</p></div>}
      {offer.visit_count && <div><span>{labels.visits}</span><p>{offer.visit_count}</p></div>}
      {offer.follow_up_terms && <div><span>{labels.followUp}</span><p>{offer.follow_up_terms}</p></div>}
    </div>}
  </section>;
}
