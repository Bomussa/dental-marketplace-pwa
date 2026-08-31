import Link from "next/link";
import { cookies } from "next/headers";
import { Card, Input, Button, Select } from "@/components/ui";
import { ShieldCheckIcon, UserIcon } from "@/components/icons";
import { getDictionary, getLocale } from "@/lib/i18n";
import { accountNationality, accountNationalityOptions } from "@/lib/account-copy";
import { loginWithPassword, registerPatient } from "./actions";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
const scalar = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
type RegistrationError = "invalid" | "username_taken" | "email_taken" | "patient_data_taken" | "unavailable";

const registrationCopy = {
  ar: {
    title: "إنشاء حساب مريض جديد",
    copy: "أنشئ حسابك للوصول إلى شاشة المريض، وحفظ ملفات العائلة، وإدارة طلبات الحجز. لا يؤدي إنشاء الحساب إلى حجز موعد، ويستلزم الحجز لاحقًا تحقق الهاتف.",
    open: "ليس لديك حساب؟ أنشئ حساب مريض",
    fullName: "الاسم الكامل",
    nationalId: "الرقم الشخصي القطري",
    nationality: "الجنسية",
    birthDate: "تاريخ الميلاد (اختياري)",
    phone: "رقم الهاتف",
    gender: "الجنس (اختياري)",
    username: "اسم الدخول المختصر (Nickname)",
    email: "البريد الإلكتروني",
    password: "كلمة المرور (4–10 أحرف أو أرقام)",
    choose: "اختر الجنسية",
    noGender: "أفضل عدم الإفصاح",
    female: "أنثى",
    male: "ذكر",
    other: "آخر",
    submit: "إنشاء حساب المريض",
    privacy: "لا تشارك كلمة مرورك أو رمز التحقق. تُستخدم هذه البيانات لإدارة ملف المريض وطلبات الحجز وفق الصلاحيات المصرح بها.",
    policyPrefix: "قبل إنشاء الحساب، راجع إطار",
    privacyLink: "الخصوصية",
    policyJoiner: "و",
    termsLink: "الشروط",
    policySuffix: "المعروضين للاعتماد.",
    errors: {
      invalid: "تحقق من الحقول المطلوبة: الاسم والرقم الشخصي والهاتف والجنسية وبيانات الدخول يجب أن تكون صالحة.",
      username_taken: "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.",
      email_taken: "البريد الإلكتروني مستخدم بالفعل. سجّل الدخول أو استخدم بريدًا آخر.",
      patient_data_taken: "لا يمكن استخدام الرقم الشخصي أو رقم الهاتف في حساب جديد. إذا كان هذا حسابك، سجّل الدخول بدلًا من إنشاء حساب آخر.",
      unavailable: "تعذر إنشاء الحساب الآن. لم يُنشأ حساب غير مكتمل؛ حاول لاحقًا.",
    },
  },
  en: {
    title: "Create a new patient account",
    copy: "Create an account to access the patient screen, save family profiles, and manage booking requests. Creating an account does not book an appointment; phone verification is still required before booking.",
    open: "New here? Create a patient account",
    fullName: "Full name",
    nationalId: "Qatar ID number",
    nationality: "Nationality",
    birthDate: "Date of birth (optional)",
    phone: "Phone number",
    gender: "Gender (optional)",
    username: "Short login name (nickname)",
    email: "Email address",
    password: "Password (4–10 letters or numbers)",
    choose: "Choose nationality",
    noGender: "Prefer not to say",
    female: "Female",
    male: "Male",
    other: "Other",
    submit: "Create patient account",
    privacy: "Never share your password or verification code. These details are used to manage the patient profile and booking requests within authorized access.",
    policyPrefix: "Before creating an account, review the approval-required",
    privacyLink: "privacy",
    policyJoiner: "and",
    termsLink: "terms",
    policySuffix: "frameworks.",
    errors: {
      invalid: "Check the required fields: name, QID, phone, nationality, and sign-in details must be valid.",
      username_taken: "That username is already in use. Choose another one.",
      email_taken: "That email is already in use. Sign in or use another email.",
      patient_data_taken: "This national ID or phone number cannot be used for a new account. If this is your account, sign in instead of creating another one.",
      unavailable: "The account could not be created right now. No incomplete account was created; please try again later.",
    },
  },
} as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const locale = getLocale(cookieStore.get("asnani_locale")?.value);
  const t = getDictionary(locale);
  const copy = registrationCopy[locale];
  const next = scalar(params.next) || "/account";
  const error = scalar(params.error);
  const registrationError = scalar(params.register_error) as RegistrationError | undefined;

  return (
    <main className="auth-stage relative mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="auth-stage__halo pointer-events-none absolute start-1/2 -translate-x-1/2" />
      <Card className="auth-card relative p-7 sm:p-9">
        <div className="auth-card__icon"><ShieldCheckIcon size={25} /></div>
        <div className="mt-7 max-w-md">
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#087d90]">{t["login.kicker"]}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.04em] text-[#092b56]">{t["login.title"]}</h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">{t["login.copy"]}</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{t["login.error"]}</div>}
        <form action={loginWithPassword} className="mt-7 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-extrabold text-slate-800">{t["login.username"]}<Input name="username" autoComplete="username" required minLength={2} maxLength={10} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,9}" dir="ltr" /></label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-800">{t["login.password"]}<Input name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={128} dir="ltr" /></label>
          <Link href="/auth/forgot-password" className="-mt-2 text-end text-xs font-extrabold text-[#0B5CAD] underline-offset-4 hover:underline">
            {locale === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
          </Link>
          <Button type="submit" className="mt-1">{t["login.submit"]}</Button>
        </form>

        <details className="mt-7 border-t border-slate-100 pt-6">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-base font-black text-[#0a426f] marker:content-none"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#0B5CAD]"><UserIcon size={18} /></span>{copy.open}</summary>
          <div className="mt-5 rounded-[24px] border border-[#0a5e92]/10 bg-slate-50/70 p-4 sm:p-5">
            <h2 className="text-xl font-black tracking-[-.025em] text-[#092b56]">{copy.title}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{copy.copy}</p>
            {registrationError && <div className="auth-alert auth-alert--error mt-4">{copy.errors[registrationError] ?? copy.errors.unavailable}</div>}
            <form action={registerPatient} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-extrabold text-slate-800 sm:col-span-2">{copy.fullName}<Input name="display_name" required maxLength={120} autoComplete="name" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.nationalId}<Input name="national_id" required inputMode="numeric" pattern="[0-9٠-٩۰-۹ -]{11,20}" autoComplete="off" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.nationality}<Select name="nationality" required defaultValue=""> <option value="">{copy.choose}</option>{accountNationalityOptions.map((country) => <option key={country} value={country}>{accountNationality(locale, country)}</option>)}</Select></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.birthDate}<Input name="date_of_birth" type="date" autoComplete="bday" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.phone}<Input name="phone" type="tel" required placeholder="+974XXXXXXXX" dir="ltr" autoComplete="tel" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800 sm:col-span-2">{copy.gender}<Select name="gender" defaultValue=""><option value="">{copy.noGender}</option><option value="female">{copy.female}</option><option value="male">{copy.male}</option><option value="other">{copy.other}</option><option value="prefer_not_to_say">{copy.noGender}</option></Select></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.username}<Input name="username" required minLength={2} maxLength={10} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,9}" title={locale === "ar" ? "2 إلى 10 أحرف أو أرقام إنجليزية، ويمكن استخدام . أو _ أو -" : "Use 2 to 10 English letters or numbers; . _ and - are allowed"} autoComplete="username" dir="ltr" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800">{copy.email}<Input name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" /></label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-800 sm:col-span-2">{copy.password}<Input name="password" type="password" required minLength={4} maxLength={10} pattern="[A-Za-z0-9]{4,10}" title={locale === "ar" ? "4 إلى 10 أحرف أو أرقام إنجليزية فقط" : "Use 4 to 10 English letters or numbers only"} autoComplete="new-password" dir="ltr" /></label>
              <div className="sm:col-span-2"><Button type="submit">{copy.submit}</Button><p className="mt-3 text-xs font-bold leading-5 text-slate-500">{copy.privacy} {locale === "ar" ? "تاريخ الميلاد والجنس اختياريان الآن؛ يُطلب تاريخ الميلاد فقط قبل تأكيد الحجز." : "Date of birth and gender are optional now; date of birth is required only before confirming a booking."}</p><p className="mt-2 text-xs font-bold leading-5 text-slate-500">{copy.policyPrefix} <Link href="/privacy" className="text-[#0B5CAD] underline-offset-4 hover:underline">{copy.privacyLink}</Link> {copy.policyJoiner} <Link href="/terms" className="text-[#0B5CAD] underline-offset-4 hover:underline">{copy.termsLink}</Link> {copy.policySuffix}</p></div>
            </form>
          </div>
        </details>
        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-[11px] font-medium leading-5 text-slate-400">{t["login.privacy"]}</p>
      </Card>
    </main>
  );
}
