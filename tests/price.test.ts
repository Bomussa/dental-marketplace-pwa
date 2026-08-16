import { describe, expect, it } from "vitest";
import { formatQarMinor, priceLabel } from "@/lib/price";

describe("price helpers", () => {
  it("converts minor units without float storage assumptions", () => {
    expect(formatQarMinor(35000, "en-QA")).toContain("350");
  });
  it("labels ranges", () => {
    const label = priceLabel("range", 35000, 50000, "en");
    expect(label).toContain("350");
    expect(label).toContain("500");
  });
  it("labels consultation pricing without inventing a number", () => {
    expect(priceLabel("consultation_required", null, null)).toBe("السعر بعد الاستشارة");
    expect(priceLabel("consultation_required", null, null, "en")).toBe("Price after consultation");
  });
  it("localizes price prefixes for English results", () => {
    expect(priceLabel("from", 35000, null, "en")).toMatch(/^From /);
    expect(priceLabel("package", 35000, null, "en")).toMatch(/^Package /);
  });
});
