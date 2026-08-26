"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailForUsername, provisionPatientBookingAccount } from "@/lib/account-auth.server";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { publicWriteHeadersClientKey } from "@/lib/public-write-request-guard";
import { passwordLoginSchema, patientBookingRegistrationSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

const LOGIN_CLIENT_WINDOW_SECONDS = 60;
const MAX_LOGIN_ATTEMPTS_PER_CLIENT_WINDOW = 30;
const LOGIN_USERNAME_WINDOW_SECONDS = 5 * 60;
const MAX_LOGIN_ATTEMPTS_PER_USERNAME_WINDOW = 20;
const REGISTRATION_WINDOW_SECONDS = 60 * 60;
const MAX_REGISTRATIONS_PER_CLIENT_WINDOW = 5;
const DECOY_LOGIN_EMAIL = "asnani-login-decoy@example.invalid";

type RegistrationError = "invalid" | "username_taken" | "email_taken" | "patient_data_taken" | "unavailable";

function registrationFailure(code: RegistrationError): never {
  redirect(`/login?register_error=${code}`);
}

export async function loginWithPassword(formData: FormData) {
  const parsed = passwordLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") || "/account",
  });

  if (!parsed.success) redirect("/login?error=invalid_credentials");

  const requestHeaders = await headers();
  const clientKey = publicWriteHeadersClientKey(requestHeaders);
  let rateAllowed = false;
  try {
    const [clientAllowed, usernameAllowed] = await Promise.all([
      consumeRateLimit({
        scope: "login",
        subject: `client:${clientKey}`,
        maxRequests: MAX_LOGIN_ATTEMPTS_PER_CLIENT_WINDOW,
        windowSeconds: LOGIN_CLIENT_WINDOW_SECONDS,
      }),
      consumeRateLimit({
        scope: "login",
        subject: `username:${parsed.data.username}`,
        maxRequests: MAX_LOGIN_ATTEMPTS_PER_USERNAME_WINDOW,
        windowSeconds: LOGIN_USERNAME_WINDOW_SECONDS,
      }),
    ]);
    rateAllowed = clientAllowed && usernameAllowed;
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  if (!rateAllowed) redirect("/login?error=invalid_credentials");

  try {
    const email = await emailForUsername(parsed.data.username);
    const supabase = await createClient();
    const { error } = await withOperationalTimeout(supabase.auth.signInWithPassword({
      email: email ?? DECOY_LOGIN_EMAIL,
      password: parsed.data.password,
    })).catch(() => ({ error: { message: "OPERATION_TIMEOUT" } }));
    if (!email || error) redirect("/login?error=invalid_credentials");
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  redirect(parsed.data.next);
}

export async function registerPatient(formData: FormData) {
  const parsed = patientBookingRegistrationSchema.safeParse({
    display_name: formData.get("display_name"),
    relationship: "self",
    national_id: formData.get("national_id"),
    nationality: formData.get("nationality"),
    date_of_birth: formData.get("date_of_birth"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) registrationFailure("invalid");

  const requestHeaders = await headers();
  const clientKey = publicWriteHeadersClientKey(requestHeaders);
  const registrationAllowed = await consumeRateLimit({
    scope: "patient_booking_registration",
    subject: `self-registration:${clientKey}`,
    maxRequests: MAX_REGISTRATIONS_PER_CLIENT_WINDOW,
    windowSeconds: REGISTRATION_WINDOW_SECONDS,
  }).catch(() => false);
  if (!registrationAllowed) registrationFailure("unavailable");

  const result = await provisionPatientBookingAccount(parsed.data);
  if (!result.ok) {
    if (result.code === "national_id_taken" || result.code === "phone_taken") registrationFailure("patient_data_taken");
    registrationFailure(result.code);
  }

  try {
    const supabase = await createClient();
    const { error } = await withOperationalTimeout(supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })).catch(() => ({ error: { message: "OPERATION_TIMEOUT" } }));
    if (error) registrationFailure("unavailable");
  } catch {
    registrationFailure("unavailable");
  }

  redirect("/account?registration_success=created");
}
