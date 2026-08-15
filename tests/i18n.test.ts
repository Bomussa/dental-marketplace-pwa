import { describe, expect, it } from "vitest";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";
import { getDirection, getLocale, locales, translate } from "@/lib/i18n";

describe("i18n dictionaries", () => {
  it("keeps Arabic and English keys identical", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
  });

  it("contains non-empty translations for every supported locale", () => {
    for (const locale of locales) {
      for (const key of Object.keys(ar) as Array<keyof typeof ar>) {
        expect(translate(locale, key).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("defaults invalid language state to Arabic and applies the correct document direction", () => {
    expect(getLocale(undefined)).toBe("ar");
    expect(getLocale("invalid")).toBe("ar");
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
  });
});
