import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { count, error } = await supabase.from("treatment_catalog").select("id", { count: "exact", head: true }).eq("active", true);
  if (error) return NextResponse.json({ ok: false, database: false }, { status: 503 });
  return NextResponse.json({ ok: true, database: true, treatments: count ?? 0, time: new Date().toISOString() });
}
