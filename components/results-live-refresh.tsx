"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Locale = "ar" | "en";
type ResultsLiveRefreshProps = { variantId: string; locale: Locale };

const copy: Record<Locale, { title: string; live: string; error: string; connecting: string }> = {
  ar: {
    title: "تتحدث الأسعار والمواعيد تلقائيًا عند تغير مصدرها",
    live: "تحديثات مباشرة",
    error: "التحديث المباشر غير متصل",
    connecting: "جارٍ الاتصال…",
  },
  en: {
    title: "Prices and appointments update automatically when their source changes",
    live: "Live updates",
    error: "Live updates disconnected",
    connecting: "Connecting…",
  },
};

export function ResultsLiveRefresh({ variantId, locale }: ResultsLiveRefreshProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const labels = copy[locale];

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`results-live:${variantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "branch_service_offers", filter: `variant_id=eq.${variantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_slots", filter: `variant_id=eq.${variantId}` }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "treatment_variants", filter: `id=eq.${variantId}` }, scheduleRefresh)
      .subscribe((nextStatus) => {
        if (nextStatus === "SUBSCRIBED") setStatus("live");
        else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") setStatus("error");
      });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [router, supabase, variantId]);

  const statusLabel = status === "live" ? labels.live : status === "error" ? labels.error : labels.connecting;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-black ${status === "live" ? "text-emerald-700" : status === "error" ? "text-red-700" : "text-slate-500"}`}
      title={labels.title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-slate-400"}`} />
      {statusLabel}
    </span>
  );
}
