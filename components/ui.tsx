import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`group relative overflow-hidden rounded-[26px] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,.97),rgba(242,250,252,.86))] shadow-[0_24px_70px_-48px_rgba(3,38,84,.58)] ring-1 ring-[#0a4d8b]/[.055] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`group relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(115deg,#084da7,#1269d3_52%,#0b9d99)] px-5 py-2.5 text-[.94rem] font-bold tracking-[-.012em] text-white shadow-[0_16px_30px_-14px_rgba(6,72,166,.74)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_38px_-14px_rgba(4,91,178,.68)] active:translate-y-0 active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.22)_48%,transparent_70%)] before:translate-x-[-125%] before:transition-transform before:duration-700 hover:before:translate-x-[125%] ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-12 w-full rounded-xl border border-[#0b5891]/15 bg-white/88 px-4 text-[.94rem] font-medium leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.92)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-[#128bb8]/40 hover:bg-white focus:border-[#1687c5] focus:bg-white focus:ring-4 focus:ring-[#1687c5]/12 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-12 w-full rounded-xl border border-[#0b5891]/15 bg-white/88 px-4 text-[.94rem] font-medium leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.92)] outline-none transition duration-200 hover:border-[#128bb8]/40 hover:bg-white focus:border-[#1687c5] focus:bg-white focus:ring-4 focus:ring-[#1687c5]/12 ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100/90 text-slate-700 ring-slate-200/80",
    green: "bg-emerald-50/95 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50/95 text-amber-900 ring-amber-100",
    red: "bg-rose-50/95 text-rose-800 ring-rose-100",
    blue: "bg-[#e5f1ff] text-[#0a4c9a] ring-[#bddcff]",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[.72rem] font-bold tracking-[-.005em] shadow-[inset_0_1px_0_rgba(255,255,255,.85)] ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}
