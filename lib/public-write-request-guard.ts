import { createHash } from "node:crypto";

type HeaderReader = Pick<Headers, "get">;

export function publicWriteRequestOriginIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || requestUrl.host;
    const requestProtocol = (forwardedProtocol || requestUrl.protocol.replace(/:$/, "")).toLowerCase();

    return originUrl.host === requestHost && originUrl.protocol.replace(/:$/, "").toLowerCase() === requestProtocol;
  } catch {
    return false;
  }
}

export function publicWriteRequestBodyIsTooLarge(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return !Number.isFinite(length) || length < 0 || length > maxBytes;
}

export async function readPublicWriteRequestTextWithinLimit(request: Request, maxBytes: number) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export function publicWriteHeadersClientKey(headers: HeaderReader) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const source = forwarded || realIp || "unknown-client";
  return createHash("sha256").update(source).digest("base64url").slice(0, 24);
}

export function publicWriteRequestClientKey(request: Request) {
  return publicWriteHeadersClientKey(request.headers);
}
