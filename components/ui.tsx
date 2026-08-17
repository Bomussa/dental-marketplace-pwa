import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[26px] border border-slate-200/80 bg-white/95 shadow-[0_22px_66px_-44px_rgba(16,42,67,.46)] backdrop-blur-xl ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#0B5CAD] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_12px_26px_-14px_rgba(11,92,173,.72)] transition hover:bg-[#084884] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0B5CAD] focus:ring-4 focus:ring-[#0B5CAD]/10 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-[#0B5CAD] focus:ring-4 focus:ring-[#0B5CAD]/10 ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100/90 text-slate-700 ring-slate-200/80",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50 text-amber-900 ring-amber-100",
    red: "bg-red-50 text-red-800 ring-red-100",
    blue: "bg-[#E7F1FB] text-[#084884] ring-[#CDE2F5]",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}
