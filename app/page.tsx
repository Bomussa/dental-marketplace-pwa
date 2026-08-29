import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getActiveTreatmentCatalog } from "@/lib/treatment-catalog.server";
import { getServerUiSession } from "@/lib/auth-claims.server";
import { SearchForm } from "@/components/search-form";
import { SupportChat } from "@/components/support-chat";
import { MobileNavigation } from "@/components/mobile-navigation";
import { CalendarIcon, ShieldCheckIcon, SparklesIcon } from "@/components/icons";

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
  const [{ treatments, variants, hasError }, claims] = await Promise.all([
    getActiveTreatmentCatalog(),
    getServerUiSession(),
  ]);
  const signedIn = Boolean(claims.data?.session?.user);

  return (
    <main className="home-page reference-home-page">
      <section className="reference-home-shell px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-8">
        <div className="reference-home-shell__ambient" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl">
          <header className="reference-home-intro">
            <p><SparklesIcon size={15} /> {t["home.intelligence"]}</p>
            <h1>{locale === "ar" ? "ابحث وقارن واحجز بثقة" : "Search, compare, and book with confidence"}</h1>
            <span>{t["home.intro"]}</span>
          </header>

          <div id="start-compare" className="reference-search-surface reveal mt-6 sm:mt-8">
            {hasError ? (
              <div className="reference-search-error" role="alert">{t["home.catalogError"]}</div>
            ) : (
              <SearchForm treatments={treatments} variants={variants} locale={locale} />
            )}
          </div>

          <div className="reference-trust-line" aria-label={locale === "ar" ? "ضمانات الاستخدام" : "Usage guarantees"}>
            <span><ShieldCheckIcon size={15} /> {t["home.trust.verified"]}</span>
            <span><CalendarIcon size={15} /> {t["home.trust.booking"]}</span>
          </div>
        </div>
      </section>

      <section className="reference-insight-section px-4 pb-6 sm:px-6 sm:pb-10">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
          <article className="reference-insight-card"><strong>{treatments.length}</strong><span>{t["home.metric.treatments"]}</span><p>{t["home.metric.treatmentsDetail"]}</p></article>
          <article className="reference-insight-card"><strong>{variants.length}</strong><span>{t["home.metric.variants"]}</span><p>{t["home.metric.variantsDetail"]}</p></article>
          <article className="reference-insight-card"><strong>QAR</strong><span>{t["home.metric.currency"]}</span><p>{t["home.metric.currencyDetail"]}</p></article>
        </div>
      </section>

      <section className="reference-support-section px-4 pb-14 sm:px-6"><SupportChat /></section>

      <MobileNavigation locale={locale} signedIn={signedIn} labels={{ home: t["nav.home"], compare: t["nav.compare"], bookings: t["nav.bookings"], clinics: t["nav.clinics"], account: t["nav.account"], login: t["nav.login"] }} />
    </main>
  );
}
