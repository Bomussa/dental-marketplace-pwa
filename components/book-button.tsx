"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { CalendarIcon, CheckIcon } from "@/components/icons";
import { bookingIntentKey, clearBookingIntent } from "@/lib/booking-intent.client";
import { trackChoice } from "@/lib/choice-events.client";

type PatientProfile = {
  id: string;
  display_name: string;
  relationship: string;
  national_id: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  phone: string | null;
  phone_verified_at: string | null;
  gender: string | null;
};

type ProfileDraft = {
  display_name: string;
  relationship: string;
  national_id: string;
  nationality: string;
  date_of_birth: string;
  phone: string;
  gender: string;
};

type RequestState = "idle" | "sending" | "confirming" | "booking" | "done" | "error";

function relationshipLabel(relationship: string) {
  if (relationship === "self") return "أنا";
  if (relationship === "child") return "ابن/ابنة";
  if (relationship === "spouse") return "زوج/زوجة";
  if (relationship === "parent") return "أب/أم";
  return "فرد من العائلة";
}

function toDraft(profile?: PatientProfile): ProfileDraft {
  return {
    display_name: profile?.display_name ?? "",
    relationship: profile?.relationship ?? "self",
    national_id: profile?.national_id ?? "",
    nationality: profile?.nationality ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    phone: profile?.phone ?? "",
    gender: profile?.gender ?? "",
  };
}

function isBookable(profile?: PatientProfile) {
  return Boolean(profile?.national_id && profile.nationality && profile.date_of_birth && profile.phone && profile.phone_verified_at);
}

export function BookButton({
  offerId,
  slotId,
  patientProfiles,
  isAuthenticated,
}: {
  offerId: string;
  slotId: string;
  patientProfiles: PatientProfile[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState(patientProfiles[0]?.id ?? "new");
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(patientProfiles[0]));
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [code, setCode] = useState("");
  const [profiles, setProfiles] = useState(patientProfiles);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId),
    [profiles, selectedProfileId],
  );
  const busy = state === "sending" || state === "confirming" || state === "booking";
  const canBook = isBookable(selectedProfile);

  function selectProfile(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    setSelectedProfileId(profileId);
    setDraft(toDraft(profile));
    setVerificationStarted(false);
    setCode("");
    setMessage("");
    setState("idle");
  }

  function updateDraft(field: keyof ProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function begin() {
    trackChoice({ event_name: "offer_booking_clicked", offer_id: offerId, slot_id: slotId });
    if (!isAuthenticated) {
      trackChoice({ event_name: "booking_login_required", offer_id: offerId, slot_id: slotId });
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setExpanded(true);
    setMessage("");
  }

  async function startVerification() {
    setState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/patient-phone-verification/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, patient_profile_id: selectedProfileId === "new" ? undefined : selectedProfileId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState("error");
        setMessage(body.error ?? "تعذر إرسال رمز التحقق. أعد المحاولة لاحقًا.");
        return;
      }

      const patientProfileId = body.patient_profile_id as string;
      const normalizedProfile: PatientProfile = {
        id: patientProfileId,
        ...draft,
        national_id: draft.national_id,
        nationality: draft.nationality.toUpperCase(),
        date_of_birth: draft.date_of_birth,
        phone: body.phone as string,
        gender: draft.gender || null,
        phone_verified_at: null,
      };
      setProfiles((current) => {
        const withoutCurrent = current.filter((profile) => profile.id !== patientProfileId);
        return [...withoutCurrent, normalizedProfile];
      });
      setSelectedProfileId(patientProfileId);
      setDraft(toDraft(normalizedProfile));
      setVerificationStarted(true);
      setState("idle");
      setMessage("أرسلنا رمز تحقق إلى رقم الهاتف. أدخله لإتمام الحجز.");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال لإرسال رمز التحقق. لم نؤكد إرسال أي رسالة.");
    }
  }

  async function confirmVerification() {
    if (!selectedProfile || !code) {
      setState("error");
      setMessage("أدخل رمز التحقق المرسل إلى الهاتف.");
      return;
    }
    setState("confirming");
    setMessage("");
    try {
      const response = await fetch("/api/patient-phone-verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patient_profile_id: selectedProfile.id, code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState("error");
        setMessage(body.error ?? "تعذر تأكيد رمز التحقق.");
        return;
      }
      setProfiles((current) => current.map((profile) => profile.id === selectedProfile.id ? { ...profile, phone_verified_at: body.phone_verified_at as string } : profile));
      setVerificationStarted(false);
      setCode("");
      setState("idle");
      setMessage("تم التحقق من رقم الهاتف. يمكنك تأكيد الموعد الآن.");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال لتأكيد الرمز. أعد المحاولة لاحقًا.");
    }
  }

  async function book() {
    if (!selectedProfile || !canBook) {
      setState("error");
      setMessage("أكمل بيانات المريض وتحقق من رقم الهاتف أولًا.");
      return;
    }

    setState("booking");
    setMessage("");
    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          slot_id: slotId,
          patient_profile_id: selectedProfile.id,
          idempotency_key: bookingIntentKey(offerId, slotId, selectedProfile.id),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        trackChoice({ event_name: "booking_login_required", offer_id: offerId, slot_id: slotId, choice_value: { response_status: 401 } });
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!response.ok) {
        trackChoice({ event_name: "booking_failed", offer_id: offerId, slot_id: slotId, choice_value: { response_status: response.status } });
        if (response.status === 409) clearBookingIntent(offerId, slotId, selectedProfile.id);
        setState("error");
        setMessage(body.error ?? "تعذر تأكيد الموعد. حدّث النتائج وحاول مرة أخرى.");
        return;
      }

      clearBookingIntent(offerId, slotId, selectedProfile.id);
      trackChoice({ event_name: "booking_succeeded", offer_id: offerId, slot_id: slotId, choice_value: { response_status: response.status } });
      setState("done");
      setMessage(`تم إنشاء الحجز: ${body.booking_code}`);
    } catch {
      setState("error");
      setMessage("تعذر الاتصال لتأكيد الموعد. أعد المحاولة؛ لن ننشئ حجزًا جديدًا لنفس المحاولة.");
    }
  }

  if (!expanded) {
    return <Button onClick={begin} className="w-full gap-2"><CalendarIcon size={18} />احجز هذا الموعد</Button>;
  }

  return (
    <div className="grid gap-3" aria-live="polite">
      <div className="rounded-[20px] border border-[#CDE2F5] bg-[#F8FBFB] p-4 shadow-[0_16px_34px_-28px_rgba(16,42,67,.44)]">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-900">بيانات المريض</p><span className="rounded-full bg-[#E7F1FB] px-2.5 py-1 text-[11px] font-black text-[#084884]">خطوة آمنة قبل الحجز</span></div>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">نحفظ هذه البيانات للحجز فقط ونطلب تحققًا فعليًا من رقم الهاتف.</p>
        <label className="mt-3 grid gap-1.5 text-xs font-extrabold text-slate-600">الشخص الذي سيستقبل العلاج
          <Select value={selectedProfileId} onChange={(event) => selectProfile(event.target.value)} disabled={busy || state === "done"}>
            <option value="new">إضافة مريض جديد</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} — {relationshipLabel(profile.relationship)}</option>)}
          </Select>
        </label>

        {!canBook && !verificationStarted && <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">الاسم الكامل<Input value={draft.display_name} onChange={(event) => updateDraft("display_name", event.target.value)} disabled={busy} required /></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">صلة القرابة<Select value={draft.relationship} onChange={(event) => updateDraft("relationship", event.target.value)} disabled={busy}><option value="self">أنا</option><option value="child">ابن/ابنة</option><option value="spouse">زوج/زوجة</option><option value="parent">أب/أم</option><option value="other">فرد آخر</option></Select></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">الرقم الشخصي<Input inputMode="numeric" value={draft.national_id} onChange={(event) => updateDraft("national_id", event.target.value)} disabled={busy} placeholder="11 رقمًا" required /></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">الجنسية<Select value={draft.nationality} onChange={(event) => updateDraft("nationality", event.target.value)} disabled={busy} required><option value="">اختر الجنسية</option><option value="QA">قطر</option><option value="SA">السعودية</option><option value="AE">الإمارات</option><option value="BH">البحرين</option><option value="KW">الكويت</option><option value="OM">عُمان</option><option value="EG">مصر</option><option value="IN">الهند</option><option value="PH">الفلبين</option><option value="PK">باكستان</option><option value="BD">بنغلاديش</option><option value="JO">الأردن</option><option value="LB">لبنان</option><option value="SY">سوريا</option><option value="US">الولايات المتحدة</option><option value="GB">المملكة المتحدة</option></Select></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">تاريخ الميلاد<Input type="date" value={draft.date_of_birth} onChange={(event) => updateDraft("date_of_birth", event.target.value)} disabled={busy} required /></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">رقم الهاتف<Input type="tel" inputMode="tel" dir="ltr" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} disabled={busy} placeholder="+974XXXXXXXX" required /></label>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600 sm:col-span-2">النوع الاجتماعي <span className="font-medium text-slate-400">اختياري</span><Select value={draft.gender} onChange={(event) => updateDraft("gender", event.target.value)} disabled={busy}><option value="">لا أريد التحديد</option><option value="female">أنثى</option><option value="male">ذكر</option><option value="other">آخر</option><option value="prefer_not_to_say">أفضل عدم الإفصاح</option></Select></label>
        </div>}

        {verificationStarted ? <div className="mt-3 rounded-xl bg-amber-50 p-3"><label className="grid gap-1.5 text-xs font-extrabold text-amber-900">رمز التحقق المرسل إلى الهاتف<Input inputMode="numeric" dir="ltr" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))} disabled={busy} placeholder="000000" /></label><Button onClick={confirmVerification} disabled={busy || !code} className="mt-2 w-full gap-2 bg-amber-600 hover:bg-amber-700"><CheckIcon size={17} />{state === "confirming" ? "جارٍ التأكيد…" : "تأكيد رقم الهاتف"}</Button></div> : canBook ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-800"><CheckIcon size={16} />رقم الهاتف متحقق وجاهز للحجز.</div> : <Button onClick={startVerification} disabled={busy} className="mt-3 w-full gap-2"><CheckIcon size={17} />{state === "sending" ? "جارٍ إرسال الرمز…" : "حفظ البيانات وإرسال رمز التحقق"}</Button>}
      </div>

      {canBook && <Button onClick={book} disabled={busy || state === "done"} className={`w-full gap-2 ${state === "done" ? "bg-[#0F9D8A] hover:bg-[#0F9D8A]" : ""}`}><CalendarIcon size={18} />{state === "booking" ? "جارٍ تأمين الموعد…" : state === "done" ? "تم الحجز" : "تأكيد الحجز"}</Button>}
      {message && <p className={`rounded-xl px-3 py-2 text-xs font-extrabold leading-5 ${state === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
