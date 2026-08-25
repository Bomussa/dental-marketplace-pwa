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

export async function POST(request: Request) {
  if (!publicWriteRequestOriginIsAllowed(request) || publicWriteRequestBodyIsTooLarge(request, MAX_BODY_BYTES)) {
    return invalidRequest();
  }

  const text = await readPublicWriteRequestTextWithinLimit(request, MAX_BODY_BYTES);
  if (text === null) return invalidRequest();

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return invalidRequest();
  }

  const locale =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    "locale" in body &&
    typeof body.locale === "string"
      ? body.locale
      : undefined;
  if (!isLocale(locale)) return invalidRequest();

  const response = NextResponse.json({ ok: true }, {
    headers: { "cache-control": "no-store" },
  });
  response.cookies.set("asnani_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
