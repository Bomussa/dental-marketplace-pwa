import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerAuthClaims, getServerSupabaseClient } from "@/lib/auth-claims.server";
import { getLocale } from "@/lib/i18n";
import { accountNationality, accountNationalityOptions, accountRelationship, accountStatus, getAccountCopy } from "@/lib/account-copy";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { CalendarIcon, ClockIcon, StarIcon, UserIcon } from "@/components/icons";
import { activateLoginCredentials, archivePatientProfile, cancelBooking, createPatientProfile, submitReview } from "./actions";
import { AccountLiveRefresh } from "@/components/account-live-refresh";

export const dynamic = "force-dynamic";
type BookingRow = { id:string; booking_code:string; start_at:string; end_at:string; status:string; offer_snapshot:unknown; created_at:string };
type ReviewRow = { booking_id:string; status:string; rating:number };
type PatientProfileRow = { id:string; display_name:string; relationship:string; national_id:string | null; nationality:string | null; date_of_birth:string | null; phone:string | null; phone_verified_at:string | null; gender:string | null; created_at:string };
type AccountSearchParams = { booking_error?: string; booking_success?: string; patient_profile_error?: string; patient_profile_success?: string; review_error?: string; review_success?: string; credentials_error?: string; credentials_success?: string };

export default async function AccountPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const copy = getAccountCopy(locale);
  const dateLocale = locale === "ar" ? "ar-QA" : "en-QA";
  const dateTimeFormatter = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Qatar" });
  const bookingErrorMessage = params.booking_error ? copy.bookingErrors[params.booking_error] ?? null : null;
  const bookingSuccessMessage = params.booking_success === "cancelled" ? copy.bookingSuccess : null;
  const patientProfileErrorMessage = params.patient_profile_error ? copy.profileErrors[params.patient_profile_error] ?? null : null;
  const patientProfileSuccessMessage = params.patient_profile_success ? copy.profileSuccess[params.patient_profile_success] ?? null : null;
  const reviewErrorMessage = params.review_error ? copy.reviewErrors[params.review_error] ?? null : null;
  const reviewSuccessMessage = params.review_success === "submitted" ? copy.reviewSuccess : null;
  const credentialsErrorMessage = params.credentials_error ? copy.credentialsErrors[params.credentials_error] ?? null : null;
  const credentialsSuccessMessage = params.credentials_success === "activated" ? copy.credentialsSuccess : null;

  const supabase = await getServerSupabaseClient();
  const { data: claimsData, error } = await getServerAuthClaims();
  const userId = claimsData?.claims?.sub;
  if (error || !userId) redirect("/login?next=/account");

  const hasLoginCredentialsPromise = (async () => {
    try {
      const admin = createAdminClient();
      const { data: usernameRow } = await admin.from("account_usernames").select("user_id").eq("user_id", userId).is("disabled_at", null).maybeSingle();
      return Boolean(usernameRow);
    } catch {
      return true;
    }
  })();

  const [hasLoginCredentials, { data: profile }, { data: bookingData }, { data: reviewData }, { data: patientProfileData }] = await Promise.all([
    hasLoginCredentialsPromise,
    supabase.from("profiles").select("display_name,phone,locale,created_at").eq("id", userId).maybeSingle(),
    supabase.from("bookings").select("id,booking_code,start_at,end_at,status,offer_snapshot,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("booking_id,status,rating").eq("patient_id", userId),
    supabase.from("patient_profiles").select("id,display_name,relationship,national_id,nationality,date_of_birth,phone,phone_verified_at,gender,created_at").is("archived_at", null).order("created_at", { ascending: true }),
  ]);

  const bookings = (bookingData ?? []) as BookingRow[];
  const reviews = (reviewData ?? []) as ReviewRow[];
  const patientProfiles = (patientProfileData ?? []) as PatientProfileRow[];
  const reviewed = new Map(reviews.map((review) => [review.booking_id, review]));
  const upcoming = bookings.filter((booking) => ["pending_hold", "pending_clinic_confirmation", "confirmed", "checked_in"].includes(booking.status)).length;
  const completed = bookings.filter((booking) => booking.status === "completed").length;

  return (
    <main className="workspace-shell mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="glass-panel rounded-[30px] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[linear-gradient(135deg,#0a55b8,#11a7a0)] text-white shadow-[0_16px_30px_-14px_rgba(8,102,179,.7)]"><UserIcon size={26} /></span>
            <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{copy.accountKicker}</p><h1 className="mt-1 truncate text-3xl font-black tracking-[-.035em] text-[#092b56]">{profile?.display_name || copy.defaultName}</h1><p className="mt-1 text-sm font-medium text-slate-500">{copy.privacy}</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3"><AccountLiveRefresh userId={userId} labels={copy} /><form action="/auth/signout" method="post"><button className="min-h-11 rounded-full border border-[#0a5e92]/10 bg-white/85 px-4 text-sm font-extrabold text-[#0a426f] shadow-[0_9px_22px_-14px_rgba(5,59,111,.28)] transition hover:-translate-y-0.5 hover:bg-white">{copy.signOut}</button></form></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,.96),rgba(234,248,248,.9))] p-4 ring-1 ring-[#0a5e92]/[.07]"><div className="text-2xl font-black text-[#092b56]">{bookings.length}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.allBookings}</div></div>
          <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(231,243,255,.95),rgba(221,250,247,.91))] p-4 ring-1 ring-[#46a6de]/15"><div className="text-2xl font-black text-[#084884]">{upcoming}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.upcoming}</div></div>
          <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(230,252,244,.95),rgba(228,247,255,.9))] p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-700">{completed}</div><div className="mt-1 text-xs font-bold text-slate-500">{copy.completedVisits}</div></div>
        </div>
      </section>

      {!hasLoginCredentials && <section className="mt-8"><Card className="p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{copy.credentialsKicker}</p><h2 className="mt-2 text-2xl font-black tracking-[-.025em] text-[#092b56]">{copy.credentialsTitle}</h2><p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">{copy.credentialsCopy}</p>{credentialsErrorMessage && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{credentialsErrorMessage}</div>}{credentialsSuccessMessage && <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{credentialsSuccessMessage}</div>}<form action={activateLoginCredentials} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.username}<Input name="username" autoComplete="username" dir="ltr" minLength={3} maxLength={32} required /></label><label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.password}<Input name="password" type="password" autoComplete="new-password" dir="ltr" minLength={12} maxLength={128} required /></label><div className="sm:col-span-2"><Button>{copy.activateCredentials}</Button></div></form></Card></section>}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{copy.familyKicker}</p><h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#092b56]">{copy.familyTitle}</h2><p className="mt-1 text-sm font-medium text-slate-500">{copy.familyCopy}</p></div><UserIcon className="text-[#0B5CAD]" size={24} /></div>
        {patientProfileErrorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{patientProfileErrorMessage}</div>}
        {patientProfileSuccessMessage && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{patientProfileSuccessMessage}</div>}
        <Card className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">{patientProfiles.map((patientProfile) => <div key={patientProfile.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#0a5e92]/[.07] bg-[linear-gradient(135deg,rgba(243,252,251,.96),rgba(238,245,255,.9))] p-4 shadow-[0_14px_28px_-24px_rgba(4,55,103,.28)]"><div><p className="font-black">{patientProfile.relationship === "self" && (patientProfile.display_name === "أنا" || patientProfile.display_name === "Me") ? copy.self : patientProfile.display_name}</p><p className="mt-1 text-xs font-bold text-slate-500">{accountRelationship(locale, patientProfile.relationship)} · {patientProfile.nationality ? accountNationality(locale, patientProfile.nationality) : "—"}</p><p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">{patientProfile.phone ?? "—"}</p></div><div className="flex items-center gap-2"><Badge tone={patientProfile.phone_verified_at ? "green" : "amber"}>{patientProfile.phone_verified_at ? copy.phoneVerified : copy.phonePending}</Badge>{patientProfile.relationship !== "self" && <form action={archivePatientProfile}><input type="hidden" name="patient_profile_id" value={patientProfile.id} /><button className="min-h-11 rounded-full px-3 text-xs font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-50">{copy.archive}</button></form>}</div></div>)}</div>
          <form action={createPatientProfile} className="mt-5 grid gap-3 border-t border-slate-200/70 pt-5 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.fullName}<Input name="display_name" required maxLength={120} placeholder={copy.namePlaceholder} /></label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.relationship}<Select name="relationship" defaultValue="child"><option value="child">{copy.child}</option><option value="spouse">{copy.spouse}</option><option value="parent">{copy.parent}</option><option value="other">{copy.other}</option></Select></label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.nationalId}<Input name="national_id" inputMode="numeric" required pattern="[0-9٠-٩۰-۹ -]{11,20}" placeholder={copy.nationalIdPlaceholder} /></label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.nationality}<Select name="nationality" required defaultValue=""><option value="">{copy.chooseNationality}</option>{accountNationalityOptions.map((code) => <option key={code} value={code}>{accountNationality(locale, code)}</option>)}</Select></label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.birthDate}<Input name="date_of_birth" type="date" required /></label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">{copy.phone}<Input name="phone" type="tel" dir="ltr" required placeholder="+974XXXXXXXX" /></label>
            <div className="sm:col-span-2"><Button>{copy.saveProfile}</Button><p className="mt-2 text-xs font-bold text-slate-500">{copy.verificationNote}</p></div>
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#087d90]">{copy.bookingsKicker}</p><h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#092b56]">{copy.bookingsTitle}</h2></div><CalendarIcon className="text-[#0B5CAD]" size={24} /></div>
        {bookingErrorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{bookingErrorMessage}</div>}
        {bookingSuccessMessage && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{bookingSuccessMessage}</div>}
        {reviewErrorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{reviewErrorMessage}</div>}
        {reviewSuccessMessage && <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{reviewSuccessMessage}</div>}
        {bookings.length === 0 ? <Card className="p-10 text-center"><CalendarIcon className="mx-auto text-slate-300" size={34} /><h3 className="mt-4 font-black">{copy.noBookings}</h3><p className="mt-2 text-sm text-slate-500">{copy.noBookingsCopy}</p></Card> : <div className="space-y-4">{bookings.map((booking) => {
          const snapshot = (booking.offer_snapshot ?? {}) as Record<string, unknown>;
          const name = locale === "ar" ? snapshot.variant_name_ar ?? snapshot.treatment_name_ar : snapshot.variant_name_en ?? snapshot.treatment_name_en;
          const canCancel = ["pending_clinic_confirmation", "confirmed"].includes(booking.status);
          const existingReview = reviewed.get(booking.id);
          const tone = booking.status === "completed" ? "green" : booking.status.includes("cancel") || booking.status === "failed" ? "red" : "blue";
          return <Card key={booking.id} className="lift overflow-hidden p-0"><div className="grid md:grid-cols-[1fr_230px]"><div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black">{String(name ?? copy.defaultBooking)}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarIcon size={14} />{dateTimeFormatter.format(new Date(booking.start_at))}</span><span dir="ltr">#{booking.booking_code}</span></div></div><Badge tone={tone}>{accountStatus(locale, booking.status)}</Badge></div>{canCancel && <form action={cancelBooking} className="mt-5"><input type="hidden" name="booking_id" value={booking.id} /><Button className="bg-white text-red-700 shadow-none ring-1 ring-red-200 hover:bg-red-50">{copy.cancelBooking}</Button></form>}</div><aside className="border-t border-slate-200/70 bg-slate-50/60 p-5 md:border-s md:border-t-0"><div className="flex items-center gap-2 text-xs font-extrabold text-slate-500"><ClockIcon size={15} />{copy.visitStatus}</div><div className="mt-2 text-sm font-black">{accountStatus(locale, booking.status)}</div>{booking.status === "completed" && <div className="mt-4">{existingReview ? <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"><div className="flex items-center gap-1.5 font-black"><StarIcon size={15} className="text-amber-500" />{existingReview.rating}/5</div><div className="mt-1 text-xs font-bold text-slate-500">{existingReview.status}</div></div> : <span className="text-xs font-bold text-slate-500">{copy.reviewAvailable}</span>}</div>}</aside></div>{booking.status === "completed" && !existingReview && <form action={submitReview} className="border-t border-slate-200/70 bg-white/70 p-5 sm:p-6"><input type="hidden" name="booking_id" value={booking.id} /><div className="flex items-center gap-2 text-sm font-black"><StarIcon size={18} className="text-amber-500" />{copy.reviewTitle}</div><div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><Select name="rating" defaultValue="5"><option value="5">5 / 5</option><option value="4">4 / 5</option><option value="3">3 / 5</option><option value="2">2 / 5</option><option value="1">1 / 5</option></Select><textarea name="review_text" maxLength={1500} className="min-h-12 rounded-2xl border border-slate-200/80 bg-white p-3 text-sm font-medium outline-none transition focus:border-[#0B5CAD] focus:ring-4 focus:ring-blue-500/10" placeholder={copy.reviewPlaceholder} /><Button>{copy.submitReview}</Button></div></form>}</Card>;
        })}</div>}
      </section>
    </main>
  );
}
