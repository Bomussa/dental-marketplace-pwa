import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "أسناني قطر", template: "%s | أسناني قطر" },
  description: "مقارنة أسعار خدمات الأسنان والتوفر والحجز لدى العيادات المشاركة في قطر.",
  applicationName: "أسناني قطر",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#007AFF" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PwaRegister />
        <SiteHeader />
        {children}
        <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-[11px] font-medium leading-6 text-slate-500 sm:px-6">
          <div className="mx-auto mb-5 h-px max-w-3xl bg-slate-200/70" />
          أسناني قطر أداة مقارنة وحجز وليست جهة تشخيص أو علاج. الأسعار والتوفر تخص العيادات المشاركة وتخضع لوقت آخر تحقق.
        </footer>
      </body>
    </html>
  );
}
