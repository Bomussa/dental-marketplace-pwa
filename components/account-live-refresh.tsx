"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Labels = { liveConnected: string; liveDisconnected: string; liveConnecting: string; liveTooltip: string };

export function AccountLiveRefresh({ userId, labels }: { userId: string; labels: Labels }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  useEffect(() => {
    const scheduleRefresh = () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); refreshTimer.current = setTimeout(() => router.refresh(), 300); };
    const channel = supabase.channel(`account-live:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `booked_by_user_id=eq.${userId}` }, scheduleRefresh).on("postgres_changes", { event: "*", schema: "public", table: "patient_profiles", filter: `user_id=eq.${userId}` }, scheduleRefresh).subscribe((nextStatus) => { if (nextStatus === "SUBSCRIBED") setStatus("live"); else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") setStatus("error"); });
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); void supabase.removeChannel(channel); };
  }, [router, supabase, userId]);
  const label = status === "live" ? labels.liveConnected : status === "error" ? labels.liveDisconnected : labels.liveConnecting;
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-black ${status === "live" ? "text-emerald-700" : status === "error" ? "text-red-700" : "text-slate-500"}`} title={labels.liveTooltip}><span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-slate-400"}`} />{label}</span>;
}
