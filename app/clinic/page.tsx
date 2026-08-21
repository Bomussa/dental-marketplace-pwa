import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthClaims, getServerSupabaseClient } from "@/lib/auth-claims.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clinicActivityReport, OPERATIONAL_RPC_TIMEOUT_MS, type ActivityReportGranularity, withOperationalTimeout } from "@/lib/operations.server";
import { getLocale } from "@/lib/i18n";
import { isIsoCalendarDate } from "@/lib/validation";
import { accountNationality } from "@/lib/account-copy";
import { clinicPriceType, clinicRole, clinicStatus, getClinicCopy } from "@/lib/clinic-copy";
import { effectiveClinicRole } from "@/lib/clinic-role-display";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { BuildingIcon, CalendarIcon, CheckIcon, ClockIcon, ShieldCheckIcon, SlidersIcon, UserIcon, WalletIcon } from "@/components/icons";
import { ActivityReportCard } from "@/components/activity-report-card";
import { ClinicBookingStatusForm } from "@/components/clinic-booking-status-form";
import { ClinicLiveRefresh } from "@/components/clinic-live-refresh";
import { PriceScopeFields } from "@/components/price-scope-fields";
import { activityReportLabel, getActivityReportCopy, parseActivityReport } from "@/lib/activity-report";
import { applyClinic, changeBookingStatus, createBranch, createClinicOperatorAccount, createOffer, createPractitioner, createSlot, markBookingCheckedIn, publishOffer, publishSlot, requestPriceRevision, reverseBookingCheckIn, revokeClinicOperatorAccount, setDailyHours } from "./actions";

export const dynamic = "force-dynamic";
type Membership = { clinic_id: string; branch_id: string | null; role: string; status: string };
type Clinic = { id: string; display_name: string; status: string };
type Branch = { id: string; clinic_id: string; name: string; area: string | null; status: string };
type Offer = { id: string; branch_id: string; variant_id: string; price_type: string; min_minor: number | null; max_minor: number | null; duration_minutes: number; status: string; last_verified_at: string | null; price_scope: unknown; included_items: unknown; excluded_items: unknown; visit_count: number | null; follow_up_terms: string | null; notes: string | null };
type Slot = { id: string; branch_id: string; variant_id: string; start_at: string; end_at: string; status: string };
type Variant = { id: string; name_ar: string; name_en: string };
type Booking = { id: string; booking_code: string; start_at: string; status: string; branch_id: string; patient_profile_id: string; offer_snapshot: unknown };
type AttendanceEvent = { booking_id: string; event_type: string; sequence_no: number };
type BookingPatientDetails = { booking_id: string; patient_display_name: string; patient_relationship: string; patient_national_id: string; patient_nationality: string; patient_date_of_birth: string; patient_phone: string };
type ClinicNotification = { id: string; event_type: string; created_at: string; status: string; payload: unknown };
type ClinicOperatorAccount = { operator_account_id: string; user_id: string; username: string; slot_no: number; status: string; created_at: string; revoked_at: string | null };

function qatarDate(daysOffset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + daysOffset * 86_400_000));
}

function validDate(value: string | undefined, fallback: string) {
  return value && isIsoCalendarDate(value) ? value : fallback;
}

function activityGranularity(value: string | undefined): ActivityReportGranularity {
  return value === "hourly" || value === "weekly" || value === "monthly" ? value : "daily";
}

export default async function ClinicPage({ searchParams }: { searchParams: Promise<{ clinic?: string; activity_start?: string; activity_end?: string; activity_granularity?: string }> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const copy = getClinicCopy(locale);
  const activityCopy = getActivityReportCopy(locale);
  const activityStart = validDate(params.activity_start, qatarDate(-29));
  const activityEnd = validDate(params.activity_end, qatarDate());
  const activityGranularityValue = activityGranularity(params.activity_granularity);
  const dateLocale = locale === "ar" ? "ar-QA" : "en-QA";
  const dateTimeFormatter = new Intl.DateTimeFormat(dateLocale, { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Qatar" });
  const supabase = await getServerSupabaseClient();
  const { data: claimsData, error } = await getServerAuthClaims();
  const userId = claimsData?.claims?.sub;
  if (error || !userId) redirect("/login?next=/clinic");
  const { data: membershipData } = await withOperationalTimeout(supabase.from("clinic_memberships").select("clinic_id,branch_id,role,status").eq("status", "active"));
  const memberships = (membershipData ?? []) as Membership[];

  if (!memberships.length) return <main className="workspace-shell mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20"><Card className="p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0B5CAD]"><BuildingIcon size={24} /></span><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#084884]">{copy.joinKicker}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{copy.joinTitle}</h1><p className="mt-3 text-sm font-medium leading-7 text-slate-500">{copy.joinCopy}</p><div className="mt-5 flex items-start gap-2 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-800"><ShieldCheckIcon size={17} className="mt-0.5 shrink-0" />{copy.joinNotice}</div><form action={applyClinic} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-extrabold">{copy.legalName}<Input name="legal_name" required /></label><label className="grid gap-2 text-sm font-extrabold">{copy.displayName}<Input name="display_name" required /></label><Button className="gap-2"><CheckIcon size={17} />{copy.submitApplication}</Button></form></Card></main>;

  const clinicIds = [...new Set(memberships.map((membership) => membership.clinic_id))];
  const selectedClinicId = params.clinic && clinicIds.includes(params.clinic) ? params.clinic : clinicIds[0];
  const [{ data: clinicData }, { data: branchData }] = await Promise.all([
    withOperationalTimeout(supabase.from("clinics").select("id,display_name,status").eq("id", selectedClinicId).limit(1)),
    withOperationalTimeout(supabase.from("branches").select("id,clinic_id,name,area,status").eq("clinic_id", selectedClinicId).order("created_at")),
  ]);
  const clinics = (clinicData ?? []) as Clinic[];
  const branches = (branchData ?? []) as Branch[];
  const branchIds = branches.map((branch) => branch.id);
  const empty = Promise.resolve({ data: [] as never[] });
  const [{ data: offerData }, { data: slotData }, { data: variantData }, { data: bookingData }, { data: practitionerData }, { data: notificationData }] = await Promise.all([
    branchIds.length ? withOperationalTimeout(supabase.from("branch_service_offers").select("id,branch_id,variant_id,price_type,min_minor,max_minor,duration_minutes,status,last_verified_at,price_scope,included_items,excluded_items,visit_count,follow_up_terms,notes").in("branch_id", branchIds).order("created_at", { ascending: false }).limit(50)) : empty,
    branchIds.length ? withOperationalTimeout(supabase.from("availability_slots").select("id,branch_id,variant_id,start_at,end_at,status").in("branch_id", branchIds).order("start_at").limit(50)) : empty,
    withOperationalTimeout(supabase.from("treatment_variants").select("id,name_ar,name_en").eq("active", true).order("name_ar")),
    branchIds.length ? withOperationalTimeout(supabase.from("bookings").select("id,booking_code,start_at,status,branch_id,patient_profile_id,offer_snapshot").in("branch_id", branchIds).order("start_at").limit(50)) : empty,
    withOperationalTimeout(supabase.from("practitioners").select("id,display_name,active,license_ref,clinic_id").eq("clinic_id", selectedClinicId).limit(50)),
    withOperationalTimeout(supabase.from("notification_outbox").select("id,event_type,created_at,status,payload").eq("recipient_user_id", userId).eq("event_type", "booking_requested").order("created_at", { ascending: false }).limit(6)),
  ]);
  const selectedClinic = clinics[0];
  const offers = (offerData ?? []) as Offer[];
  const slots = (slotData ?? []) as Slot[];
  const variants = (variantData ?? []) as Variant[];
  const bookings = (bookingData ?? []) as Booking[];
  const notifications = (notificationData ?? []) as ClinicNotification[];
  const rolesForBranch = (branchId: string) => memberships.filter((membership) => membership.clinic_id === selectedClinicId && (membership.branch_id === null || membership.branch_id === branchId)).map((membership) => membership.role);
  const hasBranchRole = (branchId: string, allowed: string[]) => rolesForBranch(branchId).some((role) => allowed.includes(role));
  const canManageClinicStructure = memberships.some((membership) => membership.clinic_id === selectedClinicId && ["owner", "manager"].includes(membership.role));
  const canManageSlots = (branchId: string) => hasBranchRole(branchId, ["owner", "manager", "receptionist"]);
  const canManageOffers = (branchId: string) => hasBranchRole(branchId, ["owner", "manager", "pricing_manager"]);
  const canPublishOffers = (branchId: string) => hasBranchRole(branchId, ["owner", "manager"]);
  const canOperateBooking = (branchId: string) => hasBranchRole(branchId, ["owner", "manager", "receptionist"]);
  const canReverseAttendance = (branchId: string) => hasBranchRole(branchId, ["owner", "manager"]);
  const bookingIds = bookings.map((booking) => booking.id);
  const publishedOffers = offers.filter((offer) => offer.status === "active").length;
  const publishedSlots = slots.filter((slot) => slot.status === "published").length;
  const offerWritableBranches = branches.filter((branch) => canManageOffers(branch.id));
  const slotWritableBranches = branches.filter((branch) => canManageSlots(branch.id));
  const canManageClinic = selectedClinic?.status === "active" && canManageClinicStructure;
  const canManageOperatorAccounts = selectedClinic?.status === "active" && memberships.some((membership) => membership.clinic_id === selectedClinicId && membership.role === "owner" && membership.status === "active");

  const patientDetailsPromise = bookingIds.length
    ? supabase.rpc("clinic_booking_patient_details", { p_booking_ids: bookingIds }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS))
    : Promise.resolve({ data: [] as BookingPatientDetails[] });
  const attendancePromise = bookingIds.length
    ? withOperationalTimeout(supabase.from("booking_attendance_events").select("*").in("booking_id", bookingIds))
    : Promise.resolve({ data: [] as AttendanceEvent[], error: null });
  const activityReportPromise = canManageClinicStructure
    ? clinicActivityReport({ clinicId: selectedClinicId, periodStart: activityStart, periodEnd: activityEnd, granularity: activityGranularityValue }).then(parseActivityReport).catch(() => null)
    : Promise.resolve(null);
  const operatorAccountsPromise = canManageOperatorAccounts
    ? createAdminClient().rpc("list_clinic_operator_accounts_server", { p_actor_id: userId, p_clinic_id: selectedClinicId }).abortSignal(AbortSignal.timeout(OPERATIONAL_RPC_TIMEOUT_MS))
    : Promise.resolve({ data: [] as ClinicOperatorAccount[] });
  const [
    { data: patientDetailsData },
    { data: attendanceData, error: attendanceError },
    activityReport,
    { data: operatorAccountData },
  ] = await Promise.all([patientDetailsPromise, attendancePromise, activityReportPromise, operatorAccountsPromise]);

  const patientDetailsByBooking = new Map<string, BookingPatientDetails>();
  for (const patientDetails of (patientDetailsData ?? []) as BookingPatientDetails[]) if (patientDetails.patient_display_name) patientDetailsByBooking.set(patientDetails.booking_id, patientDetails);
  const latestAttendanceByBooking = new Map<string, AttendanceEvent>();
  const attendanceStateUnavailable = Boolean(attendanceError);
  if (!attendanceError) for (const event of (attendanceData ?? []) as unknown as AttendanceEvent[]) {
    const current = latestAttendanceByBooking.get(event.booking_id);
    if (!current || event.sequence_no > current.sequence_no) latestAttendanceByBooking.set(event.booking_id, event);
  }
  const operatorAccounts = (operatorAccountData ?? []) as ClinicOperatorAccount[];
  const activeOperatorAccounts = operatorAccounts.filter((account) => !account.revoked_at && account.status === "active");
  const displayedRole = effectiveClinicRole(memberships, selectedClinicId);

  return <main className="workspace-shell mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
    <section className="glass-panel rounded-[32px] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[linear-gradient(135deg,#0a55b8,#11a7a0)] text-white shadow-[0_15px_28px_-14px_rgba(8,101,179,.7)]"><BuildingIcon size={24} /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{copy.dashboardKicker}</p><h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-[#092b56]">{selectedClinic?.display_name ?? copy.defaultClinicName}</h1><div className="mt-3 flex flex-wrap gap-2"><Badge tone={selectedClinic?.status === "active" ? "green" : "amber"}>{clinicStatus(locale, selectedClinic?.status ?? "pending")}</Badge><Badge>{clinicRole(locale, displayedRole)}</Badge></div></div></div><div className="flex max-w-md flex-col items-start gap-3"><ClinicLiveRefresh branchIds={branchIds} userId={userId} labels={copy} /><p className="text-xs font-medium leading-6 text-slate-500">{copy.dashboardCopy}</p></div></div>
      {!canManageClinic && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-200">{copy.pendingNotice}</div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,.96),rgba(234,248,248,.9))] p-4 ring-1 ring-[#0a5e92]/[.07]"><div className="text-2xl font-black text-[#092b56]">{branches.length}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.branches}</div></div><div className="rounded-2xl bg-[linear-gradient(135deg,rgba(231,243,255,.95),rgba(221,250,247,.91))] p-4 ring-1 ring-[#46a6de]/15"><div className="text-2xl font-black text-[#084884]">{publishedOffers}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.publishedOffers}</div></div><div className="rounded-2xl bg-[linear-gradient(135deg,rgba(230,252,244,.95),rgba(228,247,255,.9))] p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-700">{publishedSlots}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.publishedSlots}</div></div><div className="rounded-2xl bg-[linear-gradient(135deg,rgba(248,245,255,.96),rgba(234,245,255,.9))] p-4 ring-1 ring-[#7554cf]/10"><div className="text-2xl font-black text-[#092b56]">{bookings.length}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.visibleBookings}</div></div></div>
    </section>

    {canManageClinicStructure ? <><form method="get" action="/clinic" className="mt-7 grid gap-3 rounded-[24px] border border-[#0a5e92]/10 bg-white/70 p-4 sm:grid-cols-4 no-print"><input type="hidden" name="clinic" value={selectedClinicId} /><label className="grid gap-1 text-xs font-bold text-slate-600">{activityCopy.period}<Input name="activity_start" type="date" defaultValue={activityStart} /></label><label className="grid gap-1 text-xs font-bold text-slate-600">{activityCopy.period}<Input name="activity_end" type="date" defaultValue={activityEnd} /></label><label className="grid gap-1 text-xs font-bold text-slate-600">{activityCopy.aggregation}<Select name="activity_granularity" defaultValue={activityGranularityValue}><option value="hourly">{activityReportLabel(locale, "hourly")}</option><option value="daily">{activityReportLabel(locale, "daily")}</option><option value="weekly">{activityReportLabel(locale, "weekly")}</option><option value="monthly">{activityReportLabel(locale, "monthly")}</option></Select></label><Button className="self-end">{activityCopy.refresh}</Button></form><ActivityReportCard report={activityReport} locale={locale} targetId="clinic-activity-report" /></> : null}

    <section className="mt-7 grid gap-6 lg:grid-cols-4">
      <Card className="p-5"><div className="flex items-center gap-2"><BuildingIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.addBranch}</h2></div><form action={createBranch} className="mt-4 grid gap-3"><input type="hidden" name="clinic_id" value={selectedClinic?.id} /><Input name="name" required placeholder={copy.branchName} /><Input name="area" placeholder={copy.area} /><Input name="address_line" placeholder={copy.address} /><div className="grid grid-cols-2 gap-2"><Input name="lat" type="number" step="any" placeholder={copy.latitude} dir="ltr" /><Input name="lng" type="number" step="any" placeholder={copy.longitude} dir="ltr" /></div><Button disabled={!canManageClinic} title={!canManageClinic ? copy.restrictedAction : undefined}>{copy.saveBranch}</Button></form></Card>
      <Card className="p-5"><div className="flex items-center gap-2"><UserIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.addPractitioner}</h2></div><form action={createPractitioner} className="mt-4 grid gap-3"><input type="hidden" name="clinic_id" value={selectedClinic?.id} /><Input name="display_name" required placeholder={copy.practitionerName} /><Input name="license_ref" placeholder={copy.licenseReference} /><Button disabled={!canManageClinic} title={!canManageClinic ? copy.restrictedAction : undefined}>{copy.saveAsPending}</Button></form><div className="mt-4 space-y-2 text-xs">{(practitionerData ?? []).map((practitioner: { id: string; display_name: string; active: boolean }) => <div key={practitioner.id} className="flex justify-between rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200/60"><span className="font-bold">{practitioner.display_name}</span><Badge tone={practitioner.active ? "green" : "amber"}>{clinicStatus(locale, practitioner.active ? "active" : "pending")}</Badge></div>)}</div></Card>
      <Card className="p-5"><div className="flex items-center gap-2"><ClockIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.workingHours}</h2></div><div className="mt-4 grid gap-3">{branches.length ? branches.map((branch) => <div key={branch.id} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><div className="flex items-start justify-between gap-2"><div><div className="font-black">{branch.name}</div><div className="mt-1 text-xs font-bold text-slate-500">{branch.area || "—"}</div></div><Badge tone={branch.status === "active" ? "green" : "amber"}>{clinicStatus(locale, branch.status)}</Badge></div>{branch.status === "active" && canManageSlots(branch.id) && <form action={setDailyHours} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><input type="hidden" name="branch_id" value={branch.id} /><Input name="open_time" type="time" defaultValue="08:00" required /><Input name="close_time" type="time" defaultValue="20:00" required /><Button className="px-4">{copy.save}</Button></form>}</div>) : <p className="text-sm text-slate-500">{copy.noBranches}</p>}</div></Card>
      {canManageOperatorAccounts && <Card className="p-5"><div className="flex items-center gap-2"><ShieldCheckIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.operatorAccounts}</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">{copy.operatorAccountsCopy}</p><div className="mt-3 flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-900"><span>{copy.operatorSlotsAvailable}</span><span dir="ltr">{Math.max(0, 2 - activeOperatorAccounts.length)} / 2</span></div>{activeOperatorAccounts.length < 2 ? <form action={createClinicOperatorAccount} className="mt-4 grid gap-2"><input type="hidden" name="clinic_id" value={selectedClinicId} /><Input name="email" type="email" required placeholder={copy.operatorEmail} dir="ltr" /><Input name="username" required minLength={3} maxLength={32} placeholder={copy.operatorUsername} dir="ltr" /><Input name="password" type="password" required minLength={12} maxLength={128} placeholder={copy.operatorPassword} dir="ltr" /><Button>{copy.createOperator}</Button></form> : <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">{copy.operatorLimitReached}</p>}<div className="mt-4 space-y-2">{operatorAccounts.length ? operatorAccounts.map((account) => <div key={account.operator_account_id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/60"><div className="min-w-0"><div className="truncate font-black" dir="ltr">{account.username}</div><div className="mt-1 text-xs font-bold text-slate-500">{account.revoked_at ? clinicStatus(locale, "revoked") : clinicRole(locale, "manager")}</div></div>{!account.revoked_at && <form action={revokeClinicOperatorAccount}><input type="hidden" name="operator_account_id" value={account.operator_account_id} /><Button className="min-h-9 bg-slate-700 px-3 py-1 text-xs hover:bg-slate-800">{copy.revokeOperator}</Button></form>}</div>) : <p className="text-sm text-slate-500">{copy.noOperatorAccounts}</p>}</div></Card>}
    </section>

    {branches.length ? <section className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><WalletIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.newPriceOffer}</h2></div><form action={createOffer} className="mt-4 grid gap-3"><Select name="branch_id" required disabled={!offerWritableBranches.length}>{offerWritableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select><Select name="variant_id" required>{variants.map((variant) => <option key={variant.id} value={variant.id}>{locale === "ar" ? variant.name_ar : variant.name_en}</option>)}</Select><Select name="price_type" required><option value="fixed">{copy.fixedPrice}</option><option value="from">{copy.fromPrice}</option><option value="range">{copy.rangePrice}</option><option value="package">{copy.packagePrice}</option><option value="consultation_required">{copy.consultationRequired}</option></Select><div className="grid grid-cols-2 gap-2"><Input name="min_qar" type="number" step="0.01" min="0" placeholder={copy.minimumPrice} /><Input name="max_qar" type="number" step="0.01" min="0" placeholder={copy.maximumPrice} /></div><Input name="duration_minutes" type="number" min="5" max="480" defaultValue="30" required /><PriceScopeFields locale={locale} /><Button disabled={!offerWritableBranches.length}>{copy.saveDraft}</Button></form></Card><Card className="p-5"><div className="flex items-center gap-2"><CalendarIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.newAppointment}</h2></div><form action={createSlot} className="mt-4 grid gap-3"><Select name="branch_id" required disabled={!slotWritableBranches.length}>{slotWritableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select><Select name="variant_id" required>{variants.map((variant) => <option key={variant.id} value={variant.id}>{locale === "ar" ? variant.name_ar : variant.name_en}</option>)}</Select><label className="grid gap-1 text-xs font-extrabold">{copy.start}<Input name="start_at" type="datetime-local" required /></label><label className="grid gap-1 text-xs font-extrabold">{copy.end}<Input name="end_at" type="datetime-local" required /></label><Button disabled={!slotWritableBranches.length}>{copy.saveDraft}</Button></form></Card></section> : null}

    <section className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><WalletIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.priceOffers}</h2></div><div className="mt-4 space-y-3 text-sm">{offers.length ? offers.slice(0, 12).map((offer) => <div key={offer.id} className="rounded-[18px] bg-slate-50/80 p-3 ring-1 ring-slate-200/60"><div className="flex items-center justify-between gap-3"><span className="font-bold">{clinicPriceType(locale, offer.price_type)} · {offer.duration_minutes} {copy.minutesUnit} · {offer.min_minor === null ? copy.consultationRequired : `${(offer.min_minor / 100).toFixed(2)} QAR`}</span><div className="flex items-center gap-2"><Badge tone={offer.status === "active" ? "green" : "slate"}>{clinicStatus(locale, offer.status)}</Badge>{offer.status === "draft" && canPublishOffers(offer.branch_id) && <form action={publishOffer}><input type="hidden" name="id" value={offer.id} /><Button className="min-h-9 px-3 py-1 text-xs">{copy.publish}</Button></form>}</div></div>{offer.status === "active" && canManageOffers(offer.branch_id) && <form action={requestPriceRevision} className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-5"><input type="hidden" name="offer_id" value={offer.id} /><input type="hidden" name="price_type" value={offer.price_type} /><input type="hidden" name="duration_minutes" value={offer.duration_minutes} /><Input name="min_qar" type="number" min="0" step="0.01" defaultValue={(offer.min_minor ?? 0) / 100} aria-label={copy.revisionMinPrice} /><Input name="max_qar" type="number" min="0" step="0.01" defaultValue={(offer.max_minor ?? offer.min_minor ?? 0) / 100} aria-label={copy.revisionMaxPrice} /><Input name="reason" className="sm:col-span-2" minLength={3} required placeholder={copy.revisionReason} /><Button className="px-3 text-xs">{copy.requestRevision}</Button></form>}</div>) : <span className="text-slate-500">{copy.noOffers}</span>}</div></Card><Card className="p-5"><div className="flex items-center gap-2"><CalendarIcon size={18} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.appointments}</h2></div><div className="mt-4 space-y-2 text-sm">{slots.length ? slots.slice(0, 12).map((slot) => <div key={slot.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50/80 p-3 ring-1 ring-slate-200/60"><span className="font-bold">{dateTimeFormatter.format(new Date(slot.start_at))}</span><div className="flex items-center gap-2"><Badge tone={slot.status === "published" ? "green" : "slate"}>{clinicStatus(locale, slot.status)}</Badge>{slot.status === "draft" && canManageSlots(slot.branch_id) && <form action={publishSlot}><input type="hidden" name="id" value={slot.id} /><Button className="min-h-9 px-3 py-1 text-xs">{copy.publish}</Button></form>}</div></div>) : <span className="text-slate-500">{copy.noAppointments}</span>}</div></Card></section>

    <Card className="mt-6 p-5 sm:p-6"><div className="flex items-center gap-2"><SlidersIcon size={19} className="text-[#0B5CAD]" /><h2 className="font-black">{copy.operationalBookings}</h2></div><p className="mt-2 text-xs text-slate-500">{copy.attendanceCopy}</p>{notifications.length > 0 && <div className="mt-4 grid gap-2">{notifications.map((notification) => { const payload = (notification.payload ?? {}) as Record<string, unknown>; const treatment = locale === "en" ? payload.treatment_name_en ?? payload.treatment_name : payload.treatment_name_ar ?? payload.treatment_name; return <div key={notification.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-bold text-blue-900"><span>{copy.newBooking}: <b>{String(treatment ?? copy.selectedTreatment)}</b></span><span dir="ltr">{dateTimeFormatter.format(new Date(notification.created_at))}</span></div>; })}</div>}<div className="mt-4 space-y-3">{bookings.length ? bookings.map((booking) => { const latestAttendance = latestAttendanceByBooking.get(booking.id); const attendanceReversed = latestAttendance?.event_type === "attendance_reversed"; const mutableStatus = booking.status === "pending_hold" || booking.status === "pending_clinic_confirmation" || booking.status === "confirmed" ? booking.status : null; const patientDetails = patientDetailsByBooking.get(booking.id); const canOperate = canOperateBooking(booking.branch_id); return <div key={booking.id} className="grid gap-3 rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60 sm:grid-cols-[1fr_auto]"><div><div className="font-black" dir="ltr">{booking.booking_code}</div><div className="mt-1 text-xs font-bold text-slate-500">{dateTimeFormatter.format(new Date(booking.start_at))} · {clinicStatus(locale, booking.status)}</div>{patientDetails ? <div className="mt-3 grid gap-1 rounded-xl bg-white/80 p-3 text-xs font-bold text-slate-600 sm:grid-cols-2"><span>{copy.patient}: <b className="text-slate-900">{patientDetails.patient_display_name}</b></span><span>{copy.nationality}: <b className="text-slate-900">{accountNationality(locale, patientDetails.patient_nationality)}</b></span><span dir="ltr">ID: <b className="text-slate-900">{patientDetails.patient_national_id}</b></span><span dir="ltr">{patientDetails.patient_phone}</span></div> : <p className="mt-2 text-xs font-bold text-slate-400">{copy.patientDataRestricted}</p>}{attendanceReversed && booking.status === "confirmed" && <div className="mt-2 text-xs font-bold text-amber-700">{copy.attendanceReversed}</div>}</div><div className="flex flex-wrap gap-2">{canOperate ? <>{booking.status === "confirmed" && <form action={markBookingCheckedIn}><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="reason" value={copy.checkIn} /><Button className="gap-1.5"><CheckIcon size={16} />{copy.checkIn}</Button></form>}{booking.status === "checked_in" && attendanceStateUnavailable && <Badge tone="amber">{copy.attendanceUnknown}</Badge>}{booking.status === "checked_in" && !attendanceStateUnavailable && latestAttendance?.event_type !== "checked_in" && <Badge tone="amber">{copy.attendanceOutOfSync}</Badge>}{booking.status === "checked_in" && !attendanceStateUnavailable && latestAttendance?.event_type === "checked_in" && <><form action={changeBookingStatus}><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="status" value="completed" /><Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><CheckIcon size={16} />{copy.completeVisit}</Button></form>{canReverseAttendance(booking.branch_id) && <form action={reverseBookingCheckIn} className="flex gap-2"><input type="hidden" name="booking_id" value={booking.id} /><Input name="reason" required minLength={3} placeholder={copy.reverseReason} /><Button className="bg-amber-600 px-3">{copy.reverse}</Button></form>}</>}{mutableStatus && <ClinicBookingStatusForm bookingId={booking.id} status={mutableStatus} startAt={booking.start_at} labels={copy} />}</> : <Badge>{copy.viewOnly}</Badge>}</div></div>; }) : <p className="text-sm text-slate-500">{copy.noBookings}</p>}</div></Card>
  </main>;
}
