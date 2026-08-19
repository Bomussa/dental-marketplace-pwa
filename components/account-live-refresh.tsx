"use client";

import { useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRealtimeRouterRefresh } from "@/components/use-realtime-router-refresh";
import type { Database } from "@/lib/database.types";

const patientProfileAccountColumn = "account_id" satisfies keyof Database["public"]["Tables"]["patient_profiles"]["Row"];

type Labels = { liveConnected: string; liveDisconnected: string; liveConnecting: string; liveTooltip: string };

export function AccountLiveRefresh({ userId, labels }: { userId: string; labels: Labels }) {
  const configure = useCallback((channel: RealtimeChannel, scheduleRefresh: () => void) => (
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `booked_by_user_id=eq.${userId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_profiles", filter: `${patientProfileAccountColumn}=eq.${userId}` }, scheduleRefresh)
  ), [userId]);
  const status = useRealtimeRouterRefresh({
    channelName: `account-live:${userId}`,
    configure,
  });
  const label = status === "live" ? labels.liveConnected : status === "error" ? labels.liveDisconnected : labels.liveConnecting;
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-black ${status === "live" ? "text-emerald-700" : status === "error" ? "text-amber-700" : "text-slate-500"}`} title={labels.liveTooltip}><span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-amber-500" : "bg-slate-400"}`} />{label}</span>;
}
