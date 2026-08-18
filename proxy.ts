import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.pathname === "/" && code) {
    const confirmationUrl = request.nextUrl.clone();
    confirmationUrl.pathname = "/auth/confirm";
    confirmationUrl.search = "";
    confirmationUrl.searchParams.set("code", code);
    return NextResponse.redirect(confirmationUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
