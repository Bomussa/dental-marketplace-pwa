"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const router = useRouter();
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  async function changeLocale() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          accept: "application/json",
        },
        body: new URLSearchParams({ locale: nextLocale }),
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("locale_update_failed");
      startTransition(() => router.refresh());
    } catch {
      // Preserve the existing, origin-validated server route as a reliable fallback.
      const form = document.createElement("form");
      form.method = "post";
      form.action = "/api/locale";
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "locale";
      input.value = nextLocale;
      form.append(input);
      document.body.append(form);
      form.submit();
      return;
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={changeLocale}
      disabled={isUpdating}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-black text-blue-50 transition hover:bg-white/12 hover:text-white disabled:cursor-wait disabled:opacity-70"
      aria-label={ariaLabel}
      aria-busy={isUpdating}
    >
      {label}
    </button>
  );
}
