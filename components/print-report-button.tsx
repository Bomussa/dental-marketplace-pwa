"use client";

export function PrintReportButton({ label = "طباعة التقرير", targetId }: { label?: string; targetId?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = targetId ? document.getElementById(targetId) : null;
        if (target) document.body.dataset.printReportTarget = targetId;
        window.print();
        if (target) delete document.body.dataset.printReportTarget;
      }}
      className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 print:hidden"
    >
      {label}
    </button>
  );
}
