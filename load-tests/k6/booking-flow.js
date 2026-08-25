import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { boundedInteger, loadHeaders, safeJson, stagingTarget } from "./shared.js";

const target = stagingTarget();
if (target.targetEnvironment !== "staging") {
  throw new Error("Booking flow may run only when TARGET_ENV=staging.");
}
if (__ENV.BOOKING_WRITE_CONFIRMATION !== "STAGING_TEST_DATA_ONLY") {
  throw new Error("BOOKING_WRITE_CONFIRMATION must be exactly 'STAGING_TEST_DATA_ONLY'.");
}

const fixturesPath = __ENV.BOOKING_FIXTURES_PATH ?? "./fixtures/booking-fixtures.private.json";
const fixtures = JSON.parse(open(fixturesPath));
if (!Array.isArray(fixtures) || fixtures.length === 0) throw new Error("Booking fixtures must contain at least one staging record.");

const bookingVUs = boundedInteger("BOOKING_VUS", Math.min(fixtures.length, 10), 1, fixtures.length);
const bookingFailures = new Rate("booking_failures");
const bookingLatency = new Trend("booking_latency", true);
const bookingCreated = new Counter("booking_created");
const bookingResponses = new Counter("booking_responses");

for (const fixture of fixtures) {
  if (!fixture.fixture_id || !fixture.cookie_env || !fixture.offer_id || !fixture.slot_id || !fixture.patient_profile_id) {
    throw new Error("Every booking fixture requires fixture_id, cookie_env, offer_id, slot_id, and patient_profile_id.");
  }
}

export const options = {
  scenarios: {
    authenticated_booking: {
      executor: "per-vu-iterations",
      vus: bookingVUs,
      iterations: 1,
      maxDuration: "10m",
      tags: { flow: "authenticated_booking" },
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000", "p(99)<10000"],
    booking_failures: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const fixture = fixtures[(__VU - 1) % fixtures.length];
  const sessionCookie = __ENV[fixture.cookie_env];
  if (!sessionCookie) throw new Error(`Missing short-lived staging cookie in ${fixture.cookie_env}.`);

  const idempotencyKey = `${target.runId}-${fixture.fixture_id}`.slice(0, 128);
  const payload = JSON.stringify({
    offer_id: fixture.offer_id,
    slot_id: fixture.slot_id,
    patient_profile_id: fixture.patient_profile_id,
    idempotency_key: idempotencyKey,
  });

  const response = http.post(`${target.baseUrl}/api/book`, payload, {
    headers: loadHeaders(target, {
      "content-type": "application/json",
      origin: target.origin,
      cookie: sessionCookie,
    }),
    tags: { route: "/api/book" },
    timeout: "20s",
  });
  const body = safeJson(response);
  const created = check(response, {
    "booking returns 201": (r) => r.status === 201,
    "booking returns a code": () => body && typeof body.booking_code === "string" && body.booking_code.length > 0,
  });

  bookingFailures.add(!created);
  bookingLatency.add(response.timings.duration);
  bookingResponses.add(1);
  if (created) bookingCreated.add(1);
  sleep(1 + Math.random() * 2);
}
