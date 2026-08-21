import { NextRequest, NextResponse } from "next/server";
import { publicWriteRequestOriginIsAllowed } from "@/lib/public-write-request-guard";
import { withOperationalTimeout } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!publicWriteRequestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const supabase = await createClient();
  const claimsResult = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => null);
  if (claimsResult === null) {
    return NextResponse.json({ error: "signout_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (claimsResult.data?.claims) {
    const signOutResult = await withOperationalTimeout(supabase.auth.signOut()).catch(() => null);
    if (signOutResult === null || signOutResult.error) {
      return NextResponse.json({ error: "signout_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
