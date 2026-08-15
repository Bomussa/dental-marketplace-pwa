"use client";

export function PrintReportButton({ label = "طباعة التقرير" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 print:hidden"
    >
      {label}
    </button>
  );
}
