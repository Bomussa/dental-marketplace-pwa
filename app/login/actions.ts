"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailForUsername } from "@/lib/account-auth.server";
import { consumeRateLimit, withOperationalTimeout } from "@/lib/operations.server";
import { publicWriteHeadersClientKey } from "@/lib/public-write-request-guard";
import { passwordLoginSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

const LOGIN_CLIENT_WINDOW_SECONDS = 60;
const MAX_LOGIN_ATTEMPTS_PER_CLIENT_WINDOW = 30;
const LOGIN_USERNAME_WINDOW_SECONDS = 5 * 60;
const MAX_LOGIN_ATTEMPTS_PER_USERNAME_WINDOW = 20;
const DECOY_LOGIN_EMAIL = "asnani-login-decoy@example.invalid";

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
