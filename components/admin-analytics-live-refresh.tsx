"use client";

import { useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRealtimeRouterRefresh } from "@/components/use-realtime-router-refresh";

const adminRealtimeTables = ["customer_choice_events", "treatment_catalog", "treatment_variants", "branch_service_offers", "availability_slots", "feature_flags", "offer_revisions", "price_disputes", "clinics", "branches", "practitioners", "reviews", "notification_outbox", "notification_templates", "support_knowledge_articles", "settlement_periods"] as const;
type Labels = { connected: string; disconnected: string; connecting: string; tooltip: string };

export function AdminLiveRefresh({ labels }: { labels: Labels }) {
  const configure = useCallback((channel: RealtimeChannel, scheduleRefresh: () => void) => {
    for (const table of adminRealtimeTables) channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    return channel;
  }, []);
  const status = useRealtimeRouterRefresh({
    channelName: "platform-admin-live-governance",
    configure,
    debounceMs: 350,
    maxWaitMs: 1_750,
  });
  const label = status === "live" ? labels.connected : status === "error" ? labels.disconnected : labels.connecting;
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${status === "live" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "error" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-50 text-slate-600 ring-slate-200"}`} title={labels.tooltip}><span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-amber-500" : "bg-slate-400"}`} />{label}</span>;
}

/** @deprecated Use AdminLiveRefresh for the complete governance surface. */
export const AdminAnalyticsLiveRefresh = AdminLiveRefresh;
