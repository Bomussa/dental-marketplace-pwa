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
  idempotency_key: z.string().min(8).max(128),
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
