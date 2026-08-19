import { describe, expect, it } from "vitest";
import { activityReportSchema, adminOfferUpdateSchema, adminSlotUpdateSchema, bookingSchema, choiceEventSchema, clinicOperatorAccountSchema, deviceInstallationSchema, featureFlagUpdateSchema, notificationTemplateSchema, offerSchema, passwordLoginSchema, patientBookingRegistrationSchema, patientPhoneVerificationConfirmSchema, patientProfileSchema, searchSchema, supportKnowledgeArticleSchema, supportMessageSchema, treatmentCatalogSchema, treatmentVariantSchema } from "@/lib/validation";

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

  it("accepts only explicit comparison sorting criteria", () => {
    const base = { variant: "11111111-1111-4111-8111-111111111111", radius: "10" };
    expect(searchSchema.safeParse({ ...base, sort: "distance" }).success).toBe(true);
    expect(searchSchema.safeParse({ ...base, sort: "rating" }).success).toBe(true);
    expect(searchSchema.safeParse({ ...base, sort: "invented" }).success).toBe(false);
  });

  it("requires max price for range", () => {
    expect(offerSchema.safeParse({ branch_id:"11111111-1111-4111-8111-111111111111", variant_id:"22222222-2222-4222-8222-222222222222", price_type:"range", min_qar:"200", duration_minutes:"30" }).success).toBe(false);
  });

  it("requires a patient profile and a sufficiently long idempotency key for booking", () => {
    const request = { offer_id:"11111111-1111-4111-8111-111111111111", slot_id:"22222222-2222-4222-8222-222222222222", patient_profile_id:"33333333-3333-4333-8333-333333333333", idempotency_key:"booking-key-123" };
    expect(bookingSchema.safeParse(request).success).toBe(true);
    expect(bookingSchema.safeParse({ ...request, patient_profile_id: undefined }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...request, idempotency_key:"abc" }).success).toBe(false);
  });

  it("requires a complete patient profile and normalizes national ID and phone before persistence", () => {
    const parsed = patientProfileSchema.safeParse({ display_name: "ريتال", relationship: "child", national_id: "٢٨٤ ١٢٣٤-٥٦٧٨", nationality: "qa", date_of_birth: "2018-04-15", phone: "00974 5512 3456" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.national_id).toBe("28412345678");
      expect(parsed.data.nationality).toBe("QA");
      expect(parsed.data.phone).toBe("+97455123456");
    }
    expect(patientProfileSchema.safeParse({ display_name: "", relationship: "child", national_id: "28412345678", nationality: "QA", date_of_birth: "2018-04-15", phone: "+97455123456" }).success).toBe(false);
    expect(patientProfileSchema.safeParse({ display_name: "شخص", relationship: "unknown", national_id: "28412345678", nationality: "QA", date_of_birth: "2018-04-15", phone: "+97455123456" }).success).toBe(false);
    expect(patientProfileSchema.safeParse({ display_name: "شخص", relationship: "self", national_id: "2841234567", nationality: "QAT", date_of_birth: "2999-01-01", phone: "55123456" }).success).toBe(false);
    expect(patientPhoneVerificationConfirmSchema.safeParse({ patient_profile_id: "77777777-7777-4777-8777-777777777777", code: "123456" }).success).toBe(true);
    expect(patientPhoneVerificationConfirmSchema.safeParse({ patient_profile_id: "77777777-7777-4777-8777-777777777777", code: "12ab56" }).success).toBe(false);
    expect(deviceInstallationSchema.safeParse({ installation_id: "77777777-7777-4777-8777-777777777777", device_class: "mobile", platform: "iOS" }).success).toBe(true);
    expect(deviceInstallationSchema.safeParse({ installation_id: "77777777-7777-4777-8777-777777777777", device_class: "watch" }).success).toBe(false);
  });

  it("requires a secure username-password registration profile before an unauthenticated patient can proceed to phone verification", () => {
    const registration = patientBookingRegistrationSchema.safeParse({
      display_name: "فاطمة أحمد",
      relationship: "self",
      national_id: "28412345678",
      nationality: "qa",
      date_of_birth: "1992-04-15",
      phone: "00974 5512 3456",
      username: "fatima.ahmed",
      email: "fatima@example.test",
      password: "SafePass2026!",
    });
    expect(registration.success).toBe(true);
    if (registration.success) {
      expect(registration.data.username).toBe("fatima.ahmed");
      expect(registration.data.nationality).toBe("QA");
      expect(registration.data.phone).toBe("+97455123456");
    }
    expect(patientBookingRegistrationSchema.safeParse({ display_name: "فاطمة", relationship: "self", national_id: "28412345678", nationality: "QA", date_of_birth: "1992-04-15", phone: "+97455123456", username: "bad user", email: "not-an-email", password: "weakpassword" }).success).toBe(false);
    expect(passwordLoginSchema.safeParse({ username: "Fatima.Ahmed", password: "anything", next: "/results" }).success).toBe(true);
    expect(passwordLoginSchema.safeParse({ username: "a", password: "anything", next: "https://unsafe.example" }).success).toBe(false);
  });

  it("validates activity report windows and supported aggregation safely", () => {
    expect(activityReportSchema.safeParse({ period_start: "2026-08-01", period_end: "2026-08-31", granularity: "hourly" }).success).toBe(true);
    expect(activityReportSchema.safeParse({ period_start: "2026-08-01", period_end: "2026-09-01", granularity: "hourly" }).success).toBe(false);
    expect(activityReportSchema.safeParse({ period_start: "2026-01-01", period_end: "2026-12-31", granularity: "daily" }).success).toBe(true);
    expect(activityReportSchema.safeParse({ period_start: "2026-12-31", period_end: "2026-01-01", granularity: "monthly" }).success).toBe(false);
    expect(activityReportSchema.safeParse({ period_start: "2026-01-01", period_end: "2026-01-31", granularity: "minute" }).success).toBe(false);
  });

  it("requires secure credentials when the owner provisions either clinic operator account", () => {
    expect(clinicOperatorAccountSchema.safeParse({ clinic_id: offerId, username: "clinic.manager1", email: "manager@example.test", password: "ClinicPass2026!" }).success).toBe(true);
    expect(clinicOperatorAccountSchema.safeParse({ clinic_id: offerId, username: "!!", email: "manager@example.test", password: "short" }).success).toBe(false);
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

  it("accepts governed catalog, variant, and feature-flag inputs while rejecting unsafe identifiers", () => {
    expect(treatmentCatalogSchema.safeParse({ code: "dental_consultation", name_ar: "استشارة أسنان", name_en: "Dental consultation", category: "diagnostics", comparison_version: "1", active: "true" }).success).toBe(true);
    expect(treatmentCatalogSchema.safeParse({ code: "Dental Consultation", name_ar: "استشارة", name_en: "Consultation", category: "diagnostics", comparison_version: "0", active: "true" }).success).toBe(false);
    expect(treatmentVariantSchema.safeParse({ catalog_id: treatmentId, variant_key: "initial_consultation", name_ar: "استشارة أولية", name_en: "Initial consultation", attributes_json: "{}", active: "true" }).success).toBe(true);
    expect(treatmentVariantSchema.safeParse({ catalog_id: "not-a-uuid", variant_key: "استشارة", name_ar: "استشارة", name_en: "Consultation", attributes_json: "{}", active: "yes" }).success).toBe(false);
    expect(featureFlagUpdateSchema.safeParse({ key: "assistant.enabled", enabled: "false", config_json: "{\"locale\":\"ar\"}" }).success).toBe(true);
    expect(featureFlagUpdateSchema.safeParse({ key: "مفتاح", enabled: "true", config_json: "{}" }).success).toBe(false);
    expect(adminOfferUpdateSchema.safeParse({ id: offerId, price_type: "fixed", duration_minutes: "30", status: "active" }).success).toBe(true);
    expect(adminOfferUpdateSchema.safeParse({ id: offerId, price_type: "free", duration_minutes: "0", status: "published" }).success).toBe(false);
    expect(adminSlotUpdateSchema.safeParse({ id: slotId, start_at: "2026-08-17T09:00", end_at: "2026-08-17T09:30", status: "published" }).success).toBe(true);
    expect(adminSlotUpdateSchema.safeParse({ id: slotId, start_at: "2026-08-17T09:30", end_at: "2026-08-17T09:00", status: "active" }).success).toBe(false);
  });
});
