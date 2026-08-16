import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

describe("service worker activation hardening", () => {
  it("activates the hardened worker immediately after the public fallback is cached", () => {
    expect(serviceWorker).toContain(".then(() => self.skipWaiting())");
    expect(serviceWorker).toContain("self.clients.claim()");
  });

  it("keeps private and API navigations outside the public offline fallback", () => {
    expect(serviceWorker).toContain("account|clinic|admin|auth|api");
    expect(serviceWorker).toContain('request.mode !== "navigate"');
  });
});
