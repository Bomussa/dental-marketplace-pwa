import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deviceInstallationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = deviceInstallationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "بيانات التثبيت غير صالحة" }, { status: 400 });

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const accountId = claimsData?.claims?.sub ?? null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "الخدمة غير متاحة مؤقتًا" }, { status: 503 });
  }

  const { error } = await admin.from("device_installations").upsert({
    ...parsed.data,
    account_id: accountId,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "installation_id" });
  if (error) return NextResponse.json({ error: "تعذر تحديث التثبيت" }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
