import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextResponse, type NextRequest } from "next/server";

const OPERATIONAL_CLIENT_SCOPE = "clinic_bookings_only";
const OPERATIONAL_CLIENT_ALLOWED_PATHS = new Set(["/clinic/bookings", "/auth/signout", "/operation-error"]);

function carrySessionCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  return to;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(cacheHeaders).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const appMetadata = (data?.claims?.app_metadata ?? {}) as { access_scope?: string };
  const path = request.nextUrl.pathname;
  const shouldRestrict = appMetadata.access_scope === OPERATIONAL_CLIENT_SCOPE
    && !OPERATIONAL_CLIENT_ALLOWED_PATHS.has(path)
    && !path.startsWith("/api/");
  if (shouldRestrict) {
    const target = request.nextUrl.clone();
    target.pathname = "/clinic/bookings";
    target.search = "";
    return carrySessionCookies(response, NextResponse.redirect(target));
  }

  return response;
}
