import { joinBookingWaitlist } from "@/app/actions/waitlist";

export function WaitlistCta({ offerId, label = "أبلغوني عند توفر موعد" }: { offerId: string; label?: string }) {
  return <form action={joinBookingWaitlist} className="mt-4"><input type="hidden" name="offer_id" value={offerId} /><button type="submit" className="min-h-11 w-full rounded-full bg-[#0B5CAD] px-4 text-sm font-black text-white">{label}</button></form>;
}
