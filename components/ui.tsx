import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_60px_-32px_rgba(15,23,42,.35)] ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[tone]}`}>{children}</span>;
}
