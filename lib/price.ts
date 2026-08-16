import { translate, type Locale } from "@/lib/i18n";

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
  locale: Locale = "ar",
) {
  const numberLocale = locale === "ar" ? "ar-QA" : "en-QA";
  const min = formatQarMinor(minMinor, numberLocale);
  const max = formatQarMinor(maxMinor, numberLocale);
  switch (priceType) {
    case "fixed": return min ?? "—";
    case "from": return translate(locale, "price.from").replace("{price}", min ?? "—");
    case "range": return min && max ? `${min} – ${max}` : "—";
    case "package": return translate(locale, "price.package").replace("{price}", `${min ?? "—"}${max && max !== min ? ` – ${max}` : ""}`);
    case "consultation_required": return translate(locale, "price.consultationRequired");
    default: return min ?? "—";
  }
}
