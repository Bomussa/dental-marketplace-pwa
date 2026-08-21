import { NextResponse } from "next/server";
import { withOperationalTimeout } from "@/lib/operations.server";
import { serverOperationsConfigured } from "@/lib/server-readiness";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { count, error } = await withOperationalTimeout(
      supabase.from("treatment_catalog").select("id", { count: "exact", head: true }).eq("active", true),
    );
    if (error) {
      return NextResponse.json(
        { ok: false, database: false, server_operations: serverOperationsConfigured() },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        database: true,
        server_operations: serverOperationsConfigured(),
        treatments: count ?? 0,
        time: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, database: false, server_operations: serverOperationsConfigured() },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
