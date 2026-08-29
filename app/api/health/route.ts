import { NextResponse } from "next/server";
import { withOperationalTimeout } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";

function healthResponse(ok: boolean, status: number) {
  return NextResponse.json(
    { ok, time: new Date().toISOString() },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await withOperationalTimeout(
      supabase.from("treatment_catalog").select("id").eq("active", true).limit(1),
    );

    return healthResponse(!error, error ? 503 : 200);
  } catch {
    return healthResponse(false, 503);
  }
}
