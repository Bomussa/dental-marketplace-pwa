"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { coalescedRefreshDelay, nextReconnectAttempt, reconnectDelay } from "@/lib/realtime-refresh-policy";

export type RealtimeConnectionState = "connecting" | "live" | "error";

type UseRealtimeRouterRefreshOptions = {
  channelName: string;
  configure: (channel: RealtimeChannel, scheduleRefresh: () => void) => RealtimeChannel;
  enabled?: boolean;
  debounceMs?: number;
  maxWaitMs?: number;
};

/**
 * Keeps server-rendered surfaces current from a single scoped Realtime channel.
 * Events are coalesced into one refresh, and closed/error channels retry with
 * bounded exponential backoff. Database constraints remain the source of truth.
 */
export function useRealtimeRouterRefresh({
  channelName,
  configure,
  enabled = true,
  debounceMs = 320,
  maxWaitMs = 1_500,
}: UseRealtimeRouterRefreshOptions): RealtimeConnectionState {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstQueuedEventAt = useRef<number | null>(null);
  const retryAttempt = useRef(0);
  const [status, setStatus] = useState<RealtimeConnectionState>(enabled ? "connecting" : "error");
  const [connectionEpoch, setConnectionEpoch] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const clearRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
      firstQueuedEventAt.current = null;
    };
    const clearRetry = () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
    };
    const scheduleRefresh = () => {
      const now = Date.now();
      if (firstQueuedEventAt.current === null) firstQueuedEventAt.current = now;
      const delay = coalescedRefreshDelay(firstQueuedEventAt.current, now, debounceMs, maxWaitMs);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        firstQueuedEventAt.current = null;
        router.refresh();
      }, delay);
    };
    const scheduleReconnect = () => {
      if (!active || retryTimer.current) return;
      const delay = reconnectDelay(retryAttempt.current);
      retryAttempt.current = nextReconnectAttempt(retryAttempt.current);
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        if (active) {
          setStatus("connecting");
          setConnectionEpoch((current) => current + 1);
        }
      }, delay);
    };

    const channel = configure(supabase.channel(channelName), scheduleRefresh).subscribe((nextStatus) => {
      if (!active) return;
      if (nextStatus === "SUBSCRIBED") {
        retryAttempt.current = 0;
        clearRetry();
        setStatus("live");
        return;
      }
      if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") {
        setStatus("error");
        scheduleReconnect();
      }
    });

    return () => {
      active = false;
      clearRefresh();
      clearRetry();
      void supabase.removeChannel(channel);
    };
  }, [channelName, configure, connectionEpoch, debounceMs, enabled, maxWaitMs, router, supabase]);

  return enabled ? status : "error";
}
