import { NextResponse } from "next/server";
import { parseActivityReport } from "@/lib/activity-report";
import { platformActivityReport, platformAdminClient } from "@/lib/operations.server";
import { activityReportSchema } from "@/lib/validation";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const supabase = await platformAdminClient();
  if (!supabase) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(request.url);
  const parsed = activityReportSchema.safeParse({
    period_start: url.searchParams.get("start"),
    period_end: url.searchParams.get("end"),
    granularity: url.searchParams.get("granularity") ?? "daily",
  });
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

  try {
    const report = parseActivityReport(await platformActivityReport({
      periodStart: parsed.data.period_start,
      periodEnd: parsed.data.period_end,
      granularity: parsed.data.granularity,
    }));
    if (!report) throw new Error("REPORT_SHAPE_INVALID");

    const rows = [
      ["بداية الفترة", "نهاية الفترة", "التجميع", "توقيت", "بداية الشريحة", "عيادات مسجلة", "مرضى جدد", "حجوزات جديدة", "حجوزات مؤكدة", "حضور مسجل", "زيارات مكتملة", "إغلاق دون إكمال"],
      ...report.buckets.map((bucket) => [
        report.period_start,
        report.period_end,
        report.granularity,
        report.timezone,
        bucket.bucket_start,
        bucket.new_clinics,
        bucket.new_patients,
        bucket.new_bookings,
        bucket.confirmed_bookings,
        bucket.attended_bookings,
        bucket.completed_bookings,
        bucket.closed_without_completion,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    const filename = `asnani-activity-report-${parsed.data.granularity}-${parsed.data.period_start}-${parsed.data.period_end}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (reportError) {
    console.error("Activity report CSV export failed", { code: reportError instanceof Error ? reportError.message : "UNKNOWN" });
    return NextResponse.json({ error: "REPORT_UNAVAILABLE" }, { status: 503 });
  }
}
