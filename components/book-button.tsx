"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function BookButton({ offerId, slotId }: { offerId: string; slotId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function book() {
    setState("loading");
    setMessage("");
    const response = await fetch("/api/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offer_id: offerId, slot_id: slotId, idempotency_key: crypto.randomUUID() }),
    });
    if (response.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState("error");
      setMessage(body.error ?? "تعذر تأكيد الموعد. حدّث النتائج وحاول مرة أخرى.");
      return;
    }
    setState("done");
    setMessage(`تم إنشاء الحجز: ${body.booking_code}`);
  }

  return (
    <div className="grid gap-2">
      <Button onClick={book} disabled={state === "loading" || state === "done"} className="w-full bg-teal-600 hover:bg-teal-700">
        {state === "loading" ? "جاري قفل الموعد…" : state === "done" ? "تم الحجز" : "احجز هذا الموعد"}
      </Button>
      {message && <p className={`text-xs font-bold ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
