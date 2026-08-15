"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CalendarIcon, CheckIcon } from "@/components/icons";
import { bookingIntentKey, clearBookingIntent } from "@/lib/booking-intent.client";
import { trackChoice } from "@/lib/choice-events.client";

export function BookButton({ offerId, slotId }: { offerId: string; slotId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function book() {
    setState("loading");
    setMessage("");
    trackChoice({ event_name: "offer_booking_clicked", offer_id: offerId, slot_id: slotId });

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, slot_id: slotId, idempotency_key: bookingIntentKey(offerId, slotId) }),
      });

      if (response.status === 401) {
        trackChoice({ event_name: "booking_login_required", offer_id: offerId, slot_id: slotId, choice_value: { response_status: 401 } });
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        trackChoice({ event_name: "booking_failed", offer_id: offerId, slot_id: slotId, choice_value: { response_status: response.status } });
        if (response.status === 409) clearBookingIntent(offerId, slotId);
        setState("error");
        setMessage(body.error ?? "تعذر تأكيد الموعد. حدّث النتائج وحاول مرة أخرى.");
        return;
      }

      clearBookingIntent(offerId, slotId);
      trackChoice({ event_name: "booking_succeeded", offer_id: offerId, slot_id: slotId, choice_value: { response_status: response.status } });
      setState("done");
      setMessage(`تم إنشاء الحجز: ${body.booking_code}`);
    } catch {
      setState("error");
      setMessage("تعذر الاتصال لتأكيد الموعد. أعد المحاولة؛ لن ننشئ حجزًا جديدًا لنفس المحاولة.");
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={book} disabled={state === "loading" || state === "done"} className={`w-full gap-2 ${state === "done" ? "bg-[#34C759] hover:bg-[#34C759]" : ""}`}>
        {state === "done" ? <CheckIcon size={18} /> : <CalendarIcon size={18} />} {state === "loading" ? "جاري تأمين الموعد…" : state === "done" ? "تم الحجز" : "احجز هذا الموعد"}
      </Button>
      {message && <p className={`text-xs font-extrabold ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
