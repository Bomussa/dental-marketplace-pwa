import { describe, expect, it } from "vitest";
import { bookingSchema, offerSchema, searchSchema } from "@/lib/validation";

describe("validation", () => {
  it("accepts a valid search", () => {
    expect(searchSchema.safeParse({ variant: "11111111-1111-4111-8111-111111111111", radius: "10", lat: "25.28", lng: "51.53" }).success).toBe(true);
  });
  it("rejects future-incompatible bad coordinates", () => {
    expect(searchSchema.safeParse({ variant: "11111111-1111-4111-8111-111111111111", radius: "10", lat: "100", lng: "51.53" }).success).toBe(false);
  });
  it("requires max price for range", () => {
    expect(offerSchema.safeParse({ branch_id:"11111111-1111-4111-8111-111111111111", variant_id:"22222222-2222-4222-8222-222222222222", price_type:"range", min_qar:"200", duration_minutes:"30" }).success).toBe(false);
  });
  it("rejects short idempotency keys", () => {
    expect(bookingSchema.safeParse({ offer_id:"11111111-1111-4111-8111-111111111111", slot_id:"22222222-2222-4222-8222-222222222222", idempotency_key:"abc" }).success).toBe(false);
  });
});
