import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/locale/route";

const resultsUrl = "https://example.test/results?variant=sample&when=earliest&radius=10&sort=balanced";

function request(body: string, origin = "https://example.test", contentLength = body.length, referer = resultsUrl) {
  return new Request("https://example.test/api/locale", {
    method: "POST",
    headers: {
      origin,
      referer,
      host: "example.test",
      "content-type": "application/x-www-form-urlencoded",
      "content-length": String(contentLength),
    },
    body,
  });
}

describe("locale route", () => {
  it("persists only a supported locale and returns to the same public page", async () => {
    const response = await POST(request("locale=en"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(resultsUrl);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("asnani_locale=en");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
  });

  it("rejects cross-origin and malformed requests without setting a cookie", async () => {
    const crossOrigin = await POST(request("locale=en", "https://other.test"));
    const malformed = await POST(request("locale=fr"));

    expect(crossOrigin.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(crossOrigin.headers.get("set-cookie")).toBeNull();
    expect(malformed.headers.get("set-cookie")).toBeNull();
  });

  it("rejects oversized payload declarations", async () => {
    const response = await POST(request("locale=ar", "https://example.test", 257));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
