const baseUrl = (process.argv[2] ?? process.env.PRODUCTION_CHECK_URL ?? "https://www.mmc-mms.com").replace(/\/$/, "");
const publicSearchVariant = process.env.PRODUCTION_READINESS_SEARCH_VARIANT ?? "ac3f6bfe-4698-4cee-8c45-22bb23ab7783";
const timeoutMs = 15_000;
const sensitiveKeyPattern = /(?:password|otp|token|cookie|secret|national|phone|patient(?:_profile)?(?:_id)?|email|profile_id)/i;

function safeDetail(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return { type: "array", length: value.length };
  return Object.fromEntries(Object.entries(value).slice(0, 12).map(([key, entry]) => [key, Array.isArray(entry) ? { type: "array", length: entry.length } : typeof entry]));
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  return Object.entries(value).some(([key, entry]) => sensitiveKeyPattern.test(key) || containsSensitiveKey(entry));
}

function createCheck(name, path, verify, options = {}) {
  return { name, path, verify, headers: options.headers ?? {}, acceptableStatuses: options.acceptableStatuses ?? [200] };
}

const checks = [
  createCheck("homepage", "/", async (response) => {
    const body = await response.text();
    const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? "";
    const isCanonical = canonical === baseUrl || canonical === `${baseUrl}/`;
    return { ok: body.includes("أسناني") && isCanonical, detail: { canonical: canonical || null, hasBrand: body.includes("أسناني") } };
  }),
  createCheck("health", "/api/health", async (response) => {
    const body = await response.json();
    return { ok: body?.ok === true && typeof body?.time === "string", detail: safeDetail(body) };
  }),
  createCheck("pwa_manifest", "/manifest.webmanifest", async (response) => {
    const body = await response.json();
    return {
      ok: body?.display === "standalone" && typeof body?.name === "string" && body.name.includes("أسناني قطر"),
      detail: { display: body?.display, name: body?.name },
    };
  }),
  createCheck("pwa_icon", "/pwa/icon/192", async (response) => ({
    ok: (response.headers.get("content-type") ?? "").startsWith("image/"),
    detail: { contentType: response.headers.get("content-type") },
  })),
  createCheck("robots", "/robots.txt", async (response) => {
    const body = await response.text();
    return { ok: /user-agent:/i.test(body) && /sitemap:/i.test(body), detail: { hasUserAgent: /user-agent:/i.test(body), hasSitemap: /sitemap:/i.test(body) } };
  }),
  createCheck("sitemap", "/sitemap.xml", async (response) => {
    const body = await response.text();
    return { ok: /<urlset[\s>]/i.test(body) && body.includes(baseUrl), detail: { hasUrlset: /<urlset[\s>]/i.test(body), referencesCanonicalOrigin: body.includes(baseUrl) } };
  }),
  createCheck("login_entry", "/login", async (response) => {
    const body = await response.text();
    return { ok: /name=["']username["']/i.test(body) && /type=["']password["']/i.test(body), detail: { usernameField: /name=["']username["']/i.test(body), passwordField: /type=["']password["']/i.test(body) } };
  }),
  createCheck("search_valid", `/api/search?variant=${encodeURIComponent(publicSearchVariant)}&when=earliest&radius=10`, async (response) => {
    const body = await response.json();
    const hasShape = body?.variant && typeof body.variant === "object" && typeof body.variant.name_ar === "string" && typeof body.variant.name_en === "string" && Array.isArray(body?.offers) && typeof body?.count === "number" && body.count === body.offers.length;
    return { ok: hasShape && !containsSensitiveKey(body), detail: { variant: body?.variant, count: body?.count, sensitiveKeysDetected: containsSensitiveKey(body) } };
  }),
  createCheck("search_empty", "/api/search?variant=00000000-0000-4000-8000-000000000001&when=earliest&radius=10", async (response) => {
    const body = await response.json();
    return { ok: Array.isArray(body?.offers) && body.offers.length === 0 && body.count === 0 && !containsSensitiveKey(body), detail: { count: body?.count, sensitiveKeysDetected: containsSensitiveKey(body) } };
  }),
  createCheck("search_invalid", "/api/search?variant=not-a-uuid&when=earliest&radius=10", async (response) => {
    const body = await response.json();
    return { ok: body?.error === "invalid_search", detail: safeDetail(body) };
  }, { acceptableStatuses: [400] }),
  createCheck("security_headers", "/", async (response) => {
    const csp = response.headers.get("content-security-policy") ?? "";
    const checks = {
      csp: csp.includes("default-src 'self'") && csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'"),
      nosniff: response.headers.get("x-content-type-options") === "nosniff",
      frameDeny: response.headers.get("x-frame-options") === "DENY",
      coop: response.headers.get("cross-origin-opener-policy") === "same-origin",
      corp: response.headers.get("cross-origin-resource-policy") === "same-origin",
    };
    return { ok: Object.values(checks).every(Boolean), detail: checks };
  }),
];

const results = [];
for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: "GET",
      headers: { accept: "application/json,text/html,application/xml,image/*,*/*", "cache-control": "no-cache", ...check.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const verified = check.acceptableStatuses.includes(response.status) ? await check.verify(response) : { ok: false, detail: { status: response.status, expectedStatuses: check.acceptableStatuses } };
    results.push({ name: check.name, url: `${baseUrl}${check.path}`, status: response.status, elapsedMs: Number((performance.now() - startedAt).toFixed(2)), ...verified });
  } catch (error) {
    results.push({
      name: check.name,
      url: `${baseUrl}${check.path}`,
      status: 0,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

const report = {
  target: baseUrl,
  mutationFree: true,
  checkedAt: new Date().toISOString(),
  ok: results.every((result) => result.ok),
  checks: results,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
