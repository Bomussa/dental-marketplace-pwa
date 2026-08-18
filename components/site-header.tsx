import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { LocaleToggle } from "@/components/locale-toggle";
import { getDictionary, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { BuildingIcon, UserIcon } from "@/components/icons";

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
        <Link href="/" className="group flex min-w-0 items-center rounded-2xl px-1.5 py-1.5 text-white transition hover:bg-white/10" aria-label={`${t["nav.home"]} — ${t["brand.name"]} — ${t["brand.systemName"]}`}>
          <span className="relative block h-10 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#082c4c] shadow-[0_10px_22px_-11px_rgba(82,225,218,.78)] sm:h-11 sm:w-44">
            <Image src="/brand/mmc-mms-asnani-qatar-official-logo.png" alt={`${t["brand.name"]} — ${t["brand.systemName"]}`} fill priority sizes="(min-width: 640px) 176px, 128px" className="object-cover object-[center_24%] transition duration-300 group-hover:scale-[1.025]" />
          </span>
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
