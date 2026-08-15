import { createHash } from "node:crypto";

export const MAX_CHOICE_EVENT_BYTES = 12 * 1024;
export const CHOICE_EVENT_WINDOW_MS = 60_000;
export const MAX_CHOICE_EVENTS_PER_WINDOW = 60;

type RateBucket = { startedAt: number; count: number };

const buckets = new Map<string, RateBucket>();

function compactBuckets(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= CHOICE_EVENT_WINDOW_MS) buckets.delete(key);
  }
}

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

export function consumeChoiceEventRateLimit(clientKey: string, now = Date.now()) {
  compactBuckets(now);
  const previous = buckets.get(clientKey);

  if (!previous || now - previous.startedAt >= CHOICE_EVENT_WINDOW_MS) {
    buckets.set(clientKey, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (previous.count >= MAX_CHOICE_EVENTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((CHOICE_EVENT_WINDOW_MS - (now - previous.startedAt)) / 1_000)),
    };
  }

  previous.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetChoiceEventRateLimitForTests() {
  buckets.clear();
}
