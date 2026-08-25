import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";
import {
  publicWriteRequestBodyIsTooLarge,
  publicWriteRequestOriginIsAllowed,
  readPublicWriteRequestTextWithinLimit,
} from "@/lib/public-write-request-guard";

const MAX_BODY_BYTES = 256;

function invalidRequest() {
  return NextResponse.json({ error: "INVALID_LOCALE_REQUEST" }, {
    status: 400,
    headers: { "cache-control": "no-store" },
  });
}

function returnUrl(request: Request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin || !referer) return new URL("/", request.url);

  try {
    const originUrl = new URL(origin);
    const refererUrl = new URL(referer);
    if (refererUrl.origin !== originUrl.origin) return new URL("/", originUrl);
    return new URL(`${refererUrl.pathname}${refererUrl.search}`, originUrl);
  } catch {
    return new URL("/", request.url);
  }
}

export async function POST(request: Request) {
  if (!publicWriteRequestOriginIsAllowed(request) || publicWriteRequestBodyIsTooLarge(request, MAX_BODY_BYTES)) {
    return invalidRequest();
  }

  const text = await readPublicWriteRequestTextWithinLimit(request, MAX_BODY_BYTES);
  if (text === null) return invalidRequest();

  const fields = new URLSearchParams(text);
  const localeValues = fields.getAll("locale");
  const locale = localeValues.length === 1 && [...fields.keys()].every((key) => key === "locale")
    ? localeValues[0]
    : undefined;
  if (!isLocale(locale)) return invalidRequest();

  const response = NextResponse.redirect(returnUrl(request), 303);
  response.headers.set("cache-control", "no-store");
  response.cookies.set("asnani_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
