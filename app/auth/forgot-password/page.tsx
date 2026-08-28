import { cookies } from "next/headers";
import { Card } from "@/components/ui";
import { getLocale } from "@/lib/i18n";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const dynamic = "force-dynamic";

const copy = {
  ar: {
    kicker: "الحساب الآمن",
    title: "استعادة كلمة المرور",
  },
  en: {
    kicker: "Secure account",
    title: "Reset your password",
  },
} as const;

export default async function ForgotPasswordPage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = copy[locale];

  return (
    <main className="auth-stage relative mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="auth-stage__halo pointer-events-none absolute start-1/2 -translate-x-1/2" />
      <Card className="auth-card relative p-7 sm:p-9">
        <div className="mt-1 max-w-md">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#087d90]">{t.kicker}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em] text-[#092b56]">{t.title}</h1>
        </div>
        <p className="sr-only">{locale === "ar" ? "إعادة تعيين كلمة المرور عبر البريد الإلكتروني" : "Reset your password by email"}</p>
        <div className="mt-7">
          <ForgotPasswordForm locale={locale} />
        </div>
      </Card>
    </main>
  );
}
