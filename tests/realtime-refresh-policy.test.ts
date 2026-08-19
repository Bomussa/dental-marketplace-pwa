import { describe, expect, it } from "vitest";
import {
  REALTIME_RECONNECT_MAX_MS,
  coalescedRefreshDelay,
  nextReconnectAttempt,
  reconnectDelay,
} from "@/lib/realtime-refresh-policy";

describe("realtime refresh policy", () => {
  it("debounces a burst but flushes once the maximum wait has elapsed", () => {
    expect(coalescedRefreshDelay(1_000, 1_200, 320, 1_500)).toBe(320);
    expect(coalescedRefreshDelay(1_000, 2_500, 320, 1_500)).toBe(0);
  });

  it("uses bounded exponential reconnect delays", () => {
    expect(reconnectDelay(0)).toBe(1_000);
    expect(reconnectDelay(1)).toBe(2_000);
    expect(reconnectDelay(5)).toBe(REALTIME_RECONNECT_MAX_MS);
    expect(reconnectDelay(99)).toBe(REALTIME_RECONNECT_MAX_MS);
  });

  it("caps the reconnect attempt counter", () => {
    expect(nextReconnectAttempt(0)).toBe(1);
    expect(nextReconnectAttempt(5)).toBe(5);
    expect(nextReconnectAttempt(99)).toBe(5);
  });
});
