import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Select } from "@/components/ui";
import { cancelBooking, submitReview } from "./actions";

export const dynamic = "force-dynamic";

type BookingRow = { id:string; booking_code:string; start_at:string; end_at:string; status:string; offer_snapshot:unknown; created_at:string };
type ReviewRow = { booking_id:string; status:string; rating:number };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (error || !userId) redirect("/login?next=/account");
  const [{ data: profile }, { data: bookingData }, { data: reviewData }] = await Promise.all([
    supabase.from("profiles").select("display_name,phone,locale,created_at").eq("id", userId).maybeSingle(),
    supabase.from("bookings").select("id,booking_code,start_at,end_at,status,offer_snapshot,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("booking_id,status,rating").eq("patient_id", userId),
  ]);
  const bookings = (bookingData ?? []) as BookingRow[];
  const reviews = (reviewData ?? []) as ReviewRow[];
  const reviewed = new Map(reviews.map((r) => [r.booking_id, r]));
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-teal-700">حساب المريض</p><h1 className="mt-1 text-3xl font-black">{profile?.display_name || "حسابي"}</h1><p className="mt-2 text-sm text-slate-500">الملف الشخصي مُقلّل البيانات؛ لا نخزن فيه تشخيصًا أو صور أشعة أو وصفات.</p></div><form action="/auth/signout" method="post"><button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">تسجيل الخروج</button></form></div><section className="mt-8 grid gap-4"><h2 className="text-xl font-black">حجوزاتي</h2>{bookings.length === 0 ? <Card className="p-8 text-sm text-slate-500">لا توجد حجوزات بعد.</Card> : bookings.map((b) => { const snap = (b.offer_snapshot ?? {}) as Record<string, unknown>; const canCancel=["pending_hold","pending_clinic_confirmation","confirmed"].includes(b.status); const existingReview=reviewed.get(b.id); return <Card key={b.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black">{String(snap.variant_name_ar ?? snap.treatment_name_ar ?? "حجز أسنان")}</div><div className="mt-1 text-xs text-slate-500">الكود: <span dir="ltr">{b.booking_code}</span> · {new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" }).format(new Date(b.start_at))}</div></div><Badge tone={b.status === "completed" ? "green" : b.status.includes("cancel") || b.status === "failed" ? "red" : "blue"}>{b.status}</Badge></div>{canCancel && <form action={cancelBooking} className="mt-4"><input type="hidden" name="booking_id" value={b.id}/><Button className="bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50">إلغاء الحجز</Button></form>}{b.status === "completed" && !existingReview && <form action={submitReview} className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4"><input type="hidden" name="booking_id" value={b.id}/><div className="text-sm font-black">قيّم زيارتك الموثقة</div><Select name="rating" defaultValue="5" className="max-w-40"><option value="5">5 / 5</option><option value="4">4 / 5</option><option value="3">3 / 5</option><option value="2">2 / 5</option><option value="1">1 / 5</option></Select><textarea name="review_text" maxLength={1500} className="min-h-24 rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500" placeholder="اكتب تجربتك بدون معلومات طبية حساسة"/><Button className="w-fit bg-teal-600">إرسال للمراجعة</Button></form>}{existingReview && <div className="mt-4 text-xs font-bold text-slate-500">التقييم: {existingReview.rating}/5 · الحالة: {existingReview.status}</div>}</Card>; })}</section></main>;
}
