"use server";

import { redirect } from "next/navigation";
import { emailForUsername } from "@/lib/account-auth.server";
import { passwordLoginSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function loginWithPassword(formData: FormData) {
  const parsed = passwordLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") || "/account",
  });

  if (!parsed.success) redirect("/login?error=invalid_credentials");

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
