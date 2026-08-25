"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";
  const errorMessage = locale === "ar" ? "تعذر تغيير اللغة. حاول مرة أخرى." : "Language could not be changed. Please try again.";

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const changeLocale = async () => {
    setIsPending(true);
    setHasError(false);

    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("LOCALE_UPDATE_FAILED");
      window.location.reload();
    } catch {
      setHasError(true);
      setIsPending(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={changeLocale}
        className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-blue-50 transition hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-60"
        aria-label={ariaLabel}
        aria-describedby={hasError ? "locale-toggle-error" : undefined}
        disabled={isPending}
      >
        {isPending ? "…" : label}
      </button>
      {hasError && <p id="locale-toggle-error" role="status" className="absolute end-0 top-full z-20 mt-2 w-56 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-800 shadow-lg">{errorMessage}</p>}
    </div>
  );
}
