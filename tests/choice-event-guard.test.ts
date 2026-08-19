import { describe, expect, it } from "vitest";
import {
  choiceRequestBodyIsTooLarge,
  choiceRequestClientKey,
  choiceRequestOriginIsAllowed,
  CHOICE_EVENT_WINDOW_SECONDS,
  MAX_CHOICE_EVENT_BYTES,
  MAX_CHOICE_EVENTS_PER_WINDOW,
  readChoiceRequestTextWithinLimit,
} from "@/lib/choice-event-guard";

const sameOrigin = new Request("https://example.test/api/choices", {
  headers: { origin: "https://example.test", "x-forwarded-for": "203.0.113.4" },
});

describe("choice event request guard", () => {
  it("accepts only explicit same-origin requests", () => {
    expect(choiceRequestOriginIsAllowed(sameOrigin)).toBe(true);
    expect(choiceRequestOriginIsAllowed(new Request("https://example.test/api/choices"))).toBe(false);
    expect(choiceRequestOriginIsAllowed(new Request("https://example.test/api/choices", { headers: { origin: "https://attacker.test" } }))).toBe(false);
  });

  it("accepts the matching forwarded public origin behind a reverse proxy", () => {
    const proxied = new Request("http://internal.test/api/choices", {
      headers: {
        origin: "https://example.test",
        host: "internal.test",
        "x-forwarded-host": "example.test",
        "x-forwarded-proto": "https",
      },
    });
    expect(choiceRequestOriginIsAllowed(proxied)).toBe(true);
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

  it("hashes the forwarded address before it reaches distributed rate limiting", () => {
    const key = choiceRequestClientKey(sameOrigin);
    expect(key).not.toContain("203.0.113.4");
    expect(key).toHaveLength(24);
  });

  it("uses a bounded one-minute policy for the distributed rate limiter", () => {
    expect(CHOICE_EVENT_WINDOW_SECONDS).toBe(60);
    expect(MAX_CHOICE_EVENTS_PER_WINDOW).toBe(60);
  });
});
