"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

function persistLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `asnani_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const [isPending, setIsPending] = useState(false);
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setIsPending(true);
        persistLocale(nextLocale);
        window.location.reload();
      }}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-blue-50 transition hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-60"
      aria-label={ariaLabel}
      disabled={isPending}
    >
      {isPending ? "…" : label}
    </button>
  );
}
