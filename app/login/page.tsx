import { cookies } from "next/headers";
import { Card, Input, Button } from "@/components/ui";
import { ShieldCheckIcon } from "@/components/icons";
import { getDictionary, getLocale } from "@/lib/i18n";
import { sendMagicLink } from "./actions";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const scalar = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const next = scalar(params.next) || "/account";
  const sent = scalar(params.sent) === "1";
  const error = scalar(params.error);

  return (
    <main className="relative mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="pointer-events-none absolute -top-5 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-300/30 blur-3xl" />
      <Card className="relative p-7 sm:p-9">
        <span className="grid h-13 w-13 place-items-center rounded-[20px] bg-[linear-gradient(135deg,#0a55b8,#12a5a0)] text-white shadow-[0_16px_30px_-14px_rgba(8,103,178,.74)]"><ShieldCheckIcon size={24} /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{t["login.kicker"]}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.035em] text-[#092b56]">{t["login.title"]}</h1>
        <p className="mt-3 text-sm font-medium leading-7 text-slate-500">{t["login.copy"]}</p>
        {sent && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/90 p-4 text-sm font-extrabold text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">{t["login.sent"]}</div>}
        {error && <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/90 p-4 text-sm font-extrabold text-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">{t["login.error"]}</div>}
        <form action={sendMagicLink} className="mt-6 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-extrabold text-slate-800">{t["login.email"]}<Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr" /></label>
          <Button type="submit">{t["login.submit"]}</Button>
        </form>
        <p className="mt-5 text-center text-[11px] font-medium leading-5 text-slate-400">{t["login.privacy"]}</p>
      </Card>
    </main>
  );
}
