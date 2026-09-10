import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { confirmPhoneVerification, PhoneVerificationProviderError, PhoneVerificationUnavailableError } from "@/lib/phone-verification.server";
import { consumeRateLimit, OPERATIONAL_RPC_TIMEOUT_MS, withOperationalTimeout } from "@/lib/operations.server";
import { patientPhoneVerificationConfirmSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api-response";

const MAX_PHONE_VERIFICATION_CONFIRM_BYTES = 2 * 1024;

async function finalizePhoneVerification(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  challengeId: string,
  patientProfileId: string,
) {
  const { data, error } = await admin.rpc("complete_patient_phone_verification_server", {
    p_actor_id: userId,
    p_challenge_id: challengeId,
    p_patient_profile_id: patientProfileId,
  }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS));
  const completed = data?.[0] ?? null;
  if (error || !completed?.profile_id || !completed?.verified_at) return { completed: null, error };
  return { completed, error: null };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null, error: new Error("OPERATION_TIMEOUT") }));
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return jsonNoStore({ error: "يلزم تسجيل الدخول قبل تأكيد الرمز." }, 401);

  if (!publicWriteRequestOriginIsAllowed(request)) return jsonNoStore({ error: "forbidden_origin" }, 403);
  if (publicWriteRequestBodyIsTooLarge(request, MAX_PHONE_VERIFICATION_CONFIRM_BYTES)) {
    return jsonNoStore({ error: "phone_verification_too_large" }, 413);
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_PHONE_VERIFICATION_CONFIRM_BYTES).catch(() => "");
  if (raw === null) return jsonNoStore({ error: "phone_verification_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return jsonNoStore({ error: "أدخل رمز التحقق بصورة صحيحة." }, 400);
  }
  const parsed = patientPhoneVerificationConfirmSchema.safeParse(payload);
  if (!parsed.success) return jsonNoStore({ error: "أدخل رمز التحقق بصورة صحيحة." }, 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return jsonNoStore({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
  }

  const input = parsed.data;
  const { data: challenge, error: challengeError } = await admin
    .from("patient_phone_verification_challenges")
    .select("id,phone,status,attempt_count,expires_at")
    .eq("patient_profile_id", input.patient_profile_id)
    .eq("account_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (challengeError) return jsonNoStore({ error: "تعذر قراءة حالة التحقق." }, 503);
  if (!challenge) return jsonNoStore({ error: "أرسل رمز تحقق جديدًا لهذا الملف." }, 400);

  if (challenge.status === "verified") {
    const { completed, error } = await finalizePhoneVerification(admin, userId, challenge.id, input.patient_profile_id);
    if (completed) {
      return jsonNoStore({ patient_profile_id: completed.profile_id, phone_verified_at: completed.verified_at });
    }
    const inconsistent = error?.code === "42501" || error?.code === "55000" || error?.code === "P0002";
    return jsonNoStore(
      { error: inconsistent ? "أرسل رمز تحقق جديدًا لهذا الملف." : "تعذر قراءة نتيجة تحقق الهاتف المحفوظة." },
      inconsistent ? 400 : 503,
    );
  }

  if (challenge.status !== "pending") return jsonNoStore({ error: "أرسل رمز تحقق جديدًا لهذا الملف." }, 400);

  let allowed: boolean;
  try {
    allowed = await consumeRateLimit({
      scope: "phone_verification_confirm",
      subject: `${userId}:${input.patient_profile_id}`,
      maxRequests: 5,
      windowSeconds: 10 * 60,
    });
  } catch {
    return jsonNoStore({ error: "خدمة حماية التحقق غير متاحة مؤقتًا." }, 503);
  }
  if (!allowed) {
    return jsonNoStore({ error: "تجاوزت الحد المسموح لمحاولات الرمز. أرسل رمزًا جديدًا لاحقًا." }, 429, { "retry-after": "600" });
  }

  if (new Date(challenge.expires_at) <= new Date() || challenge.attempt_count >= 5) {
    try {
      const { error: expiryError } = await withOperationalTimeout(admin.from("patient_phone_verification_challenges").update({ status: "expired" }).eq("id", challenge.id).eq("status", "pending"));
      if (expiryError) return jsonNoStore({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
    } catch {
      return jsonNoStore({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
    }
    return jsonNoStore({ error: "انتهت صلاحية الرمز. أرسل رمزًا جديدًا." }, 400);
  }

  let approved: boolean;
  try {
    approved = await confirmPhoneVerification(challenge.phone, input.code);
  } catch (error) {
    if (error instanceof PhoneVerificationUnavailableError) {
      return jsonNoStore({ error: "تحقق الرسائل القصيرة غير مهيأ بعد." }, 503);
    }
    if (error instanceof PhoneVerificationProviderError) {
      return jsonNoStore({ error: "تعذر تأكيد الرمز لدى مزود الرسائل. أعد المحاولة لاحقًا." }, 502);
    }
    return jsonNoStore({ error: "تعذر تأكيد رمز الهاتف." }, 503);
  }

  if (!approved) {
    const attempts = challenge.attempt_count + 1;
    await admin
      .from("patient_phone_verification_challenges")
      .update({ attempt_count: attempts, status: attempts >= 5 ? "expired" : "pending" })
      .eq("id", challenge.id)
      .eq("status", "pending");
    return jsonNoStore({ error: attempts >= 5 ? "انتهت محاولات الرمز. أرسل رمزًا جديدًا." : "رمز التحقق غير صحيح." }, 400);
  }

  const { completed } = await finalizePhoneVerification(admin, userId, challenge.id, input.patient_profile_id);
  if (!completed) {
    return jsonNoStore({ error: "تم قبول رمز الهاتف، لكن تعذر إكمال حفظ التحقق. حدّث الصفحة ثم حاول مرة أخرى." }, 503);
  }

  return jsonNoStore({ patient_profile_id: completed.profile_id, phone_verified_at: completed.verified_at });
}
