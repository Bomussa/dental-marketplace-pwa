import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { BuildingIcon, CalendarIcon, CheckIcon, ClockIcon, ShieldCheckIcon, SlidersIcon, UserIcon, WalletIcon } from "@/components/icons";
import { applyClinic, changeBookingStatus, createBranch, createOffer, createPractitioner, createSlot, markBookingCheckedIn, publishOffer, publishSlot, requestPriceRevision, reverseBookingCheckIn, setDailyHours } from "./actions";

export const dynamic = "force-dynamic";

type Membership={clinic_id:string;branch_id:string|null;role:string;status:string};
type Clinic={id:string;display_name:string;status:string};
type Branch={id:string;clinic_id:string;name:string;area:string|null;status:string};
type Offer={id:string;branch_id:string;variant_id:string;price_type:string;min_minor:number|null;max_minor:number|null;duration_minutes:number;status:string;last_verified_at:string|null};
type Slot={id:string;branch_id:string;variant_id:string;start_at:string;end_at:string;status:string};
type Variant={id:string;name_ar:string;name_en:string};
type Booking={id:string;booking_code:string;start_at:string;status:string;branch_id:string;offer_snapshot:unknown};
type AttendanceEvent={booking_id:string;event_type:string;sequence_no:number};

export default async function ClinicPage({ searchParams }: { searchParams: Promise<{ clinic?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) redirect("/login?next=/clinic");
  const { data: membershipData } = await supabase.from("clinic_memberships").select("clinic_id,branch_id,role,status").eq("status", "active");
  const memberships=(membershipData??[]) as Membership[];

  if (!memberships.length) return <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20"><Card className="p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#007AFF]"><BuildingIcon size={24}/></span><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">انضمام العيادات</p><h1 className="mt-2 text-3xl font-black tracking-tight">قدّم طلب عيادتك</h1><p className="mt-3 text-sm font-medium leading-7 text-slate-500">يُنشأ الطلب بحالة Pending. لا يمكن تفعيل العيادة أو الفرع أو الطبيب قبل تسجيل تحقق صالح من الإدارة.</p><div className="mt-5 flex items-start gap-2 rounded-2xl bg-blue-50 p-4 text-xs font-bold leading-5 text-blue-800"><ShieldCheckIcon size={17} className="mt-0.5 shrink-0"/>بياناتك التشغيلية تبقى خلف صلاحيات العيادة وRLS؛ الظهور العام لا يبدأ قبل التحقق والتفعيل.</div><form action={applyClinic} className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-extrabold">الاسم القانوني<Input name="legal_name" required /></label><label className="grid gap-2 text-sm font-extrabold">الاسم الظاهر<Input name="display_name" required /></label><Button className="gap-2"><CheckIcon size={17}/>إرسال الطلب</Button></form></Card></main>;

  const clinicIds=[...new Set(memberships.map(m=>m.clinic_id))];
  const selectedClinicId = params.clinic && clinicIds.includes(params.clinic) ? params.clinic : clinicIds[0];
  const [{ data: clinicData }, { data: branchData }] = await Promise.all([
    supabase.from("clinics").select("id,display_name,status").eq("id", selectedClinicId).limit(1),
    supabase.from("branches").select("id,clinic_id,name,area,status").eq("clinic_id", selectedClinicId).order("created_at"),
  ]);
  const clinics=(clinicData??[]) as Clinic[];
  const branches=(branchData??[]) as Branch[];
  const branchIds = branches.map((branch) => branch.id);
  const empty = Promise.resolve({ data: [] as never[] });
  const [{data:offerData},{data:slotData},{data:variantData},{data:bookingData},{data:practitionerData}] = await Promise.all([
    branchIds.length ? supabase.from("branch_service_offers").select("id,branch_id,variant_id,price_type,min_minor,max_minor,duration_minutes,status,last_verified_at").in("branch_id", branchIds).order("created_at",{ascending:false}).limit(50) : empty,
    branchIds.length ? supabase.from("availability_slots").select("id,branch_id,variant_id,start_at,end_at,status").in("branch_id", branchIds).order("start_at").limit(50) : empty,
    supabase.from("treatment_variants").select("id,name_ar,name_en").eq("active",true).order("name_ar"),
    branchIds.length ? supabase.from("bookings").select("id,booking_code,start_at,status,branch_id,offer_snapshot").in("branch_id", branchIds).order("start_at").limit(50) : empty,
    supabase.from("practitioners").select("id,display_name,active,license_ref,clinic_id").eq("clinic_id", selectedClinicId).limit(50),
  ]);
  const selectedClinic=clinics[0];
  const offers=(offerData??[]) as Offer[], slots=(slotData??[]) as Slot[], variants=(variantData??[]) as Variant[], bookings=(bookingData??[]) as Booking[];
  const bookingIds = bookings.map((booking) => booking.id);
  let attendanceStateUnavailable = false;
  const latestAttendanceByBooking = new Map<string, AttendanceEvent>();
  if (bookingIds.length) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("booking_attendance_events")
      .select("*")
      .in("booking_id", bookingIds);
    attendanceStateUnavailable = Boolean(attendanceError);
    if (!attendanceError) {
      for (const event of (attendanceData ?? []) as unknown as AttendanceEvent[]) {
        const current = latestAttendanceByBooking.get(event.booking_id);
        if (!current || event.sequence_no > current.sequence_no) latestAttendanceByBooking.set(event.booking_id, event);
      }
    }
  }
  const publishedOffers=offers.filter(o=>o.status==="active").length;
  const publishedSlots=slots.filter(s=>s.status==="published").length;
  const canManageClinic = selectedClinic?.status === "active";

  return (
    <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
      <section className="glass-panel rounded-[30px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#007AFF]"><BuildingIcon size={24}/></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">لوحة العيادة</p><h1 className="mt-1 text-3xl font-black tracking-tight">{selectedClinic?.display_name??"عيادتي"}</h1><div className="mt-3 flex flex-wrap gap-2"><Badge tone={selectedClinic?.status==="active"?"green":"amber"}>{selectedClinic?.status??"pending"}</Badge><Badge>{memberships.find((membership) => membership.clinic_id === selectedClinicId)?.role ?? "member"}</Badge></div></div></div><p className="max-w-md text-xs font-medium leading-6 text-slate-500">إدارة الفروع والأطباء والأسعار والمواعيد والحجوزات من مساحة تشغيل واحدة. كل نشر يظل خاضعًا لبوابات التحقق وقواعد قاعدة البيانات.</p></div>
        {!canManageClinic && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-200">هذه العيادة قيد التحقق. ستتاح إضافة الفروع والأطباء والعروض والمواعيد بعد تفعيل الإدارة لها؛ لا تُنشر أي بيانات قبل ذلك.</div>}
        <div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{branches.length}</div><div className="mt-1 text-xs font-bold text-slate-500">فروع</div></div><div className="rounded-2xl bg-blue-50/75 p-4 ring-1 ring-blue-100"><div className="text-2xl font-black text-[#0066CC]">{publishedOffers}</div><div className="mt-1 text-xs font-bold text-slate-500">عروض منشورة</div></div><div className="rounded-2xl bg-emerald-50/75 p-4 ring-1 ring-emerald-100"><div className="text-2xl font-black text-emerald-700">{publishedSlots}</div><div className="mt-1 text-xs font-bold text-slate-500">مواعيد منشورة</div></div><div className="rounded-2xl bg-white/75 p-4 ring-1 ring-slate-200/60"><div className="text-2xl font-black">{bookings.length}</div><div className="mt-1 text-xs font-bold text-slate-500">حجوزات ظاهرة لك</div></div></div>
      </section>

      <section className="mt-7 grid gap-6 lg:grid-cols-3">
        <Card className="p-5"><div className="flex items-center gap-2"><BuildingIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">إضافة فرع</h2></div><form action={createBranch} className="mt-4 grid gap-3"><input type="hidden" name="clinic_id" value={selectedClinic?.id}/><Input name="name" required placeholder="اسم الفرع"/><Input name="area" placeholder="المنطقة"/><Input name="address_line" placeholder="العنوان"/><div className="grid grid-cols-2 gap-2"><Input name="lat" type="number" step="any" placeholder="Latitude" dir="ltr"/><Input name="lng" type="number" step="any" placeholder="Longitude" dir="ltr"/></div><Button disabled={!canManageClinic} title={!canManageClinic ? "فعّل العيادة أولًا من لوحة الإدارة" : undefined}>حفظ الفرع</Button></form></Card>
        <Card className="p-5"><div className="flex items-center gap-2"><UserIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">إضافة طبيب</h2></div><form action={createPractitioner} className="mt-4 grid gap-3"><input type="hidden" name="clinic_id" value={selectedClinic?.id}/><Input name="display_name" required placeholder="اسم مقدم الخدمة"/><Input name="license_ref" placeholder="مرجع الترخيص"/><Button disabled={!canManageClinic} title={!canManageClinic ? "فعّل العيادة أولًا من لوحة الإدارة" : undefined}>حفظ Pending</Button></form><div className="mt-4 space-y-2 text-xs">{(practitionerData??[]).map((p:{id:string;display_name:string;active:boolean})=><div key={p.id} className="flex justify-between rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200/60"><span className="font-bold">{p.display_name}</span><Badge tone={p.active?"green":"amber"}>{p.active?"active":"pending"}</Badge></div>)}</div></Card>
        <Card className="p-5"><div className="flex items-center gap-2"><ClockIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">الفروع وساعات العمل</h2></div><div className="mt-4 grid gap-3">{branches.length?branches.map(b=><div key={b.id} className="rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60"><div className="flex items-start justify-between gap-2"><div><div className="font-black">{b.name}</div><div className="mt-1 text-xs font-bold text-slate-500">{b.area||"—"}</div></div><Badge tone={b.status==="active"?"green":"amber"}>{b.status}</Badge></div>{b.status==="active"&&<form action={setDailyHours} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><input type="hidden" name="branch_id" value={b.id}/><Input name="open_time" type="time" defaultValue="08:00" required/><Input name="close_time" type="time" defaultValue="20:00" required/><Button className="px-4">حفظ</Button></form>}</div>):<p className="text-sm text-slate-500">لا توجد فروع بعد.</p>}</div></Card>
      </section>

      {branches.length ? <section className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><WalletIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">عرض سعر جديد</h2></div><form action={createOffer} className="mt-4 grid gap-3"><Select name="branch_id" required>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select name="variant_id" required>{variants.map(v=><option key={v.id} value={v.id}>{v.name_ar}</option>)}</Select><Select name="price_type" required><option value="fixed">سعر ثابت</option><option value="from">يبدأ من</option><option value="range">نطاق</option><option value="package">باقة</option><option value="consultation_required">بعد الاستشارة</option></Select><div className="grid grid-cols-2 gap-2"><Input name="min_qar" type="number" step="0.01" min="0" placeholder="الأدنى QAR"/><Input name="max_qar" type="number" step="0.01" min="0" placeholder="الأعلى QAR"/></div><Input name="duration_minutes" type="number" min="5" max="480" defaultValue="30" required/><Button>حفظ كمسودة</Button></form></Card><Card className="p-5"><div className="flex items-center gap-2"><CalendarIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">موعد جديد</h2></div><form action={createSlot} className="mt-4 grid gap-3"><Select name="branch_id" required>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select name="variant_id" required>{variants.map(v=><option key={v.id} value={v.id}>{v.name_ar}</option>)}</Select><label className="grid gap-1 text-xs font-extrabold">البداية<Input name="start_at" type="datetime-local" required/></label><label className="grid gap-1 text-xs font-extrabold">النهاية<Input name="end_at" type="datetime-local" required/></label><Button>حفظ كمسودة</Button></form></Card></section> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2"><WalletIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">عروض الأسعار</h2></div>
          <div className="mt-4 space-y-3 text-sm">
            {offers.length ? offers.slice(0, 12).map((offer) => (
              <div key={offer.id} className="rounded-[18px] bg-slate-50/80 p-3 ring-1 ring-slate-200/60">
                <div className="flex items-center justify-between gap-3"><span className="font-bold">{offer.price_type} · {offer.duration_minutes} د · {offer.min_minor === null ? "بعد الاستشارة" : `${(offer.min_minor / 100).toFixed(2)} ر.ق`}</span><div className="flex items-center gap-2"><Badge tone={offer.status === "active" ? "green" : "slate"}>{offer.status}</Badge>{offer.status === "draft" && <form action={publishOffer}><input type="hidden" name="id" value={offer.id}/><Button className="min-h-9 px-3 py-1 text-xs">نشر</Button></form>}</div></div>
                {offer.status === "active" && <form action={requestPriceRevision} className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-5"><input type="hidden" name="offer_id" value={offer.id}/><input type="hidden" name="price_type" value={offer.price_type}/><input type="hidden" name="duration_minutes" value={offer.duration_minutes}/><Input name="min_qar" type="number" min="0" step="0.01" defaultValue={(offer.min_minor ?? 0) / 100} aria-label="السعر الأدنى الجديد"/><Input name="max_qar" type="number" min="0" step="0.01" defaultValue={(offer.max_minor ?? offer.min_minor ?? 0) / 100} aria-label="السعر الأعلى الجديد"/><Input name="reason" className="sm:col-span-2" minLength={3} required placeholder="سبب التعديل"/><Button className="px-3 text-xs">طلب تعديل</Button></form>}
              </div>
            )) : <span className="text-slate-500">لا توجد عروض.</span>}
          </div>
        </Card>
        <Card className="p-5"><div className="flex items-center gap-2"><CalendarIcon size={18} className="text-[#007AFF]"/><h2 className="font-black">المواعيد المنشورة والمسودات</h2></div><div className="mt-4 space-y-2 text-sm">{slots.length?slots.slice(0,12).map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50/80 p-3 ring-1 ring-slate-200/60"><span className="font-bold">{new Intl.DateTimeFormat("ar-QA",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Qatar"}).format(new Date(s.start_at))}</span><div className="flex items-center gap-2"><Badge tone={s.status==="published"?"green":"slate"}>{s.status}</Badge>{s.status==="draft"&&<form action={publishSlot}><input type="hidden" name="id" value={s.id}/><Button className="min-h-9 px-3 py-1 text-xs">نشر</Button></form>}</div></div>):<span className="text-slate-500">لا توجد مواعيد.</span>}</div></Card>
      </section>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-2"><SlidersIcon size={19} className="text-[#007AFF]"/><h2 className="font-black">الحجوزات التشغيلية</h2></div>
        <p className="mt-2 text-xs text-slate-500">الحضور قابل للعكس كتصحيح تشغيلي، وبعد العكس يعود الحجز إلى مؤكد ويمكن تسجيل وصول جديد. الإكمال يتطلب أن يكون آخر حدث حضور هو Check-in صالح.</p>
        <div className="mt-4 space-y-3">{bookings.length ? bookings.map((b) => {
          const latestAttendance = latestAttendanceByBooking.get(b.id);
          const attendanceReversed = latestAttendance?.event_type === "attendance_reversed";
          const mutableStatus = ["pending_hold", "pending_clinic_confirmation", "confirmed"].includes(b.status);
          const canMarkNoShow = b.status === "confirmed" && new Date(b.start_at).getTime() <= Date.now();
          return <div key={b.id} className="grid gap-3 rounded-[20px] bg-slate-50/80 p-4 ring-1 ring-slate-200/60 sm:grid-cols-[1fr_auto]">
            <div><div className="font-black" dir="ltr">{b.booking_code}</div><div className="mt-1 text-xs font-bold text-slate-500">{new Intl.DateTimeFormat("ar-QA",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Qatar"}).format(new Date(b.start_at))} · {b.status}</div>{attendanceReversed && b.status === "confirmed" && <div className="mt-2 text-xs font-bold text-amber-700">تم عكس حضور سابق؛ يمكن تسجيل الوصول من جديد عند حضور المريض.</div>}</div>
            <div className="flex flex-wrap gap-2">
              {b.status === "confirmed" && <form action={markBookingCheckedIn}><input type="hidden" name="booking_id" value={b.id}/><input type="hidden" name="reason" value="حضور مؤكد من العيادة"/><Button className="gap-1.5"><CheckIcon size={16}/>تسجيل الحضور</Button></form>}
              {b.status === "checked_in" && attendanceStateUnavailable && <Badge tone="amber">تعذر التحقق من حالة الحضور — أعد تحميل الصفحة</Badge>}
              {b.status === "checked_in" && !attendanceStateUnavailable && latestAttendance?.event_type !== "checked_in" && <Badge tone="amber">حالة الحضور غير متزامنة — أعد تحميل الصفحة</Badge>}
              {b.status === "checked_in" && !attendanceStateUnavailable && latestAttendance?.event_type === "checked_in" && <>
                <form action={changeBookingStatus}><input type="hidden" name="booking_id" value={b.id}/><input type="hidden" name="status" value="completed"/><Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><CheckIcon size={16}/>إكمال الزيارة</Button></form>
                <form action={reverseBookingCheckIn} className="flex gap-2"><input type="hidden" name="booking_id" value={b.id}/><Input name="reason" required minLength={3} placeholder="سبب عكس الحضور"/><Button className="bg-amber-600 px-3">عكس</Button></form>
              </>}
              {mutableStatus && <form action={changeBookingStatus} className="flex gap-2"><input type="hidden" name="booking_id" value={b.id}/><Select name="status" defaultValue="" required className="w-48"><option value="" disabled>اختر إجراءً</option>{["pending_hold","pending_clinic_confirmation"].includes(b.status) && <option value="confirmed">تأكيد الحجز</option>}{["pending_clinic_confirmation","confirmed"].includes(b.status) && <option value="clinic_cancelled">إلغاء من العيادة</option>}{canMarkNoShow && <option value="no_show">تسجيل عدم الحضور</option>}<option value="failed">تعذر إتمام الحجز</option></Select><Button className="gap-1.5"><CheckIcon size={16}/>تنفيذ</Button></form>}
            </div>
          </div>;
        }) : <p className="text-sm text-slate-500">لا توجد حجوزات.</p>}</div>
      </Card>
    </main>
  );
}
