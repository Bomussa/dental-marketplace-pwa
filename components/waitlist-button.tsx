"use client";

import { useState } from "react";

export function WaitlistButton({ offerId, patientProfiles }: { offerId: string; patientProfiles: Array<{ id: string; display_name: string }> }) {
  const [profileId, setProfileId] = useState(patientProfiles[0]?.id ?? "");
  const [state, setState] = useState<string | null>(null);
  async function join() {
    if (!profileId) return;
    setState("loading");
    const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ offer_id: offerId, patient_profile_id: profileId }) });
    const body = await response.json().catch(() => null);
    setState(response.ok ? `تمت الإضافة. ترتيبك: ${body?.queue_position ?? "—"}` : body?.error ?? "تعذر الانضمام");
  }
  if (!patientProfiles.length) return null;
  return <div className="mt-4 grid gap-2"><select value={profileId} onChange={(event) => setProfileId(event.target.value)} className="min-h-11 rounded-2xl border px-3 text-sm font-bold">{patientProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select><button type="button" onClick={join} disabled={state === "loading"} className="min-h-11 rounded-full bg-[#0B5CAD] px-4 text-sm font-black text-white disabled:opacity-60">{state === "loading" ? "جارٍ الإضافة…" : "أبلغوني عند توفر موعد"}</button>{state && state !== "loading" && <p role="status" className="text-xs font-bold text-slate-600">{state}</p>}</div>;
}
