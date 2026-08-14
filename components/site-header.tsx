import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const appMeta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const isAdmin = appMeta.platform_admin === true;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 font-black tracking-tight text-slate-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white">س</span>
          <span>أسناني قطر</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Link href="/clinic" className="rounded-lg px-3 py-2 hover:bg-slate-100">للعيادات</Link>
          {isAdmin && <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-slate-100">الإدارة</Link>}
          {signedIn ? (
            <Link href="/account" className="rounded-lg bg-slate-950 px-4 py-2 text-white">حسابي</Link>
          ) : (
            <Link href="/login" className="rounded-lg bg-slate-950 px-4 py-2 text-white">تسجيل الدخول</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
