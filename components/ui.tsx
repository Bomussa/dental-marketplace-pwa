import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[28px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_24px_70px_-44px_rgba(15,23,42,.48)] backdrop-blur-xl ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-14px_rgba(var(--primary-rgb),.9)] transition hover:bg-[var(--primary-strong)] active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-12 w-full rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-sm font-semibold text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--primary)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--control-ring)] ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-12 w-full rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-sm font-semibold text-[var(--ink)] outline-none transition hover:border-[var(--primary)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--control-ring)] ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100/90 text-slate-700 ring-slate-200/70",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    blue: "bg-[var(--primary-soft)] text-[var(--primary-strong)] ring-[var(--primary-soft)]",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}
