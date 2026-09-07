import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "رؤيتنا وأهدافنا",
  description: "رؤية وأهداف أسناني قطر في تسهيل اكتشاف خدمات طب الأسنان ومقارنتها وحجز المواعيد في قطر.",
};

const arabicGoals = [
  ["اكتشف بسهولة", "ابحث عن خدمات وعيادات الأسنان في مكان واحد."],
  ["قارن بوضوح", "قارن الخدمات والأسعار والعروض والمواعيد المتاحة."],
  ["اعرف التفاصيل", "اطّلع على تفاصيل الخدمة والسعر وشروط العرض قبل الحجز."],
  ["اختر الموعد", "تعرّف على المواعيد المتاحة واختر ما يناسبك."],
  ["احجز بسهولة", "أنشئ حجزك بخطوات واضحة وبسيطة."],
  ["تابع حجزك", "اعرف حالة الحجز وتحديثاته بوضوح."],
  ["بيانات أدق", "نسعى إلى تقديم معلومات دقيقة ومحدثة من مصادرها، مع تقليل المعلومات غير المؤكدة."],
  ["خدمة أفضل للعيادات", "نوفر للعيادات أدوات منظمة لإدارة خدماتها وأسعارها ومواعيدها وحجوزاتها."],
  ["أمان وخصوصية", "نحمي بيانات المستخدمين ونستخدم المعلومات اللازمة لتشغيل خدمات المنصة."],
  ["تجربة أبسط", "نختصر رحلة البحث والمقارنة والحجز في تجربة رقمية سهلة وواضحة."],
] as const;

const englishGoals = [
  ["Discover easily", "Find dental services and participating clinics in one place."],
  ["Compare clearly", "Compare services, prices, offers, and available appointments."],
  ["Know the details", "Review service details, displayed price, and offer conditions before booking."],
  ["Choose a time", "See available appointments and choose what suits you."],
  ["Book simply", "Create a booking through a clear, straightforward flow."],
  ["Track your booking", "See the booking status and its updates clearly."],
  ["Better data", "We aim to provide accurate, up-to-date information from its sources and reduce unconfirmed information."],
  ["Better clinic operations", "Give participating clinics organized tools to manage services, prices, availability, and bookings."],
  ["Privacy and security", "Protect user data and use the information needed to operate the platform."],
  ["A simpler experience", "Reduce the journey from search to comparison to booking into one clear digital experience."],
] as const;

export default async function AboutPage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const isArabic = locale === "ar";
  const goals = isArabic ? arabicGoals : englishGoals;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:pt-12">
      <section className="reveal overflow-hidden rounded-[1.75rem] border border-[#cfe4e8] bg-[linear-gradient(135deg,#06345f_0%,#075d97_52%,#087d78_100%)] px-5 py-8 text-white shadow-[0_28px_70px_-45px_rgba(2,35,72,.65)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="max-w-4xl">
          <p className="mb-3 text-sm font-extrabold tracking-wide text-[#c8f5ed]">
            {isArabic ? "أسناني قطر" : "Asnani Qatar"}
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {isArabic ? "رؤيتنا وأهدافنا" : "Our Vision & Goals"}
          </h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-white/90 sm:text-lg">
            {isArabic
              ? "أن نجعل الوصول إلى خدمات طب الأسنان في قطر أسهل، أوضح وأكثر موثوقية."
              : "To make access to dental services in Qatar easier, clearer, and more trustworthy."}
          </p>
        </div>
      </section>

      <section className="reveal reveal-delay-1 mx-auto mt-8 max-w-5xl rounded-[1.5rem] border border-[var(--line-subtle)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          {isArabic ? "ما الذي نسعى إليه؟" : "What we aim to do"}
        </h2>
        <p className="mt-4 text-[1rem] leading-8 text-[var(--text-default)] sm:text-lg">
          {isArabic
            ? "نسعى في أسناني قطر إلى بناء تجربة رقمية تجمع البحث والمقارنة واكتشاف الأسعار والمواعيد والحجز في مكان واحد، وتساعد المستخدم على اتخاذ قرار واضح قبل حجز خدمة الأسنان."
            : "Asnani Qatar aims to bring search, comparison, price discovery, availability, and booking together in one digital experience, helping users make a clear decision before booking a dental service."}
        </p>
      </section>

      <section className="reveal reveal-delay-2 mt-10">
        <div className="mb-5 max-w-3xl">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{isArabic ? "أهدافنا" : "Our goals"}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
            {isArabic ? "نركز على قيمة عملية واضحة للمستخدم والعيادة والمنصة." : "We focus on practical value for patients, clinics, and the platform."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(([title, description], index) => (
            <article key={title} className="lift rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-[var(--shadow-sm)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8f7f6] text-sm font-extrabold text-[var(--teal)]" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-[var(--line-subtle)]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reveal mt-10 rounded-[1.5rem] border border-[#c9e5e2] bg-[#eff8f8] p-6 text-center sm:p-9">
        <p className="text-sm font-bold text-[var(--text-muted)]">{isArabic ? "هدفنا" : "Our aim"}</p>
        <p className="mx-auto mt-3 max-w-3xl text-xl font-extrabold leading-9 text-[var(--text-strong)] sm:text-2xl">
          {isArabic
            ? "أن نختصر رحلة البحث عن خدمة الأسنان من عدة خطوات متفرقة إلى تجربة واحدة واضحة."
            : "To turn a fragmented dental-service search into one clear experience."}
        </p>
        <p className="mt-5 text-lg font-extrabold tracking-wide text-[var(--brand)]">
          {isArabic ? "ابحث ← قارن ← اختر ← احجز" : "Search → Compare → Choose → Book"}
        </p>
      </section>

      <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-6 text-[var(--text-muted)]">
        {isArabic
          ? "أسناني قطر منصة لاكتشاف ومقارنة وحجز خدمات طب الأسنان، وليست جهة تشخيص أو علاج أو اعتماد طبي."
          : "Asnani Qatar is a platform for discovering, comparing, and booking dental services; it is not a medical diagnosis, treatment, or accreditation authority."}
      </p>
    </main>
  );
}
