"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminAnalyticsLiveRefresh() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("platform-admin-customer-choice-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_choice_events" },
        () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => router.refresh(), 350);
        },
      )
      .subscribe((nextStatus) => {
        if (nextStatus === "SUBSCRIBED") setStatus("live");
        else if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") setStatus("error");
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
      title="تحديث تلقائي عند وصول حدث جديد إلى customer_choice_events"
    >
      <span className={`h-2 w-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "error" ? "bg-red-500" : "bg-slate-400"}`} />
      {status === "live" ? "Realtime متصل" : status === "error" ? "Realtime غير متصل" : "جاري الاتصال…"}
    </span>
  );
}
