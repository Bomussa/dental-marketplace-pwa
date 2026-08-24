import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`relative overflow-hidden rounded-[22px] border border-[#dbe7ef] bg-white/95 shadow-[0_18px_46px_-36px_rgba(8,44,89,.42)] ring-1 ring-white/80 ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex min-h-12 items-center justify-center rounded-[14px] bg-[#0b5f9a] px-5 py-3 text-[.96rem] font-extrabold tracking-[-.012em] text-white shadow-[0_12px_24px_-16px_rgba(4,65,123,.72)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#094e80] hover:shadow-[0_16px_28px_-17px_rgba(4,65,123,.72)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1687c5]/25 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none motion-reduce:transition-none ${className}`} {...props} />;
}

const fieldClassName = "h-12 w-full rounded-[14px] border border-[#cfdde7] bg-white px-4 text-[.96rem] font-semibold leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-[#9fc0d2] focus:border-[#1687c5] focus:bg-white focus:ring-4 focus:ring-[#1687c5]/14";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClassName} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClassName} ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-sky-200 bg-sky-50 text-[#07528d]",
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[.75rem] font-extrabold tracking-[-.006em] ${map[tone]}`}>{children}</span>;
}
