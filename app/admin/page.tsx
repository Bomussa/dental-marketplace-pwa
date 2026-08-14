import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { moderateReview, updateFeatureFlag, verifyAndActivate } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const meta = (claimsData?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  if (error || !claimsData?.claims?.sub || meta.platform_admin !== true) redirect("/");
  const [{ data: clinics }, { data: branches }, { data: practitioners }, { data: flags }, { data: disputes }, { data: reviews }] = await Promise.all([
    supabase.from("clinics").select("id,display_name,legal_name,status,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("branches").select("id,clinic_id,name,status,area").order("created_at", { ascending: false }).limit(100),
    supabase.from("practitioners").select("id,clinic_id,display_name,active,license_ref").limit(100),
    supabase.from("feature_flags").select("key,enabled,config,updated_at").order("key"),
    supabase.from("price_disputes").select("id,branch_id,status,description,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("id,rating,review_text,status,created_at").eq("status","pending").order("created_at",{ascending:false}).limit(20),
  ]);
  const pendingSubjects = [
    ...(clinics ?? []).filter((x) => x.status === "pending").map((x) => ({ type: "clinic", id:x.id, label:x.display_name })),
    ...(branches ?? []).filter((x) => x.status === "pending").map((x) => ({ type: "branch", id:x.id, label:x.name })),
    ...(practitioners ?? []).filter((x) => !x.active).map((x) => ({ type: "practitioner", id:x.id, label:x.display_name })),
  ];
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div><p className="text-sm font-bold text-teal-700">Platform Admin</p><h1 className="mt-1 text-3xl font-black">بوابة التحقق والتشغيل</h1><p className="mt-2 text-sm text-slate-500">صلاحية الإدارة تأتي من app_metadata غير القابل لتعديل المستخدم، وRLS يعيد التحقق في PostgreSQL.</p></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="font-black">عناصر تنتظر التحقق</h2><div className="mt-4 space-y-3">{pendingSubjects.length ? pendingSubjects.map((s) => <form key={`${s.type}-${s.id}`} action={verifyAndActivate} className="rounded-2xl bg-slate-50 p-4"><input type="hidden" name="subject_type" value={s.type}/><input type="hidden" name="subject_id" value={s.id}/><div className="flex items-center justify-between gap-3"><div><div className="font-black">{s.label}</div><div className="text-xs text-slate-500">{s.type}</div></div><Badge tone="amber">pending</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input name="source" required placeholder="مصدر التحقق"/><Input name="identifier" placeholder="رقم/مرجع الترخيص"/><Button className="bg-teal-600">تحقق وفعّل</Button></div></form>) : <p className="text-sm text-slate-500">لا توجد عناصر معلقة.</p>}</div></Card><Card className="p-5"><h2 className="font-black">Feature Flags</h2><div className="mt-4 space-y-3">{flags?.map((f) => <form action={updateFeatureFlag} key={f.key} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><input type="hidden" name="key" value={f.key}/><div><div className="font-black">{f.key}</div><div className="text-xs text-slate-500">{f.enabled ? "Enabled" : "Disabled"}</div></div><Select name="enabled" defaultValue={String(f.enabled)} className="w-36"><option value="false">Disabled</option><option value="true">Enabled</option></Select><Button className="ms-2">حفظ</Button></form>)}</div></Card></div><Card className="mt-6 p-5"><h2 className="font-black">تقييمات تنتظر المراجعة</h2><div className="mt-4 space-y-3">{reviews?.length ? reviews.map((r:{id:string;rating:number;review_text:string|null;status:string}) => <form key={r.id} action={moderateReview} className="rounded-xl bg-slate-50 p-3"><input type="hidden" name="id" value={r.id}/><div className="font-bold">{r.rating}/5 · {r.review_text || "بدون نص"}</div><div className="mt-2 flex gap-2"><Select name="status" defaultValue="published" className="w-40"><option value="published">published</option><option value="hidden">hidden</option><option value="removed">removed</option></Select><Button>اعتماد</Button></div></form>) : <p className="text-sm text-slate-500">لا توجد تقييمات معلقة.</p>}</div></Card><Card className="mt-6 p-5"><h2 className="font-black">نزاعات السعر الحديثة</h2><div className="mt-4 space-y-2">{disputes?.length ? disputes.map((d) => <div key={d.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-bold">{d.description}</div><div className="mt-1 text-xs text-slate-500">{d.status}</div></div>) : <p className="text-sm text-slate-500">لا توجد نزاعات.</p>}</div></Card></main>;
}
