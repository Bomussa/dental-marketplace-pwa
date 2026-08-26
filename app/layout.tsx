import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Manrope, Noto_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { BrandLockup } from "@/components/brand-lockup";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { DeviceInstallationRegistrar } from "@/components/device-installation-registrar";
import { getDictionary, getDirection, getLocale } from "@/lib/i18n";

const arabicFont = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700", "800"] });
const latinFont = Manrope({ variable: "--font-latin", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mmc-mms.com"),
  title: { default: "أسناني قطر", template: "%s | أسناني قطر" },
  description: "مقارنة أسعار خدمات الأسنان والتوفر والحجز لدى العيادات المشاركة في قطر.",
  applicationName: "أسناني قطر",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B5CAD" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  return (
    <html lang={locale} dir={getDirection(locale)} className={`${arabicFont.variable} ${latinFont.variable}`}>
      <body>
        <DeviceInstallationRegistrar />
        <LocaleProvider locale={locale}>
          <SiteHeader />
          {children}
          <footer className="site-footer mx-auto mt-8 max-w-7xl px-4 pb-8 pt-5 sm:px-6">
            <div className="site-footer__panel">
              <div className="site-footer__brand">
                <BrandLockup brandName={t["brand.name"]} systemName={t["brand.systemName"]} tone="dark" />
                <p className="site-footer__system" dir="ltr">{t["footer.systemName"]}</p>
              </div>
              <div className="grid gap-3">
                <p className="site-footer__disclaimer">{t["footer.disclaimer"]}</p>
                <nav aria-label={locale === "ar" ? "روابط السياسات" : "Policy links"} className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-[#0B5CAD]">
                  <Link href="/privacy" className="underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5CAD]">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link>
                  <Link href="/terms" className="underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5CAD]">{locale === "ar" ? "الشروط" : "Terms"}</Link>
                </nav>
              </div>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
