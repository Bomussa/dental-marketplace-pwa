import { NextRequest, NextResponse } from "next/server";
import { publicWriteRequestOriginIsAllowed } from "@/lib/public-write-request-guard";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!publicWriteRequestOriginIsAllowed(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403, headers: { "cache-control": "no-store" } });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
