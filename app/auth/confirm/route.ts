import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = request.nextUrl.searchParams.get("next") || "/account";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/account";

  let error: Error | null = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  else error = new Error("missing auth token");

  const target = request.nextUrl.clone();
  target.pathname = error ? "/login" : next;
  target.search = error ? "?error=confirm_failed" : "";
  return NextResponse.redirect(target);
}
