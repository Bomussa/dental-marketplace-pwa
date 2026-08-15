import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Select } from "@/components/ui";
import { CalendarIcon, ClockIcon, StarIcon, UserIcon } from "@/components/icons";
import { archivePatientProfile, cancelBooking, createPatientProfile, submitReview } from "./actions";

export const dynamic = "force-dynamic";

type BookingRow = { id:string; booking_code:string; start_at:string; end_at:string; status:string; offer_snapshot:unknown; created_at:string };
type ReviewRow = { booking_id:string; status:string; rating:number };
type PatientProfileRow = { id:string; display_name:string; relationship:string; date_of_birth:string | null; gender:string | null; created_at:string };

const statusLabel: Record<string, string> = {
  pending_hold: "قيد تأمين الموعد",
  pending_clinic_confirmation: "بانتظار تأكيد العيادة",
  confirmed: "مؤكد",
  checked_in: "تم الوصول",
  completed: "مكتمل",
  patient_cancelled: "ملغي من المريض",
  clinic_cancelled: "ملغي من العيادة",
  no_show: "لم يحضر",
  failed: "غير مكتمل",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (error || !userId) redirect("/login?next=/account");

  const [{ data: profile }, { data: bookingData }, { data: reviewData }, { data: patientProfileData }] = await Promise.all([
    supabase.from("profiles").select("display_name,phone,locale,created_at").eq("id", userId).maybeSingle(),
    supabase.from("bookings").select("id,booking_code,start_at,end_at,status,offer_snapshot,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("booking_id,status,rating").eq("patient_id", userId),
    supabase.from("patient_profiles").select("id,display_name,relationship,date_of_birth,gender,created_at").is("archived_at", null).order("created_at", { ascending: true }),
  ]);

  const bookings = (bookingData ?? []) as BookingRow[];
  const reviews = (reviewData ?? []) as ReviewRow[];
  const patientProfiles = (patientProfileData ?? []) as PatientProfileRow[];
  const reviewed = new Map(reviews.map((r) => [r.booking_id, r]));
  const upcoming = bookings.filter((b) => ["pending_hold", "pending_clinic_confirmation", "confirmed", "checked_in"].includes(b.status)).length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="glass-panel rounded-[30px] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-blue-50 text-[#007AFF]"><UserIcon size={26}/></span>
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">حساب المريض</p><h1 className="mt-1 truncate text-3xl font-black tracking-tight">{profile?.display_name || "حسابي"}</h1><p className="mt-1 text-sm font-medium text-slate-500">ملف شخصي مُقلّل البيانات، بدون تشخيصات أو صور أشعة أو وصفات.</p></div>
          </div>
          <form action="/auth/signout" method="post"><button className="min-h-11 rounded-full bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">تسجيل الخروج</button></form>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{bookings.length}</div><div className="mt-1 text-xs font-bold text-slate-500">كل الحجوزات</div></div>
          <div className="rounded-2xl bg-blue-50/75 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-[#0066CC]">{upcoming}</div><div className="mt-1 text-xs font-bold text-slate-500">قادمة أو قيد التأكيد</div></div>
          <div className="rounded-2xl bg-emerald-50/75 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-700">{completed}</div><div className="mt-1 text-xs font-bold text-slate-500">زيارات مكتملة</div></div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#0066CC]">Family profiles</p><h2 className="mt-1 text-2xl font-black">لمن تحجز المواعيد؟</h2><p className="mt-1 text-sm font-medium text-slate-500">أضف أفراد العائلة بالحد الأدنى من البيانات. لا نخزن أي ملف طبي هنا.</p></div><UserIcon className="text-[#007AFF]" size={24}/></div>
        <Card className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">{patientProfiles.map((patientProfile) => <div key={patientProfile.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70"><div><p className="font-black">{patientProfile.display_name}</p><p className="mt-1 text-xs font-bold text-slate-500">{patientProfile.relationship === "self" ? "أنا" : patientProfile.relationship === "child" ? "ابن/ابنة" : patientProfile.relationship === "spouse" ? "زوج/زوجة" : patientProfile.relationship === "parent" ? "أب/أم" : "فرد من العائلة"}</p></div>{patientProfile.relationship !== "self" && <form action={archivePatientProfile}><input type="hidden" name="patient_profile_id" value={patientProfile.id}/><button className="min-h-11 rounded-full px-3 text-xs font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-50">أرشفة</button></form>}</div>)}</div>
          <form action={createPatientProfile} className="mt-5 grid gap-3 border-t border-slate-200/70 pt-5 sm:grid-cols-[1fr_180px_auto]">
            <input name="display_name" required maxLength={120} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10" placeholder="اسم الشخص كما تريد أن يظهر"/>
            <Select name="relationship" defaultValue="child"><option value="child">ابن/ابنة</option><option value="spouse">زوج/زوجة</option><option value="parent">أب/أم</option><option value="other">فرد آخر</option></Select>
            <Button>إضافة شخص</Button>
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#0066CC]">Bookings</p><h2 className="mt-1 text-2xl font-black">حجوزاتي</h2></div><CalendarIcon className="text-[#007AFF]" size={24}/></div>
        {bookings.length === 0 ? <Card className="p-10 text-center"><CalendarIcon className="mx-auto text-slate-300" size={34}/><h3 className="mt-4 font-black">لا توجد حجوزات بعد</h3><p className="mt-2 text-sm text-slate-500">ابدأ من البحث، واختر عرضًا لديه موعد صالح للحجز.</p></Card> : <div className="space-y-4">{bookings.map((b) => {
          const snap = (b.offer_snapshot ?? {}) as Record<string, unknown>;
          const canCancel = ["pending_hold", "pending_clinic_confirmation", "confirmed"].includes(b.status);
          const existingReview = reviewed.get(b.id);
          const tone = b.status === "completed" ? "green" : b.status.includes("cancel") || b.status === "failed" ? "red" : "blue";
          return <Card key={b.id} className="lift overflow-hidden p-0"><div className="grid md:grid-cols-[1fr_230px]"><div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black">{String(snap.variant_name_ar ?? snap.treatment_name_ar ?? "حجز أسنان")}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarIcon size={14}/>{new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" }).format(new Date(b.start_at))}</span><span dir="ltr">#{b.booking_code}</span></div></div><Badge tone={tone}>{statusLabel[b.status] ?? b.status}</Badge></div>{canCancel && <form action={cancelBooking} className="mt-5"><input type="hidden" name="booking_id" value={b.id}/><Button className="bg-white text-red-700 shadow-none ring-1 ring-red-200 hover:bg-red-50">إلغاء الحجز</Button></form>}</div><aside className="border-t border-slate-200/70 bg-slate-50/60 p-5 md:border-s md:border-t-0"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><ClockIcon size={15}/>حالة الزيارة</div><div className="mt-2 text-sm font-black">{statusLabel[b.status] ?? b.status}</div>{b.status === "completed" && <div className="mt-4">{existingReview ? <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"><div className="flex items-center gap-1.5 font-black"><StarIcon size={15} className="text-amber-500"/>{existingReview.rating}/5</div><div className="mt-1 text-xs font-bold text-slate-500">{existingReview.status}</div></div> : <span className="text-xs font-bold text-slate-500">يمكنك تقييم هذه الزيارة.</span>}</div>}</aside></div>{b.status === "completed" && !existingReview && <form action={submitReview} className="border-t border-slate-200/70 bg-white/70 p-5 sm:p-6"><input type="hidden" name="booking_id" value={b.id}/><div className="flex items-center gap-2 text-sm font-black"><StarIcon size={18} className="text-amber-500"/>قيّم زيارتك الموثقة</div><div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><Select name="rating" defaultValue="5"><option value="5">5 / 5</option><option value="4">4 / 5</option><option value="3">3 / 5</option><option value="2">2 / 5</option><option value="1">1 / 5</option></Select><textarea name="review_text" maxLength={1500} className="min-h-12 rounded-2xl border border-slate-200/80 bg-white p-3 text-sm font-medium outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10" placeholder="اكتب تجربتك بدون معلومات طبية حساسة"/><Button>إرسال للمراجعة</Button></div></form>}</Card>;
        })}</div>}
      </section>
    </main>
  );
}
