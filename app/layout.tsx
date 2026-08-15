import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteHeader } from "@/components/site-header";
import { PwaRegister } from "@/components/pwa-register";
import { DeviceInstallationRegistrar } from "@/components/device-installation-registrar";
import { getDictionary, getDirection, getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "أسناني قطر", template: "%s | أسناني قطر" },
  description: "مقارنة أسعار خدمات الأسنان والتوفر والحجز لدى العيادات المشاركة في قطر.",
  applicationName: "أسناني قطر",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#007AFF" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body>
        <PwaRegister />
        <DeviceInstallationRegistrar />
        <LocaleProvider locale={locale}>
          <SiteHeader />
          {children}
          <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-[11px] font-medium leading-6 text-slate-500 sm:px-6">
            <div className="mx-auto mb-5 h-px max-w-3xl bg-slate-200/70" />
            {t["footer.disclaimer"]}
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
