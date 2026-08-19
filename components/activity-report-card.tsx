import { PrintReportButton } from "@/components/print-report-button";
import { Card } from "@/components/ui";
import { activityReportLabel, getActivityReportCopy, type ActivityReport } from "@/lib/activity-report";
import type { Locale } from "@/lib/i18n";

function qatarFormat(value: string, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-QA" : "en-QA", { timeZone: "Asia/Qatar", ...options }).format(new Date(value));
}

function bucketLabel(value: string, locale: Locale, granularity: ActivityReport["granularity"]) {
  if (granularity === "hourly") return qatarFormat(value, locale, { dateStyle: "medium", timeStyle: "short" });
  if (granularity === "monthly") return qatarFormat(value, locale, { year: "numeric", month: "long" });
  if (granularity === "weekly") return qatarFormat(value, locale, { dateStyle: "medium" });
  return qatarFormat(value, locale, { dateStyle: "medium" });
}

export function ActivityReportCard({
  report,
  locale,
  targetId,
  exportHref,
}: {
  report: ActivityReport | null;
  locale: Locale;
  targetId: string;
  exportHref?: string;
}) {
  const copy = getActivityReportCopy(locale);

  if (!report) {
    return <Card id={targetId} className="mt-6 border border-amber-200 bg-amber-50/80 p-5 text-amber-900 sm:p-6"><div className="font-black">{copy.reportUnavailable}</div></Card>;
  }

  const hasActivity = report.buckets.some((bucket) => bucket.new_clinics + bucket.new_patients + bucket.new_bookings > 0);
  const cards = report.scope === "platform"
    ? [
        [report.total_clinics, copy.clinics, "text-[#092b56]", "bg-blue-50"],
        [report.active_clinics, copy.activeClinics, "text-emerald-700", "bg-emerald-50"],
        [report.total_patients, copy.patients, "text-[#084884]", "bg-cyan-50"],
        [report.total_bookings, copy.bookings, "text-violet-700", "bg-violet-50"],
      ]
    : [
        [report.total_patients, copy.patients, "text-[#084884]", "bg-cyan-50"],
        [report.total_bookings, copy.bookings, "text-violet-700", "bg-violet-50"],
        [report.new_patients_in_period, copy.newPatients, "text-emerald-700", "bg-emerald-50"],
        [report.new_bookings_in_period, copy.newBookings, "text-[#092b56]", "bg-blue-50"],
      ];

  return (
    <section id={targetId} data-print-report-section className="mt-7 print:mt-0">
      <Card className="overflow-hidden p-5 sm:p-6 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#087d90]">{copy.qatarTime} · {activityReportLabel(locale, report.granularity)}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#092b56]">{report.scope === "platform" ? copy.titlePlatform : copy.titleClinic}</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{report.scope === "platform" ? copy.introPlatform : copy.introClinic}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <PrintReportButton label={copy.print} targetId={targetId} />
            {exportHref ? <a href={exportHref} className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 transition hover:bg-slate-50">{copy.exportCsv}</a> : null}
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-3 py-2"><dt>{copy.scope}</dt><dd className="mt-1 text-sm font-black text-slate-900">{report.scope === "platform" ? copy.platformScope : copy.clinicScope}</dd></div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2"><dt>{copy.period}</dt><dd className="mt-1 text-sm font-black text-slate-900" dir="ltr">{report.period_start} — {report.period_end}</dd></div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2"><dt>{copy.aggregation}</dt><dd className="mt-1 text-sm font-black text-slate-900">{activityReportLabel(locale, report.granularity)}</dd></div>
          <div className="rounded-2xl bg-slate-50 px-3 py-2"><dt>{copy.generatedAt}</dt><dd className="mt-1 text-sm font-black text-slate-900">{qatarFormat(report.generated_at, locale, { dateStyle: "short", timeStyle: "short" })}</dd></div>
        </dl>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
          {cards.map(([value, label, tone, background]) => <div key={String(label)} className={`rounded-2xl ${background} p-4 ring-1 ring-slate-900/[.04]`}><div className={`text-3xl font-black ${tone}`}>{value}</div><div className="mt-1 text-xs font-bold text-slate-600">{label}</div></div>)}
        </div>

        <div className="mt-6 overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] border-collapse text-right text-xs">
            <caption className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm font-black text-[#092b56]">{copy.activityTable}</caption>
            <thead className="bg-slate-50 text-slate-600"><tr>
              <th className="px-4 py-3 font-black">{copy.timeBucket}</th>
              {report.scope === "platform" ? <th className="px-4 py-3 font-black">{copy.newClinics}</th> : null}
              <th className="px-4 py-3 font-black">{copy.newPatients}</th>
              <th className="px-4 py-3 font-black">{copy.newBookings}</th>
              <th className="px-4 py-3 font-black">{copy.confirmedBookings}</th>
              <th className="px-4 py-3 font-black">{copy.attendedBookings}</th>
              <th className="px-4 py-3 font-black">{copy.completedBookings}</th>
              <th className="px-4 py-3 font-black">{copy.closedWithoutCompletion}</th>
            </tr></thead>
            <tbody>
              {report.buckets.map((bucket) => <tr key={bucket.bucket_start} className="border-t border-slate-100 even:bg-slate-50/70"><td className="px-4 py-3 font-bold text-slate-800">{bucketLabel(bucket.bucket_start, locale, report.granularity)}</td>{report.scope === "platform" ? <td className="px-4 py-3 font-black">{bucket.new_clinics}</td> : null}<td className="px-4 py-3 font-black">{bucket.new_patients}</td><td className="px-4 py-3 font-black text-[#084884]">{bucket.new_bookings}</td><td className="px-4 py-3 font-black">{bucket.confirmed_bookings}</td><td className="px-4 py-3 font-black text-emerald-700">{bucket.attended_bookings}</td><td className="px-4 py-3 font-black text-emerald-700">{bucket.completed_bookings}</td><td className="px-4 py-3 font-black text-slate-600">{bucket.closed_without_completion}</td></tr>)}
            </tbody>
          </table>
        </div>
        {!hasActivity ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">{copy.noActivity}</p> : null}
      </Card>
    </section>
  );
}
