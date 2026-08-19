"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailForUsername } from "@/lib/account-auth.server";
import { consumeRateLimit } from "@/lib/operations.server";
import { publicWriteHeadersClientKey } from "@/lib/public-write-request-guard";
import { passwordLoginSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

const LOGIN_CLIENT_WINDOW_SECONDS = 60;
const MAX_LOGIN_ATTEMPTS_PER_CLIENT_WINDOW = 30;
const LOGIN_CLIENT_USERNAME_WINDOW_SECONDS = 5 * 60;
const MAX_LOGIN_ATTEMPTS_PER_CLIENT_USERNAME_WINDOW = 10;

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
    const [clientAllowed, clientUsernameAllowed] = await Promise.all([
      consumeRateLimit({
        scope: "login",
        subject: `client:${clientKey}`,
        maxRequests: MAX_LOGIN_ATTEMPTS_PER_CLIENT_WINDOW,
        windowSeconds: LOGIN_CLIENT_WINDOW_SECONDS,
      }),
      consumeRateLimit({
        scope: "login",
        subject: `client-username:${clientKey}:${parsed.data.username}`,
        maxRequests: MAX_LOGIN_ATTEMPTS_PER_CLIENT_USERNAME_WINDOW,
        windowSeconds: LOGIN_CLIENT_USERNAME_WINDOW_SECONDS,
      }),
    ]);
    rateAllowed = clientAllowed && clientUsernameAllowed;
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  if (!rateAllowed) redirect("/login?error=invalid_credentials");

  try {
    const email = await emailForUsername(parsed.data.username);
    if (!email) redirect("/login?error=invalid_credentials");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
    if (error) redirect("/login?error=invalid_credentials");
  } catch {
    redirect("/login?error=invalid_credentials");
  }

  redirect(parsed.data.next);
}
