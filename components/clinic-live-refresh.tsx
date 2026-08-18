"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Labels = { liveConnected: string; liveDisconnected: string; liveConnecting: string; liveTooltip: string };

export function ClinicLiveRefresh({ branchIds, userId, labels }: { branchIds: string[]; userId: string; labels: Labels }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");

  useEffect(() => {
    if (!branchIds.length) return;
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase.channel(`clinic-live:${userId}:${branchIds.slice().sort().join(":")}`);
    for (const branchId of branchIds) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `branch_id=eq.${branchId}` }, scheduleRefresh);
    }
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notification_outbox", filter: `recipient_user_id=eq.${userId}` }, scheduleRefresh)
      .subscribe((nextStatus) => {
        if (nextStatus === "SUBSCRIBED") setStatus("live");
        else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") setStatus("error");
      });
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [branchIds, router, supabase, userId]);

  const label = status === "live" ? labels.liveConnected : status === "error" ? labels.liveDisconnected : labels.liveConnecting;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${status === "live" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "error" ? "bg-red-50 text-red-700 ring-red-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`} title={labels.liveTooltip}>
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-slate-400"}`} />
      {label}
    </span>
  );
}
