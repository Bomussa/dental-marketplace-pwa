import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: ReturnType<typeof createServer>;
let baseUrl = "";

function securityHeaders(response: ServerResponse) {
  response.setHeader("content-security-policy", "default-src 'self'; object-src 'none'; frame-ancestors 'none'");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("cross-origin-opener-policy", "same-origin");
  response.setHeader("cross-origin-resource-policy", "same-origin");
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", baseUrl);
  if (url.pathname === "/") {
    securityHeaders(response);
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<html><head><link rel="canonical" href="${baseUrl}"></head><body>أسناني</body></html>`);
    return;
  }
  if (url.pathname === "/api/health") return json(response, 200, { ok: true, time: "2026-08-26T00:00:00.000Z" });
  if (url.pathname === "/manifest.webmanifest") return json(response, 200, { name: "أسناني قطر", display: "standalone" });
  if (url.pathname === "/pwa/icon/192") {
    response.writeHead(200, { "content-type": "image/png" });
    response.end("png");
    return;
  }
  if (url.pathname === "/robots.txt") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end(`User-agent: *\nSitemap: ${baseUrl}/sitemap.xml`);
    return;
  }
  if (url.pathname === "/sitemap.xml") {
    response.writeHead(200, { "content-type": "application/xml" });
    response.end(`<urlset><url><loc>${baseUrl}/</loc></url></urlset>`);
    return;
  }
  if (url.pathname === "/login") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<input name="username"><input type="password">');
    return;
  }
  if (url.pathname === "/api/search") {
    const variant = url.searchParams.get("variant");
    if (variant === "not-a-uuid") return json(response, 400, { error: "invalid_search" });
    if (variant === "00000000-0000-4000-8000-000000000001") return json(response, 200, { variant: null, offers: [], count: 0 });
    return json(response, 200, { variant: { name_ar: "تبييض", name_en: "Whitening" }, offers: [], count: 0 });
  }
  response.writeHead(404).end();
}

function runReadinessCheck() {
  const script = path.join(process.cwd(), "scripts", "production-readiness-check.mjs");
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    execFile(process.execPath, [script, baseUrl], { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error && typeof error.code !== "number") return reject(error);
      resolve({ code: typeof error?.code === "number" ? error.code : 0, stdout, stderr });
    });
  });
}

beforeAll(async () => {
  server = createServer(handleRequest).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server address unavailable");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

describe("production readiness check", () => {
  it("accepts the current health contract and read-only search contract", async () => {
    const result = await runReadinessCheck();
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ target: baseUrl, mutationFree: true, ok: true });
  });
});
