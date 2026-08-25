"use client";

import { useEffect, useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const [isPending, startTransition] = useTransition();
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => {
        await setLocale(nextLocale);
        window.location.reload();
      })}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-blue-50 transition hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-60"
      aria-label={ariaLabel}
      disabled={isPending}
    >
      {isPending ? "…" : label}
    </button>
  );
}
