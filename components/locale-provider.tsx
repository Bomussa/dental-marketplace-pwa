"use client";

import { createContext, useContext } from "react";
import { getDictionary, type Locale, type TranslationKey } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const dictionary = getDictionary(locale);
  return (
    <LocaleContext.Provider value={{ locale, t: (key) => dictionary[key] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider is required for useTranslation");
  return context;
}
