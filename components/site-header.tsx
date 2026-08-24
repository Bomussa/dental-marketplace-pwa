import { cookies } from "next/headers";
import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { LocaleToggle } from "@/components/locale-toggle";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { BuildingIcon, UserIcon } from "@/components/icons";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const { data } = await getServerAuthClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const appMeta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const isAdmin = appMeta.platform_admin === true;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3.5 sm:px-4">
      <div className="glass-shell mx-auto flex min-h-[4.35rem] max-w-7xl items-center justify-between gap-2.5 rounded-[26px] px-3 py-2.5 sm:px-4">
        <Link href="/" className="group flex min-w-0 items-center rounded-2xl px-1.5 py-1.5 transition hover:bg-white/10" aria-label={`${t["nav.home"]} — ${t["brand.name"]} — ${t["brand.systemName"]}`}>
          <BrandLockup brandName={t["brand.name"]} systemName={t["brand.systemName"]} compact />
        </Link>
        <nav className="flex shrink-0 items-center gap-1.5 text-[.94rem] font-extrabold text-blue-50" aria-label={t["nav.home"]}>
          <Link href="/clinic" aria-label={t["nav.clinics"]} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 transition hover:bg-white/12 hover:text-white">
            <BuildingIcon size={17}/><span className="hidden md:inline">{t["nav.clinics"]}</span>
          </Link>
          {isAdmin && <Link href="/admin" aria-label={t["nav.admin"]} className="inline-flex min-h-11 items-center rounded-full px-3.5 transition hover:bg-white/12 hover:text-white">{t["nav.admin"]}</Link>}
          <LocaleToggle locale={locale} label={t["nav.language"]} ariaLabel={t["nav.languageLabel"]} />
          <Link href={signedIn ? "/account" : "/login"} aria-label={signedIn ? t["nav.account"] : t["nav.login"]} className="ms-1 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/16 bg-white/16 px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22)] transition hover:-translate-y-0.5 hover:bg-white/22 hover:shadow-[0_11px_24px_-10px_rgba(0,0,0,.45)]">
            <UserIcon size={17}/><span className="hidden md:inline">{signedIn ? t["nav.account"] : t["nav.login"]}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
