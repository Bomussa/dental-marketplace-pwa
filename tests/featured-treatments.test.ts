import { describe, expect, it } from "vitest";
import { FEATURED_TREATMENT_CODES, getFeaturedTreatments } from "@/components/search-form";
import type { Treatment } from "@/lib/models";

function treatment(code: string): Treatment {
  return {
    id: `${code}-id`,
    code,
    category: "test",
    name_ar: `${code} ar`,
    name_en: `${code} en`,
  };
}

describe("featured treatments", () => {
  it("uses the curated clinical ranking when all featured catalog entries are available", () => {
    const catalog = [treatment("xray_bitewing"), ...FEATURED_TREATMENT_CODES.map(treatment), treatment("implant")];

    expect(getFeaturedTreatments(catalog).map((item) => item.code)).toEqual(FEATURED_TREATMENT_CODES);
  });

  it("falls back to the first five active catalog entries when no curated entry is available", () => {
    const catalog = ["first", "second", "third", "fourth", "fifth", "sixth"].map(treatment);

    expect(getFeaturedTreatments(catalog).map((item) => item.code)).toEqual(["first", "second", "third", "fourth", "fifth"]);
  });
});
