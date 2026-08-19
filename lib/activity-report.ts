import type { Locale } from "@/lib/i18n";
import type { ActivityReportGranularity } from "@/lib/operations.server";

export type ActivityReportBucket = {
  bucket_start: string;
  bucket_end: string;
  new_clinics: number;
  new_patients: number;
  new_bookings: number;
  confirmed_bookings: number;
  attended_bookings: number;
  completed_bookings: number;
  closed_without_completion: number;
};

export type ActivityReport = {
  scope: "platform" | "clinic";
  clinic_id: string | null;
  period_start: string;
  period_end: string;
  granularity: ActivityReportGranularity;
  timezone: "Asia/Qatar";
  generated_at: string;
  total_clinics: number;
  active_clinics: number;
  total_patients: number;
  total_bookings: number;
  new_clinics_in_period: number;
  new_patients_in_period: number;
  new_bookings_in_period: number;
  buckets: ActivityReportBucket[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseBucket(value: unknown): ActivityReportBucket | null {
  if (!isRecord(value) || typeof value.bucket_start !== "string" || typeof value.bucket_end !== "string") return null;
  const counts = [
    "new_clinics", "new_patients", "new_bookings", "confirmed_bookings", "attended_bookings", "completed_bookings", "closed_without_completion",
  ].map((field) => nonNegativeInteger(value[field]));
  if (counts.some((count) => count === null)) return null;
  return {
    bucket_start: value.bucket_start,
    bucket_end: value.bucket_end,
    new_clinics: counts[0]!,
    new_patients: counts[1]!,
    new_bookings: counts[2]!,
    confirmed_bookings: counts[3]!,
    attended_bookings: counts[4]!,
    completed_bookings: counts[5]!,
    closed_without_completion: counts[6]!,
  };
}

export function parseActivityReport(value: unknown): ActivityReport | null {
  if (!isRecord(value)) return null;
  const scope = value.scope;
  const granularity = value.granularity;
  if ((scope !== "platform" && scope !== "clinic") || !["hourly", "daily", "weekly", "monthly"].includes(String(granularity))) return null;
  if (typeof value.period_start !== "string" || typeof value.period_end !== "string" || typeof value.generated_at !== "string" || value.timezone !== "Asia/Qatar" || !Array.isArray(value.buckets)) return null;
  const totalFields = ["total_clinics", "active_clinics", "total_patients", "total_bookings", "new_clinics_in_period", "new_patients_in_period", "new_bookings_in_period"];
  const totals = totalFields.map((field) => nonNegativeInteger(value[field]));
  const buckets = value.buckets.map(parseBucket);
  if (totals.some((total) => total === null) || buckets.some((bucket) => bucket === null)) return null;
  if (scope === "clinic" && typeof value.clinic_id !== "string") return null;
  if (scope === "platform" && value.clinic_id !== null) return null;
  return {
    scope,
    clinic_id: scope === "clinic" ? value.clinic_id as string : null,
    period_start: value.period_start,
    period_end: value.period_end,
    granularity: granularity as ActivityReportGranularity,
    timezone: "Asia/Qatar",
    generated_at: value.generated_at,
    total_clinics: totals[0]!,
    active_clinics: totals[1]!,
    total_patients: totals[2]!,
    total_bookings: totals[3]!,
    new_clinics_in_period: totals[4]!,
    new_patients_in_period: totals[5]!,
    new_bookings_in_period: totals[6]!,
    buckets: buckets as ActivityReportBucket[],
  };
}

export function activityReportLabel(locale: Locale, granularity: ActivityReportGranularity) {
  const labels = locale === "ar"
    ? { hourly: "بالساعة", daily: "يومي", weekly: "أسبوعي", monthly: "شهري" }
    : { hourly: "Hourly", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
  return labels[granularity];
}

export function getActivityReportCopy(locale: Locale) {
  return locale === "ar"
    ? {
        titlePlatform: "كشف النشاط التشغيلي الشامل",
        titleClinic: "كشف نشاط العيادة",
        introPlatform: "مؤشرات تسجيل العيادات والمرضى والحجوزات من المصدر التشغيلي، مجمّعة بتوقيت قطر ومن دون أي بيانات تعريفية للمرضى.",
        introClinic: "مؤشرات المرضى والحجوزات الخاصة بهذه العيادة فقط، مجمّعة بتوقيت قطر ومن دون بيانات تعريفية للمرضى.",
        scope: "النطاق", period: "الفترة", aggregation: "التجميع", timezone: "المنطقة الزمنية", generatedAt: "وقت الإعداد",
        clinics: "العيادات", activeClinics: "عيادات مفعلة", patients: "المرضى", bookings: "إجمالي الحجوزات",
        newClinics: "عيادات مسجلة", newPatients: "مرضى جدد", newBookings: "حجوزات جديدة", confirmedBookings: "حجوزات مؤكدة", attendedBookings: "حضور مسجل", completedBookings: "زيارات مكتملة", closedWithoutCompletion: "إغلاق دون إكمال",
        activityTable: "تفصيل النشاط", timeBucket: "الفترة الزمنية", print: "طباعة الكشف", exportCsv: "تصدير CSV", refresh: "تحديث الكشف", reportUnavailable: "تعذر تحميل كشف النشاط الآن. لم تُستبدل المشكلة التقنية بأرقام صفرية.",
        noActivity: "لا توجد أحداث مسجلة ضمن الفترة المختارة.", qatarTime: "توقيت قطر", platformScope: "كل العيادات", clinicScope: "هذه العيادة فقط", dateRangeTooLarge: "قلّص الفترة المختارة لهذا التجميع.",
      }
    : {
        titlePlatform: "Platform activity report",
        titleClinic: "Clinic activity report",
        introPlatform: "Operational registrations for clinics, patients, and bookings, aggregated in Qatar time and without patient-identifying data.",
        introClinic: "Patient and booking activity for this clinic only, aggregated in Qatar time and without patient-identifying data.",
        scope: "Scope", period: "Period", aggregation: "Aggregation", timezone: "Time zone", generatedAt: "Generated", 
        clinics: "Clinics", activeClinics: "Active clinics", patients: "Patients", bookings: "Total bookings",
        newClinics: "New clinics", newPatients: "New patients", newBookings: "New bookings", confirmedBookings: "Confirmed bookings", attendedBookings: "Attendance recorded", completedBookings: "Completed visits", closedWithoutCompletion: "Closed without completion",
        activityTable: "Activity detail", timeBucket: "Time bucket", print: "Print report", exportCsv: "Export CSV", refresh: "Refresh report", reportUnavailable: "The activity report could not load. A technical failure is not converted into zeroes.",
        noActivity: "No activity was recorded in the selected period.", qatarTime: "Qatar time", platformScope: "All clinics", clinicScope: "This clinic only", dateRangeTooLarge: "Reduce the selected range for this aggregation.",
      };
}
