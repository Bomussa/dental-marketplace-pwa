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
  // The forwarded request host takes precedence: previews and custom domains
  // must never inherit an internal local origin from a server-action request.
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : h.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();
  const redirectTo = new URL("/auth/confirm", origin);
  redirectTo.searchParams.set("next", parsed.data.next);
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { emailRedirectTo: redirectTo.toString() } });
  if (error) redirect("/login?error=send_failed");
  redirect(`/login?sent=1&next=${encodeURIComponent(parsed.data.next)}`);
}
