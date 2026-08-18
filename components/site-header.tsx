import { cookies } from "next/headers";
import Link from "next/link";
import { LocaleToggle } from "@/components/locale-toggle";
import { getDictionary, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { BuildingIcon, ToothIcon, UserIcon } from "@/components/icons";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const appMeta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const isAdmin = appMeta.platform_admin === true;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="glass-shell mx-auto flex min-h-15 max-w-7xl items-center justify-between rounded-[24px] px-2.5 py-2 sm:px-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 text-white transition hover:bg-white/10" aria-label={`${t["nav.home"]} — ${t["brand.name"]}`}>
          <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[15px] bg-[linear-gradient(135deg,#62e7d6,#2789ef_56%,#8d68ed)] text-white shadow-[0_10px_22px_-9px_rgba(82,225,218,.74)] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_25%_16%,rgba(255,255,255,.65),transparent_30%)]"><ToothIcon size={20} className="relative" /></span>
          <span className="truncate text-sm font-black tracking-tight sm:text-base">{t["brand.name"]}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-extrabold text-blue-50" aria-label={t["nav.home"]}>
          <Link href="/clinic" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 transition hover:bg-white/12 hover:text-white">
            <BuildingIcon size={17}/><span className="hidden sm:inline">{t["nav.clinics"]}</span>
          </Link>
          {isAdmin && <Link href="/admin" className="inline-flex min-h-10 items-center rounded-full px-3 transition hover:bg-white/12 hover:text-white">{t["nav.admin"]}</Link>}
          <LocaleToggle locale={locale} label={t["nav.language"]} ariaLabel={t["nav.languageLabel"]} />
          <Link href={signedIn ? "/account" : "/login"} className="ms-1 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 bg-white/14 px-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22)] transition hover:-translate-y-0.5 hover:bg-white/22 hover:shadow-[0_9px_20px_-10px_rgba(0,0,0,.42)]">
            <UserIcon size={17}/><span className="hidden sm:inline">{signedIn ? t["nav.account"] : t["nav.login"]}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
