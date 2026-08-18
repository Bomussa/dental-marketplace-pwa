import { cookies } from "next/headers";
import { getDictionary, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { SearchForm } from "@/components/search-form";
import { SupportChat } from "@/components/support-chat";
import { Badge, Card } from "@/components/ui";
import { CalendarIcon, RouteIcon, ShieldCheckIcon, SparklesIcon, WalletIcon } from "@/components/icons";
import type { Treatment, TreatmentVariant } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: treatments, error: tError }, { data: variants, error: vError }] = await Promise.all([
    supabase.from("treatment_catalog").select("id,code,category,name_ar,name_en").eq("active", true).order("category").order("name_ar"),
    supabase.from("treatment_variants").select("id,catalog_id,variant_key,name_ar,name_en").eq("active", true).order("name_ar"),
  ]);
  const loadError = tError || vError;
  const treatmentRows = (treatments ?? []) as Treatment[];
  const variantRows = (variants ?? []) as TreatmentVariant[];

  return (
    <main className="overflow-hidden">
      <section className="premium-hero relative isolate px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="hero-mesh pointer-events-none absolute inset-x-0 top-0 h-[720px] sm:h-[750px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[linear-gradient(180deg,rgba(4,19,54,.12),rgba(4,19,54,.60)_70%,transparent)] sm:h-[750px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="reveal mb-6 flex flex-wrap justify-center gap-2">
              <Badge tone="blue">{t["home.badge.compare"]}</Badge><Badge tone="green">{t["home.badge.availability"]}</Badge><Badge>{t["home.badge.booking"]}</Badge>
            </div>
            <p className="eyebrow-glow reveal reveal-delay-1 mb-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-100"><SparklesIcon size={16}/> {t["home.intelligence"]}</p>
            <h1 className="reveal reveal-delay-1 mx-auto max-w-5xl text-[2.8rem] font-black leading-[1.04] tracking-[-.045em] text-white drop-shadow-[0_12px_34px_rgba(0,11,37,.48)] sm:text-6xl lg:text-7xl">
              {t["home.hero.before"]} <span className="bg-[linear-gradient(115deg,#a5f4e7,#91cbff_54%,#e1ccff)] bg-clip-text text-transparent">{t["home.hero.highlight"]}</span> {t["home.hero.after"]}
            </h1>
            <p className="reveal reveal-delay-2 mx-auto mt-7 max-w-2xl text-base font-medium leading-8 text-blue-50/90 sm:text-lg">{t["home.intro"]}</p>
          </div>

          <div className="glass-panel reveal reveal-delay-2 mx-auto mt-10 max-w-6xl rounded-[38px] p-3 sm:p-4">
            {loadError ? <div className="rounded-[26px] bg-rose-50 p-5 text-sm font-bold text-rose-700">{t["home.catalogError"]}</div> : <SearchForm treatments={treatmentRows} variants={variantRows} locale={locale} />}
          </div>

          <div className="reveal reveal-delay-2 mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-bold text-blue-50/90">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"><ShieldCheckIcon size={16} className="text-[#83f1d5]"/> {t["home.trust.verified"]}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"><WalletIcon size={16} className="text-[#91cbff]"/> {t["home.trust.payment"]}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/8 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"><CalendarIcon size={16} className="text-[#d6c0ff]"/> {t["home.trust.booking"]}</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-2 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[[String(treatmentRows.length),t["home.metric.treatments"],t["home.metric.treatmentsDetail"]],[String(variantRows.length),t["home.metric.variants"],t["home.metric.variantsDetail"]],["QAR",t["home.metric.currency"],t["home.metric.currencyDetail"]]].map(([value,label,detail]) => (
            <div key={label} className="metric-card lift rounded-[28px] border border-white/85 p-6 shadow-[0_24px_62px_-42px_rgba(4,37,83,.46)] ring-1 ring-[#07528d]/[.07]">
              <div className="text-3xl font-black tracking-[-.035em] text-[#082956]">{value}</div><div className="mt-1 text-sm font-extrabold text-[#16456f]">{label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-4 overflow-hidden rounded-[34px] border border-white/70 px-4 py-16 shadow-[0_30px_80px_-60px_rgba(5,39,85,.62)] sm:mx-6 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(223,250,247,.94),rgba(243,248,255,.92)_48%,rgba(226,240,255,.92))]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#0c7188]">{t["home.decision.kicker"]}</p><h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#0a2d5b] sm:text-4xl">{t["home.decision.title"]}</h2></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              [RouteIcon,t["home.feature.precise.title"],t["home.feature.precise.copy"],"from-cyan-400 to-blue-600"],
              [ShieldCheckIcon,t["home.feature.verified.title"],t["home.feature.verified.copy"],"from-emerald-400 to-teal-600"],
              [CalendarIcon,t["home.feature.booking.title"],t["home.feature.booking.copy"],"from-violet-400 to-indigo-600"],
            ].map(([Icon,title,copy,gradient]) => {
              const FeatureIcon = Icon as typeof RouteIcon;
              return <Card key={String(title)} className="lift p-7"><span className={`grid h-12 w-12 place-items-center rounded-[18px] bg-gradient-to-br ${String(gradient)} text-white shadow-[0_14px_28px_-14px_rgba(16,90,168,.65)]`}><FeatureIcon size={22}/></span><h3 className="mt-6 text-lg font-black text-[#092b56]">{String(title)}</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-500">{String(copy)}</p></Card>;
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <SupportChat />
      </section>
    </main>
  );
}
