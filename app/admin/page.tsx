import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { BuildingIcon, CheckIcon, ShieldCheckIcon, SlidersIcon, StarIcon, WalletIcon } from "@/components/icons";
import { AdminChoiceAnalytics } from "@/components/admin-choice-analytics";
import { parseCustomerChoiceAnalytics } from "@/lib/customer-choice-analytics";
import { moderateReview, updateFeatureFlag, verifyAndActivate } from "./actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{ days?: string | string[] }>;
};

function parseAnalyticsDays(value: string | string[] | undefined): 1 | 7 | 30 {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "1") return 1;
  if (raw === "30") return 30;
  return 7;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  const days = parseAnalyticsDays(query.days);
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const meta = (claimsData?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  if (error || !claimsData?.claims?.sub || meta.platform_admin !== true) redirect("/");

  const [
    { data: clinics },
    { data: branches },
    { data: practitioners },
    { data: flags },
    { data: disputes },
    { data: reviews },
    analyticsResult,
  ] = await Promise.all([
    supabase.from("clinics").select("id,display_name,legal_name,status,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("branches").select("id,clinic_id,name,status,area").order("created_at", { ascending: false }).limit(100),
    supabase.from("practitioners").select("id,clinic_id,display_name,active,license_ref").limit(100),
    supabase.from("feature_flags").select("key,enabled,config,updated_at").order("key"),
    supabase.from("price_disputes").select("id,branch_id,status,description,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("id,rating,review_text,status,created_at").eq("status", "pending").order("created_at", { ascending:false }).limit(20),
    supabase.rpc("admin_customer_choice_analytics", { p_days: days }),
  ]);

  const analytics = analyticsResult.error ? null : parseCustomerChoiceAnalytics(analyticsResult.data);

  const pendingSubjects = [
    ...(clinics ?? []).filter((x) => x.status === "pending").map((x) => ({ type: "clinic", id:x.id, label:x.display_name })),
    ...(branches ?? []).filter((x) => x.status === "pending").map((x) => ({ type: "branch", id:x.id, label:x.name })),
    ...(practitioners ?? []).filter((x) => !x.active).map((x) => ({ type: "practitioner", id:x.id, label:x.display_name })),
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="glass-panel rounded-[30px] p-5 sm:p-7">
        <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#007AFF]"><ShieldCheckIcon size={24}/></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">Platform Admin</p><h1 className="mt-1 text-3xl font-black tracking-tight">بوابة التحقق والتشغيل</h1><p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">صلاحية الإدارة تأتي من app_metadata، وRLS يعيد التحقق من الصلاحية داخل PostgreSQL قبل العمليات الحساسة.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{pendingSubjects.length}</div><div className="mt-1 text-xs font-bold text-slate-500">بانتظار التحقق</div></div><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{flags?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">Feature flags</div></div><div className="rounded-2xl bg-amber-50/75 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-800">{reviews?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">تقييمات معلقة</div></div><div className="rounded-2xl bg-red-50/75 p-4 ring-1 ring-red-100"><div className="text-2xl font-black text-red-700">{disputes?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">نزاعات سعر حديثة</div></div></div>
      </section>

      {analytics ? (
        <AdminChoiceAnalytics analytics={analytics} days={days} />
      ) : (
        <Card className="mt-7 border border-red-200 bg-red-50/70 p-5 text-red-800">
          <div className="font-black">تعذر تحميل Customer Intelligence</div>
          <p className="mt-2 text-sm font-medium">لم يتم تحويل الخطأ إلى أرقام صفرية حتى لا تختلط مشكلة تقنية مع عدم وجود طلب حقيقي. {analyticsResult.error?.message}</p>
        </Card>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><BuildingIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">عناصر تنتظر التحقق</h2></div><div className="mt-4 space-y-3">{pendingSubjects.length ? pendingSubjects.map((s) => <form key={`${s.type}-${s.id}`} action={verifyAndActivate} className="rounded-[22px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="subject_type" value={s.type}/><input type="hidden" name="subject_id" value={s.id}/><div className="flex items-center justify-between gap-3"><div><div className="font-black">{s.label}</div><div className="mt-1 text-xs font-bold text-slate-500">{s.type}</div></div><Badge tone="amber">pending</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input name="source" required placeholder="مصدر التحقق"/><Input name="identifier" placeholder="رقم/مرجع الترخيص"/><Button className="gap-2"><CheckIcon size={17}/>تحقق وفعّل</Button></div></form>) : <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">لا توجد عناصر معلقة حاليًا.</div>}</div></Card>

        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><SlidersIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">Feature Flags</h2></div><div className="mt-4 space-y-3">{flags?.map((f) => <form action={updateFeatureFlag} key={f.key} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="key" value={f.key}/><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-black">{f.key}</div><div className="mt-1 text-xs font-bold text-slate-500">{f.enabled ? "Enabled" : "Disabled"}</div></div><Badge tone={f.enabled ? "green" : "slate"}>{f.enabled ? "ON" : "OFF"}</Badge></div><div className="mt-3 flex gap-2"><Select name="enabled" defaultValue={String(f.enabled)}><option value="false">Disabled</option><option value="true">Enabled</option></Select><Button>حفظ</Button></div></form>)}</div></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><StarIcon size={19} className="text-amber-500"/><h2 className="font-black">تقييمات تنتظر المراجعة</h2></div><div className="mt-4 space-y-3">{reviews?.length ? reviews.map((r:{id:string;rating:number;review_text:string|null;status:string}) => <form key={r.id} action={moderateReview} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="id" value={r.id}/><div className="font-bold"><span className="inline-flex items-center gap-1"><StarIcon size={14} className="text-amber-500"/>{r.rating}/5</span> · {r.review_text || "بدون نص"}</div><div className="mt-3 flex gap-2"><Select name="status" defaultValue="published"><option value="published">published</option><option value="hidden">hidden</option><option value="removed">removed</option></Select><Button>اعتماد</Button></div></form>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد تقييمات معلقة.</p>}</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-red-500"/><h2 className="font-black">نزاعات السعر الحديثة</h2></div><div className="mt-4 space-y-2">{disputes?.length ? disputes.map((d) => <div key={d.id} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><div className="text-sm font-bold">{d.description}</div><div className="mt-2"><Badge tone={d.status === "resolved" ? "green" : "amber"}>{d.status}</Badge></div></div>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد نزاعات.</p>}</div></Card>
      </div>
    </main>
  );
}
