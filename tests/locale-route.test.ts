import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/locale/route";

function request(body: string, origin = "https://example.test", contentLength = body.length) {
  return new Request("https://example.test/api/locale", {
    method: "POST",
    headers: {
      origin,
      host: "example.test",
      "content-type": "application/json",
      "content-length": String(contentLength),
    },
    body,
  });
}

describe("locale route", () => {
  it("persists only a supported locale in an httpOnly same-site cookie", async () => {
    const response = await POST(request(JSON.stringify({ locale: "en" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("asnani_locale=en");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("rejects cross-origin and malformed requests without setting a cookie", async () => {
    const crossOrigin = await POST(request(JSON.stringify({ locale: "en" }), "https://other.test"));
    const malformed = await POST(request(JSON.stringify({ locale: "fr" })));

    expect(crossOrigin.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(crossOrigin.headers.get("set-cookie")).toBeNull();
    expect(malformed.headers.get("set-cookie")).toBeNull();
  });

  it("rejects oversized payload declarations", async () => {
    const response = await POST(request(JSON.stringify({ locale: "ar" }), "https://example.test", 257));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
