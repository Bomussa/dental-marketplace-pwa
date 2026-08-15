"use client";

import { useTranslation } from "@/components/locale-provider";
import { themes, useTheme, type Theme } from "@/components/theme-provider";

const themeKey: Record<Theme, "theme.patient" | "theme.clinic" | "theme.admin"> = {
  patient: "theme.patient",
  clinic: "theme.clinic",
  admin: "theme.admin",
};

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme, useContextTheme } = useTheme();

  return (
    <details className="theme-menu relative">
      <summary
        className="theme-menu-trigger inline-flex min-h-10 list-none items-center gap-2 rounded-full px-3 text-xs font-extrabold text-[var(--nav-ink)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus-ring)]"
        aria-label={t("theme.ariaLabel")}
      >
        <span className="theme-swatch" aria-hidden="true" />
        <span className="hidden lg:inline">{t("theme.label")}</span>
      </summary>
      <div className="theme-menu-panel absolute end-0 top-[calc(100%+0.5rem)] z-50 w-52 rounded-2xl border border-[var(--line)] bg-[var(--surface-solid)] p-2 shadow-[var(--menu-shadow)] backdrop-blur-xl">
        <div className="px-2 pb-1 pt-0.5 text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{t("theme.label")}</div>
        <div className="grid gap-1" role="group" aria-label={t("theme.ariaLabel")}>
          {themes.map((option) => (
            <button
              key={option}
              type="button"
              className={`theme-menu-option ${theme === option ? "theme-menu-option-active" : ""}`}
              onClick={() => setTheme(option)}
              aria-pressed={theme === option}
            >
              <span className={`theme-swatch theme-swatch-${option}`} aria-hidden="true" />
              <span>{t(themeKey[option])}</span>
            </button>
          ))}
          <button type="button" className="theme-menu-option mt-1 border-t border-[var(--line)] pt-2" onClick={useContextTheme}>
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[10px]" aria-hidden="true">A</span>
            <span>{t("theme.auto")}</span>
          </button>
        </div>
      </div>
    </details>
  );
}
