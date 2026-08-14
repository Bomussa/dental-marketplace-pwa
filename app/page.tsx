import { createClient } from "@/lib/supabase/server";
import { SearchForm } from "@/components/search-form";
import { Card, Badge } from "@/components/ui";
import type { Treatment, TreatmentVariant } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: treatments, error: tError }, { data: variants, error: vError }] = await Promise.all([
    supabase.from("treatment_catalog").select("id,code,category,name_ar,name_en").eq("active", true).order("category").order("name_ar"),
    supabase.from("treatment_variants").select("id,catalog_id,variant_key,name_ar,name_en").eq("active", true).order("name_ar"),
  ]);
  const loadError = tError || vError;

  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="green">سعر قابل للمقارنة</Badge><Badge tone="blue">توفر فعلي</Badge><Badge>حجز ذري</Badge>
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.15] tracking-tight text-slate-950 sm:text-6xl">
            اعرف تكلفة العلاج، الأقرب، والمتاح قبل ما تروح.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            نقارن نفس خدمة الأسنان بنفس الـvariant بين العيادات المشاركة، ثم نعرض السعر والمسافة وأقرب موعد صالح للحجز.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 text-center">
            {[['25','علاج رئيسي'],['46','Variant دقيق'],['QAR','تخزين بالسنتات']].map(([v,l]) => (
              <div key={l} className="rounded-2xl border border-slate-200 bg-white/70 p-4"><div className="text-xl font-black">{v}</div><div className="mt-1 text-xs text-slate-500">{l}</div></div>
            ))}
          </div>
        </div>
        <Card className="p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">ابحث وقارن</p>
            <h2 className="mt-2 text-2xl font-black">شو العلاج اللي بتدور عليه؟</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">الترتيب هو الأقل سعرًا ضمن النتائج المشاركة والمتاحة، وليس ادعاءً بأنه الأرخص في قطر.</p>
          </div>
          {loadError ? (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">تعذر تحميل كتالوج الخدمات حاليًا.</div>
          ) : (
            <SearchForm treatments={(treatments ?? []) as Treatment[]} variants={(variants ?? []) as TreatmentVariant[]} />
          )}
        </Card>
      </section>
      <section className="border-y border-slate-200 bg-white/60">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
          {[
            ["01","مطابقة صحيحة","لا نقارن “علاج عصب” عام بعرض مختلف؛ المقارنة على Variant محدد."],
            ["02","Open ≠ Available","ساعات العمل منفصلة عن وجود Slot صالح فعليًا لنفس العلاج."],
            ["03","السعر محفوظ عند الحجز","الحجز يحتفظ Snapshot غير قابل للتغيير للعرض والسعر وقت التأكيد."],
          ].map(([n,t,d]) => <div key={n} className="p-3"><div className="text-xs font-black text-teal-700">{n}</div><h3 className="mt-2 font-black">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{d}</p></div>)}
        </div>
      </section>
    </main>
  );
}
