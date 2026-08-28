"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";

type Copy = {
  title: string;
  intro: string;
  email: string;
  submit: string;
  loading: string;
  success: string;
  error: string;
  back: string;
};

const copy: Record<Locale, Copy> = {
  ar: {
    title: "استعادة كلمة المرور",
    intro: "أدخل البريد الإلكتروني المرتبط بحسابك لإرسال رابط آمن لإعادة تعيين كلمة المرور.",
    email: "البريد الإلكتروني",
    submit: "إرسال رابط الاستعادة",
    loading: "جارٍ الإرسال…",
    success: "تم إرسال تعليمات الاستعادة. إذا كان البريد مرتبطًا بحساب، سيصلك رابط لإعادة تعيين كلمة المرور.",
    error: "تعذر إرسال طلب الاستعادة الآن. حاول مرة أخرى لاحقًا.",
    back: "العودة إلى تسجيل الدخول",
  },
  en: {
    title: "Reset your password",
    intro: "Enter the email address associated with your account to receive a secure password reset link.",
    email: "Email address",
    submit: "Send reset link",
    loading: "Sending…",
    success: "Reset instructions were sent. If the email is associated with an account, you will receive a password reset link.",
    error: "The reset request could not be sent right now. Please try again later.",
    back: "Back to sign in",
  },
};

export default function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    const normalizedEmail = email.trim();
    const callbackUrl = new URL("/auth/confirm", window.location.origin);
    callbackUrl.searchParams.set("next", "/auth/update-password");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: callbackUrl.toString(),
    });

    setState(error ? "error" : "success");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate={false}>
      <div>
        <label htmlFor="reset-email" className="grid gap-2 text-sm font-extrabold text-slate-800">
          {t.email}
        </label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          required
          maxLength={254}
          dir="ltr"
          className="mt-2"
        />
      </div>

      {state === "success" && (
        <p className="auth-alert" role="status" aria-live="polite">{t.success}</p>
      )}
      {state === "error" && (
        <p className="auth-alert auth-alert--error" role="alert">{t.error}</p>
      )}

      <Button type="submit" disabled={state === "loading"} className="mt-1">
        {state === "loading" ? t.loading : t.submit}
      </Button>

      <Link href="/login" className="text-center text-sm font-extrabold text-[#0B5CAD] underline-offset-4 hover:underline">
        {t.back}
      </Link>
    </form>
  );
}
