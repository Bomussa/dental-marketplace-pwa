const baseUrl = (process.argv[2] ?? process.env.PRODUCTION_CHECK_URL ?? "https://www.mmc-mms.com").replace(/\/$/, "");

const checks = [
  {
    name: "health",
    path: "/api/health",
    verify: async (response) => {
      const body = await response.json();
      return body?.ok === true && body?.database === true && body?.server_operations === true
        ? { ok: true, detail: { treatments: body.treatments } }
        : { ok: false, detail: body };
    },
  },
  {
    name: "pwa_manifest",
    path: "/manifest.webmanifest",
    verify: async (response) => {
      const body = await response.json();
      return body?.display === "standalone" && typeof body?.name === "string" && body.name.includes("أسناني قطر")
        ? { ok: true, detail: { display: body.display, name: body.name } }
        : { ok: false, detail: body };
    },
  },
  {
    name: "security_headers",
    path: "/",
    verify: async (response) => {
      const csp = response.headers.get("content-security-policy") ?? "";
      const checks = {
        csp: csp.includes("default-src 'self'") && csp.includes("object-src 'none'") && csp.includes("frame-ancestors 'none'"),
        nosniff: response.headers.get("x-content-type-options") === "nosniff",
        frameDeny: response.headers.get("x-frame-options") === "DENY",
        coop: response.headers.get("cross-origin-opener-policy") === "same-origin",
      };
      return { ok: Object.values(checks).every(Boolean), detail: checks };
    },
  },
];

const results = [];
for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: "GET",
      headers: { accept: "application/json,text/html,*/*", "cache-control": "no-cache" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const verified = response.ok ? await check.verify(response) : { ok: false, detail: { status: response.status } };
    results.push({ name: check.name, url: `${baseUrl}${check.path}`, status: response.status, elapsedMs: Number((performance.now() - startedAt).toFixed(2)), ...verified });
  } catch (error) {
    results.push({ name: check.name, url: `${baseUrl}${check.path}`, status: 0, elapsedMs: Number((performance.now() - startedAt).toFixed(2)), ok: false, detail: { error: error instanceof Error ? error.message : String(error) } });
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
