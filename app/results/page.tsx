import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { searchSchema } from "@/lib/validation";
import { priceLabel } from "@/lib/price";
import type { SearchOffer } from "@/lib/models";
import { Badge, Card } from "@/components/ui";
import { BookButton } from "@/components/book-button";
import { ArrowUpLeftIcon, ClockIcon, LocationIcon, ShieldCheckIcon, SlidersIcon, StarIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
function scalar(v: string | string[] | undefined) { return Array.isArray(v) ? v[0] : v; }

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const parsed = searchSchema.safeParse({ variant: scalar(raw.variant), lat: scalar(raw.lat) ?? "", lng: scalar(raw.lng) ?? "", radius: scalar(raw.radius) ?? "10" });
  if (!parsed.success) return <main className="mx-auto max-w-4xl px-4 py-16"><Card className="p-8"><h1 className="text-2xl font-black">طلب البحث غير صالح</h1><p className="mt-3 text-slate-500">اختر علاجًا دقيقًا وأعد البحث.</p><Link className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#0066CC]" href="/">العودة للبحث<ArrowUpLeftIcon size={16}/></Link></Card></main>;
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
  // eslint-disable-next-line react-hooks/purity
  const tomorrowKey = qatarDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const offers = allOffers.filter((offer) => {
    if (when === "earliest") return true;
    if (!offer.earliest_slot_at) return false;
    const key = qatarDate(new Date(offer.earliest_slot_at));
    return when === "today" ? key === todayKey : when === "tomorrow" ? key === tomorrowKey : true;
  });
  const whenLabel = when === "today" ? "اليوم" : when === "tomorrow" ? "غدًا" : "أقرب موعد";

  return (
    <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">نتائج مطابقة لنفس الخدمة</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{variant?.name_ar ?? "نتائج البحث"}</h1><p className="mt-2 text-sm font-medium text-slate-500">الأقل سعرًا أولًا ضمن العروض المؤهلة، ثم المسافة عند توفر موقعك.</p></div>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"><ArrowUpLeftIcon size={17}/>بحث جديد</Link>
      </div>

      <div className="glass-shell mb-6 flex flex-wrap items-center gap-2 rounded-[22px] px-4 py-3 text-xs font-extrabold text-slate-600"><SlidersIcon size={17} className="text-[#007AFF]"/><span>{whenLabel}</span><span className="text-slate-300">•</span><span>نطاق {parsed.data.radius} كم عند توفر الموقع</span><span className="text-slate-300">•</span><span>{offers.length} نتيجة</span></div>

      {error ? <Card className="p-7 text-red-700">تعذر تحميل النتائج: {error.message}</Card> : offers.length === 0 ? (
        <Card className="p-10 text-center"><h2 className="text-xl font-black">لا توجد عروض مؤهلة الآن</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">هذا يعني عدم وجود عرض Active مطابق للشروط الحالية في نطاق البحث، وليس عدم وجود الخدمة في قطر.</p></Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => (
            <Card key={offer.offer_id} className="lift overflow-hidden p-0">
              <div className="grid lg:grid-cols-[1fr_290px]">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="grid h-7 min-w-7 place-items-center rounded-full bg-slate-950 px-2 text-[11px] font-black text-white">{index + 1}</span>{offer.last_verified_at && <Badge tone="blue"><span className="inline-flex items-center gap-1"><ShieldCheckIcon size={13}/>تحقق موثق</span></Badge>}<Badge tone={offer.open_now ? "green" : "slate"}>{offer.open_now ? "مفتوح الآن" : "مغلق الآن"}</Badge></div>
                      <h2 className="mt-3 truncate text-xl font-black tracking-tight sm:text-2xl">{offer.clinic_name}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500"><LocationIcon size={15}/>{offer.branch_name}{offer.area ? ` · ${offer.area}` : ""}</p>
                    </div>
                    {Number(offer.review_count) > 0 && <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-800"><StarIcon size={14} className="text-amber-500"/>{Number(offer.rating_avg).toFixed(1)}<span className="font-bold text-slate-400">({offer.review_count})</span></div>}
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50/90 p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><ClockIcon size={14}/>مدة الخدمة</div><div className="mt-1 text-sm font-black">{offer.duration_minutes} دقيقة</div></div>
                    <div className="rounded-2xl bg-slate-50/90 p-3.5"><div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><LocationIcon size={14}/>المسافة</div><div className="mt-1 text-sm font-black">{offer.distance_km == null ? "غير محسوبة" : `${offer.distance_km.toFixed(1)} كم`}</div></div>
                    <div className="rounded-2xl bg-slate-50/90 p-3.5 sm:col-span-2 lg:col-span-1"><div className="text-[11px] font-bold text-slate-500">آخر تحقق</div><div className="mt-1 text-sm font-black">{offer.last_verified_at ? new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(offer.last_verified_at)) : "غير مسجل"}</div></div>
                  </div>
                </div>

                <aside className="border-t border-slate-200/70 bg-slate-50/55 p-5 sm:p-6 lg:border-s lg:border-t-0">
                  <div className="text-xs font-extrabold text-slate-500">السعر المعلن</div><div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{priceLabel(offer.price_type, offer.min_minor, offer.max_minor)}</div>
                  <div className="mt-5 text-xs font-extrabold text-slate-500">أقرب موعد صالح</div><div className="mt-1 min-h-10 text-sm font-black leading-6">{offer.earliest_slot_at ? new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" }).format(new Date(offer.earliest_slot_at)) : "لا يوجد موعد منشور الآن"}</div>
                  <div className="mt-4">{offer.earliest_slot_id ? <BookButton offerId={offer.offer_id} slotId={offer.earliest_slot_id} /> : <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-extrabold leading-5 text-amber-800">العرض متاح للمقارنة فقط حاليًا؛ لا يوجد Slot صالح للحجز.</div>}</div>
                </aside>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
