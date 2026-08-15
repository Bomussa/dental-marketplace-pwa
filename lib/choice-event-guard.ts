import { createHash } from "node:crypto";

export const MAX_CHOICE_EVENT_BYTES = 12 * 1024;
export const CHOICE_EVENT_WINDOW_SECONDS = 60;
export const MAX_CHOICE_EVENTS_PER_WINDOW = 60;

export function choiceRequestOriginIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function choiceRequestBodyIsTooLarge(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return !Number.isFinite(length) || length < 0 || length > MAX_CHOICE_EVENT_BYTES;
}

export async function readChoiceRequestTextWithinLimit(request: Request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_CHOICE_EVENT_BYTES) {
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

export function choiceRequestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const source = forwarded || realIp || "unknown-client";
  return createHash("sha256").update(source).digest("base64url").slice(0, 24);
}
