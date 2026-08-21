import { z } from "zod";

export const uuid = z.string().uuid();

const coordinate = z.coerce.number().finite();
export const searchSortSchema = z.enum(["balanced", "price", "distance", "rating", "soonest"]);
export const searchWhenSchema = z.enum(["earliest", "today", "tomorrow"]);

export const searchSchema = z.object({
  variant: uuid,
  lat: z.union([z.literal(""), coordinate.min(-90).max(90)]).optional(),
  lng: z.union([z.literal(""), coordinate.min(-180).max(180)]).optional(),
  radius: z.coerce.number().min(1).max(50).default(10),
  sort: searchSortSchema.default("balanced"),
});

export const searchQuerySchema = searchSchema.extend({
  when: searchWhenSchema.default("earliest"),
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

export function isIsoCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDate = z.string()
  .refine(isIsoCalendarDate, { message: "تاريخ غير صالح" });
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
}).superRefine((value, context) => {
  if (value.period_end < value.period_start) {
    context.addIssue({ code: "custom", path: ["period_end"], message: "نهاية التقرير يجب أن تكون بعد بدايته" });
    return;
  }
  const spanDays = Math.floor((Date.parse(`${value.period_end}T00:00:00Z`) - Date.parse(`${value.period_start}T00:00:00Z`)) / 86_400_000) + 1;
  if (spanDays > 1_826) {
    context.addIssue({ code: "custom", path: ["period_end"], message: "نطاق التقرير أطول من الحد المسموح" });
  }
});

export const activityReportSchema = z.object({
  clinic_id: uuid.optional(),
  period_start: isoDate,
  period_end: isoDate,
  granularity: z.enum(["hourly", "daily", "weekly", "monthly"]).default("daily"),
}).superRefine((value, context) => {
  if (value.period_end < value.period_start) {
    context.addIssue({ code: "custom", path: ["period_end"], message: "نهاية التقرير يجب أن تكون بعد بدايته" });
    return;
  }
  const spanDays = Math.floor((Date.parse(`${value.period_end}T00:00:00Z`) - Date.parse(`${value.period_start}T00:00:00Z`)) / 86_400_000) + 1;
  const maximumDays = value.granularity === "hourly" ? 31 : value.granularity === "daily" ? 366 : 1_826;
  if (spanDays > maximumDays) {
    context.addIssue({ code: "custom", path: ["period_end"], message: "نطاق التقرير أطول من الحد المسموح لهذا التجميع" });
  }
});

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

const optionalGender = z.union([z.literal(""), z.enum(["female", "male", "other", "prefer_not_to_say"])]).transform((value) => value || undefined);

function normalizeArabicDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function normalizeNationalId(value: string) {
  return normalizeArabicDigits(value).replace(/[\s-]/g, "");
}

export function normalizePhone(value: string) {
  const normalized = normalizeArabicDigits(value).trim().replace(/[\s().-]/g, "");
  return normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized;
}

const nationalIdSchema = z.string().trim().transform(normalizeNationalId).refine((value) => /^\d{11}$/.test(value));
const nationalitySchema = z.string().trim().transform((value) => value.toUpperCase()).refine((value) => /^[A-Z]{2}$/.test(value));
const phoneSchema = z.string().trim().transform(normalizePhone).refine((value) => /^\+[1-9]\d{7,14}$/.test(value));
const dateOfBirthSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}, { message: "تاريخ الميلاد غير صالح" });

export const patientProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  relationship: z.enum(["self", "child", "spouse", "parent", "other"]),
  national_id: nationalIdSchema,
  nationality: nationalitySchema,
  date_of_birth: dateOfBirthSchema,
  phone: phoneSchema,
  gender: optionalGender.optional(),
});

export const patientProfileUpsertSchema = patientProfileSchema.extend({
  patient_profile_id: uuid.optional(),
});

export const usernameSchema = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/, "اسم المستخدم يجب أن يتكون من 3 إلى 32 حرفًا أو رقمًا، ويمكن أن يتضمن . أو _ أو -").transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12, "كلمة المرور يجب ألا تقل عن 12 حرفًا").max(128).refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), "كلمة المرور تحتاج حرفًا صغيرًا وكبيرًا ورقمًا واحدًا على الأقل");

export function isSafeInternalRedirectPath(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("\\");
  } catch {
    return false;
  }
}

const internalRedirectPathSchema = z.string().startsWith("/").max(300).refine(
  isSafeInternalRedirectPath,
  "وجهة إعادة التوجيه يجب أن تبقى داخل التطبيق",
);

export const passwordLoginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
  next: internalRedirectPathSchema.default("/account"),
});

export const patientBookingRegistrationSchema = patientProfileSchema.extend({
  relationship: z.literal("self"),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
});

export const clinicOperatorAccountSchema = z.object({
  clinic_id: uuid,
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
});

export const clinicOperatorAccountIdSchema = z.object({
  operator_account_id: uuid,
});

export const patientPhoneVerificationStartSchema = patientProfileUpsertSchema;

export const patientPhoneVerificationConfirmSchema = z.object({
  patient_profile_id: uuid,
  code: z.string().trim().regex(/^\d{4,10}$/),
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

export const treatmentCatalogSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_]{2,80}$/),
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().min(2).max(160),
  category: z.string().trim().regex(/^[a-z0-9_-]{2,80}$/),
  comparison_version: z.coerce.number().int().min(1).max(999),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const treatmentCatalogUpdateSchema = treatmentCatalogSchema.extend({
  id: uuid,
});

export const treatmentVariantSchema = z.object({
  catalog_id: uuid,
  variant_key: z.string().trim().regex(/^[a-z0-9_]{2,100}$/),
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().min(2).max(160),
  attributes_json: z.string().trim().max(5000).optional().default("{}"),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const treatmentVariantUpdateSchema = treatmentVariantSchema.extend({
  id: uuid,
});

export const featureFlagUpdateSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_.-]{2,120}$/),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  config_json: z.string().trim().max(5000).optional().default("{}"),
});

export const adminOfferUpdateSchema = z.object({
  id: uuid,
  price_type: z.enum(["fixed", "from", "range", "package", "consultation_required"]),
  duration_minutes: z.coerce.number().int().min(5).max(480),
  status: z.enum(["draft", "active", "needs_review", "stale", "suspended", "archived"]),
});

export const adminSlotUpdateSchema = z.object({
  id: uuid,
  start_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  status: z.enum(["draft", "published", "held", "consumed", "expired", "cancelled"]),
}).refine((value) => value.end_at > value.start_at, { path: ["end_at"], message: "وقت النهاية يجب أن يكون بعد البداية" });
