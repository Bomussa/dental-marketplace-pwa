import { cookies } from "next/headers";
import { Card, Input, Button } from "@/components/ui";
import { ShieldCheckIcon } from "@/components/icons";
import { getDictionary, getLocale } from "@/lib/i18n";
import { loginWithPassword } from "./actions";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const scalar = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const next = scalar(params.next) || "/account";
  const error = scalar(params.error);

  return (
    <main className="auth-stage relative mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="auth-stage__halo pointer-events-none absolute start-1/2 -translate-x-1/2" />
      <Card className="auth-card relative p-7 sm:p-9">
        <div className="auth-card__icon"><ShieldCheckIcon size={25} /></div>
        <div className="mt-7 max-w-md">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#087d90]">{t["login.kicker"]}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em] text-[#092b56]">{t["login.title"]}</h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">{t["login.copy"]}</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{t["login.error"]}</div>}
        <form action={loginWithPassword} className="mt-7 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-extrabold text-slate-800">{t["login.username"]}<Input name="username" autoComplete="username" required minLength={3} maxLength={32} dir="ltr" /></label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-800">{t["login.password"]}<Input name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={128} dir="ltr" /></label>
          <Button type="submit" className="mt-1">{t["login.submit"]}</Button>
        </form>
        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] font-medium leading-5 text-slate-400">{t["login.privacy"]}</p>
      </Card>
    </main>
  );
}
