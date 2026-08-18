import { NextResponse } from "next/server";
import { provisionPatientBookingAccount } from "@/lib/account-auth.server";
import { consumeRateLimit } from "@/lib/operations.server";
import { patientBookingRegistrationSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

const messages = {
  username_taken: "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.",
  email_taken: "البريد الإلكتروني مسجل بالفعل. سجّل الدخول لإكمال طلب الحجز.",
  national_id_taken: "الرقم الشخصي مسجل بالفعل. سجّل الدخول لإكمال طلب الحجز.",
  unavailable: "تعذر إنشاء الحساب الآن. حاول لاحقًا دون تكرار البيانات.",
} as const;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = patientBookingRegistrationSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "تحقق من بيانات التسجيل والمريض." }, { status: 400 });

  const input = parsed.data;
  try {
    const [emailAllowed, usernameAllowed] = await Promise.all([
      consumeRateLimit({ scope: "patient_booking_registration", subject: input.email, maxRequests: 5, windowSeconds: 60 * 60 }),
      consumeRateLimit({ scope: "patient_booking_registration", subject: input.username, maxRequests: 5, windowSeconds: 60 * 60 }),
    ]);
    if (!emailAllowed || !usernameAllowed) {
      return NextResponse.json({ error: "تجاوزت الحد المؤقت لإنشاء الحسابات. حاول بعد ساعة." }, { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } });
    }
  } catch {
    return NextResponse.json({ error: "خدمة التسجيل غير متاحة مؤقتًا." }, { status: 503 });
  }

  const created = await provisionPatientBookingAccount(input);
  if (!created.ok) return NextResponse.json({ error: messages[created.code] }, { status: created.code === "unavailable" ? 503 : 409 });

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (sessionError) {
    return NextResponse.json({ error: "تم إنشاء الحساب، لكن تعذر فتح الجلسة. سجّل الدخول ثم أكمل طلب الحجز." }, { status: 503 });
  }

  return NextResponse.json({ patient_profile_id: created.patientProfileId, phone: input.phone }, { status: 201, headers: { "cache-control": "no-store" } });
}
