"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({ email: z.string().email(), next: z.string().startsWith("/").max(300).default("/account") });

export async function sendMagicLink(formData: FormData) {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), next: formData.get("next") || "/account" });
  if (!parsed.success) redirect("/login?error=invalid_email");
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || h.get("origin") || `https://${h.get("host")}`;
  const supabase = await createClient();
  const redirectTo = new URL("/auth/confirm", origin);
  redirectTo.searchParams.set("next", parsed.data.next);
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { emailRedirectTo: redirectTo.toString() } });
  if (error) redirect("/login?error=send_failed");
  redirect(`/login?sent=1&next=${encodeURIComponent(parsed.data.next)}`);
}
