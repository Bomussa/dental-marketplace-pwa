import { NextResponse } from "next/server";
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

const MAX_PHONE_VERIFICATION_CONFIRM_BYTES = 2 * 1024;

type PhoneVerificationCompletion = {
  profile_id: string;
  verified_at: string;
};

type PhoneVerificationRpcError = {
  code?: string;
};

type PhoneVerificationRpcRequest = PromiseLike<{
  data: PhoneVerificationCompletion[] | null;
  error: PhoneVerificationRpcError | null;
}> & {
  abortSignal(signal: AbortSignal): PhoneVerificationRpcRequest;
};

type PhoneVerificationRpcClient = {
  rpc: (
    fn: "complete_patient_phone_verification_server",
    args: {
      p_actor_id: string;
      p_challenge_id: string;
      p_patient_profile_id: string;
    },
  ) => PhoneVerificationRpcRequest;
};

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

async function finalizePhoneVerification(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  challengeId: string,
  patientProfileId: string,
) {
  // The RPC was added by the migration in this release. Keep this narrow contract local
  // so the rest of the generated Database type remains unchanged until its next full refresh.
  const rpcClient = admin as unknown as PhoneVerificationRpcClient;
  const { data, error } = await rpcClient.rpc("complete_patient_phone_verification_server", {
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
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return json({ error: "يلزم تسجيل الدخول قبل تأكيد الرمز." }, 401);

  if (!publicWriteRequestOriginIsAllowed(request)) return json({ error: "forbidden_origin" }, 403);
  if (publicWriteRequestBodyIsTooLarge(request, MAX_PHONE_VERIFICATION_CONFIRM_BYTES)) {
    return json({ error: "phone_verification_too_large" }, 413);
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_PHONE_VERIFICATION_CONFIRM_BYTES).catch(() => "");
  if (raw === null) return json({ error: "phone_verification_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "أدخل رمز التحقق بصورة صحيحة." }, 400);
  }
  const parsed = patientPhoneVerificationConfirmSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "أدخل رمز التحقق بصورة صحيحة." }, 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
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
  if (challengeError) return json({ error: "تعذر قراءة حالة التحقق." }, 503);
  if (!challenge) return json({ error: "أرسل رمز تحقق جديدًا لهذا الملف." }, 400);

  // If the database already committed this verification but the HTTP response was lost,
  // return the committed result without asking Twilio to validate an already-consumed code again.
  if (challenge.status === "verified") {
    const { completed, error } = await finalizePhoneVerification(admin, userId, challenge.id, input.patient_profile_id);
    if (completed) {
      return json({ patient_profile_id: completed.profile_id, phone_verified_at: completed.verified_at });
    }
    const inconsistent = error?.code === "42501" || error?.code === "55000" || error?.code === "P0002";
    return json(
      { error: inconsistent ? "أرسل رمز تحقق جديدًا لهذا الملف." : "تعذر قراءة نتيجة تحقق الهاتف المحفوظة." },
      inconsistent ? 400 : 503,
    );
  }

  if (challenge.status !== "pending") return json({ error: "أرسل رمز تحقق جديدًا لهذا الملف." }, 400);

  let allowed: boolean;
  try {
    allowed = await consumeRateLimit({
      scope: "phone_verification_confirm",
      subject: `${userId}:${input.patient_profile_id}`,
      maxRequests: 5,
      windowSeconds: 10 * 60,
    });
  } catch {
    return json({ error: "خدمة حماية التحقق غير متاحة مؤقتًا." }, 503);
  }
  if (!allowed) {
    return json({ error: "تجاوزت الحد المسموح لمحاولات الرمز. أرسل رمزًا جديدًا لاحقًا." }, 429, { "retry-after": "600" });
  }

  if (new Date(challenge.expires_at) <= new Date() || challenge.attempt_count >= 5) {
    try {
      const { error: expiryError } = await withOperationalTimeout(admin.from("patient_phone_verification_challenges").update({ status: "expired" }).eq("id", challenge.id).eq("status", "pending"));
      if (expiryError) return json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
    } catch {
      return json({ error: "خدمة التحقق غير متاحة مؤقتًا." }, 503);
    }
    return json({ error: "انتهت صلاحية الرمز. أرسل رمزًا جديدًا." }, 400);
  }

  let approved: boolean;
  try {
    approved = await confirmPhoneVerification(challenge.phone, input.code);
  } catch (error) {
    if (error instanceof PhoneVerificationUnavailableError) {
      return json({ error: "تحقق الرسائل القصيرة غير مهيأ بعد." }, 503);
    }
    if (error instanceof PhoneVerificationProviderError) {
      return json({ error: "تعذر تأكيد الرمز لدى مزود الرسائل. أعد المحاولة لاحقًا." }, 502);
    }
    return json({ error: "تعذر تأكيد رمز الهاتف." }, 503);
  }

  if (!approved) {
    const attempts = challenge.attempt_count + 1;
    await admin
      .from("patient_phone_verification_challenges")
      .update({ attempt_count: attempts, status: attempts >= 5 ? "expired" : "pending" })
      .eq("id", challenge.id)
      .eq("status", "pending");
    return json({ error: attempts >= 5 ? "انتهت محاولات الرمز. أرسل رمزًا جديدًا." : "رمز التحقق غير صحيح." }, 400);
  }

  const { completed } = await finalizePhoneVerification(admin, userId, challenge.id, input.patient_profile_id);
  if (!completed) {
    return json({ error: "تم قبول رمز الهاتف، لكن تعذر إكمال حفظ التحقق. حدّث الصفحة ثم حاول مرة أخرى." }, 503);
  }

  return json({ patient_profile_id: completed.profile_id, phone_verified_at: completed.verified_at });
}
