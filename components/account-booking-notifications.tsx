import { CalendarIcon, LocationIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthClaims } from "@/lib/auth-claims.server";
import { withOperationalTimeout } from "@/lib/operations.server";
import type { Locale } from "@/lib/i18n";
import { withdrawBookingWaitlist } from "@/app/actions/waitlist-withdraw";
import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationRow = { id: string; event_type: string; payload: unknown; created_at: string };
type NotificationLabels = { notificationsKicker: string; notificationsTitle: string; notificationsCopy: string; noNotifications: string; bookingConfirmation: string; bookingLocation: string; directions: string; directionsUnavailable: string; arriveEarly: string };
type BookingNotificationPayload = { booking_code: string | null; start_at: string | null; clinic_name: string | null; branch_name: string | null; branch_area: string | null; branch_address: string | null; treatment_name: string | null; branch_latitude: number | null; branch_longitude: number | null; arrival_before_minutes: number | null };
type WaitlistRow = { waitlist_id: string; status: string; created_at: string; notified_at: string | null; treatment_name_ar: string | null; treatment_name_en: string | null };
type WaitlistRpcClient = Pick<SupabaseClient, "rpc">;

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePayload(value: unknown): BookingNotificationPayload {
  const payload = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    booking_code: readString(payload.booking_code),
    start_at: readString(payload.start_at),
    clinic_name: readString(payload.clinic_name),
    branch_name: readString(payload.branch_name),
    branch_area: readString(payload.branch_area),
    branch_address: readString(payload.branch_address),
    treatment_name: readString(payload.treatment_name),
    branch_latitude: readFiniteNumber(payload.branch_latitude),
    branch_longitude: readFiniteNumber(payload.branch_longitude),
    arrival_before_minutes: readFiniteNumber(payload.arrival_before_minutes),
  };
}

function directionsHref(payload: BookingNotificationPayload) {
  if (payload.branch_latitude !== null && payload.branch_longitude !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${payload.branch_latitude},${payload.branch_longitude}`)}`;
  }
  const address = [payload.branch_address, payload.branch_name, payload.branch_area, payload.clinic_name, "Qatar"].filter((part): part is string => Boolean(part)).join(", ");
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

export async function AccountBookingNotifications({ locale, labels, notifications }: { locale: Locale; labels: NotificationLabels; notifications: NotificationRow[] }) {
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" });
  const { data: claims } = await getServerAuthClaims();
  const userId = claims?.claims?.sub;
  let waitlist: WaitlistRow[] = [];
  let waitlistUnavailable = false;
  if (userId) {
    try {
      const admin = createAdminClient();
      const rpcClient = admin as unknown as WaitlistRpcClient;
      const result = await withOperationalTimeout(
        rpcClient.rpc("list_booking_waitlist_server", { p_actor_id: userId }),
      );
      if (result.error) {
        waitlistUnavailable = true;
      } else {
        waitlist = (result.data ?? []) as WaitlistRow[];
      }
    } catch {
      waitlistUnavailable = true;
    }
  }

  return (
    <>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{labels.notificationsKicker}</p><h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#092b56]">{labels.notificationsTitle}</h2><p className="mt-1 text-sm font-medium text-slate-500">{labels.notificationsCopy}</p></div><LocationIcon className="text-[#0B5CAD]" size={24} /></div>
        {notifications.length === 0 ? <Card className="p-6 text-sm font-bold text-slate-500">{labels.noNotifications}</Card> : <div className="space-y-3">{notifications.map((notification) => { const payload = parsePayload(notification.payload); const waitlistOpened = notification.event_type === "waitlist_slot_opened"; const href = directionsHref(payload); const location = [payload.clinic_name, payload.branch_name, payload.branch_area, payload.branch_address].filter((part): part is string => Boolean(part)).join(" · "); const arrivesEarly = payload.arrival_before_minutes === 30 ? labels.arriveEarly : null; const title = waitlistOpened ? (locale === "ar" ? "موعد متاح الآن" : "An appointment is now available") : labels.bookingConfirmation; const message = waitlistOpened ? (locale === "ar" ? "تم فتح موعد مطابق لطلبك في قائمة الانتظار. لم يتم الحجز تلقائيًا؛ راجع الموعد وأكمل الحجز بنفسك." : "A matching appointment has opened for your waitlist request. It was not booked automatically; review it and complete the booking yourself.") : null; return <Card key={notification.id} className={waitlistOpened ? "border border-amber-200 bg-amber-50/70 p-5" : "border border-emerald-100 bg-[linear-gradient(135deg,rgba(237,252,248,.96),rgba(239,247,255,.95))] p-5"}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#087d90]">{title}</p><h3 className="mt-2 text-lg font-black text-[#092b56]">{waitlistOpened ? title : payload.treatment_name ?? labels.bookingConfirmation}</h3>{message && <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-700">{message}</p>}{!waitlistOpened && payload.booking_code && <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">#{payload.booking_code}</p>}</div>{payload.start_at && <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#0a426f] ring-1 ring-[#0a5e92]/10"><CalendarIcon size={14} />{formatter.format(new Date(payload.start_at))}</div>}</div>{!waitlistOpened && <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70"><div className="flex items-center gap-1.5 text-xs font-black text-slate-600"><LocationIcon size={14} />{labels.bookingLocation}</div><p className="mt-2 text-sm font-bold text-slate-800">{location || labels.directionsUnavailable}</p>{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[#0a5e92]/15 bg-white px-4 text-xs font-black text-[#0a426f] transition hover:bg-blue-50">{labels.directions}</a> : null}</div>}{arrivesEarly && <p className="mt-4 text-sm font-black text-emerald-800">{arrivesEarly}</p>}</Card>; })}</div>}
      </section>

      {waitlistUnavailable && <section className="mt-8"><Card className="border border-amber-200 bg-amber-50/70 p-5 text-sm font-bold text-amber-900">{locale === "ar" ? "تعذر تحميل قائمة الانتظار الآن. لم تتأثر حجوزاتك الحالية؛ حاول تحديث الصفحة لاحقًا." : "Your waitlist could not be loaded right now. Existing bookings are unaffected; please refresh later."}</Card></section>}

      {waitlist.length > 0 && <section className="mt-8"><div className="mb-4"><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{locale === "ar" ? "قائمة الانتظار" : "Waitlist"}</p><h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#092b56]">{locale === "ar" ? "طلبات الانتظار الحالية" : "Your current waitlist requests"}</h2><p className="mt-1 text-sm font-medium text-slate-500">{locale === "ar" ? "يمكنك سحب أي طلب ما دام نشطًا. لن يتم حجز الموعد تلقائيًا." : "You can withdraw an active request. Appointments are never booked automatically."}</p></div><div className="space-y-3">{waitlist.map((entry) => { const treatmentName = locale === "ar" ? entry.treatment_name_ar ?? entry.treatment_name_en : entry.treatment_name_en ?? entry.treatment_name_ar; const status = entry.status === "notified" ? (locale === "ar" ? "تم إشعارك" : "Notified") : (locale === "ar" ? "نشط" : "Active"); return <Card key={entry.waitlist_id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-black text-[#092b56]">{treatmentName ?? (locale === "ar" ? "طلب انتظار" : "Waitlist request")}</p><p className="mt-1 text-xs font-bold text-slate-500">{status} · {formatter.format(new Date(entry.created_at))}</p></div>{entry.status === "active" && <form action={withdrawBookingWaitlist}><input type="hidden" name="waitlist_id" value={entry.waitlist_id} /><button type="submit" className="min-h-11 rounded-full border border-red-200 bg-white px-4 text-xs font-black text-red-700 transition hover:bg-red-50">{locale === "ar" ? "سحب الطلب" : "Withdraw request"}</button></form>}</div></Card>; })}</div></section>}
    </>
  );
}
