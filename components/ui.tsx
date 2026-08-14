import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[28px] border border-slate-200/70 bg-white/90 shadow-[0_24px_70px_-44px_rgba(15,23,42,.48)] backdrop-blur-xl ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-14px_rgba(0,122,255,.9)] transition hover:bg-[#0066CC] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-12 w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10 ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100/90 text-slate-700 ring-slate-200/70",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    blue: "bg-blue-50 text-[#0066CC] ring-blue-100",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}
