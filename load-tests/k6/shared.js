const PRODUCTION_HOSTS = new Set([
  "mmc-mms.com",
  "www.mmc-mms.com",
]);

export function requiredEnv(name) {
  const value = __ENV[name];
  if (!value || !value.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

export function boundedInteger(name, fallback, minimum, maximum) {
  const raw = __ENV[name] ?? String(fallback);
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function stagingTarget() {
  const targetEnvironment = requiredEnv("TARGET_ENV");
  if (targetEnvironment !== "staging") throw new Error("TARGET_ENV must be exactly 'staging'.");
  if (requiredEnv("LOAD_TEST_CONFIRMATION") !== "STAGING_ONLY") {
    throw new Error("LOAD_TEST_CONFIRMATION must be exactly 'STAGING_ONLY'.");
  }

  const baseUrl = new URL(requiredEnv("BASE_URL"));
  if (baseUrl.protocol !== "https:") throw new Error("BASE_URL must use HTTPS.");
  if (PRODUCTION_HOSTS.has(baseUrl.hostname)) throw new Error("Production hostnames are blocked by this test suite.");

  const runId = requiredEnv("RUN_ID");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{7,79}$/.test(runId)) {
    throw new Error("RUN_ID must be 8-80 safe characters.");
  }

  return { baseUrl: baseUrl.toString().replace(/\/$/, ""), origin: baseUrl.origin, runId };
}

export function loadHeaders(target, extra = {}) {
  return {
    "x-load-test-run": target.runId,
    "x-load-test-environment": "staging",
    "user-agent": "dental-marketplace-k6-staging-load-test/1.0",
    ...extra,
  };
}

export function safeJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}
