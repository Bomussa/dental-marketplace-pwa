"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export const themes = ["patient", "clinic", "admin"] as const;
export type Theme = (typeof themes)[number];

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  useContextTheme: () => void;
};

const storageKey = "asnani_theme";
const preferenceChangeEvent = "asnani-theme-preference-change";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value !== null && themes.includes(value as Theme);
}

function themeForPath(pathname: string): Theme {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/clinic" || pathname.startsWith("/clinic/")) return "clinic";
  return "patient";
}

function subscribeToThemePreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(preferenceChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(preferenceChangeEvent, onStoreChange);
  };
}

function getThemePreference() {
  return window.localStorage.getItem(storageKey);
}

function announceThemePreferenceChange() {
  window.dispatchEvent(new Event(preferenceChangeEvent));
}

const themeColors: Record<Theme, string> = {
  patient: "#066CCF",
  clinic: "#087B61",
  admin: "#6D45CF",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const preference = useSyncExternalStore(subscribeToThemePreference, getThemePreference, () => null);
  const theme = isTheme(preference) ? preference : themeForPath(pathname);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[theme]);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(storageKey, nextTheme);
    announceThemePreferenceChange();
  }, []);

  const useContextTheme = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    announceThemePreferenceChange();
  }, []);

  const value = useMemo(() => ({ theme, setTheme, useContextTheme }), [setTheme, theme, useContextTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
