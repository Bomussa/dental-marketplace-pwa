import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchSchema } from "@/lib/validation";
import { priceLabel } from "@/lib/price";
import type { SearchOffer } from "@/lib/models";
import { Badge, Card } from "@/components/ui";
import { BookButton } from "@/components/book-button";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

function scalar(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const parsed = searchSchema.safeParse({
    variant: scalar(raw.variant), lat: scalar(raw.lat) ?? "", lng: scalar(raw.lng) ?? "", radius: scalar(raw.radius) ?? "10",
  });
  if (!parsed.success) {
    return <main className="mx-auto max-w-4xl px-4 py-16"><Card className="p-8"><h1 className="text-2xl font-black">طلب البحث غير صالح</h1><p className="mt-3 text-slate-500">اختر علاجًا دقيقًا وأعد البحث.</p><Link className="mt-6 inline-block font-bold text-teal-700" href="/">العودة للبحث</Link></Card></main>;
  }
  const lat = parsed.data.lat === "" || parsed.data.lat === undefined ? null : parsed.data.lat;
  const lng = parsed.data.lng === "" || parsed.data.lng === undefined ? null : parsed.data.lng;
  const when = scalar(raw.when) ?? "earliest";
  const supabase = await createClient();
  const [{ data: variant }, { data, error }] = await Promise.all([
    supabase.from("treatment_variants").select("name_ar,name_en").eq("id", parsed.data.variant).single(),
    supabase.rpc("search_dental_offers", { p_variant_id: parsed.data.variant, p_lat: lat, p_lng: lng, p_radius_km: parsed.data.radius }),
  ]);
  const allOffers = (data ?? []) as SearchOffer[];
  const qatarDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year:"numeric", month:"2-digit", day:"2-digit" }).format(date);
  const todayKey = qatarDate(new Date());
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowKey = qatarDate(tomorrow);
  const offers = allOffers.filter((offer) => {
    if (when === "earliest") return true;
    if (!offer.earliest_slot_at) return false;
    const key = qatarDate(new Date(offer.earliest_slot_at));
    return when === "today" ? key === todayKey : when === "tomorrow" ? key === tomorrowKey : true;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold text-teal-700">نتائج مطابقة لنفس الخدمة</p><h1 className="mt-1 text-3xl font-black">{variant?.name_ar ?? "نتائج البحث"}</h1><p className="mt-2 text-sm text-slate-500">مرتبة حسب السعر ضمن العيادات المشاركة المؤهلة، ثم المسافة عند توفر الموقع.</p></div>
        <Link href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">بحث جديد</Link>
      </div>
      {error ? <Card className="p-7 text-red-700">تعذر تحميل النتائج: {error.message}</Card> : offers.length === 0 ? (
        <Card className="p-10 text-center"><h2 className="text-xl font-black">لا توجد عروض مؤهلة الآن</h2><p className="mt-2 text-sm text-slate-500">هذا يعني عدم وجود عرض Active مطابق للشروط الحالية في نطاق البحث، وليس عدم وجود الخدمة في قطر.</p></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {offers.map((offer, index) => (
            <Card key={offer.offer_id} className="overflow-hidden p-6">
              <div className="flex items-start justify-between gap-4">
                <div><div className="text-xs font-black text-slate-400">#{index + 1}</div><h2 className="mt-1 text-xl font-black">{offer.clinic_name}</h2><p className="mt-1 text-sm text-slate-500">{offer.branch_name}{offer.area ? ` · ${offer.area}` : ""}</p></div>
                <Badge tone={offer.open_now ? "green" : "slate"}>{offer.open_now ? "مفتوح الآن" : "مغلق الآن"}</Badge>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">السعر</div><div className="mt-1 font-black">{priceLabel(offer.price_type, offer.min_minor, offer.max_minor)}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">المسافة</div><div className="mt-1 font-black">{offer.distance_km == null ? "غير محسوبة" : `${offer.distance_km.toFixed(1)} كم`}</div><div className="mt-1 text-[10px] text-slate-400">خط مستقيم تقريبي</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">مدة الخدمة</div><div className="mt-1 font-black">{offer.duration_minutes} دقيقة</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs text-slate-500">أقرب موعد متاح</div><div className="mt-1 font-black">{offer.earliest_slot_at ? new Intl.DateTimeFormat("ar-QA", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Qatar" }).format(new Date(offer.earliest_slot_at)) : "لا يوجد Slot منشور"}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-5 text-slate-500"><span>تأكيد العيادة: {offer.clinic_attested_at ? new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(offer.clinic_attested_at)) : "—"}</span><span>تحقق المنصة: {offer.last_verified_at ? new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(offer.last_verified_at)) : "لم يُسجل"}</span>{Number(offer.review_count) > 0 && <span>تقييم موثق: {Number(offer.rating_avg).toFixed(1)} / 5 · {offer.review_count} زيارة</span>}</div>
              <div className="mt-5">{offer.earliest_slot_id ? <BookButton offerId={offer.offer_id} slotId={offer.earliest_slot_id} /> : <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">العرض ظاهر للمقارنة، لكن لا يوجد موعد صالح للحجز حاليًا.</div>}</div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
