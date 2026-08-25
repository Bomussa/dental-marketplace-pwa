"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <form method="post" action="/api/locale" className="inline-flex">
      <input type="hidden" name="locale" value={nextLocale} />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-blue-50 transition hover:bg-white/12 hover:text-white"
        aria-label={ariaLabel}
      >
        {label}
      </button>
    </form>
  );
}
