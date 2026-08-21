import { NextResponse } from "next/server";
import { financialReportSummary, withOperationalTimeout } from "@/lib/operations.server";
import { createClient } from "@/lib/supabase/server";
import { financialReportSchema } from "@/lib/validation";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await withOperationalTimeout(supabase.auth.getClaims()).catch(() => ({ data: null, error: new Error("OPERATION_TIMEOUT") }));
  const meta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  if (error || !data?.claims?.sub || meta.platform_admin !== true) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = financialReportSchema.safeParse({
    clinic_id: url.searchParams.get("clinic"),
    period_start: url.searchParams.get("start"),
    period_end: url.searchParams.get("end"),
  });
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });

  try {
    const report = await financialReportSummary({
      clinicId: parsed.data.clinic_id,
      periodStart: parsed.data.period_start,
      periodEnd: parsed.data.period_end,
    }) as Record<string, unknown>;
    const rows = [
      ["clinic_id", "period_start", "period_end", "attended_bookings", "posted_debit_qar", "posted_credit_qar"],
      [
        parsed.data.clinic_id,
        parsed.data.period_start,
        parsed.data.period_end,
        Number(report.attended_bookings ?? 0),
        (Number(report.posted_debit_minor ?? 0) / 100).toFixed(2),
        (Number(report.posted_credit_minor ?? 0) / 100).toFixed(2),
      ],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
    const filename = `asnani-financial-report-${parsed.data.period_start}-${parsed.data.period_end}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (reportError) {
    console.error("Financial report CSV export failed", { code: reportError instanceof Error ? reportError.message : "UNKNOWN" });
    return NextResponse.json({ error: "REPORT_UNAVAILABLE" }, { status: 503 });
  }
}
