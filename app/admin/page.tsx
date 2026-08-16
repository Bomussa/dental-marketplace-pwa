import { redirect } from "next/navigation";
import { financialReportSummary } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import { AdminChoiceAnalytics } from "@/components/admin-choice-analytics";
import { PrintReportButton } from "@/components/print-report-button";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { BuildingIcon, CheckIcon, ShieldCheckIcon, SlidersIcon, StarIcon, WalletIcon } from "@/components/icons";
import { parseCustomerChoiceAnalytics } from "@/lib/customer-choice-analytics";
import { activateNotificationTemplate, approveSupportKnowledgeArticle, archiveSupportKnowledgeArticle, createNotificationTemplate, createSettlement, createSupportKnowledgeArticle, moderateReview, reviewPriceRevision, updateFeatureFlag, verifyAndActivate } from "./actions";

export const dynamic = "force-dynamic";

type AdminPageProps = { searchParams: Promise<{ days?: string | string[]; clinic?: string | string[]; start?: string | string[]; end?: string | string[] }> };
type FinancialReport = { clinic_id: string; period_start: string; period_end: string; attended_bookings: number; posted_debit_minor: number; posted_credit_minor: number };
type ProposedSnapshot = { price_type?: string; min_minor?: number | null; max_minor?: number | null; duration_minutes?: number };

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAnalyticsDays(value: string | string[] | undefined): 1 | 7 | 30 {
  const raw = firstValue(value);
  return raw === "1" ? 1 : raw === "30" ? 30 : 7;
}

function qatarDate(daysOffset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + daysOffset * 86_400_000));
}

function validDate(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function proposedSummary(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return "بيانات السعر غير متاحة";
  const proposed = snapshot as ProposedSnapshot;
  if (proposed.price_type === "consultation_required") return "بعد الاستشارة";
  const min = typeof proposed.min_minor === "number" ? `${(proposed.min_minor / 100).toFixed(2)} QAR` : "—";
  const max = typeof proposed.max_minor === "number" ? ` – ${(proposed.max_minor / 100).toFixed(2)} QAR` : "";
  return `${proposed.price_type ?? "price"}: ${min}${max} · ${proposed.duration_minutes ?? "—"} min`;
}

function isFinancialReport(value: unknown): value is FinancialReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return typeof report.clinic_id === "string" && typeof report.attended_bookings === "number" && typeof report.posted_debit_minor === "number" && typeof report.posted_credit_minor === "number";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  const days = parseAnalyticsDays(query.days);
  const reportStart = validDate(firstValue(query.start), qatarDate(-29));
  const reportEnd = validDate(firstValue(query.end), qatarDate());
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
    { data: revisions },
    { data: settlements },
    { data: knowledgeArticles },
    { data: notificationTemplates },
    { data: outboxRows },
    analyticsResult,
  ] = await Promise.all([
    supabase.from("clinics").select("id,display_name,legal_name,status,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("branches").select("id,clinic_id,name,status,area").order("created_at", { ascending: false }).limit(100),
    supabase.from("practitioners").select("id,clinic_id,display_name,active,license_ref").limit(100),
    supabase.from("feature_flags").select("key,enabled,config,updated_at").order("key"),
    supabase.from("price_disputes").select("id,branch_id,status,description,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("id,rating,review_text,status,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("offer_revisions").select("id,offer_id,revision_no,proposed_snapshot,reason,created_at").eq("status", "submitted").order("created_at", { ascending: false }).limit(30),
    supabase.from("settlement_periods").select("id,clinic_id,period_start,period_end,period_kind,status,created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("support_knowledge_articles").select("id,slug,locale,title,category,audience,status,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("notification_templates").select("id,template_key,channel,locale,subject,body,status,version,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("notification_outbox").select("id,event_type,channel,locale,status,attempt_count,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.rpc("admin_customer_choice_analytics", { p_days: days }),
  ]);

  const clinicRows = clinics ?? [];
  const selectedClinicId = clinicRows.some((clinic) => clinic.id === firstValue(query.clinic)) ? firstValue(query.clinic)! : clinicRows[0]?.id;
  const selectedClinic = clinicRows.find((clinic) => clinic.id === selectedClinicId);
  const analytics = analyticsResult.error ? null : parseCustomerChoiceAnalytics(analyticsResult.data);
  const pendingSubjects = [
    ...clinicRows.filter((clinic) => clinic.status === "pending").map((clinic) => ({ type: "clinic", id: clinic.id, label: clinic.display_name })),
    ...(branches ?? []).filter((branch) => branch.status === "pending").map((branch) => ({ type: "branch", id: branch.id, label: branch.name })),
    ...(practitioners ?? []).filter((practitioner) => !practitioner.active).map((practitioner) => ({ type: "practitioner", id: practitioner.id, label: practitioner.display_name })),
  ];

  let report: FinancialReport | null = null;
  let reportUnavailable = false;
  if (selectedClinicId) {
    try {
      const response = await financialReportSummary({ clinicId: selectedClinicId, periodStart: reportStart, periodEnd: reportEnd });
      report = isFinancialReport(response) ? response : null;
    } catch {
      reportUnavailable = true;
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="glass-panel rounded-[30px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#007AFF]"><ShieldCheckIcon size={24}/></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">Platform Admin</p><h1 className="mt-1 text-3xl font-black tracking-tight">بوابة التحقق والتشغيل</h1><p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">تُنفَّذ مراجعة السعر والحضور والتسوية عبر وظائف خادمية موحدة؛ لا تنشئ الواجهة قيودًا محاسبية أو حالات حضور مباشرة.</p></div></div><Badge tone="blue">QAR · Asia/Qatar</Badge></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-5"><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{pendingSubjects.length}</div><div className="mt-1 text-xs font-bold text-slate-500">بانتظار التحقق</div></div><div className="rounded-2xl bg-blue-50/75 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-[#0066CC]">{revisions?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">تعديلات سعر معلقة</div></div><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{flags?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">Feature flags</div></div><div className="rounded-2xl bg-amber-50/75 p-4 ring-1 ring-amber-100"><div className="text-2xl font-black text-amber-800">{reviews?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">تقييمات معلقة</div></div><div className="rounded-2xl bg-red-50/75 p-4 ring-1 ring-red-100"><div className="text-2xl font-black text-red-700">{disputes?.length ?? 0}</div><div className="mt-1 text-xs font-bold text-slate-500">نزاعات سعر حديثة</div></div></div>
      </section>

      {analytics ? <AdminChoiceAnalytics analytics={analytics} days={days} /> : <Card className="mt-7 border border-red-200 bg-red-50/70 p-5 text-red-800"><div className="font-black">تعذر تحميل Customer Intelligence</div><p className="mt-2 text-sm font-medium">لم يتم تحويل الخطأ إلى أرقام صفرية حتى لا تختلط مشكلة تقنية مع عدم وجود طلب حقيقي.</p></Card>}

      <section className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><BuildingIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">عناصر تنتظر التحقق</h2></div><div className="mt-4 space-y-3">{pendingSubjects.length ? pendingSubjects.map((subject) => <form key={`${subject.type}-${subject.id}`} action={verifyAndActivate} className="rounded-[22px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="subject_type" value={subject.type}/><input type="hidden" name="subject_id" value={subject.id}/><div className="flex items-center justify-between gap-3"><div><div className="font-black">{subject.label}</div><div className="mt-1 text-xs font-bold text-slate-500">{subject.type}</div></div><Badge tone="amber">pending</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input name="source" required placeholder="مصدر التحقق"/><Input name="identifier" placeholder="رقم/مرجع الترخيص"/><Button className="gap-2"><CheckIcon size={17}/>تحقق وفعّل</Button></div></form>) : <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">لا توجد عناصر معلقة حاليًا.</div>}</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><SlidersIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">Feature Flags</h2></div><div className="mt-4 space-y-3">{flags?.map((flag) => <form action={updateFeatureFlag} key={flag.key} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="key" value={flag.key}/><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-black">{flag.key}</div><div className="mt-1 text-xs font-bold text-slate-500">{flag.enabled ? "Enabled" : "Disabled"}</div></div><Badge tone={flag.enabled ? "green" : "slate"}>{flag.enabled ? "ON" : "OFF"}</Badge></div><div className="mt-3 flex gap-2"><Select name="enabled" defaultValue={String(flag.enabled)}><option value="false">Disabled</option><option value="true">Enabled</option></Select><Button>حفظ</Button></div></form>)}</div></Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">مراجعة تعديلات الأسعار</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">الاعتماد يحدّث العرض من لقطة الاقتراح الذرية؛ الرفض يسجل سببه داخل سجل المراجعة.</p><div className="mt-4 space-y-3">{revisions?.length ? revisions.map((revision) => <form key={revision.id} action={reviewPriceRevision} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="revision_id" value={revision.id}/><div className="flex items-start justify-between gap-3"><div><div className="font-black">عرض {revision.offer_id.slice(0, 8)} · v{revision.revision_no}</div><div className="mt-1 text-xs font-bold text-slate-600">{proposedSummary(revision.proposed_snapshot)}</div><p className="mt-2 text-xs leading-5 text-slate-500">سبب العيادة: {revision.reason}</p></div><Badge tone="amber">submitted</Badge></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Input name="reason" minLength={3} placeholder="سبب الرفض (مطلوب للرفض)"/><button type="submit" name="decision" value="approve" className="rounded-full bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700">اعتماد</button><button type="submit" name="decision" value="reject" className="rounded-full bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">رفض</button></div></form>) : <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">لا توجد تعديلات أسعار بانتظار المراجعة.</p>}</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-emerald-600"/><h2 className="font-black">إنشاء فترة تسوية</h2></div><form action={createSettlement} className="mt-4 grid gap-3"><Select name="clinic_id" required>{clinicRows.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.display_name}</option>)}</Select><div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs font-bold text-slate-600">البداية<Input name="period_start" type="date" defaultValue={reportStart} required/></label><label className="grid gap-1 text-xs font-bold text-slate-600">النهاية<Input name="period_end" type="date" defaultValue={reportEnd} required/></label></div><Select name="period_kind" defaultValue="monthly"><option value="weekly">weekly</option><option value="monthly">monthly</option><option value="annual">annual</option><option value="manual">manual</option></Select><Input name="notes" maxLength={1000} placeholder="ملاحظات اختيارية"/><Button>إنشاء فترة مفتوحة</Button></form><div className="mt-4 space-y-2 text-xs">{settlements?.length ? settlements.slice(0, 6).map((settlement) => <div key={settlement.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span>{settlement.period_start} — {settlement.period_end}</span><Badge tone={settlement.status === "closed" ? "green" : "slate"}>{settlement.status}</Badge></div>) : <span className="text-slate-500">لا توجد فترات تسوية بعد.</span>}</div></Card>
      </section>

      <section id="financial-report" className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">تقرير الحضور والمحاسبة</h2></div><div className="flex flex-wrap gap-2"><PrintReportButton/>{selectedClinicId && <a href={`/api/admin/reports/csv?clinic=${encodeURIComponent(selectedClinicId)}&start=${encodeURIComponent(reportStart)}&end=${encodeURIComponent(reportEnd)}`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:bg-slate-50">CSV</a>}</div></div><form method="get" className="mt-4 grid gap-3 sm:grid-cols-4"><Select name="clinic" defaultValue={selectedClinicId}>{clinicRows.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.display_name}</option>)}</Select><Input name="start" type="date" defaultValue={reportStart}/><Input name="end" type="date" defaultValue={reportEnd}/><Button>تحديث التقرير</Button></form>{report ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-blue-50 p-4"><div className="text-2xl font-black text-[#0066CC]">{report.attended_bookings}</div><div className="mt-1 text-xs font-bold text-slate-600">مرضى حضروا</div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-2xl font-black">{(report.posted_debit_minor / 100).toFixed(2)}</div><div className="mt-1 text-xs font-bold text-slate-600">إجمالي مدين QAR</div></div><div className="rounded-2xl bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-700">{(report.posted_credit_minor / 100).toFixed(2)}</div><div className="mt-1 text-xs font-bold text-slate-600">إجمالي دائن QAR</div></div></div> : <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">{reportUnavailable ? "تعذر تحميل التقرير التشغيلي الآن؛ تحقّق من مفتاح الخدمة الخادمي في بيئة النشر." : "لا توجد عيادة متاحة للتقرير."}</p>}<p className="mt-4 text-xs leading-5 text-slate-500">النطاق: {reportStart} إلى {reportEnd} · {selectedClinic?.display_name ?? "—"}. لا يجمع التقرير حجوزات عُكس حضورها ولا يستبدل دفتر الأستاذ بقيود واجهة.</p></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><StarIcon size={19} className="text-amber-500"/><h2 className="font-black">تقييمات تنتظر المراجعة</h2></div><div className="mt-4 space-y-3">{reviews?.length ? reviews.map((review) => <form key={review.id} action={moderateReview} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><input type="hidden" name="id" value={review.id}/><div className="font-bold"><span className="inline-flex items-center gap-1"><StarIcon size={14} className="text-amber-500"/>{review.rating}/5</span> · {review.review_text || "بدون نص"}</div><div className="mt-3 flex gap-2"><Select name="status" defaultValue="published"><option value="published">published</option><option value="hidden">hidden</option><option value="removed">removed</option></Select><Button>اعتماد</Button></div></form>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد تقييمات معلقة.</p>}</div><div className="mt-6 border-t border-slate-200 pt-6"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-red-500"/><h2 className="font-black">نزاعات السعر الحديثة</h2></div><div className="mt-4 space-y-2">{disputes?.length ? disputes.map((dispute) => <div key={dispute.id} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><div className="text-sm font-bold">{dispute.description}</div><div className="mt-2"><Badge tone={dispute.status === "resolved" ? "green" : "amber"}>{dispute.status}</Badge></div></div>) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد نزاعات.</p>}</div></div></Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheckIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">قاعدة معرفة المساعد</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">لا يستخدم المساعد إلا المقالات المعتمدة للجمهور وباللغة المطابقة للمحادثة. تعطيل المقال يحوله إلى archived فيختفي فورًا من مصادر المساعد العامة.</p><form action={createSupportKnowledgeArticle} className="mt-4 grid gap-3"><div className="grid grid-cols-2 gap-2"><Input name="slug" required pattern="[a-z0-9-]{3,100}" placeholder="slug-en-lowercase"/><Select name="locale" defaultValue="ar"><option value="ar">العربية</option><option value="en">English</option></Select></div><div className="grid grid-cols-2 gap-2"><Select name="category" defaultValue="booking"><option value="booking">booking</option><option value="pricing">pricing</option><option value="availability">availability</option><option value="account">account</option><option value="clinic">clinic</option><option value="policy">policy</option><option value="safety">safety</option></Select><Select name="audience" defaultValue="public"><option value="public">public</option><option value="clinic">clinic</option><option value="admin">admin</option></Select></div><Input name="title" required maxLength={200} placeholder="عنوان المقال"/><textarea name="body_markdown" required minLength={10} maxLength={20000} className="min-h-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-[#007AFF]/20 transition focus:ring-4" placeholder="المحتوى المعتمد للمساعد"/><Button>حفظ كمسودة</Button></form><div className="mt-5 space-y-2">{knowledgeArticles?.length ? knowledgeArticles.map((article) => <div key={article.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200/60"><div className="flex items-center justify-between gap-3"><div><div className="font-black">{article.title}</div><div className="mt-1 text-xs text-slate-500">{article.locale} · {article.category} · {article.audience}</div></div><Badge tone={article.status === "approved" ? "green" : article.status === "archived" ? "slate" : "amber"}>{article.status}</Badge></div><div className="mt-2 flex flex-wrap gap-2">{article.status === "draft" && <form action={approveSupportKnowledgeArticle}><input type="hidden" name="id" value={article.id}/><Button className="min-h-8 px-3 py-1 text-xs">اعتماد للمساعد</Button></form>}{article.status !== "archived" && <form action={archiveSupportKnowledgeArticle}><input type="hidden" name="id" value={article.id}/><Button className="min-h-8 bg-slate-700 px-3 py-1 text-xs hover:bg-slate-800">تعطيل المقال</Button></form>}</div></div>) : <p className="text-sm text-slate-500">لا توجد مقالات معرفة بعد.</p>}</div></Card>
        <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><WalletIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">قوالب الإشعارات وصندوق الإرسال</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">تُنشأ أحداث الحجز والحضور في صندوق الإرسال ذرّيًا؛ لا يبدأ التسليم الخارجي حتى إعداد مزود معتمد.</p><form action={createNotificationTemplate} className="mt-4 grid gap-3"><div className="grid grid-cols-3 gap-2"><Input name="template_key" required pattern="[a-z0-9_.-]{3,80}" placeholder="booking_confirmed"/><Select name="channel" defaultValue="push"><option value="push">push</option><option value="email">email</option><option value="sms">sms</option></Select><Select name="locale" defaultValue="ar"><option value="ar">العربية</option><option value="en">English</option></Select></div><Input name="subject" maxLength={200} placeholder="العنوان (اختياري للبريد)"/><textarea name="body" required maxLength={4000} className="min-h-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-[#007AFF]/20 transition focus:ring-4" placeholder="نص القالب"/><Button>حفظ القالب كمسودة</Button></form><div className="mt-5 space-y-2">{notificationTemplates?.length ? notificationTemplates.map((template) => <div key={template.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200/60"><div className="flex items-center justify-between gap-3"><div><div className="font-black">{template.template_key} · v{template.version}</div><div className="mt-1 text-xs text-slate-500">{template.channel} · {template.locale}</div></div><Badge tone={template.status === "active" ? "green" : "amber"}>{template.status}</Badge></div>{template.status === "draft" && <form action={activateNotificationTemplate} className="mt-2"><input type="hidden" name="id" value={template.id}/><Button className="min-h-8 px-3 py-1 text-xs">تفعيل القالب</Button></form>}</div>) : <p className="text-sm text-slate-500">لا توجد قوالب بعد.</p>}</div><div className="mt-5 border-t border-slate-200 pt-4"><div className="text-sm font-black">آخر عناصر صندوق الإرسال</div><div className="mt-2 space-y-2">{outboxRows?.length ? outboxRows.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span>{item.event_type} · {item.channel} · {item.locale}</span><Badge tone={item.status === "sent" ? "green" : item.status === "failed" ? "red" : "amber"}>{item.status} · {item.attempt_count}</Badge></div>) : <span className="text-xs text-slate-500">لا توجد عناصر إرسال مسجلة بعد.</span>}</div></div></Card>
      </section>
    </main>
  );
}
