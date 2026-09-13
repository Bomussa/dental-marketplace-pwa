import { joinBookingWaitlist } from "@/app/actions/waitlist";

export function WaitlistButton({ offerId, patientProfiles }: { offerId: string; patientProfiles: Array<{ id: string; display_name: string }> }) {
  if (!patientProfiles.length) return null;
  return (
    <form action={joinBookingWaitlist} className="mt-4 grid gap-2">
      <input type="hidden" name="offer_id" value={offerId} />
      <label className="grid gap-1 text-xs font-extrabold text-slate-600">
        المراجع
        <select name="patient_profile_id" defaultValue={patientProfiles[0].id} className="min-h-11 rounded-2xl border px-3 text-sm font-bold">
          {patientProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-full bg-[#0B5CAD] px-4 text-sm font-black text-white">
        أبلغوني عند توفر موعد
      </button>
    </form>
  );
}
