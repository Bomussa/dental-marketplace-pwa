import { describe, expect, it } from "vitest";
import { operationFailureCode, operationFailureUrl } from "@/lib/operation-feedback";

describe("operation feedback", () => {
  it("maps database authorization failures without exposing raw codes to the URL", () => {
    expect(operationFailureCode(new Error("42501"))).toBe("forbidden");
    expect(operationFailureUrl("clinic", "createOffer", "forbidden")).toBe("/operation-error?area=clinic&action=createOffer&code=forbidden");
  });

  it("maps uniqueness, exclusion, stale-state, and controlled business conflicts", () => {
    expect(operationFailureCode(new Error("23505"))).toBe("conflict");
    expect(operationFailureCode(new Error("23P01"))).toBe("conflict");
    expect(operationFailureCode(new Error("55000"))).toBe("conflict");
    expect(operationFailureCode(new Error("P0001"))).toBe("conflict");
  });

  it("uses a generic unavailable state for unknown internal failures", () => {
    expect(operationFailureCode(new Error("SENSITIVE_INTERNAL_CODE"))).toBe("unavailable");
  });
});
