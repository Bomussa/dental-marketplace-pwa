import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { choiceEventSchema } from "@/lib/validation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return json({ error: "forbidden_origin" }, 403);
    } catch {
      return json({ error: "invalid_origin" }, 403);
    }
  }

  const payload = await request.json().catch(() => null);
  const parsed = choiceEventSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "invalid_choice_event" }, 400);

  const { error } = await supabase.from("customer_choice_events").insert(parsed.data);
  if (error?.code === "23505") return json({ ok: true, duplicate: true }, 200);
  if (error) {
    console.error("choice_event_insert_failed", { code: error.code, message: error.message });
    return json({ error: "choice_event_not_recorded" }, 503);
  }
  return json({ ok: true }, 201);
}
