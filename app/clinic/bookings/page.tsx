import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthClaims, getServerSupabaseClient } from "@/lib/auth-claims.server";
import { OPERATIONAL_RPC_TIMEOUT_MS, withOperationalTimeout } from "@/lib/operations.server";
import { getLocale } from "@/lib/i18n";
import { accountNationality } from "@/lib/account-copy";
import { clientBookingStatusTone, parseClientBookingPage, parseClientBookingView } from "@/lib/client-booking-workspace";
import { clinicStatus } from "@/lib/clinic-copy";
import { clinicBookingAttendanceState, latestClinicAttendanceByBooking } from "@/lib/clinic-booking-attendance";
import { Badge, Card } from "@/components/ui";
import { BuildingIcon, CalendarIcon, ShieldCheckIcon } from "@/components/icons";
import { ClinicBookingActions } from "@/components/clinic-booking-actions";
import { ClinicLiveRefresh } from "@/components/clinic-live-refresh";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const ATTENTION_STATUSES = ["pending_hold", "pending_clinic_confirmation", "confirmed"];

type Booking = { id: string; booking_code: string; start_at: string; status: string; branch_id: string; offer_snapshot: unknown };
type Branch = { id: string; name: string; area: string | null };
type PatientDetails = { booking_id: string; patient_display_name: string; patient_national_id: string; patient_nationality: string; patient_date_of_birth: string; patient_phone: string };
type AttendanceEvent = { booking_id: string; event_type: string; sequence_no: number };
type Membership = { clinic_id: string; branch_id: string | null; role: string; status: string };
type SearchParams = { view?: string; page?: string };

function treatmentName(snapshot: unknown, locale: "ar" | "en") {
  if (!snapshot || typeof snapshot !== "object") return locale === "ar" ? "العلاج المحدد في الحجز" : "Treatment selected in booking";
  const value = snapshot as Record<string, unknown>;
  const candidates = locale === "ar"
    ? [value.treatment_name_ar, value.variant_name_ar, value.treatment_name, value.variant_name]
    : [value.treatment_name_en, value.variant_name_en, value.treatment_name, value.variant_name];
  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0) ?? (locale === "ar" ? "العلاج المحدد في الحجز" : "Treatment selected in booking");
}

export default async function OperationalBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, cookieStore, claimsResult, supabase] = await Promise.all([searchParams, cookies(), getServerAuthClaims(), getServerSupabaseClient()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const isArabic = locale === "ar";
  const userId = claimsResult.data?.claims?.sub;
  const appMetadata = (claimsResult.data?.claims?.app_metadata ?? {}) as { access_scope?: string };
  if (claimsResult.error || !userId) redirect("/login?next=/clinic/bookings");
  if (appMetadata.access_scope !== "clinic_bookings_only") redirect("/clinic");

  const selectedView = parseClientBookingView(params.view);
  const page = parseClientBookingPage(params.page);
  const rangeStart = (page - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE - 1;
  const now = new Date().toISOString();
  const { data: membershipData } = await withOperationalTimeout(
    supabase.from("clinic_memberships").select("clinic_id,branch_id,role,status").eq("status", "active").eq("role", "receptionist"),
  );
  const memberships = (membershipData ?? []) as Membership[];
  const branchIds = [...new Set(memberships.map((membership) => membership.branch_id).filter((branchId): branchId is string => Boolean(branchId)))];
  if (!branchIds.length) redirect("/operation-error?code=access_restricted");

  const bookingFields = "id,booking_code,start_at,status,branch_id,offer_snapshot";
  const bookingQuery = selectedView === "attention"
    ? supabase.from("bookings").select(bookingFields, { count: "exact" }).in("branch_id", branchIds).in("status", ATTENTION_STATUSES).order("start_at").range(rangeStart, rangeEnd)
    : selectedView === "upcoming"
      ? supabase.from("bookings").select(bookingFields, { count: "exact" }).in("branch_id", branchIds).gte("start_at", now).order("start_at").range(rangeStart, rangeEnd)
      : supabase.from("bookings").select(bookingFields, { count: "exact" }).in("branch_id", branchIds).lt("start_at", now).order("start_at", { ascending: false }).range(rangeStart, rangeEnd);

  const [
    { data: branchData },
    bookingResult,
    attentionCountResult,
    upcomingCountResult,
    historyCountResult,
  ] = await Promise.all([
    withOperationalTimeout(supabase.from("branches").select("id,name,area").in("id", branchIds).order("name")),
    withOperationalTimeout(bookingQuery),
    withOperationalTimeout(supabase.from("bookings").select("id", { count: "exact", head: true }).in("branch_id", branchIds).in("status", ATTENTION_STATUSES)),
    withOperationalTimeout(supabase.from("bookings").select("id", { count: "exact", head: true }).in("branch_id", branchIds).gte("start_at", now)),
    withOperationalTimeout(supabase.from("bookings").select("id", { count: "exact", head: true }).in("branch_id", branchIds).lt("start_at", now)),
  ]);

  const branches = (branchData ?? []) as Branch[];
  const bookings = (bookingResult.data ?? []) as Booking[];
  const visibleCount = bookingResult.count ?? 0;
  const attentionCount = attentionCountResult.count ?? 0;
  const upcomingCount = upcomingCountResult.count ?? 0;
  const historyCount = historyCountResult.count ?? 0;
  const bookingIds = bookings.map((booking) => booking.id);
  const [{ data: patientData }, { data: attendanceData, error: attendanceError }] = await Promise.all([
    bookingIds.length
      ? supabase.rpc("clinic_booking_patient_details", { p_booking_ids: bookingIds }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS))
      : Promise.resolve({ data: [] as PatientDetails[] }),
    bookingIds.length
      ? withOperationalTimeout(supabase.from("booking_attendance_events").select("booking_id,event_type,sequence_no").in("booking_id", bookingIds))
      : Promise.resolve({ data: [] as AttendanceEvent[], error: null }),
  ]);
  const patientByBooking = new Map<string, PatientDetails>();
  for (const item of (patientData ?? []) as PatientDetails[]) patientByBooking.set(item.booking_id, item);
  const latestAttendanceByBooking = attendanceError
    ? new Map<string, AttendanceEvent>()
    : latestClinicAttendanceByBooking((attendanceData ?? []) as AttendanceEvent[]);
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const dateTime = new Intl.DateTimeFormat(isArabic ? "ar-QA" : "en-QA", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Qatar" });
  const copy = isArabic ? {
    kicker: "مساحة العميل التشغيلية",
    title: "الحجوزات المصرح بها",
    subtitle: "إدارة الحجوزات المصرح بها لفروعك فقط. تبدأ كل وردية بقائمة الإجراءات المطلوبة، وتصل التحديثات مباشرة عند توفر اتصال لحظي.",
    branch: "الفرع",
    patient: "المريض",
    qid: "الرقم الشخصي",
    phone: "الهاتف",
    nationality: "الجنسية",
    treatment: "العلاج",
    checkIn: "تسجيل الحضور",
    completeVisit: "إكمال الزيارة",
    noBookings: "لا توجد حجوزات ضمن هذا العرض الآن.",
    unavailable: "تعذر تحميل الحجوزات مؤقتًا. أعد تحميل الصفحة للمحاولة مجددًا.",
    restricted: "تفاصيل المريض غير متاحة لهذا الحجز ضمن الصلاحية الحالية.",
    scope: "وصولك محصور بالحجوزات التشغيلية للفروع الممنوحة لك.",
    attention: "تتطلب إجراء",
    upcoming: "القادمة",
    history: "السجل السابق",
    actions: "إجراءات مطلوبة",
    view: "العرض",
    of: "من",
    previous: "السابق",
    next: "التالي",
    liveConnected: "التحديث اللحظي متصل",
    liveDisconnected: "التحديث اللحظي غير متصل",
    liveConnecting: "جارٍ اتصال التحديث اللحظي…",
    liveTooltip: "حالة اتصال التحديث اللحظي",
    actionChoose: "اختر إجراءً",
    actionConfirm: "تأكيد الحجز",
    actionCancel: "إلغاء من العيادة",
    actionNoShow: "تسجيل عدم الحضور",
    actionFail: "تعذر إتمام الحجز",
    actionApply: "تنفيذ",
    attendanceUnknown: "تعذر التحقق من حالة الحضور — أعد تحميل الصفحة",
    attendanceOutOfSync: "حالة الحضور غير متزامنة — أعد تحميل الصفحة",
    reverseReason: "سبب عكس الحضور",
    reverse: "عكس",
    viewOnly: "عرض فقط",
  } : {
    kicker: "Operational client workspace",
    title: "Authorized bookings",
    subtitle: "Manage bookings for your assigned branches only. Each shift starts with the action queue, and live updates refresh the workspace whenever the connection is available.",
    branch: "Branch",
    patient: "Patient",
    qid: "QID",
    phone: "Phone",
    nationality: "Nationality",
    treatment: "Treatment",
    checkIn: "Check in",
    completeVisit: "Complete visit",
    noBookings: "There are no bookings in this view right now.",
    unavailable: "Bookings could not be loaded temporarily. Reload the page to try again.",
    restricted: "Patient details are not available for this booking under the current access scope.",
    scope: "Your access is limited to operational bookings for the branches assigned to you.",
    attention: "Needs action",
    upcoming: "Upcoming",
    history: "Past record",
    actions: "Action queue",
    view: "Showing",
    of: "of",
    previous: "Previous",
    next: "Next",
    liveConnected: "Live updates connected",
    liveDisconnected: "Live updates disconnected",
    liveConnecting: "Connecting live updates…",
    liveTooltip: "Live update connection state",
    actionChoose: "Choose an action",
    actionConfirm: "Confirm booking",
    actionCancel: "Cancel from clinic",
    actionNoShow: "Mark no-show",
    actionFail: "Booking could not be completed",
    actionApply: "Apply",
    attendanceUnknown: "Attendance status could not be verified — reload the page",
    attendanceOutOfSync: "Attendance status is out of sync — reload the page",
    reverseReason: "Reason for reversing check-in",
    reverse: "Reverse",
    viewOnly: "View only",
  };
  const viewHref = (view: "attention" | "upcoming" | "history", targetPage = 1) => `/clinic/bookings?view=${view}&page=${targetPage}`;
  const firstVisible = visibleCount === 0 ? 0 : rangeStart + 1;
  const lastVisible = Math.min(rangeStart + bookings.length, visibleCount);

  return <main className="workspace-shell mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <section className="glass-panel rounded-[30px] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[linear-gradient(135deg,#0a55b8,#11a7a0)] text-white"><CalendarIcon size={23} /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#087d90]">{copy.kicker}</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-[#092b56]">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><ClinicLiveRefresh branchIds={branchIds} userId={userId} labels={copy} /><Badge tone="blue"><ShieldCheckIcon size={14} />{copy.scope}</Badge></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">{branches.map((branch) => <Badge key={branch.id}><BuildingIcon size={14} />{branch.name}{branch.area ? ` · ${branch.area}` : ""}</Badge>)}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={copy.actions}>
        <Link href={viewHref("attention")} aria-current={selectedView === "attention" ? "page" : undefined} className={`rounded-2xl p-4 ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5CAD] ${selectedView === "attention" ? "bg-amber-50 text-amber-950 ring-amber-200" : "bg-white/80 text-slate-700 ring-slate-200 hover:bg-slate-50"}`}><span className="block text-2xl font-black">{attentionCount}</span><span className="mt-1 block text-xs font-bold">{copy.attention}</span></Link>
        <Link href={viewHref("upcoming")} aria-current={selectedView === "upcoming" ? "page" : undefined} className={`rounded-2xl p-4 ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5CAD] ${selectedView === "upcoming" ? "bg-blue-50 text-blue-950 ring-blue-200" : "bg-white/80 text-slate-700 ring-slate-200 hover:bg-slate-50"}`}><span className="block text-2xl font-black">{upcomingCount}</span><span className="mt-1 block text-xs font-bold">{copy.upcoming}</span></Link>
        <Link href={viewHref("history")} aria-current={selectedView === "history" ? "page" : undefined} className={`rounded-2xl p-4 ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5CAD] ${selectedView === "history" ? "bg-slate-100 text-slate-900 ring-slate-300" : "bg-white/80 text-slate-700 ring-slate-200 hover:bg-slate-50"}`}><span className="block text-2xl font-black">{historyCount}</span><span className="mt-1 block text-xs font-bold">{copy.history}</span></Link>
      </div>
    </section>

    <Card className="mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarIcon size={19} className="text-[#0B5CAD]" /><h2 className="font-black">{selectedView === "attention" ? copy.attention : selectedView === "upcoming" ? copy.upcoming : copy.history}</h2></div>{!bookingResult.error && <p className="text-xs font-bold text-slate-500" aria-live="polite">{copy.view} <span dir="ltr">{firstVisible}–{lastVisible}</span> {copy.of} <span dir="ltr">{visibleCount}</span></p>}</div>
      <div className="mt-5 space-y-3">
        {bookingResult.error ? <p role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-200">{copy.unavailable}</p> : bookings.length ? bookings.map((booking) => {
          const patient = patientByBooking.get(booking.id);
          const branch = branchById.get(booking.branch_id);
          const latestAttendance = latestAttendanceByBooking.get(booking.id);
          const attendanceState = clinicBookingAttendanceState(latestAttendance, Boolean(attendanceError));
          return <article key={booking.id} className="grid gap-4 rounded-[22px] bg-slate-50/80 p-4 ring-1 ring-slate-200/70 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="font-black" dir="ltr">{booking.booking_code}</span><Badge tone={clientBookingStatusTone(booking.status)}>{clinicStatus(locale, booking.status)}</Badge></div>
              <div className="mt-2 text-sm font-bold text-slate-700">{dateTime.format(new Date(booking.start_at))}</div>
              <div className="mt-2 grid gap-2 rounded-2xl bg-white/80 p-3 text-xs font-bold leading-6 text-slate-600 sm:grid-cols-2"><span>{copy.branch}: <b className="text-slate-900">{branch?.name ?? "—"}</b></span><span>{copy.treatment}: <b className="text-slate-900">{treatmentName(booking.offer_snapshot, locale)}</b></span>{patient ? <><span>{copy.patient}: <b className="text-slate-900">{patient.patient_display_name}</b></span><span>{copy.nationality}: <b className="text-slate-900">{accountNationality(locale, patient.patient_nationality)}</b></span><span dir="ltr">{copy.qid}: <b className="text-slate-900">{patient.patient_national_id}</b></span><span dir="ltr">{copy.phone}: <b className="text-slate-900">{patient.patient_phone}</b></span></> : <span className="sm:col-span-2 text-slate-400">{copy.restricted}</span>}</div>
            </div>
            <ClinicBookingActions bookingId={booking.id} status={booking.status} startAt={booking.start_at} canOperate attendanceState={attendanceState} latestAttendanceEvent={latestAttendance?.event_type} labels={copy} />
          </article>;
        }) : <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">{copy.noBookings}</p>}
      </div>
      {!bookingResult.error && visibleCount > PAGE_SIZE && <nav className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label={copy.title}><span className="text-xs font-bold text-slate-500"><span dir="ltr">{page}</span></span>{rangeStart > 0 ? <Link className="rounded-xl px-3 py-2 text-sm font-black text-[#0B5CAD] ring-1 ring-blue-200 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5CAD]" href={viewHref(selectedView, page - 1)}>{copy.previous}</Link> : <span />}{rangeEnd + 1 < visibleCount ? <Link className="rounded-xl px-3 py-2 text-sm font-black text-[#0B5CAD] ring-1 ring-blue-200 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5CAD]" href={viewHref(selectedView, page + 1)}>{copy.next}</Link> : <span />}</nav>}
    </Card>
  </main>;
}
