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
      <section className="relative px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="hero-mesh pointer-events-none absolute inset-x-0 -top-28 h-[620px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 flex flex-wrap justify-center gap-2"><Badge tone="blue">{t["home.badge.compare"]}</Badge><Badge tone="green">{t["home.badge.availability"]}</Badge><Badge>{t["home.badge.booking"]}</Badge></div>
            <p className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#0066CC]"><SparklesIcon size={16}/> {t["home.intelligence"]}</p>
            <h1 className="mx-auto max-w-4xl text-[2.65rem] font-black leading-[1.08] tracking-[-.035em] text-slate-950 sm:text-6xl lg:text-7xl">
              {t["home.hero.before"]} <span className="text-[#007AFF]">{t["home.hero.highlight"]}</span> {t["home.hero.after"]}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">{t["home.intro"]}</p>
          </div>

          <div className="glass-panel mx-auto mt-9 max-w-6xl rounded-[36px] p-3 sm:p-4">
            {loadError ? <div className="rounded-[24px] bg-red-50 p-5 text-sm font-bold text-red-700">{t["home.catalogError"]}</div> : <SearchForm treatments={treatmentRows} variants={variantRows} locale={locale} />}
          </div>

          <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheckIcon size={16} className="text-[#007AFF]"/> {t["home.trust.verified"]}</span>
            <span className="inline-flex items-center gap-1.5"><WalletIcon size={16} className="text-[#007AFF]"/> {t["home.trust.payment"]}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarIcon size={16} className="text-[#007AFF]"/> {t["home.trust.booking"]}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[[String(treatmentRows.length),t["home.metric.treatments"],t["home.metric.treatmentsDetail"]],[String(variantRows.length),t["home.metric.variants"],t["home.metric.variantsDetail"]],["QAR",t["home.metric.currency"],t["home.metric.currencyDetail"]]].map(([value,label,detail]) => (
            <div key={label} className="metric-card rounded-[24px] border border-white/80 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,.4)] ring-1 ring-slate-200/50">
              <div className="text-2xl font-black tracking-tight text-slate-950">{value}</div><div className="mt-1 text-sm font-extrabold text-slate-700">{label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/55 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0066CC]">{t["home.decision.kicker"]}</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{t["home.decision.title"]}</h2></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [RouteIcon,t["home.feature.precise.title"],t["home.feature.precise.copy"]],
              [ShieldCheckIcon,t["home.feature.verified.title"],t["home.feature.verified.copy"]],
              [CalendarIcon,t["home.feature.booking.title"],t["home.feature.booking.copy"]],
            ].map(([Icon,title,copy]) => {
              const FeatureIcon = Icon as typeof RouteIcon;
              return <Card key={String(title)} className="lift p-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#007AFF]"><FeatureIcon size={21}/></span><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-500">{String(copy)}</p></Card>;
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
