"use server";

import { cookies } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error("INVALID_LOCALE");
  const cookieStore = await cookies();
  cookieStore.set("asnani_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
