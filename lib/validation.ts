import { z } from "zod";

export const uuid = z.string().uuid();

const coordinate = z.coerce.number().finite();

export const searchSchema = z.object({
  variant: uuid,
  lat: z.union([z.literal(""), coordinate.min(-90).max(90)]).optional(),
  lng: z.union([z.literal(""), coordinate.min(-180).max(180)]).optional(),
  radius: z.coerce.number().min(1).max(50).default(10),
});

export const bookingSchema = z.object({
  offer_id: uuid,
  slot_id: uuid,
  patient_profile_id: uuid,
  idempotency_key: z.string().min(8).max(128),
});

export const choiceEventNameSchema = z.enum([
  "treatment_selected",
  "variant_selected",
  "appointment_preference_selected",
  "location_requested",
  "location_acquired",
  "location_denied",
  "search_submitted",
  "offer_booking_clicked",
  "booking_login_required",
  "booking_succeeded",
  "booking_failed",
]);

const choiceScalar = z.union([z.string().max(220), z.number().finite(), z.boolean(), z.null()]);
const appointmentPreference = new Set(["earliest", "today", "tomorrow"]);

export const choiceEventSchema = z.object({
  event_id: uuid,
  session_id: uuid,
  event_name: choiceEventNameSchema,
  page_path: z.string().startsWith("/").max(300),
  treatment_id: uuid.optional(),
  variant_id: uuid.optional(),
  offer_id: uuid.optional(),
  slot_id: uuid.optional(),
  choice_value: z.record(z.string().max(80), choiceScalar).default({}),
}).superRefine((value, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

  if (value.event_name === "treatment_selected" && !value.treatment_id) issue("treatment_id", "treatment_id is required");

  if (value.event_name === "variant_selected" && (!value.treatment_id || !value.variant_id)) {
    if (!value.treatment_id) issue("treatment_id", "treatment_id is required");
    if (!value.variant_id) issue("variant_id", "variant_id is required");
  }

  if (value.event_name === "appointment_preference_selected" || value.event_name === "search_submitted") {
    if (!value.treatment_id) issue("treatment_id", "treatment_id is required");
    if (!value.variant_id) issue("variant_id", "variant_id is required");
    if (typeof value.choice_value.when !== "string" || !appointmentPreference.has(value.choice_value.when)) {
      issue("choice_value", "valid appointment preference is required");
    }
  }

  if (value.event_name === "search_submitted" && typeof value.choice_value.location_used !== "boolean") {
    issue("choice_value", "location_used boolean is required");
  }

  if (["offer_booking_clicked", "booking_login_required", "booking_succeeded", "booking_failed"].includes(value.event_name)) {
    if (!value.offer_id) issue("offer_id", "offer_id is required");
    if (!value.slot_id) issue("slot_id", "slot_id is required");
  }
});

export const clinicApplicationSchema = z.object({
  legal_name: z.string().trim().min(2).max(180),
  display_name: z.string().trim().min(2).max(120),
});

export const branchSchema = z.object({
  clinic_id: uuid,
  name: z.string().trim().min(2).max(120),
  area: z.string().trim().max(120).optional().default(""),
  address_line: z.string().trim().max(240).optional().default(""),
  lat: z.union([z.literal(""), coordinate.min(-90).max(90)]).optional(),
  lng: z.union([z.literal(""), coordinate.min(-180).max(180)]).optional(),
});

export const offerSchema = z.object({
  branch_id: uuid,
  variant_id: uuid,
  price_type: z.enum(["fixed", "from", "range", "package", "consultation_required"]),
  min_qar: z.coerce.number().min(0).max(100000).optional(),
  max_qar: z.coerce.number().min(0).max(100000).optional(),
  duration_minutes: z.coerce.number().int().min(5).max(480),
}).superRefine((value, ctx) => {
  if (value.price_type !== "consultation_required" && value.min_qar === undefined) {
    ctx.addIssue({ code: "custom", path: ["min_qar"], message: "السعر الأدنى مطلوب" });
  }
  if (value.price_type === "range" && value.max_qar === undefined) {
    ctx.addIssue({ code: "custom", path: ["max_qar"], message: "السعر الأعلى مطلوب" });
  }
  if (value.min_qar !== undefined && value.max_qar !== undefined && value.max_qar < value.min_qar) {
    ctx.addIssue({ code: "custom", path: ["max_qar"], message: "السعر الأعلى يجب ألا يقل عن الأدنى" });
  }
});

export const slotSchema = z.object({
  branch_id: uuid,
  variant_id: uuid,
  start_at: z.string().min(16).max(40),
  end_at: z.string().min(16).max(40),
}).refine((v) => new Date(normalizeQatarDateTime(v.end_at)) > new Date(normalizeQatarDateTime(v.start_at)), {
  path: ["end_at"],
  message: "وقت النهاية يجب أن يكون بعد البداية",
});

export const verificationSchema = z.object({
  subject_type: z.enum(["clinic", "branch", "practitioner"]),
  subject_id: uuid,
  source: z.string().trim().min(2).max(120),
  identifier: z.string().trim().max(180).optional().default(""),
});

export const featureFlagSchema = z.object({
  key: z.enum(["payments", "promotions", "instant_slots", "verified_reviews"]),
  enabled: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export function normalizeQatarDateTime(value: string) {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return `${value}:00+03:00`;
  return `${value}+03:00`;
}

export const practitionerSchema = z.object({
  clinic_id: uuid,
  display_name: z.string().trim().min(2).max(120),
  license_ref: z.string().trim().max(120).optional().default(""),
});

export const dailyHoursSchema = z.object({
  branch_id: uuid,
  open_time: z.string().regex(/^\d{2}:\d{2}$/),
  close_time: z.string().regex(/^\d{2}:\d{2}$/),
}).refine((v) => v.close_time > v.open_time, { path: ["close_time"], message: "وقت الإغلاق يجب أن يكون بعد الافتتاح" });

export const bookingStatusSchema = z.object({
  booking_id: uuid,
  status: z.enum(["confirmed","checked_in","completed","clinic_cancelled","no_show","failed"]),
});

export const reviewSchema = z.object({
  booking_id: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  review_text: z.string().trim().max(1500).optional().default(""),
});

export const offerRevisionSchema = z.object({
  offer_id: uuid,
  price_type: z.enum(["fixed", "from", "range", "package", "consultation_required"]),
  min_qar: z.coerce.number().min(0).max(100000).optional(),
  max_qar: z.coerce.number().min(0).max(100000).optional(),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  reason: z.string().trim().min(3).max(500),
}).superRefine((value, ctx) => {
  const issue = (path: "min_qar" | "max_qar", message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (value.price_type === "consultation_required" && (value.min_qar !== undefined || value.max_qar !== undefined)) issue("min_qar", "سعر الاستشارة لا يحمل مبلغًا");
  if (["fixed", "from", "package"].includes(value.price_type) && value.min_qar === undefined) issue("min_qar", "السعر الأدنى مطلوب");
  if (value.price_type === "range" && (value.min_qar === undefined || value.max_qar === undefined)) issue("max_qar", "حدا النطاق مطلوبان");
  if (value.min_qar !== undefined && value.max_qar !== undefined && value.max_qar < value.min_qar) issue("max_qar", "السعر الأعلى يجب ألا يقل عن الأدنى");
});

export const attendanceSchema = z.object({
  booking_id: uuid,
  reason: z.string().trim().min(3).max(500).optional().default(""),
});

export const attendanceReversalSchema = z.object({
  booking_id: uuid,
  reason: z.string().trim().min(3).max(500),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const settlementPeriodSchema = z.object({
  clinic_id: uuid,
  period_start: isoDate,
  period_end: isoDate,
  period_kind: z.enum(["weekly", "monthly", "annual", "manual"]),
  notes: z.string().trim().max(1000).optional().default(""),
}).refine((value) => value.period_end >= value.period_start, { path: ["period_end"], message: "نهاية الفترة يجب أن تكون بعد بدايتها" });

export const financialReportSchema = z.object({
  clinic_id: uuid,
  period_start: isoDate,
  period_end: isoDate,
}).refine((value) => value.period_end >= value.period_start, { path: ["period_end"], message: "نهاية التقرير يجب أن تكون بعد بدايته" });

export const supportMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["ar", "en"]),
  conversation_id: uuid.optional(),
});

export const supportKnowledgeArticleSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,100}$/),
  locale: z.enum(["ar", "en"]),
  title: z.string().trim().min(3).max(200),
  body_markdown: z.string().trim().min(10).max(20000),
  category: z.enum(["booking", "pricing", "availability", "account", "clinic", "policy", "safety"]),
  audience: z.enum(["public", "clinic", "admin"]),
});

export const notificationTemplateSchema = z.object({
  template_key: z.string().trim().regex(/^[a-z0-9_.-]{3,80}$/),
  channel: z.enum(["email", "sms", "push"]),
  locale: z.enum(["ar", "en"]),
  subject: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(1).max(4000),
});

const optionalIsoDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((value) => value || undefined);
const optionalGender = z.union([z.literal(""), z.enum(["female", "male", "other", "prefer_not_to_say"])]).transform((value) => value || undefined);

export const patientProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  relationship: z.enum(["self", "child", "spouse", "parent", "other"]),
  date_of_birth: optionalIsoDate.optional(),
  gender: optionalGender.optional(),
});

export const patientProfileArchiveSchema = z.object({
  patient_profile_id: uuid,
});

export const deviceInstallationSchema = z.object({
  installation_id: uuid,
  device_label: z.string().trim().min(1).max(80).optional(),
  platform: z.string().trim().max(80).optional(),
  browser: z.string().trim().max(120).optional(),
  device_class: z.enum(["mobile", "tablet", "desktop", "unknown"]),
  app_version: z.string().trim().max(80).optional(),
});
