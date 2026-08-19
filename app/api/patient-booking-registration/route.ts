import { NextResponse } from "next/server";
import { provisionPatientBookingAccount } from "@/lib/account-auth.server";
import { consumeRateLimit } from "@/lib/operations.server";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestClientKey,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";
import { patientBookingRegistrationSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

const MAX_PATIENT_BOOKING_REGISTRATION_BYTES = 8 * 1024;
const PATIENT_REGISTRATION_CLIENT_WINDOW_SECONDS = 60 * 60;
const MAX_PATIENT_REGISTRATIONS_PER_CLIENT_WINDOW = 10;

const messages = {
  username_taken: "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.",
  email_taken: "البريد الإلكتروني مسجل بالفعل. سجّل الدخول لإكمال طلب الحجز.",
  national_id_taken: "الرقم الشخصي مسجل بالفعل. سجّل الدخول لإكمال طلب الحجز.",
  unavailable: "تعذر إنشاء الحساب الآن. حاول لاحقًا دون تكرار البيانات.",
} as const;

function json(body: unknown, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  if (!publicWriteRequestOriginIsAllowed(request)) return json({ error: "forbidden_origin" }, 403);
  if (publicWriteRequestBodyIsTooLarge(request, MAX_PATIENT_BOOKING_REGISTRATION_BYTES)) {
    return json({ error: "registration_too_large" }, 413);
  }

  const raw = await readPublicWriteRequestTextWithinLimit(request, MAX_PATIENT_BOOKING_REGISTRATION_BYTES).catch(() => "");
  if (raw === null) return json({ error: "registration_too_large" }, 413);

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ error: "تحقق من بيانات التسجيل والمريض." }, 400);
  }

  const parsed = patientBookingRegistrationSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "تحقق من بيانات التسجيل والمريض." }, 400);

  const input = parsed.data;
  try {
    const [clientAllowed, emailAllowed, usernameAllowed] = await Promise.all([
      consumeRateLimit({
        scope: "patient_booking_registration",
        subject: `client:${publicWriteRequestClientKey(request)}`,
        maxRequests: MAX_PATIENT_REGISTRATIONS_PER_CLIENT_WINDOW,
        windowSeconds: PATIENT_REGISTRATION_CLIENT_WINDOW_SECONDS,
      }),
      consumeRateLimit({ scope: "patient_booking_registration", subject: `email:${input.email}`, maxRequests: 5, windowSeconds: 60 * 60 }),
      consumeRateLimit({ scope: "patient_booking_registration", subject: `username:${input.username}`, maxRequests: 5, windowSeconds: 60 * 60 }),
    ]);
    if (!clientAllowed || !emailAllowed || !usernameAllowed) {
      return json(
        { error: "تجاوزت الحد المؤقت لإنشاء الحسابات. حاول بعد ساعة." },
        429,
        { "retry-after": "3600" },
      );
    }
  } catch {
    return json({ error: "خدمة التسجيل غير متاحة مؤقتًا." }, 503);
  }

  const created = await provisionPatientBookingAccount(input);
  if (!created.ok) return json({ error: messages[created.code] }, created.code === "unavailable" ? 503 : 409);

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (sessionError) {
    return json({ error: "تم إنشاء الحساب، لكن تعذر فتح الجلسة. سجّل الدخول ثم أكمل طلب الحجز." }, 503);
  }

  return json({ patient_profile_id: created.patientProfileId, phone: input.phone }, 201);
}
