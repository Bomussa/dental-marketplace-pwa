import { Input, Select } from "@/components/ui";
import { EMPTY_PRICE_SCOPE, PRICE_SCOPE_KEYS, parsePriceScope } from "@/lib/price-scope";
import type { Locale } from "@/lib/i18n";

const labels = {
  ar: {
    title: "شفافية السعر ونطاق العلاج",
    intro: "حدّد حالة كل بند كما ستلتزم به العيادة. لا يجوز اعتبار الباقة شاملة دون هذا الإفصاح.",
    registration: "التسجيل", examination: "الفحص السريري", xray: "الأشعة", diagnostics: "تحاليل أو تشخيص إضافي", anesthesia: "التخدير", laboratory: "المختبر أو المعمل", medications: "الدواء",
    included: "مشمول في السعر", excluded: "غير مشمول", assessment_required: "يتحدد بعد التقييم", not_applicable: "لا ينطبق على هذا العلاج",
    includedItems: "تفاصيل إضافية مشمولة — بند في كل سطر", excludedItems: "تفاصيل إضافية غير مشمولة — بند في كل سطر", visits: "عدد الزيارات المشمولة", followUp: "شروط المتابعة", notes: "ملاحظات مهمة للمريض",
  },
  en: {
    title: "Price transparency and treatment scope",
    intro: "Set each item exactly as the clinic will honour it. A package cannot be described as comprehensive without this disclosure.",
    registration: "Registration", examination: "Clinical examination", xray: "X-rays", diagnostics: "Additional diagnostics or tests", anesthesia: "Anaesthesia", laboratory: "Laboratory", medications: "Medication",
    included: "Included in the price", excluded: "Not included", assessment_required: "Determined after assessment", not_applicable: "Not applicable to this treatment",
    includedItems: "Additional included details — one per line", excludedItems: "Additional excluded details — one per line", visits: "Included visit count", followUp: "Follow-up terms", notes: "Important patient notes",
  },
} as const;

type ScopeSource = {
  price_scope?: unknown;
  included_items?: unknown;
  excluded_items?: unknown;
  visit_count?: number | null;
  follow_up_terms?: string | null;
  notes?: string | null;
};

function newlineItems(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "";
}

export function PriceScopeFields({ locale, source, compact = false }: { locale: Locale; source?: ScopeSource; compact?: boolean }) {
  const copy = labels[locale];
  const scope = parsePriceScope(source?.price_scope) ?? EMPTY_PRICE_SCOPE;
  return (
    <fieldset className={`price-scope-fields ${compact ? "price-scope-fields--compact" : ""}`}>
      <legend className="price-scope-fields__title">{copy.title}</legend>
      <p className="price-scope-fields__intro">{copy.intro}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PRICE_SCOPE_KEYS.map((key) => <label key={key} className="grid gap-1 text-xs font-extrabold text-slate-600"><span>{copy[key]}</span><Select name={`scope_${key}`} defaultValue={scope[key]} required><option value="included">{copy.included}</option><option value="excluded">{copy.excluded}</option><option value="assessment_required">{copy.assessment_required}</option><option value="not_applicable">{copy.not_applicable}</option></Select></label>)}
      </div>
      {!compact && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.includedItems}<textarea name="included_items" defaultValue={newlineItems(source?.included_items)} className="price-scope-fields__textarea" maxLength={1800} /></label><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.excludedItems}<textarea name="excluded_items" defaultValue={newlineItems(source?.excluded_items)} className="price-scope-fields__textarea" maxLength={1800} /></label><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.visits}<Input name="visit_count" type="number" min="1" max="99" defaultValue={source?.visit_count ?? ""} /></label><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.followUp}<Input name="follow_up_terms" maxLength={1000} defaultValue={source?.follow_up_terms ?? ""} /></label><label className="grid gap-1 text-xs font-extrabold text-slate-600 sm:col-span-2">{copy.notes}<textarea name="notes" defaultValue={source?.notes ?? ""} className="price-scope-fields__textarea" maxLength={1000} /></label></div>}
    </fieldset>
  );
}
