"use client";

import { useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRealtimeRouterRefresh } from "@/components/use-realtime-router-refresh";

type Locale = "ar" | "en";
type ResultsLiveRefreshProps = { variantId: string; locale: Locale };

const copy: Record<Locale, { title: string; live: string; error: string; connecting: string }> = {
  ar: {
    title: "تتحدث الأسعار والمواعيد تلقائيًا عند تغير مصدرها",
    live: "تحديثات مباشرة",
    error: "التحديث المباشر يعيد الاتصال تلقائيًا",
    connecting: "جارٍ الاتصال…",
  },
  en: {
    title: "Prices and appointments update automatically when their source changes",
    live: "Live updates",
    error: "Live updates are reconnecting automatically",
    connecting: "Connecting…",
  },
};

export function ResultsLiveRefresh({ variantId, locale }: ResultsLiveRefreshProps) {
  const configure = useCallback((channel: RealtimeChannel, scheduleRefresh: () => void) => (
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "branch_service_offers", filter: `variant_id=eq.${variantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_slots", filter: `variant_id=eq.${variantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "treatment_variants", filter: `id=eq.${variantId}` }, scheduleRefresh)
  ), [variantId]);
  const status = useRealtimeRouterRefresh({
    channelName: `results-live:${variantId}`,
    configure,
  });
  const labels = copy[locale];
  const statusLabel = status === "live" ? labels.live : status === "error" ? labels.error : labels.connecting;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-black ${status === "live" ? "text-emerald-200" : status === "error" ? "text-amber-100" : "text-blue-100"}`}
      title={labels.title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" : status === "error" ? "bg-amber-200" : "bg-blue-200"}`} />
      {statusLabel}
    </span>
  );
}
