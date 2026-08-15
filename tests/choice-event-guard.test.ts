import { describe, expect, it, beforeEach } from "vitest";
import {
  choiceRequestBodyIsTooLarge,
  choiceRequestClientKey,
  choiceRequestOriginIsAllowed,
  consumeChoiceEventRateLimit,
  MAX_CHOICE_EVENT_BYTES,
  MAX_CHOICE_EVENTS_PER_WINDOW,
  readChoiceRequestTextWithinLimit,
  resetChoiceEventRateLimitForTests,
} from "@/lib/choice-event-guard";

const sameOrigin = new Request("https://example.test/api/choices", {
  headers: { origin: "https://example.test", "x-forwarded-for": "203.0.113.4" },
});

describe("choice event request guard", () => {
  beforeEach(() => resetChoiceEventRateLimitForTests());

  it("accepts only explicit same-origin requests", () => {
    expect(choiceRequestOriginIsAllowed(sameOrigin)).toBe(true);
    expect(choiceRequestOriginIsAllowed(new Request("https://example.test/api/choices"))).toBe(false);
    expect(choiceRequestOriginIsAllowed(new Request("https://example.test/api/choices", { headers: { origin: "https://attacker.test" } }))).toBe(false);
  });

  it("rejects declared bodies above the event budget", () => {
    expect(choiceRequestBodyIsTooLarge(new Request("https://example.test/api/choices", { headers: { "content-length": String(MAX_CHOICE_EVENT_BYTES) } }))).toBe(false);
    expect(choiceRequestBodyIsTooLarge(new Request("https://example.test/api/choices", { headers: { "content-length": String(MAX_CHOICE_EVENT_BYTES + 1) } }))).toBe(true);
  });

  it("rejects an undeclared streamed body above the event budget", async () => {
    const oversized = new Request("https://example.test/api/choices", {
      method: "POST",
      body: "x".repeat(MAX_CHOICE_EVENT_BYTES + 1),
    });
    await expect(readChoiceRequestTextWithinLimit(oversized)).resolves.toBeNull();
  });

  it("hashes the forwarded address instead of retaining it as an in-memory key", () => {
    const key = choiceRequestClientKey(sameOrigin);
    expect(key).not.toContain("203.0.113.4");
    expect(key).toHaveLength(24);
  });

  it("limits a client within a fixed minute window and resets after it", () => {
    const now = 1_000_000;
    for (let index = 0; index < MAX_CHOICE_EVENTS_PER_WINDOW; index += 1) {
      expect(consumeChoiceEventRateLimit("client", now).allowed).toBe(true);
    }
    const denied = consumeChoiceEventRateLimit("client", now);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(consumeChoiceEventRateLimit("client", now + 60_000).allowed).toBe(true);
  });
});
