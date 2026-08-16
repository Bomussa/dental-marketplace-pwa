import { describe, expect, it } from "vitest";
import { optionalQarInputToMinor, priceInputsToMinor, qarInputToMinor } from "@/lib/money-input";

describe("QAR form input to minor units", () => {
  it("parses decimal text without floating-point arithmetic", () => {
    expect(qarInputToMinor("450")).toBe(45_000);
    expect(qarInputToMinor("450.5")).toBe(45_050);
    expect(qarInputToMinor("450.05")).toBe(45_005);
    expect(qarInputToMinor("0.01")).toBe(1);
    expect(qarInputToMinor("100000.00")).toBe(10_000_000);
  });

  it("rejects precision, format, and range outside supported QAR input", () => {
    for (const value of ["1.001", "100000.01", "-1", "1e3", "01.00", "", "abc"]) {
      expect(() => qarInputToMinor(value)).toThrow("INVALID_MONEY_INPUT");
    }
  });

  it("treats blank optional input as no monetary value", () => {
    expect(optionalQarInputToMinor("")).toBeNull();
    expect(optionalQarInputToMinor(null)).toBeNull();
  });

  it("enforces exact price-type invariants", () => {
    expect(priceInputsToMinor("fixed", "450.50", "999")).toEqual({ minMinor: 45_050, maxMinor: 45_050 });
    expect(priceInputsToMinor("from", "200", "999")).toEqual({ minMinor: 20_000, maxMinor: null });
    expect(priceInputsToMinor("range", "200", "350.25")).toEqual({ minMinor: 20_000, maxMinor: 35_025 });
    expect(priceInputsToMinor("consultation_required", "999", "1000")).toEqual({ minMinor: null, maxMinor: null });
  });

  it("rejects an inverted or incomplete range", () => {
    expect(() => priceInputsToMinor("range", "400", "350")).toThrow("INVALID_MONEY_RANGE");
    expect(() => priceInputsToMinor("range", "400", "")).toThrow("INVALID_MONEY_INPUT");
  });
});
