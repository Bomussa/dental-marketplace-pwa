import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { ensurePhoneVerificationAvailable, PhoneVerificationProviderError, PhoneVerificationUnavailableError, startPhoneVerification } from "@/lib/phone-verification.server";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { patientPhoneVerificationStartSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_PHONE_VERIFICATION_START_BYTES = 8 * 1024;

export async function POST(request: Request) {
  try {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "يلزم تسجيل الدخول قبل التحقق من الهاتف." }, { status: 401 });

  if (!publicWriteRequestOriginIsAllowed(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  if (publicWriteRequestBodyIsTooLarge(request, MAX_PHONE_VERIFICATION_START_BYTES)) {
    return NextResponse.json({ error: "phone_verification_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_PHONE_VERIFICATION_START_BYTES).catch(() => "");
  if (raw === null) return NextResponse.json({ error: "phone_verification_too_large" }, { status: 413, headers: { "cache-control": "no-store" } });

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "تحقق من بيانات المريض ورقم الهاتف." }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  const parsed = patientPhoneVerificationStartSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "تحقق من بيانات المريض ورقم الهاتف." }, { status: 400 });

  try {
    ensurePhoneVerificationAvailable();
  } catch (error) {
    if (error instanceof PhoneVerificationUnavailableError) {
      return NextResponse.json({ error: "تحقق الرسائل القصيرة غير مهيأ بعد. لن يتم الحجز قبل تفعيله." }, { status: 503 });
    }
    return NextResponse.json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, { status: 503 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, { status: 503 });
  }

  const input = parsed.data;
  let accountAllowed: boolean;
  let phoneAllowed: boolean;
  try {
    [accountAllowed, phoneAllowed] = await Promise.all([
      consumeRateLimit({ scope: "phone_verification_start", subject: userId, maxRequests: 3, windowSeconds: 60 * 60 }),
      consumeRateLimit({ scope: "phone_verification_start", subject: input.phone, maxRequests: 3, windowSeconds: 60 * 60 }),
    ]);
  } catch {
    return NextResponse.json({ error: "خدمة حماية التحقق غير متاحة مؤقتًا." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (!accountAllowed || !phoneAllowed) {
    return NextResponse.json({ error: "تجاوزت الحد المسموح لإرسال الرمز. حاول لاحقًا." }, { status: 429, headers: { "retry-after": "3600", "cache-control": "no-store" } });
  }

  const profilePayload = {
    display_name: input.display_name,
    relationship: input.relationship,
    national_id: input.national_id,
    nationality: input.nationality,
    date_of_birth: input.date_of_birth,
    phone: input.phone,
    gender: input.gender ?? null,
  };

  let profileId = input.patient_profile_id;
  let existingPhone: string | null = null;
  if (profileId) {
    const { data: existing, error } = await withOperationalTimeout(
      admin
        .from("patient_profiles")
        .select("id,phone")
        .eq("id", profileId)
        .eq("account_id", userId)
        .is("archived_at", null)
        .maybeSingle(),
    );
    if (error) return NextResponse.json({ error: "تعذر الوصول إلى ملف المريض." }, { status: 503 });
    if (!existing) return NextResponse.json({ error: "ملف المريض غير متاح لهذا الحساب." }, { status: 403 });
    existingPhone = existing.phone;

    const { error: updateError } = await withOperationalTimeout(
      admin
        .from("patient_profiles")
        .update({ ...profilePayload, phone_verified_at: existingPhone === input.phone ? undefined : null })
        .eq("id", profileId)
        .eq("account_id", userId),
    );
    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json({ error: "تحقق من بيانات المريض ورقم الهاتف." }, { status: 400, headers: { "cache-control": "no-store" } });
      }
      return NextResponse.json({ error: "تعذر حفظ بيانات المريض." }, { status: 503 });
    }
  } else {
    const { data: created, error } = await withOperationalTimeout(
      admin
        .from("patient_profiles")
        .insert({ account_id: userId, ...profilePayload })
        .select("id")
        .single(),
    );
    if (error || !created) {
      if (error?.code === "23505") {
        return NextResponse.json({ error: "تحقق من بيانات المريض ورقم الهاتف." }, { status: 400, headers: { "cache-control": "no-store" } });
      }
      return NextResponse.json({ error: "تعذر إنشاء ملف المريض." }, { status: 503 });
    }
    profileId = created.id;
  }

  try {
    await startPhoneVerification(input.phone);
  } catch (error) {
    if (error instanceof PhoneVerificationUnavailableError) {
      return NextResponse.json({ error: "تحقق الرسائل القصيرة غير مهيأ بعد. لن يتم الحجز قبل تفعيله." }, { status: 503 });
    }
    if (error instanceof PhoneVerificationProviderError) {
      return NextResponse.json({ error: "تعذر إرسال رمز التحقق. تحقق من الرقم ثم أعد المحاولة لاحقًا." }, { status: 502 });
    }
    return NextResponse.json({ error: "تعذر بدء التحقق من الهاتف." }, { status: 503 });
  }

  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const challengeHash = createHash("sha256").update(`${profileId}:${randomUUID()}`).digest("hex");
  const { error: cancellationError } = await withOperationalTimeout(
    admin
      .from("patient_phone_verification_challenges")
      .update({ status: "cancelled", consumed_at: new Date().toISOString() })
      .eq("patient_profile_id", profileId)
      .eq("account_id", userId)
      .eq("status", "pending"),
  );
  if (cancellationError) return NextResponse.json({ error: "تعذر حفظ جلسة التحقق. أرسل رمزًا جديدًا." }, { status: 503 });
  const { error: challengeError } = await withOperationalTimeout(admin.from("patient_phone_verification_challenges").insert({
    account_id: userId,
    patient_profile_id: profileId,
    phone: input.phone,
    code_hash: challengeHash,
    expires_at: expiresAt,
  }));
  if (challengeError) return NextResponse.json({ error: "تم إرسال الرمز، لكن تعذر حفظ جلسة التحقق. أرسل رمزًا جديدًا." }, { status: 503 });

  return NextResponse.json({ patient_profile_id: profileId, phone: input.phone, expires_at: expiresAt }, { status: 201 });
  } catch (error) {
    console.error("phone_verification_start_storage_or_timeout_failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
