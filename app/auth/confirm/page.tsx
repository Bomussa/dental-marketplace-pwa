"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeNext(candidate: string | null) {
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.startsWith("/\\")
    ? candidate
    : "/account";
}

export default function AuthConfirmPage() {
  const [status, setStatus] = useState("جارٍ تأكيد الدخول الآمن…");

  useEffect(() => {
    const confirm = async () => {
      const currentUrl = new URL(window.location.href);
      const next = safeNext(currentUrl.searchParams.get("next"));
      const code = currentUrl.searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const supabase = createClient();

      let error: Error | null = null;
      if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else if (accessToken && refreshToken) {
        ({ error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }));
      } else {
        error = new Error("missing auth token");
      }

      if (error) {
        setStatus("تعذّر تأكيد الدخول. ستعود إلى صفحة الدخول الآن…");
        window.location.replace("/login?error=confirm_failed");
        return;
      }

      setStatus("تم التأكيد. جارٍ نقلك إلى حسابك…");
      window.location.replace(next);
    };

    void confirm();
  }, []);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 text-center" aria-live="polite">
      <p className="rounded-2xl bg-white/75 px-5 py-4 text-sm font-bold text-[var(--muted)] shadow-sm ring-1 ring-[var(--line)]">
        {status}
      </p>
    </main>
  );
}
