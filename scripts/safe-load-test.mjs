import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

const DEFAULT_TARGET = "http://127.0.0.1:3000/manifest.webmanifest";
const DEFAULT_LEVELS = "5,25,50";
const MAX_SAFE_CONCURRENCY = 50;
const SAFE_STATIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/offline.html",
]);

const target = new URL(process.argv[2] ?? DEFAULT_TARGET);
const requestedLevels = (process.argv[3] ?? DEFAULT_LEVELS)
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!requestedLevels.length) {
  throw new Error("Provide at least one positive concurrency level.");
}
if (!["http:", "https:"].includes(target.protocol)) {
  throw new Error("Only HTTP(S) targets are permitted.");
}
if (!SAFE_STATIC_PATHS.has(target.pathname)) {
  throw new Error("This safe load test only permits static, mutation-free PWA assets.");
}
if (requestedLevels.some((value) => value > MAX_SAFE_CONCURRENCY)) {
  throw new Error(`Safe load tests are capped at ${MAX_SAFE_CONCURRENCY} concurrent requests. Use an isolated, approved performance environment for higher load.`);
}

const timeoutMs = 15_000;

function requestOnce(agent) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const request = (target.protocol === "https:" ? https : http).request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        agent,
        headers: { accept: "application/json,text/plain,*/*", "cache-control": "no-cache" },
        timeout: timeoutMs,
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve({
          ok: response.statusCode >= 200 && response.statusCode < 400,
          status: response.statusCode ?? 0,
          elapsedMs: performance.now() - startedAt,
        }));
      },
    );

    request.once("timeout", () => request.destroy(new Error("timeout")));
    request.once("error", (error) => resolve({
      ok: false,
      status: error.code === "ECONNRESET" ? 598 : 599,
      elapsedMs: performance.now() - startedAt,
      error: error.code ?? error.message,
    }));
    request.end();
  });
}

function percentile(values, point) {
  if (!values.length) return 0;
  const index = Math.max(0, Math.min(values.length - 1, Math.ceil(values.length * point) - 1));
  return values[index];
}

async function runLevel(concurrency) {
  const agent = target.protocol === "https:"
    ? new https.Agent({ keepAlive: true, maxSockets: concurrency, maxFreeSockets: 0 })
    : new http.Agent({ keepAlive: true, maxSockets: concurrency, maxFreeSockets: 0 });

  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  const requests = Array.from({ length: concurrency }, async () => {
    await barrier;
    return requestOnce(agent);
  });

  const startedAt = performance.now();
  release();
  const results = await Promise.all(requests);
  const totalMs = performance.now() - startedAt;
  agent.destroy();

  const latencies = results.map((result) => result.elapsedMs).sort((left, right) => left - right);
  const statusCounts = Object.fromEntries([...new Set(results.map((result) => result.status))]
    .sort((left, right) => left - right)
    .map((status) => [status, results.filter((result) => result.status === status).length]));
  const errors = results.filter((result) => !result.ok);

  return {
    concurrency,
    totalRequests: results.length,
    successful: results.length - errors.length,
    failed: errors.length,
    successRate: Number((((results.length - errors.length) / results.length) * 100).toFixed(2)),
    durationMs: Number(totalMs.toFixed(2)),
    throughputPerSecond: Number((results.length / (totalMs / 1000)).toFixed(2)),
    latencyMs: {
      min: Number((latencies[0] ?? 0).toFixed(2)),
      p50: Number(percentile(latencies, 0.5).toFixed(2)),
      p95: Number(percentile(latencies, 0.95).toFixed(2)),
      p99: Number(percentile(latencies, 0.99).toFixed(2)),
      max: Number((latencies.at(-1) ?? 0).toFixed(2)),
    },
    statusCounts,
    errorSamples: [...new Set(errors.map((result) => result.error ?? `HTTP_${result.status}`))].slice(0, 5),
  };
}

const report = {
  target: target.toString(),
  startedAt: new Date().toISOString(),
  mutationFree: true,
  staticAssetOnly: true,
  maxSafeConcurrency: MAX_SAFE_CONCURRENCY,
  rounds: [],
};

for (const level of requestedLevels) {
  report.rounds.push(await runLevel(level));
}

console.log(JSON.stringify(report, null, 2));
