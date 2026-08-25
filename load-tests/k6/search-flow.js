import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { boundedInteger, loadHeaders, safeJson, stagingTarget } from "./shared.js";

const target = stagingTarget();
const variantId = __ENV.TEST_VARIANT_ID;
if (!variantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(variantId)) {
  throw new Error("TEST_VARIANT_ID must be a staging UUID.");
}

const maxRate = boundedInteger("SEARCH_MAX_RPS", 100, 1, 500);
const preAllocatedVUs = boundedInteger("SEARCH_PREALLOCATED_VUS", 100, 10, 1000);
const maxVUs = boundedInteger("SEARCH_MAX_VUS", 500, preAllocatedVUs, 2000);
const searchFailures = new Rate("search_failures");
const searchLatency = new Trend("search_latency", true);
const searchResponses = new Counter("search_responses");
const profile = __ENV.SEARCH_PROFILE ?? "full";
if (!["smoke", "full"].includes(profile)) throw new Error("SEARCH_PROFILE must be either 'smoke' or 'full'.");
const stages = profile === "smoke"
  ? [
    { duration: "5s", target: Math.min(5, maxRate) },
    { duration: "10s", target: maxRate },
    { duration: "5s", target: 0 },
  ]
  : [
    { duration: "5m", target: Math.max(10, Math.floor(maxRate * 0.2)) },
    { duration: "10m", target: Math.max(10, Math.floor(maxRate * 0.6)) },
    { duration: "15m", target: maxRate },
    { duration: "5m", target: 0 },
  ];

export const options = {
  scenarios: {
    public_search: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs,
      maxVUs,
      stages,
      tags: { flow: "public_search" },
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<4000", "p(99)<8000"],
    search_failures: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

const sorts = ["balanced", "price", "distance", "rating", "soonest"];
const whenValues = ["earliest", "today", "tomorrow"];

export default function () {
  const params = [
    ["variant", variantId],
    ["radius", String(5 + ((__VU + __ITER) % 4) * 5)],
    ["sort", sorts[(__VU + __ITER) % sorts.length]],
    ["when", whenValues[(__VU + __ITER) % whenValues.length]],
  ];

  if (__ENV.TEST_SEARCH_LAT && __ENV.TEST_SEARCH_LNG) {
    params.push(["lat", __ENV.TEST_SEARCH_LAT], ["lng", __ENV.TEST_SEARCH_LNG]);
  }

  const query = params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
  const response = http.get(`${target.baseUrl}/api/search?${query}`, {
    headers: loadHeaders(target),
    tags: { route: "/api/search" },
    timeout: "15s",
  });
  const body = safeJson(response);
  const valid = check(response, {
    "search returns 200": (r) => r.status === 200,
    "search returns JSON count": () => body && typeof body.count === "number" && Array.isArray(body.offers),
    "search returns variant details": () => body && body.variant && typeof body.variant.name_ar === "string" && typeof body.variant.name_en === "string",
  });

  searchFailures.add(!valid);
  searchLatency.add(response.timings.duration);
  searchResponses.add(1);
  sleep(1 + Math.random() * 3);
}
