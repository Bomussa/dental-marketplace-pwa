"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { CalendarIcon, CheckIcon } from "@/components/icons";
import { bookingIntentKey, clearBookingIntent } from "@/lib/booking-intent.client";
import { trackChoice } from "@/lib/choice-events.client";

type PatientProfile = { id: string; display_name: string; relationship: string };

function relationshipLabel(relationship: string) {
  if (relationship === "self") return "أنا";
  if (relationship === "child") return "ابن/ابنة";
  if (relationship === "spouse") return "زوج/زوجة";
  if (relationship === "parent") return "أب/أم";
  return "فرد من العائلة";
}

export function BookButton({ offerId, slotId, patientProfiles }: { offerId: string; slotId: string; patientProfiles: PatientProfile[] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [patientProfileId, setPatientProfileId] = useState(patientProfiles[0]?.id ?? "");

  async function book() {
    if (!patientProfileId) {
      setState("error");
      setMessage("سجّل الدخول ثم أضف الشخص الذي تريد الحجز له من صفحة حسابك.");
      return;
    }

    setState("loading");
    setMessage("");
    trackChoice({ event_name: "offer_booking_clicked", offer_id: offerId, slot_id: slotId });

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          slot_id: slotId,
          patient_profile_id: patientProfileId,
          idempotency_key: bookingIntentKey(offerId, slotId, patientProfileId),
        }),
      });

      if (response.status === 401) {
        trackChoice({ event_name: "booking_login_required", offer_id: offerId, slot_id: slotId, choice_value: { response_status: 401 } });
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        trackChoice({ event_name: "booking_failed", offer_id: offerId, slot_id: slotId, choice_value: { response_status: response.status } });
        if (response.status === 409) clearBookingIntent(offerId, slotId, patientProfileId);
        setState("error");
        setMessage(body.error ?? "تعذر تأكيد الموعد. حدّث النتائج وحاول مرة أخرى.");
        return;
      }

      clearBookingIntent(offerId, slotId, patientProfileId);
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
      {patientProfiles.length > 0 ? (
        <label className="grid gap-1.5 text-xs font-extrabold text-slate-600">
          لمن هذا الموعد؟
          <Select value={patientProfileId} onChange={(event) => setPatientProfileId(event.target.value)} disabled={state === "loading" || state === "done"}>
            {patientProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} — {relationshipLabel(profile.relationship)}</option>)}
          </Select>
        </label>
      ) : (
        <div className="rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-800">سجّل الدخول ثم أضف الشخص الذي تريد الحجز له من صفحة حسابك.</div>
      )}
      <Button onClick={book} disabled={state === "loading" || state === "done" || patientProfiles.length === 0} className={`w-full gap-2 ${state === "done" ? "bg-[#34C759] hover:bg-[#34C759]" : ""}`}>
        {state === "done" ? <CheckIcon size={18} /> : <CalendarIcon size={18} />} {state === "loading" ? "جاري تأمين الموعد…" : state === "done" ? "تم الحجز" : "احجز هذا الموعد"}
      </Button>
      {message && <p className={`text-xs font-extrabold ${state === "error" ? "text-red-700" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
