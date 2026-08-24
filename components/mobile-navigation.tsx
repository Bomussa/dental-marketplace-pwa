"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingIcon, CalendarIcon, SearchIcon, ToothIcon, UserIcon } from "@/components/icons";
import type { Locale } from "@/lib/i18n";

type MobileNavigationProps = {
  locale: Locale;
  signedIn: boolean;
  labels: {
    home: string;
    compare: string;
    bookings: string;
    clinics: string;
    account: string;
    login: string;
  };
};

export function MobileNavigation({ locale, signedIn, labels }: MobileNavigationProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const accountHref = signedIn ? "/account" : "/login?next=/account";

  const items = [
    { href: "/", label: labels.home, Icon: ToothIcon, active: isHome },
    { href: "/account", label: labels.bookings, Icon: CalendarIcon, active: pathname === "/account" },
    { href: "/#start-compare", label: labels.compare, Icon: SearchIcon, active: false, primary: true },
    { href: accountHref, label: signedIn ? labels.account : labels.login, Icon: UserIcon, active: pathname === "/account" || pathname === "/login" },
    { href: "/clinic", label: labels.clinics, Icon: BuildingIcon, active: pathname === "/clinic" },
  ];

  return (
    <nav className="mobile-dock" aria-label={locale === "ar" ? "التنقل الأساسي" : "Primary navigation"}>
      {items.map(({ href, label, Icon, active, primary }) => (
        <Link key={`${href}-${label}`} href={href} className={`mobile-dock__item ${active ? "mobile-dock__item--active" : ""} ${primary ? "mobile-dock__item--primary" : ""}`} aria-current={active ? "page" : undefined}>
          <span className="mobile-dock__icon"><Icon size={primary ? 22 : 19} /></span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
