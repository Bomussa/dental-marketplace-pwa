"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";

const copy = {
  ar: {
    title: "إنشاء كلمة مرور جديدة",
    intro: "اختر كلمة مرور جديدة لحسابك ثم احفظها.",
    password: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور الجديدة",
    submit: "حفظ كلمة المرور",
    loading: "جارٍ الحفظ…",
    success: "تم حفظ كلمة المرور بنجاح.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    invalid: "استخدم كلمة مرور من 4 إلى 128 حرفًا على الأقل.",
    missing: "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.",
    error: "تعذر حفظ كلمة المرور الآن. اطلب رابط استعادة جديدًا وحاول مرة أخرى.",
    request: "طلب رابط استعادة جديد",
    login: "العودة إلى تسجيل الدخول",
  },
  en: {
    title: "Create a new password",
    intro: "Choose a new password for your account and save it.",
    password: "New password",
    confirm: "Confirm new password",
    submit: "Save password",
    loading: "Saving…",
    success: "Your password has been saved successfully.",
    mismatch: "The passwords do not match.",
    invalid: "Use a password between 4 and 128 characters.",
    missing: "This recovery link is invalid or has expired. Request a new link.",
    error: "The password could not be saved right now. Request a new reset link and try again.",
    request: "Request a new reset link",
    login: "Back to sign in",
  },
} as const;

export default function UpdatePasswordForm({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "missing" | "saving" | "success" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const hasSession = Boolean(data.session);
      setReady(hasSession);
      setState(hasSession ? "ready" : "missing");
    };

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION")) {
        setReady(true);
        setState("ready");
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || state === "saving") return;

    if (password.length < 4 || password.length > 128) {
      setState("error");
      return;
    }
    if (password !== confirm) {
      setState("error");
      return;
    }

    setState("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setState(error ? "error" : "success");
  }

  if (state === "loading") {
    return <p className="auth-alert" role="status" aria-live="polite">{locale === "ar" ? "جارٍ التحقق من رابط الاستعادة…" : "Checking the recovery link…"}</p>;
  }

  if (state === "missing" || !ready) {
    return (
      <div className="grid gap-4">
        <p className="auth-alert auth-alert--error" role="alert">{t.missing}</p>
        <Link href="/auth/forgot-password" className="text-center text-sm font-extrabold text-[#0B5CAD] underline-offset-4 hover:underline">
          {t.request}
        </Link>
        <Link href="/login" className="text-center text-sm font-extrabold text-slate-500 underline-offset-4 hover:underline">
          {t.login}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label htmlFor="new-password" className="grid gap-2 text-sm font-extrabold text-slate-800">{t.password}</label>
        <Input
          id="new-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={4}
          maxLength={128}
          required
          dir="ltr"
          className="mt-2"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="grid gap-2 text-sm font-extrabold text-slate-800">{t.confirm}</label>
        <Input
          id="confirm-password"
          name="confirm_password"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          minLength={4}
          maxLength={128}
          required
          dir="ltr"
          className="mt-2"
        />
      </div>

      {state === "error" && (
        <p className="auth-alert auth-alert--error" role="alert">
          {password.length < 4 || password.length > 128 ? t.invalid : password !== confirm ? t.mismatch : t.error}
        </p>
      )}
      {state === "success" && (
        <div className="grid gap-3">
          <p className="auth-alert" role="status" aria-live="polite">{t.success}</p>
          <Link href="/login" className="text-center text-sm font-extrabold text-[#0B5CAD] underline-offset-4 hover:underline">
            {t.login}
          </Link>
        </div>
      )}

      {state !== "success" && (
        <Button type="submit" disabled={state === "saving"} className="mt-1">
          {state === "saving" ? t.loading : t.submit}
        </Button>
      )}
    </form>
  );
}
