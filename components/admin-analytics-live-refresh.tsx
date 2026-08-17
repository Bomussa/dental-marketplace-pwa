"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const adminRealtimeTables = [
  "customer_choice_events",
  "treatment_catalog",
  "treatment_variants",
  "branch_service_offers",
  "availability_slots",
  "feature_flags",
  "offer_revisions",
  "price_disputes",
  "clinics",
  "branches",
  "practitioners",
  "reviews",
  "notification_outbox",
  "notification_templates",
  "support_knowledge_articles",
  "settlement_periods",
] as const;

export function AdminLiveRefresh() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 350);
    };
    const channel = supabase.channel("platform-admin-live-governance");
    for (const table of adminRealtimeTables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe((nextStatus) => {
      if (nextStatus === "SUBSCRIBED") setStatus("live");
      else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") setStatus("error");
    });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${
        status === "live"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : status === "error"
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
      title="تتحدث أسطح الحوكمة عند تغير بياناتها المصرح بها"
    >
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-slate-400"}`} />
      {status === "live" ? "تحديثات مباشرة" : status === "error" ? "التحديث المباشر غير متصل" : "جارٍ الاتصال…"}
    </span>
  );
}

/** @deprecated Use AdminLiveRefresh for the complete governance surface. */
export const AdminAnalyticsLiveRefresh = AdminLiveRefresh;
