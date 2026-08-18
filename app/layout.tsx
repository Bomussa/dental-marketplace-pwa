import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { BrandLockup } from "@/components/brand-lockup";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { DeviceInstallationRegistrar } from "@/components/device-installation-registrar";
import { getDictionary, getDirection, getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
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
    <html lang={locale} dir={getDirection(locale)}>
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
              <p className="site-footer__disclaimer">{t["footer.disclaimer"]}</p>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
