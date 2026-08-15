import { describe, expect, it } from "vitest";
import { bookingSchema, choiceEventSchema, notificationTemplateSchema, offerSchema, searchSchema, supportKnowledgeArticleSchema, supportMessageSchema } from "@/lib/validation";

const eventBase = {
  event_id: "11111111-1111-4111-8111-111111111111",
  session_id: "22222222-2222-4222-8222-222222222222",
  page_path: "/results",
};

const treatmentId = "33333333-3333-4333-8333-333333333333";
const variantId = "44444444-4444-4444-8444-444444444444";
const offerId = "55555555-5555-4555-8555-555555555555";
const slotId = "66666666-6666-4666-8666-666666666666";

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

  it("accepts a complete search event", () => {
    expect(choiceEventSchema.safeParse({
      ...eventBase,
      event_name: "search_submitted",
      treatment_id: treatmentId,
      variant_id: variantId,
      choice_value: { when:"today", radius_km:10, location_used:true },
    }).success).toBe(true);
  });

  it("rejects a search event without a valid appointment preference", () => {
    expect(choiceEventSchema.safeParse({
      ...eventBase,
      event_name: "search_submitted",
      treatment_id: treatmentId,
      variant_id: variantId,
      choice_value: { location_used:true },
    }).success).toBe(false);
  });

  it("rejects a search event without a boolean location signal", () => {
    expect(choiceEventSchema.safeParse({
      ...eventBase,
      event_name: "search_submitted",
      treatment_id: treatmentId,
      variant_id: variantId,
      choice_value: { when:"earliest", location_used:"yes" },
    }).success).toBe(false);
  });

  it("requires offer and slot identifiers for booking events", () => {
    expect(choiceEventSchema.safeParse({ ...eventBase, event_name:"offer_booking_clicked", offer_id:offerId, slot_id:slotId, choice_value:{} }).success).toBe(true);
    expect(choiceEventSchema.safeParse({ ...eventBase, event_name:"offer_booking_clicked", offer_id:offerId, choice_value:{} }).success).toBe(false);
  });

  it("accepts a bounded bilingual support message and rejects oversized input", () => {
    expect(supportMessageSchema.safeParse({ message: "How do I book an appointment?", locale: "en" }).success).toBe(true);
    expect(supportMessageSchema.safeParse({ message: "x".repeat(2001), locale: "ar" }).success).toBe(false);
  });

  it("requires governed formats for knowledge articles and notification templates", () => {
    expect(supportKnowledgeArticleSchema.safeParse({ slug: "booking-basics", locale: "en", title: "Booking basics", body_markdown: "Use the results page to compare appointments.", category: "booking", audience: "public" }).success).toBe(true);
    expect(supportKnowledgeArticleSchema.safeParse({ slug: "عنوان عربي", locale: "ar", title: "الحجز", body_markdown: "نص كافٍ للمقال", category: "booking", audience: "public" }).success).toBe(false);
    expect(notificationTemplateSchema.safeParse({ template_key: "booking_confirmed", channel: "push", locale: "ar", body: "تم تأكيد حجزك" }).success).toBe(true);
    expect(notificationTemplateSchema.safeParse({ template_key: "حجز", channel: "push", locale: "ar", body: "تم تأكيد حجزك" }).success).toBe(false);
  });
});
