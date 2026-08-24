import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getActiveTreatmentCatalog } from "@/lib/treatment-catalog.server";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { SearchForm } from "@/components/search-form";
import { SupportChat } from "@/components/support-chat";
import { Badge, Card } from "@/components/ui";
import { MobileNavigation } from "@/components/mobile-navigation";
import { CalendarIcon, RouteIcon, ShieldCheckIcon, SparklesIcon, ToothIcon, WalletIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مقارنة خدمات الأسنان والحجز في قطر",
  description: "قارن خدمات الأسنان والتوفر واطلب الحجز لدى العيادات المشاركة في قطر.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "مقارنة خدمات الأسنان والحجز في قطر | أسناني قطر",
    description: "قارن خدمات الأسنان والتوفر واطلب الحجز لدى العيادات المشاركة في قطر.",
    url: "/",
    siteName: "أسناني قطر",
  },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const [{ treatments: treatmentRows, variants: variantRows, hasError: loadError }, claims] = await Promise.all([
    getActiveTreatmentCatalog(),
    getServerAuthClaims(),
  ]);
  const signedIn = Boolean(claims.data?.claims?.sub);

  return (
    <main className="home-page">
      <section className="home-hero premium-hero relative isolate overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="hero-mesh pointer-events-none absolute inset-0" />
        <div className="home-hero__veil pointer-events-none absolute inset-0" />
        <div className="home-hero__halo pointer-events-none absolute" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="reveal mb-6 flex flex-wrap justify-center gap-2">
              <Badge tone="blue">{t["home.badge.compare"]}</Badge>
              <Badge tone="green">{t["home.badge.availability"]}</Badge>
              <Badge>{t["home.badge.booking"]}</Badge>
            </div>
            <p className="eyebrow-glow reveal reveal-delay-1 mb-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[.24em] text-cyan-100 sm:text-xs"><SparklesIcon size={16} /> {t["home.intelligence"]}</p>
            <h1 className="home-hero__title reveal reveal-delay-1 mx-auto max-w-5xl text-[2.7rem] font-black leading-[1.06] tracking-[-.052em] text-white">
              {t["home.hero.before"]} <span className="home-hero__accent">{t["home.hero.highlight"]}</span> {t["home.hero.after"]}
            </h1>
            <p className="reveal reveal-delay-2 mx-auto mt-6 max-w-2xl text-[.98rem] font-medium leading-8 text-blue-50/92 sm:text-lg">{t["home.intro"]}</p>
          </div>

          <aside className="mobile-decision-card reveal reveal-delay-2 mx-auto mt-8 max-w-3xl" aria-label={t["home.journey.title"]}>
            <span className="mobile-decision-card__seal" aria-hidden="true"><ToothIcon size={26} /></span>
            <div className="mobile-decision-card__copy"><span>{t["home.journey.kicker"]}</span><strong>{t["home.journey.title"]}</strong><p>{t["home.journey.copy"]}</p></div>
            <span className="mobile-decision-card__marker" aria-hidden="true"><ShieldCheckIcon size={17} /></span>
          </aside>

          <div id="start-compare" className="home-search-card reveal reveal-delay-2 mx-auto mt-5 max-w-6xl p-3 sm:mt-10 sm:p-4">
            <div className="home-search-card__topline" aria-hidden="true"><span /><span /><span /></div>
            {loadError ? <div className="rounded-[26px] bg-rose-50 p-5 text-sm font-bold text-rose-700">{t["home.catalogError"]}</div> : <SearchForm treatments={treatmentRows} variants={variantRows} locale={locale} />}
          </div>

          <div className="trust-row reveal reveal-delay-2 mx-auto mt-5 flex max-w-5xl flex-wrap items-center justify-center gap-2.5 text-xs font-bold text-blue-50/95">
            <span className="trust-chip"><ShieldCheckIcon size={16} className="text-[#83f1d5]" /> {t["home.trust.verified"]}</span>
            <span className="trust-chip"><WalletIcon size={16} className="text-[#91cbff]" /> {t["home.trust.payment"]}</span>
            <span className="trust-chip"><CalendarIcon size={16} className="text-[#d6c0ff]" /> {t["home.trust.booking"]}</span>
          </div>
        </div>
      </section>

      <section className="home-metrics-section relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-3 sm:grid-cols-3">
          {[[String(treatmentRows.length), t["home.metric.treatments"], t["home.metric.treatmentsDetail"]], [String(variantRows.length), t["home.metric.variants"], t["home.metric.variantsDetail"]], ["QAR", t["home.metric.currency"], t["home.metric.currencyDetail"]]].map(([value, label, detail]) => (
            <div key={label} className="metric-card home-metric lift rounded-[28px] border border-white/85 p-5 shadow-[0_24px_62px_-42px_rgba(4,37,83,.46)] ring-1 ring-[#07528d]/[.07]">
              <div className="home-metric__value">{value}</div><div className="mt-1 text-sm font-extrabold text-[#16456f]">{label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="decision-section relative mx-4 overflow-hidden rounded-[34px] border border-white/70 px-4 py-14 shadow-[0_30px_80px_-60px_rgba(5,39,85,.62)] sm:mx-6 sm:px-6">
        <div className="decision-section__background pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#0c7188]">{t["home.decision.kicker"]}</p><h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#0a2d5b] sm:text-4xl">{t["home.decision.title"]}</h2></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [RouteIcon, t["home.feature.precise.title"], t["home.feature.precise.copy"]],
              [ShieldCheckIcon, t["home.feature.verified.title"], t["home.feature.verified.copy"]],
              [CalendarIcon, t["home.feature.booking.title"], t["home.feature.booking.copy"]],
            ].map(([Icon, title, copy], index) => {
              const FeatureIcon = Icon as typeof RouteIcon;
              return <Card key={String(title)} className="feature-card lift p-6"><span className="feature-card__icon grid h-12 w-12 place-items-center rounded-[18px]"><FeatureIcon size={22} /></span><span className="feature-card__index">0{index + 1}</span><h3 className="mt-6 text-lg font-black text-[#092b56]">{String(title)}</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-500">{String(copy)}</p></Card>;
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6"><SupportChat /></section>

      <MobileNavigation locale={locale} signedIn={signedIn} labels={{ home: t["nav.home"], compare: t["nav.compare"], bookings: t["nav.bookings"], clinics: t["nav.clinics"], account: t["nav.account"], login: t["nav.login"] }} />
    </main>
  );
}
