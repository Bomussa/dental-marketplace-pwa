"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => {
        await setLocale(nextLocale);
        router.refresh();
      })}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-slate-600 transition hover:bg-white/80 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60"
      aria-label={ariaLabel}
      disabled={isPending}
    >
      {isPending ? "…" : label}
    </button>
  );
}
