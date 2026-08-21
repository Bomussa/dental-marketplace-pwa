import { NextRequest, NextResponse } from "next/server";
import { publicWriteRequestOriginIsAllowed } from "@/lib/public-write-request-guard";
import { withOperationalTimeout } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!publicWriteRequestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const supabase = await createClient();
  const { data } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null }));
  if (data?.claims) await withOperationalTimeout(supabase.auth.signOut()).catch(() => undefined);
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
