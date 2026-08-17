import { Card, Input, Button } from "@/components/ui";
import { ShieldCheckIcon } from "@/components/icons";
import { sendMagicLink } from "./actions";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const scalar = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const next = scalar(params.next) || "/account";
  const sent = scalar(params.sent) === "1";
  const error = scalar(params.error);
  return <main className="mx-auto max-w-lg px-4 py-16 sm:py-24"><Card className="p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0B5CAD]"><ShieldCheckIcon size={23}/></span><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#084884]">دخول آمن بدون كلمة مرور</p><h1 className="mt-2 text-3xl font-black tracking-tight">أرسل رابط الدخول إلى بريدك</h1><p className="mt-3 text-sm font-medium leading-7 text-slate-500">نستخدم رابط تحقق لمرة واحدة. بعد فتحه ستعود مباشرة إلى الصفحة التي كنت تريدها.</p>{sent && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-extrabold text-emerald-800">تم إرسال الرابط. افتح بريدك وأكمل التحقق.</div>}{error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-extrabold text-red-800">تعذر إرسال رابط الدخول. تحقق من البريد وحاول مرة أخرى.</div>}<form action={sendMagicLink} className="mt-6 grid gap-4"><input type="hidden" name="next" value={next}/><label className="grid gap-2 text-sm font-extrabold text-slate-800">البريد الإلكتروني<Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr"/></label><Button type="submit">إرسال رابط الدخول</Button></form><p className="mt-5 text-center text-[11px] font-medium leading-5 text-slate-400">لن نطلب كلمة مرور داخل التطبيق ولن نطلب بيانات طبية لتسجيل الدخول.</p></Card></main>;
}
