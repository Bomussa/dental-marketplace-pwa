import { bookingSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, OPERATIONAL_RPC_TIMEOUT_MS, withOperationalTimeout } from "@/lib/operations.server";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { jsonNoStore } from "@/lib/api-response";

const MAX_BOOKING_REQUEST_BYTES = 4 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null, error: new Error("OPERATION_TIMEOUT") }));
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return jsonNoStore({ error: "يلزم تسجيل الدخول قبل الحجز" }, 401);

  if (!publicWriteRequestOriginIsAllowed(request)) return jsonNoStore({ error: "forbidden_origin" }, 403);
  if (publicWriteRequestBodyIsTooLarge(request, MAX_BOOKING_REQUEST_BYTES)) return jsonNoStore({ error: "booking_too_large" }, 413);

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_BOOKING_REQUEST_BYTES).catch(() => "");
  if (raw === null) return jsonNoStore({ error: "booking_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return jsonNoStore({ error: "بيانات الحجز غير صالحة" }, 400);
  }

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) return jsonNoStore({ error: "بيانات الحجز غير صالحة" }, 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return jsonNoStore({ error: "خدمة الحجز غير متاحة مؤقتًا" }, 503);
  }

  let bookingRateAllowed;
  try {
    bookingRateAllowed = await consumeRateLimit({
      scope: "booking",
      subject: userId,
      maxRequests: 10,
      windowSeconds: 60 * 60,
    });
  } catch {
    return jsonNoStore({ error: "خدمة حماية الحجز غير متاحة مؤقتًا" }, 503);
  }
  if (!bookingRateAllowed) {
    return jsonNoStore(
      { error: "تم تجاوز عدد محاولات الحجز المسموح به مؤقتًا. حاول بعد قليل." },
      429,
      { "retry-after": "3600" },
    );
  }

  const { data, error } = await admin.rpc("book_slot_server", {
    p_actor_id: userId,
    p_slot_id: parsed.data.slot_id,
    p_offer_id: parsed.data.offer_id,
    p_idempotency_key: parsed.data.idempotency_key,
    p_patient_profile_id: parsed.data.patient_profile_id,
  }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
  if (error) {
    const conflict = error.code === "P0001" || error.code === "23505" || /already|bookable|eligible|shorter/i.test(error.message);
    const forbidden = error.code === "42501" || /profile.*account|not available/i.test(error.message);
    const incompleteProfile = error.code === "22023" && /complete and phone verified/i.test(error.message);
    const invalid = error.code === "22023" || /patient profile is required/i.test(error.message);
    const unavailable = /abort|timeout|network/i.test(error.message);
    const status = forbidden ? 403 : conflict ? 409 : invalid ? 400 : unavailable ? 503 : 500;
    const message = forbidden ? "لا يمكنك الحجز بهذا الملف." : conflict ? "الموعد لم يعد متاحًا. حدّث النتائج." : incompleteProfile ? "أكمل بيانات المريض وتحقق من رقم الهاتف قبل الحجز." : invalid ? "اختر الشخص الذي تريد الحجز له." : unavailable ? "خدمة الحجز غير متاحة مؤقتًا. أعد المحاولة لاحقًا." : "تعذر إنشاء الحجز";
    return jsonNoStore({ error: message }, status);
  }

  const booking = Array.isArray(data) ? data[0] : data;
  return jsonNoStore(booking, 201);
}
