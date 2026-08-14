import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return NextResponse.json({ error: "يلزم تسجيل الدخول قبل الحجز" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "بيانات الحجز غير صالحة" }, { status: 400 });

  const { data, error } = await supabase.rpc("book_slot", {
    p_slot_id: parsed.data.slot_id,
    p_offer_id: parsed.data.offer_id,
    p_idempotency_key: parsed.data.idempotency_key,
  });
  if (error) {
    const conflict = error.code === "P0001" || error.code === "23505" || /already|bookable|eligible|shorter/i.test(error.message);
    return NextResponse.json({ error: conflict ? "الموعد لم يعد متاحًا. حدّث النتائج." : "تعذر إنشاء الحجز" }, { status: conflict ? 409 : 400 });
  }
  const booking = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(booking, { status: 201 });
}
