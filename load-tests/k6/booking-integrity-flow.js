import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { boundedInteger, loadHeaders, safeJson, stagingTarget } from "./shared.js";

const target = stagingTarget();
if (target.targetEnvironment !== "staging") {
  throw new Error("Booking integrity flow may run only when TARGET_ENV=staging.");
}
if (__ENV.BOOKING_WRITE_CONFIRMATION !== "STAGING_TEST_DATA_ONLY") {
  throw new Error("BOOKING_WRITE_CONFIRMATION must be exactly 'STAGING_TEST_DATA_ONLY'.");
}

const mode = __ENV.BOOKING_INTEGRITY_MODE;
if (mode !== "retry" && mode !== "concurrency") {
  throw new Error("BOOKING_INTEGRITY_MODE must be exactly 'retry' or 'concurrency'.");
}

const fixturesPath = __ENV.BOOKING_INTEGRITY_FIXTURES_PATH ?? "./fixtures/booking-integrity-fixtures.private.json";
const fixtures = JSON.parse(open(fixturesPath));
if (!Array.isArray(fixtures) || fixtures.length === 0) throw new Error("Booking integrity fixtures must contain at least one staging record.");

for (const fixture of fixtures) {
  if (!fixture.fixture_id || !fixture.cookie_env || !fixture.offer_id || !fixture.slot_id || !fixture.patient_profile_id) {
    throw new Error("Every fixture requires fixture_id, cookie_env, offer_id, slot_id, and patient_profile_id.");
  }
}

const vus = boundedInteger("BOOKING_INTEGRITY_VUS", mode === "retry" ? 1 : fixtures.length, 1, fixtures.length);
if (mode === "retry" && vus > fixtures.length) throw new Error("Retry VUs cannot exceed fixture count.");
if (mode === "concurrency") {
  const first = fixtures[0];
  if (!fixtures.every((fixture) => fixture.slot_id === first.slot_id && fixture.offer_id === first.offer_id)) {
    throw new Error("Concurrency fixtures must target exactly one shared slot and offer.");
  }
  if (new Set(fixtures.map((fixture) => fixture.fixture_id)).size !== fixtures.length) {
    throw new Error("Concurrency fixtures must have distinct fixture_id values.");
  }
}

const integrityFailures = new Rate("booking_integrity_failures");
const bookingLatency = new Trend("booking_integrity_latency", true);
const retryCreated = new Counter("retry_created");
const retryReconciled = new Counter("retry_reconciled");
const concurrencyCreated = new Counter("concurrency_created");
const concurrencyConflicts = new Counter("concurrency_conflicts");
const concurrencyUnexpected = new Counter("concurrency_unexpected");

export const options = {
  scenarios: {
    booking_integrity: {
      executor: "per-vu-iterations",
      vus,
      iterations: 1,
      maxDuration: "10m",
      tags: { flow: `booking_${mode}` },
      gracefulStop: "30s",
    },
  },
  thresholds: mode === "retry"
    ? {
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<5000", "p(99)<10000"],
        booking_integrity_failures: ["rate<0.01"],
        checks: ["rate>0.99"],
        retry_created: [`count==${vus}`],
        retry_reconciled: [`count==${vus}`],
      }
    : {
        http_req_duration: ["p(95)<5000", "p(99)<10000"],
        booking_integrity_failures: ["rate<0.01"],
        checks: ["rate>0.99"],
        concurrency_created: ["count==1"],
        concurrency_conflicts: [`count==${vus - 1}`],
        concurrency_unexpected: ["count==0"],
      },
};

function postBooking(fixture, idempotencyKey) {
  const sessionCookie = __ENV[fixture.cookie_env];
  if (!sessionCookie) throw new Error(`Missing short-lived staging cookie in ${fixture.cookie_env}.`);
  const response = http.post(`${target.baseUrl}/api/book`, JSON.stringify({
    offer_id: fixture.offer_id,
    slot_id: fixture.slot_id,
    patient_profile_id: fixture.patient_profile_id,
    idempotency_key: idempotencyKey,
  }), {
    headers: loadHeaders(target, {
      "content-type": "application/json",
      origin: target.origin,
      cookie: sessionCookie,
    }),
    tags: { route: "/api/book", mode },
    timeout: "20s",
  });
  bookingLatency.add(response.timings.duration);
  return { response, body: safeJson(response) };
}

function runRetry(fixture) {
  const idempotencyKey = `${target.runId}-retry-${fixture.fixture_id}`.slice(0, 128);
  const first = postBooking(fixture, idempotencyKey);
  const firstCreated = check(first.response, {
    "retry first request returns 201": (response) => response.status === 201,
    "retry first request returns a booking code": () => typeof first.body?.booking_code === "string" && first.body.booking_code.length > 0,
  });
  if (firstCreated) retryCreated.add(1);

  const retried = postBooking(fixture, idempotencyKey);
  const reconciled = check(retried.response, {
    "retry request returns 201": (response) => response.status === 201,
    "retry returns the same booking code": () => firstCreated && retried.body?.booking_code === first.body?.booking_code,
  });
  if (reconciled) retryReconciled.add(1);
  integrityFailures.add(!(firstCreated && reconciled));
}

function runConcurrency(fixture) {
  const idempotencyKey = `${target.runId}-concurrency-${fixture.fixture_id}`.slice(0, 128);
  const attempt = postBooking(fixture, idempotencyKey);
  const allowed = check(attempt.response, {
    "concurrent request is created or rejected as unavailable": (response) => response.status === 201 || response.status === 409,
    "created concurrent booking has a code": () => attempt.response.status !== 201 || (typeof attempt.body?.booking_code === "string" && attempt.body.booking_code.length > 0),
  });

  if (attempt.response.status === 201) concurrencyCreated.add(1);
  else if (attempt.response.status === 409) concurrencyConflicts.add(1);
  else concurrencyUnexpected.add(1);
  integrityFailures.add(!allowed);
}

export default function bookingIntegrityFlow() {
  const fixture = fixtures[(__VU - 1) % fixtures.length];
  if (mode === "retry") runRetry(fixture);
  else runConcurrency(fixture);
  sleep(1 + Math.random() * 2);
}
