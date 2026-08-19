export const REALTIME_REFRESH_DEBOUNCE_MS = 320;
export const REALTIME_REFRESH_MAX_WAIT_MS = 1_500;
export const REALTIME_RECONNECT_BASE_MS = 1_000;
export const REALTIME_RECONNECT_MAX_MS = 30_000;
export const REALTIME_RECONNECT_MAX_EXPONENT = 5;

export function coalescedRefreshDelay(firstQueuedEventAt: number, now: number, debounceMs = REALTIME_REFRESH_DEBOUNCE_MS, maxWaitMs = REALTIME_REFRESH_MAX_WAIT_MS) {
  return now - firstQueuedEventAt >= maxWaitMs ? 0 : debounceMs;
}

export function reconnectDelay(attempt: number) {
  const exponent = Math.min(Math.max(attempt, 0), REALTIME_RECONNECT_MAX_EXPONENT);
  return Math.min(REALTIME_RECONNECT_BASE_MS * 2 ** exponent, REALTIME_RECONNECT_MAX_MS);
}

export function nextReconnectAttempt(attempt: number) {
  return Math.min(Math.max(attempt, 0) + 1, REALTIME_RECONNECT_MAX_EXPONENT);
}
