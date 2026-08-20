"use client";

import { useCallback, useMemo } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRealtimeRouterRefresh } from "@/components/use-realtime-router-refresh";
import { isClinicBookingNotification } from "@/lib/clinic-realtime-refresh";

type Labels = { liveConnected: string; liveDisconnected: string; liveConnecting: string; liveTooltip: string };

export function ClinicLiveRefresh({ branchIds, userId, labels }: { branchIds: string[]; userId: string; labels: Labels }) {
  const orderedBranchIds = useMemo(() => [...new Set(branchIds)].sort(), [branchIds]);
  const branchScope = orderedBranchIds.join(":");
  const configure = useCallback((channel: RealtimeChannel, scheduleRefresh: () => void) => {
    for (const branchId of orderedBranchIds) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `branch_id=eq.${branchId}` }, scheduleRefresh);
    }
    return channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_outbox", filter: `recipient_user_id=eq.${userId}` }, (payload) => {
      if (isClinicBookingNotification(payload)) scheduleRefresh();
    });
  }, [orderedBranchIds, userId]);
  const status = useRealtimeRouterRefresh({
    channelName: `clinic-live:${userId}:${branchScope}`,
    configure,
    enabled: orderedBranchIds.length > 0,
  });

  const label = status === "live" ? labels.liveConnected : status === "error" ? labels.liveDisconnected : labels.liveConnecting;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${status === "live" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "error" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`} title={labels.liveTooltip}>
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-amber-500" : "bg-slate-400"}`} />
      {label}
    </span>
  );
}
