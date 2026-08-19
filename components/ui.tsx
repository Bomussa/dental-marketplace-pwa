import type { HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`group relative overflow-hidden rounded-[28px] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,.985),rgba(238,249,252,.9))] shadow-[0_26px_76px_-50px_rgba(3,38,84,.60)] ring-1 ring-[#0a4d8b]/[.06] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`group relative inline-flex min-h-[3.15rem] items-center justify-center overflow-hidden rounded-[1.05rem] bg-[linear-gradient(115deg,#063f91,#126bd7_52%,#079d99)] px-6 py-3 text-[1rem] font-extrabold tracking-[-.018em] text-white shadow-[0_18px_36px_-15px_rgba(6,72,166,.78)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-14px_rgba(4,91,178,.72)] active:translate-y-0 active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,.24)_48%,transparent_70%)] before:translate-x-[-125%] before:transition-transform before:duration-700 hover:before:translate-x-[125%] ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-[3.15rem] w-full rounded-[.95rem] border border-[#0b5891]/16 bg-white/92 px-4 text-[1rem] font-semibold leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.92)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-[#128bb8]/45 hover:bg-white focus:border-[#1687c5] focus:bg-white focus:ring-4 focus:ring-[#1687c5]/12 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-[3.15rem] w-full rounded-[.95rem] border border-[#0b5891]/16 bg-white/92 px-4 text-[1rem] font-semibold leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.92)] outline-none transition duration-200 hover:border-[#128bb8]/45 hover:bg-white focus:border-[#1687c5] focus:bg-white focus:ring-4 focus:ring-[#1687c5]/12 ${className}`} {...props} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const map = {
    slate: "bg-slate-100/90 text-slate-700 ring-slate-200/80",
    green: "bg-emerald-50/95 text-emerald-800 ring-emerald-100",
    amber: "bg-amber-50/95 text-amber-900 ring-amber-100",
    red: "bg-rose-50/95 text-rose-800 ring-rose-100",
    blue: "bg-[#e5f1ff] text-[#0a4c9a] ring-[#bddcff]",
  };
  return <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[.78rem] font-extrabold tracking-[-.008em] shadow-[inset_0_1px_0_rgba(255,255,255,.88)] ring-1 ring-inset ${map[tone]}`}>{children}</span>;
}
