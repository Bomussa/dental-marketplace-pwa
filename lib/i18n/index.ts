import ar, { type TranslationKey } from "./ar";
import en from "./en";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

const dictionaries = { ar, en } as const;

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function getLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : "ar";
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export type { TranslationKey };
