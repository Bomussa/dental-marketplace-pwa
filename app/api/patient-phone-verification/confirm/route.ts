import { NextResponse } from "next/server";
import { confirmPhoneVerification, PhoneVerificationProviderError, PhoneVerificationUnavailableError } from "@/lib/phone-verification.server";
import { consumeRateLimit } from "@/lib/operations.server";
import { patientPhoneVerificationConfirmSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "يلزم تسجيل الدخول قبل تأكيد الرمز." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsed = patientPhoneVerificationConfirmSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "أدخل رمز التحقق بصورة صحيحة." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, { status: 503 });
  }

  const input = parsed.data;
  const allowed = await consumeRateLimit({
    scope: "phone_verification_confirm",
    subject: `${userId}:${input.patient_profile_id}`,
    maxRequests: 5,
    windowSeconds: 10 * 60,
  }).catch(() => false);
  if (!allowed) {
    return NextResponse.json({ error: "تجاوزت الحد المسموح لمحاولات الرمز. أرسل رمزًا جديدًا لاحقًا." }, { status: 429, headers: { "retry-after": "600", "cache-control": "no-store" } });
  }

  const { data: challenge, error: challengeError } = await admin
    .from("patient_phone_verification_challenges")
    .select("id,phone,status,attempt_count,expires_at")
    .eq("patient_profile_id", input.patient_profile_id)
    .eq("account_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (challengeError) return NextResponse.json({ error: "تعذر قراءة حالة التحقق." }, { status: 503 });
  if (!challenge) return NextResponse.json({ error: "أرسل رمز تحقق جديدًا لهذا الملف." }, { status: 400 });

  if (new Date(challenge.expires_at) <= new Date() || challenge.attempt_count >= 5) {
    await admin.from("patient_phone_verification_challenges").update({ status: "expired" }).eq("id", challenge.id).eq("status", "pending");
    return NextResponse.json({ error: "انتهت صلاحية الرمز. أرسل رمزًا جديدًا." }, { status: 400 });
  }

  let approved: boolean;
  try {
    approved = await confirmPhoneVerification(challenge.phone, input.code);
  } catch (error) {
    if (error instanceof PhoneVerificationUnavailableError) {
      return NextResponse.json({ error: "تحقق الرسائل القصيرة غير مهيأ بعد." }, { status: 503 });
    }
    if (error instanceof PhoneVerificationProviderError) {
      return NextResponse.json({ error: "تعذر تأكيد الرمز لدى مزود الرسائل. أعد المحاولة لاحقًا." }, { status: 502 });
    }
    return NextResponse.json({ error: "تعذر تأكيد رمز الهاتف." }, { status: 503 });
  }

  if (!approved) {
    const attempts = challenge.attempt_count + 1;
    await admin
      .from("patient_phone_verification_challenges")
      .update({ attempt_count: attempts, status: attempts >= 5 ? "expired" : "pending" })
      .eq("id", challenge.id)
      .eq("status", "pending");
    return NextResponse.json({ error: attempts >= 5 ? "انتهت محاولات الرمز. أرسل رمزًا جديدًا." : "رمز التحقق غير صحيح." }, { status: 400 });
  }

  const verifiedAt = new Date().toISOString();
  const { data: profile, error: profileError } = await admin
    .from("patient_profiles")
    .update({ phone_verified_at: verifiedAt })
    .eq("id", input.patient_profile_id)
    .eq("account_id", userId)
    .eq("phone", challenge.phone)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "تعذر حفظ تحقق الهاتف لهذا الملف." }, { status: 503 });

  const { error: consumeError } = await admin
    .from("patient_phone_verification_challenges")
    .update({ status: "verified", consumed_at: verifiedAt })
    .eq("id", challenge.id)
    .eq("status", "pending");
  if (consumeError) return NextResponse.json({ error: "تم التحقق من الهاتف، لكن تعذر إنهاء جلسة الرمز." }, { status: 503 });

  return NextResponse.json({ patient_profile_id: profile.id, phone_verified_at: verifiedAt });
}
