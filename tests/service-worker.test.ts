import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const offlineDocument = readFileSync(join(process.cwd(), "public", "offline.html"), "utf8");

describe("service worker activation hardening", () => {
  it("activates the hardened worker immediately after the static fallback is cached", () => {
    expect(serviceWorker).toContain('qatar-dental-shell-v3');
    expect(serviceWorker).toContain('const PUBLIC_FALLBACK = "/offline.html"');
    expect(serviceWorker).toContain('credentials: "omit"');
    expect(serviceWorker).toContain(".then(() => self.skipWaiting())");
    expect(serviceWorker).toContain("self.clients.claim()");
  });

  it("keeps private and API navigations outside the public offline fallback", () => {
    expect(serviceWorker).toContain("account|clinic|admin|auth|api");
    expect(serviceWorker).toContain('request.mode !== "navigate"');
  });

  it("uses an authentication-independent offline document", () => {
    expect(offlineDocument).toContain("لا يوجد اتصال بالإنترنت");
    expect(offlineDocument).toContain("لا نعرض صفحات الحساب أو العيادة أو الإدارة من الذاكرة المؤقتة");
    expect(offlineDocument).not.toContain("تسجيل الخروج");
    expect(offlineDocument).not.toContain("لوحة الإدارة");
  });
});
