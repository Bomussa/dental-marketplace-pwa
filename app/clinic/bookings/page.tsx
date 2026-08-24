import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthClaims, getServerSupabaseClient } from "@/lib/auth-claims.server";
import { OPERATIONAL_RPC_TIMEOUT_MS, withOperationalTimeout } from "@/lib/operations.server";
import { getLocale } from "@/lib/i18n";
import { accountNationality } from "@/lib/account-copy";
import { clinicStatus } from "@/lib/clinic-copy";
import { Badge, Button, Card } from "@/components/ui";
import { BuildingIcon, CalendarIcon, CheckIcon, ShieldCheckIcon } from "@/components/icons";
import { ClinicBookingStatusForm } from "@/components/clinic-booking-status-form";
import { markBookingCheckedIn } from "../actions";

export const dynamic = "force-dynamic";

type Booking = { id: string; booking_code: string; start_at: string; status: string; branch_id: string; offer_snapshot: unknown };
type Branch = { id: string; name: string; area: string | null };
type PatientDetails = { booking_id: string; patient_display_name: string; patient_national_id: string; patient_nationality: string; patient_date_of_birth: string; patient_phone: string };
type Membership = { clinic_id: string; branch_id: string | null; role: string; status: string };

function treatmentName(snapshot: unknown, locale: "ar" | "en") {
  if (!snapshot || typeof snapshot !== "object") return locale === "ar" ? "العلاج المحدد في الحجز" : "Treatment selected in booking";
  const value = snapshot as Record<string, unknown>;
  const candidates = locale === "ar"
    ? [value.treatment_name_ar, value.variant_name_ar, value.treatment_name, value.variant_name]
    : [value.treatment_name_en, value.variant_name_en, value.treatment_name, value.variant_name];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0) ?? (locale === "ar" ? "العلاج المحدد في الحجز" : "Treatment selected in booking");
}

export default async function OperationalBookingsPage() {
  const [cookieStore, claimsResult, supabase] = await Promise.all([cookies(), getServerAuthClaims(), getServerSupabaseClient()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const isArabic = locale === "ar";
  const userId = claimsResult.data?.claims?.sub;
  const appMetadata = (claimsResult.data?.claims?.app_metadata ?? {}) as { access_scope?: string };
  if (claimsResult.error || !userId) redirect("/login?next=/clinic/bookings");
  if (appMetadata.access_scope !== "clinic_bookings_only") redirect("/clinic");

  const { data: membershipData } = await withOperationalTimeout(
    supabase.from("clinic_memberships").select("clinic_id,branch_id,role,status").eq("status", "active").eq("role", "receptionist"),
  );
  const memberships = (membershipData ?? []) as Membership[];
  const branchIds = memberships.map((membership) => membership.branch_id).filter((branchId): branchId is string => Boolean(branchId));
  if (!branchIds.length) redirect("/operation-error?code=access_restricted");

  const [{ data: branchData }, { data: bookingData }] = await Promise.all([
    withOperationalTimeout(supabase.from("branches").select("id,name,area").in("id", branchIds).order("name")),
    withOperationalTimeout(supabase.from("bookings").select("id,booking_code,start_at,status,branch_id,offer_snapshot").in("branch_id", branchIds).order("start_at").limit(100)),
  ]);
  const branches = (branchData ?? []) as Branch[];
  const bookings = (bookingData ?? []) as Booking[];
  const bookingIds = bookings.map((booking) => booking.id);
  const { data: patientData } = bookingIds.length
    ? await supabase.rpc("clinic_booking_patient_details", { p_booking_ids: bookingIds }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS))
    : { data: [] as PatientDetails[] };
  const patientByBooking = new Map<string, PatientDetails>();
  for (const item of (patientData ?? []) as PatientDetails[]) patientByBooking.set(item.booking_id, item);
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const dateTime = new Intl.DateTimeFormat(isArabic ? "ar-QA" : "en-QA", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Qatar" });
  const copy = isArabic ? {
    kicker: "مساحة العميل التشغيلية", title: "الحجوزات المصرح بها", subtitle: "تظهر هنا حجوزات الفروع الممنوحة لك فقط. تُسجل كل حالة من خلال إجراءات الحجز المعتمدة.", branch: "الفرع", patient: "المريض", qid: "الرقم الشخصي", phone: "الهاتف", nationality: "الجنسية", treatment: "العلاج", checkIn: "تسجيل الحضور", noBookings: "لا توجد حجوزات مرئية حاليًا ضمن الفروع المصرح بها.", restricted: "تفاصيل المريض غير متاحة لهذا الحجز ضمن الصلاحية الحالية.", scope: "وصولك محصور بهذه الشاشة والحجوزات التشغيلية المصرح بها.",
  } : {
    kicker: "Operational client workspace", title: "Authorized bookings", subtitle: "Only bookings for the branches assigned to you appear here. Every status change uses the approved booking operations.", branch: "Branch", patient: "Patient", qid: "QID", phone: "Phone", nationality: "Nationality", treatment: "Treatment", checkIn: "Check in", noBookings: "There are no visible bookings for your authorized branches right now.", restricted: "Patient details are not available for this booking under the current access scope.", scope: "Your access is limited to this screen and authorized operational bookings.",
  };

  return <main className="workspace-shell mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
    <section className="glass-panel rounded-[30px] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[linear-gradient(135deg,#0a55b8,#11a7a0)] text-white"><CalendarIcon size={23} /></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#087d90]">{copy.kicker}</p><h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-[#092b56]">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{copy.subtitle}</p></div></div><Badge tone="blue"><ShieldCheckIcon size={14} />{copy.scope}</Badge></div>
      <div className="mt-5 flex flex-wrap gap-2">{branches.map((branch) => <Badge key={branch.id}><BuildingIcon size={14} />{branch.name}{branch.area ? ` · ${branch.area}` : ""}</Badge>)}</div>
    </section>

    <Card className="mt-6 p-5 sm:p-6"><div className="flex items-center gap-2"><CalendarIcon size={19} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.title}</h2></div><div className="mt-5 space-y-3">{bookings.length ? bookings.map((booking) => {
      const patient = patientByBooking.get(booking.id);
      const branch = branchById.get(booking.branch_id);
      const mutableStatus = booking.status === "pending_hold" || booking.status === "pending_clinic_confirmation" || booking.status === "confirmed" ? booking.status : null;
      return <article key={booking.id} className="grid gap-4 rounded-[22px] bg-slate-50/80 p-4 ring-1 ring-slate-200/70 sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="font-black" dir="ltr">{booking.booking_code}</span><Badge tone={booking.status === "confirmed" || booking.status === "checked_in" ? "green" : "amber"}>{clinicStatus(locale, booking.status)}</Badge></div><div className="mt-2 text-sm font-bold text-slate-700">{dateTime.format(new Date(booking.start_at))}</div><div className="mt-2 grid gap-2 rounded-2xl bg-white/80 p-3 text-xs font-bold leading-6 text-slate-600 sm:grid-cols-2"><span>{copy.branch}: <b className="text-slate-900">{branch?.name ?? "—"}</b></span><span>{copy.treatment}: <b className="text-slate-900">{treatmentName(booking.offer_snapshot, locale)}</b></span>{patient ? <><span>{copy.patient}: <b className="text-slate-900">{patient.patient_display_name}</b></span><span>{copy.nationality}: <b className="text-slate-900">{accountNationality(locale, patient.patient_nationality)}</b></span><span dir="ltr">{copy.qid}: <b className="text-slate-900">{patient.patient_national_id}</b></span><span dir="ltr">{copy.phone}: <b className="text-slate-900">{patient.patient_phone}</b></span></> : <span className="sm:col-span-2 text-slate-400">{copy.restricted}</span>}</div></div><div className="flex flex-wrap content-start gap-2">{booking.status === "confirmed" && <form action={markBookingCheckedIn}><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="reason" value={copy.checkIn} /><Button className="gap-1.5"><CheckIcon size={16} />{copy.checkIn}</Button></form>}{mutableStatus && <ClinicBookingStatusForm bookingId={booking.id} status={mutableStatus} startAt={booking.start_at} labels={isArabic ? { actionChoose: "اختر إجراء", actionConfirm: "تأكيد الحجز", actionCancel: "إلغاء من العيادة", actionNoShow: "لم يحضر", actionFail: "تعذر التنفيذ", actionApply: "تطبيق" } : { actionChoose: "Choose action", actionConfirm: "Confirm booking", actionCancel: "Cancel by clinic", actionNoShow: "No show", actionFail: "Mark failed", actionApply: "Apply" }} />}</div></article>;
    }) : <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">{copy.noBookings}</p>}</div></Card>
  </main>;
}
