import { Card, Input, Button } from "@/components/ui";
import { sendMagicLink } from "./actions";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const scalar = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const next = scalar(params.next) || "/account";
  const sent = scalar(params.sent) === "1";
  const error = scalar(params.error);
  return <main className="mx-auto max-w-lg px-4 py-16"><Card className="p-7 sm:p-9"><p className="text-xs font-black text-teal-700">دخول آمن</p><h1 className="mt-2 text-3xl font-black">أرسل رابط الدخول إلى بريدك</h1><p className="mt-3 text-sm leading-6 text-slate-500">لا نخزن كلمة مرور داخل التطبيق. بعد التحقق ستعود للحساب أو صفحة الحجز.</p>{sent && <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">تم إرسال الرابط. افتح بريدك وأكمل التحقق.</div>}{error && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">تعذر إرسال رابط الدخول. تحقق من البريد وحاول مرة أخرى.</div>}<form action={sendMagicLink} className="mt-6 grid gap-4"><input type="hidden" name="next" value={next}/><label className="grid gap-2 text-sm font-bold">البريد الإلكتروني<Input name="email" type="email" autoComplete="email" required placeholder="name@example.com" dir="ltr"/></label><Button type="submit" className="bg-teal-600 hover:bg-teal-700">إرسال رابط الدخول</Button></form></Card></main>;
}
