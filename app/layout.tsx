import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import "./globals.css";
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
          <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-[11px] font-medium leading-6 text-slate-500 sm:px-6">
            <div className="mx-auto mb-6 h-px max-w-3xl bg-slate-200/70" />
            <div className="mx-auto flex max-w-xl flex-col items-center gap-2.5">
              <div className="relative h-20 w-64 overflow-hidden rounded-2xl border border-slate-200/70 bg-[#082c4c] shadow-[0_14px_30px_-20px_rgba(8,44,76,.55)]">
                <Image src="/brand/mmc-mms-asnani-qatar-official-logo.png" alt={`${t["brand.name"]} — ${t["brand.systemName"]}`} fill sizes="256px" className="object-cover object-[center_24%]" />
              </div>
              <p className="max-w-md text-[10px] font-black tracking-[0.03em] text-slate-600 sm:text-[11px]">{t["footer.systemName"]}</p>
              <p>{t["footer.disclaimer"]}</p>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
