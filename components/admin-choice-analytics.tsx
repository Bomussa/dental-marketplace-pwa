import Link from "next/link";
import { Card } from "@/components/ui";
import { AdminAnalyticsLiveRefresh } from "@/components/admin-analytics-live-refresh";
import { conversionRate, type CustomerChoiceAnalytics } from "@/lib/customer-choice-analytics";

const dayLabels: Record<number, string> = {
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
  7: "الأحد",
};

const preferenceLabels: Record<string, string> = {
  earliest: "أقرب موعد",
  today: "اليوم",
  tomorrow: "غدًا",
  unknown: "غير محدد",
};

const eventLabels: Record<string, string> = {
  treatment_selected: "اختيار علاج",
  variant_selected: "اختيار النوع الدقيق",
  appointment_preference_selected: "اختيار الموعد",
  location_requested: "طلب الموقع",
  location_acquired: "السماح بالموقع",
  location_denied: "رفض/تعذر الموقع",
  search_submitted: "تنفيذ بحث",
  offer_booking_clicked: "ضغط حجز",
  booking_login_required: "طلب تسجيل الدخول",
  booking_succeeded: "حجز ناجح",
  booking_failed: "حجز فاشل",
};

function formatPercent(value: number) {
  return `${value.toLocaleString("ar-QA", { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: string | null) {
  if (!value) return "لا يوجد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير معروف";
  return new Intl.DateTimeFormat("ar-QA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Qatar",
  }).format(date);
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className="min-w-0 truncate text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500">{value.toLocaleString("ar-QA")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#007AFF] transition-[width]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AdminChoiceAnalytics({ analytics, days }: { analytics: CustomerChoiceAnalytics; days: 1 | 7 | 30 }) {
  const m = analytics.metrics;
  const treatmentMax = Math.max(0, ...analytics.top_treatments.map((item) => item.searches));
  const variantMax = Math.max(0, ...analytics.top_variants.map((item) => item.searches));
  const weekdayMax = Math.max(0, ...analytics.weekday_searches.map((item) => item.searches));
  const hourMax = Math.max(0, ...analytics.hourly_searches.map((item) => item.searches));
  const searchToClick = conversionRate(m.booking_clicks, m.searches);
  const clickToSuccess = conversionRate(m.booking_successes, m.booking_clicks);
  const searchToSuccess = conversionRate(m.booking_successes, m.searches);
  const locationPermissionRate = conversionRate(m.location_acquired, m.location_requested);
  const locationSearchRate = conversionRate(m.searches_with_location, m.searches);

  return (
    <section className="mt-7 space-y-6" aria-labelledby="customer-intelligence-title">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200/70 bg-gradient-to-l from-blue-50/80 via-white to-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#0066CC]">First-Party Intelligence</p>
              <h2 id="customer-intelligence-title" className="mt-1 text-2xl font-black tracking-tight">ذكاء قرارات العملاء</h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                بيانات سلوكية مجهولة الهوية من customer_choice_events. لا تعرض هذه اللوحة بريدًا أو user id أو session id أو إحداثيات العميل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminAnalyticsLiveRefresh />
              {[1, 7, 30].map((range) => (
                <Link
                  key={range}
                  href={`/admin?days=${range}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 transition ${days === range ? "bg-[#007AFF] text-white ring-[#007AFF]" : "bg-white text-slate-600 ring-slate-200 hover:ring-blue-300"}`}
                >
                  {range === 1 ? "24 ساعة" : `${range} أيام`}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-bold text-slate-500">
            <span>التوقيت: قطر</span>
            <span>آخر حدث: {formatDate(m.last_event_at)}</span>
            <span>تحديث التقرير: {formatDate(analytics.generated_at)}</span>
          </div>
        </div>

        {m.total_events === 0 ? (
          <div className="p-6 sm:p-8">
            <div className="rounded-[24px] bg-slate-50 p-6 text-center ring-1 ring-slate-200/70">
              <div className="text-lg font-black text-slate-900">لا توجد أحداث حقيقية بعد</div>
              <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                هذا هو السلوك الصحيح: لن نعرض أرقامًا تجريبية كأنها طلب سوق. أول بحث فعلي من Production سيظهر هنا تلقائيًا بعد وصوله إلى Supabase.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["عمليات البحث", m.searches],
                ["جلسات مجهولة", m.unique_sessions],
                ["نقرات الحجز", m.booking_clicks],
                ["حجوزات ناجحة", m.booking_successes],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-[22px] bg-slate-50/80 p-4 ring-1 ring-slate-200/70">
                  <div className="text-2xl font-black text-slate-950">{Number(value).toLocaleString("ar-QA")}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black">مسار التحويل</h3>
            <span className="text-xs font-bold text-slate-500">Search → Booking</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-blue-50/70 p-4 ring-1 ring-blue-100"><div className="text-xl font-black text-[#0066CC]">{formatPercent(searchToClick)}</div><div className="mt-1 text-xs font-bold text-slate-600">بحث ← نقرة حجز</div></div>
            <div className="rounded-[20px] bg-emerald-50/70 p-4 ring-1 ring-emerald-100"><div className="text-xl font-black text-emerald-700">{formatPercent(clickToSuccess)}</div><div className="mt-1 text-xs font-bold text-slate-600">نقرة ← حجز ناجح</div></div>
            <div className="rounded-[20px] bg-violet-50/70 p-4 ring-1 ring-violet-100"><div className="text-xl font-black text-violet-700">{formatPercent(searchToSuccess)}</div><div className="mt-1 text-xs font-bold text-slate-600">بحث ← حجز ناجح</div></div>
          </div>
          <div className="mt-5 overflow-hidden rounded-[20px] ring-1 ring-slate-200/70">
            {[
              ["عمليات البحث", m.searches],
              ["نقرات الحجز", m.booking_clicks],
              ["تسجيل الدخول مطلوب", m.login_required],
              ["حجز ناجح", m.booking_successes],
              ["حجز فاشل", m.booking_failures],
            ].map(([label, value], index) => (
              <div key={String(label)} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${index ? "border-t border-slate-100" : ""}`}>
                <span className="font-bold text-slate-600">{label}</span><span className="font-black">{Number(value).toLocaleString("ar-QA")}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-black">استخدام الموقع — بدون تخزين المكان</h3>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-500">نقيس الإذن والاستخدام فقط. لا توجد خريطة طلب جغرافي لأن الـPipeline لا يخزن منطقة منشأ العميل أو إحداثياته.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200/70"><div className="text-xl font-black">{m.location_requested.toLocaleString("ar-QA")}</div><div className="mt-1 text-xs font-bold text-slate-500">طلبات استخدام الموقع</div></div>
            <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200/70"><div className="text-xl font-black">{m.location_acquired.toLocaleString("ar-QA")}</div><div className="mt-1 text-xs font-bold text-slate-500">تم السماح</div></div>
            <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200/70"><div className="text-xl font-black">{formatPercent(locationPermissionRate)}</div><div className="mt-1 text-xs font-bold text-slate-500">نسبة السماح من الطلبات</div></div>
            <div className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-200/70"><div className="text-xl font-black">{formatPercent(locationSearchRate)}</div><div className="mt-1 text-xs font-bold text-slate-500">نسبة البحث باستخدام الموقع</div></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="font-black">أكثر العلاجات بحثًا</h3>
          <div className="mt-5 space-y-4">
            {analytics.top_treatments.length ? analytics.top_treatments.map((item) => <BarRow key={item.id} label={`${item.name_ar} — ${item.name_en}`} value={item.searches} max={treatmentMax} />) : <p className="text-sm font-medium text-slate-500">لا توجد عمليات بحث في الفترة المحددة.</p>}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="font-black">أكثر الأنواع الدقيقة بحثًا</h3>
          <div className="mt-5 space-y-4">
            {analytics.top_variants.length ? analytics.top_variants.map((item) => <BarRow key={item.id} label={`${item.treatment_name_ar}: ${item.name_ar}`} value={item.searches} max={variantMax} />) : <p className="text-sm font-medium text-slate-500">لا توجد بيانات variants في الفترة المحددة.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <h3 className="font-black">تفضيل الموعد</h3>
          <div className="mt-5 space-y-3">
            {analytics.appointment_preferences.length ? analytics.appointment_preferences.map((item) => (
              <div key={item.preference} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
                <span className="text-sm font-bold">{preferenceLabels[item.preference] ?? item.preference}</span><span className="font-black">{item.searches.toLocaleString("ar-QA")}</span>
              </div>
            )) : <p className="text-sm text-slate-500">لا توجد بيانات.</p>}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="font-black">البحث حسب يوم الأسبوع</h3>
          <div className="mt-5 space-y-3">
            {analytics.weekday_searches.length ? analytics.weekday_searches.map((item) => <BarRow key={item.iso_day} label={dayLabels[item.iso_day] ?? String(item.iso_day)} value={item.searches} max={weekdayMax} />) : <p className="text-sm text-slate-500">لا توجد بيانات.</p>}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="font-black">ساعات البحث — توقيت قطر</h3>
          <div className="mt-5 max-h-72 space-y-3 overflow-y-auto pe-1">
            {analytics.hourly_searches.length ? analytics.hourly_searches.map((item) => <BarRow key={item.hour} label={`${String(item.hour).padStart(2, "0")}:00`} value={item.searches} max={hourMax} />) : <p className="text-sm text-slate-500">لا توجد بيانات.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h3 className="font-black">آخر الأحداث</h3><span className="text-xs font-bold text-slate-500">بدون session identifiers</span></div>
        <div className="mt-4 overflow-hidden rounded-[20px] ring-1 ring-slate-200/70">
          {analytics.recent_events.length ? analytics.recent_events.map((event, index) => (
            <div key={`${event.created_at}-${index}`} className={`grid gap-1 px-4 py-3 text-sm sm:grid-cols-[180px_1fr_auto] sm:items-center ${index ? "border-t border-slate-100" : ""}`}>
              <span className="font-black text-slate-800">{eventLabels[event.event_name] ?? event.event_name}</span>
              <span className="min-w-0 truncate font-medium text-slate-500">{event.variant_name_ar || event.treatment_name_ar || "—"}</span>
              <span className="text-xs font-bold text-slate-400">{formatDate(event.created_at)}</span>
            </div>
          )) : <p className="p-5 text-sm font-medium text-slate-500">لا توجد أحداث في الفترة المحددة.</p>}
        </div>
      </Card>
    </section>
  );
}
