import { Card } from "@/components/ui";
import { CalendarIcon, LocationIcon } from "@/components/icons";
import type { Locale } from "@/lib/i18n";

type NotificationRow = {
  id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
};

type NotificationLabels = {
  notificationsKicker: string;
  notificationsTitle: string;
  notificationsCopy: string;
  noNotifications: string;
  bookingConfirmation: string;
  bookingLocation: string;
  directions: string;
  directionsUnavailable: string;
  arriveEarly: string;
};

type BookingNotificationPayload = {
  booking_code: string | null;
  start_at: string | null;
  clinic_name: string | null;
  branch_name: string | null;
  branch_area: string | null;
  branch_address: string | null;
  treatment_name: string | null;
  branch_latitude: number | null;
  branch_longitude: number | null;
  arrival_before_minutes: number | null;
};

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

export function AccountBookingNotifications({ locale, labels, notifications }: { locale: Locale; labels: NotificationLabels; notifications: NotificationRow[] }) {
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" });

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{labels.notificationsKicker}</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#092b56]">{labels.notificationsTitle}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{labels.notificationsCopy}</p>
        </div>
        <LocationIcon className="text-[#0B5CAD]" size={24} />
      </div>
      {notifications.length === 0 ? (
        <Card className="p-6 text-sm font-bold text-slate-500">{labels.noNotifications}</Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const payload = parsePayload(notification.payload);
            const href = directionsHref(payload);
            const location = [payload.clinic_name, payload.branch_name, payload.branch_area, payload.branch_address].filter((part): part is string => Boolean(part)).join(" · ");
            const arrivesEarly = payload.arrival_before_minutes === 30 ? labels.arriveEarly : null;
            return (
              <Card key={notification.id} className="border border-emerald-100 bg-[linear-gradient(135deg,rgba(237,252,248,.96),rgba(239,247,255,.95))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-[#087d90]">{labels.bookingConfirmation}</p>
                    <h3 className="mt-2 text-lg font-black text-[#092b56]">{payload.treatment_name ?? labels.bookingConfirmation}</h3>
                    {payload.booking_code && <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">#{payload.booking_code}</p>}
                  </div>
                  {payload.start_at && <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#0a426f] ring-1 ring-[#0a5e92]/10"><CalendarIcon size={14} />{formatter.format(new Date(payload.start_at))}</div>}
                </div>
                <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-600"><LocationIcon size={14} />{labels.bookingLocation}</div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{location || labels.directionsUnavailable}</p>
                  {href ? <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[#0a5e92]/15 bg-white px-4 text-xs font-black text-[#0a426f] transition hover:bg-blue-50">{labels.directions}</a> : null}
                </div>
                {arrivesEarly && <p className="mt-4 text-sm font-black text-emerald-800">{arrivesEarly}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
