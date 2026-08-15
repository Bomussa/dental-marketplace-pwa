import { cookies } from "next/headers";
import Link from "next/link";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className="glass-shell mx-auto flex min-h-14 max-w-7xl items-center justify-between rounded-[22px] px-2.5 py-2 sm:px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 text-[var(--nav-ink)] transition hover:bg-[var(--surface-hover)]" aria-label={`${t["nav.home"]} — ${t["brand.name"]}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[var(--primary)] text-white shadow-[0_8px_20px_-12px_rgba(var(--primary-rgb),.9)]"><ToothIcon size={19}/></span>
          <span className="truncate text-sm font-black tracking-tight sm:text-base">{t["brand.name"]}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-extrabold text-[var(--muted)]" aria-label={t["nav.home"]}>
          <Link href="/clinic" className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 transition hover:bg-[var(--surface-hover)] hover:text-[var(--nav-ink)]">
            <BuildingIcon size={17}/><span className="hidden sm:inline">{t["nav.clinics"]}</span>
          </Link>
          {isAdmin && <Link href="/admin" className="inline-flex min-h-10 items-center rounded-full px-3 transition hover:bg-[var(--surface-hover)] hover:text-[var(--nav-ink)]">{t["nav.admin"]}</Link>}
          <ThemeToggle />
          <LocaleToggle locale={locale} label={t["nav.language"]} ariaLabel={t["nav.languageLabel"]} />
          <Link href={signedIn ? "/account" : "/login"} className="ms-1 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--nav-ink)] px-3.5 text-white shadow-sm transition hover:bg-[var(--primary-strong)]">
            <UserIcon size={17}/><span className="hidden sm:inline">{signedIn ? t["nav.account"] : t["nav.login"]}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
