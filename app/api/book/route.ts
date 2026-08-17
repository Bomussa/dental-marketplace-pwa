import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/operations.server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "يلزم تسجيل الدخول قبل الحجز" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "بيانات الحجز غير صالحة" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "خدمة الحجز غير متاحة مؤقتًا" }, { status: 503 });
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
    return NextResponse.json({ error: "خدمة حماية الحجز غير متاحة مؤقتًا" }, { status: 503 });
  }
  if (!bookingRateAllowed) {
    return NextResponse.json(
      { error: "تم تجاوز عدد محاولات الحجز المسموح به مؤقتًا. حاول بعد قليل." },
      { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } },
    );
  }

  const { data, error } = await admin.rpc("book_slot_server", {
    p_actor_id: userId,
    p_slot_id: parsed.data.slot_id,
    p_offer_id: parsed.data.offer_id,
    p_idempotency_key: parsed.data.idempotency_key,
    p_patient_profile_id: parsed.data.patient_profile_id,
  });
  if (error) {
    const conflict = error.code === "P0001" || error.code === "23505" || /already|bookable|eligible|shorter/i.test(error.message);
    const forbidden = error.code === "42501" || /profile.*account|not available/i.test(error.message);
    const incompleteProfile = error.code === "22023" && /complete and phone verified/i.test(error.message);
    const invalid = error.code === "22023" || /patient profile is required/i.test(error.message);
    const status = forbidden ? 403 : conflict ? 409 : invalid ? 400 : 500;
    const message = forbidden ? "لا يمكنك الحجز بهذا الملف." : conflict ? "الموعد لم يعد متاحًا. حدّث النتائج." : incompleteProfile ? "أكمل بيانات المريض وتحقق من رقم الهاتف قبل الحجز." : invalid ? "اختر الشخص الذي تريد الحجز له." : "تعذر إنشاء الحجز";
    return NextResponse.json({ error: message }, { status });
  }

  const booking = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(booking, { status: 201 });
}
