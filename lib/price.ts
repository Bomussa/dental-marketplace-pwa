export function formatQarMinor(value: number | null | undefined, locale = "ar-QA") {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function priceLabel(
  priceType: string,
  minMinor: number | null,
  maxMinor: number | null,
  locale = "ar-QA",
) {
  const min = formatQarMinor(minMinor, locale);
  const max = formatQarMinor(maxMinor, locale);
  switch (priceType) {
    case "fixed": return min ?? "—";
    case "from": return `يبدأ من ${min ?? "—"}`;
    case "range": return min && max ? `${min} – ${max}` : "—";
    case "package": return `باقة ${min ?? "—"}${max && max !== min ? ` – ${max}` : ""}`;
    case "consultation_required": return "السعر بعد الاستشارة";
    default: return min ?? "—";
  }
}
