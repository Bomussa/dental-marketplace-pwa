import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { ShieldCheckIcon } from "@/components/icons";
import { createOperationalClientAccount, createPatientAccount, deletePatientAccountAsAdmin, revokeOperationalClientAccount } from "@/app/admin/actions";

type ClinicOption = { id: string; display_name: string };
type BranchOption = { id: string; clinic_id: string; name: string; area: string | null; status: string };
type PatientAccount = { user_id: string; display_name: string; created_at: string };

type OperationalClient = {
  operator_account_id: string;
  user_id: string;
  username: string;
  clinic_id: string;
  clinic_name: string;
  branch_id: string;
  branch_name: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
};

type SuperAdminUserManagementProps = {
  clinics: ClinicOption[];
  branches: BranchOption[];
  operationalClients: OperationalClient[] | null;
  patientAccounts: PatientAccount[] | null;
};

export function SuperAdminUserManagement({ clinics, branches, operationalClients, patientAccounts }: SuperAdminUserManagementProps) {
  const activeOperationalClients = operationalClients?.filter((client) => !client.revoked_at && client.status === "active") ?? [];

  return (
    <section id="super-admin-user-management" className="mt-7 grid gap-6 lg:grid-cols-2">
      <Card className="border border-violet-200 bg-[linear-gradient(145deg,rgba(248,246,255,.97),rgba(239,249,255,.94))] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-700 text-white"><ShieldCheckIcon size={19} /></span>
          <div><h2 className="font-black text-[#092b56]">إدارة المستخدمين والصلاحيات العليا</h2><p className="mt-1 text-xs leading-5 text-slate-600">هذا القسم متاح للمدير الأعلى فقط. تُنشأ الحسابات بأدوار محددة ولا تُحذف سجلاتها بشكل مباشر.</p></div>
        </div>

        <div className="mt-5 grid gap-5">
          <form action={createOperationalClientAccount} className="rounded-[22px] bg-white/85 p-4 ring-1 ring-violet-100">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-black">إنشاء عميل تشغيلي للحجوزات</h3><p className="mt-1 text-xs leading-5 text-slate-500">صلاحية ثابتة: الحجوزات التابعة لفرع واحد فقط، من دون الوصول للحسابات أو الإدارة.</p></div><Badge tone="blue">Bookings only</Badge></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-600">العيادة<Select name="clinic_id" required defaultValue=""><option value="" disabled>اختر العيادة</option>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.display_name}</option>)}</Select></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">الفرع<Select name="branch_id" required defaultValue=""><option value="" disabled>اختر الفرع</option>{branches.filter((branch) => branch.status === "active").map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.area ? ` · ${branch.area}` : ""}</option>)}</Select></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">اسم المستخدم<Input name="username" required minLength={3} maxLength={32} autoComplete="off" placeholder="operator.name" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">البريد الإلكتروني<Input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="operator@example.com" /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600 sm:col-span-2">كلمة مرور ابتدائية<Input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="12 أحرف على الأقل؛ كبير وصغير ورقم" /></label>
            </div>
            <Button className="mt-4 w-full bg-violet-700 hover:bg-violet-800">إنشاء عميل الحجوزات</Button>
          </form>

          <form action={createPatientAccount} className="rounded-[22px] bg-white/85 p-4 ring-1 ring-sky-100">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-black">إنشاء حساب مريض</h3><p className="mt-1 text-xs leading-5 text-slate-500">يستخدم عقد التسجيل نفسه ولا ينشئ حجزًا تلقائيًا.</p></div><Badge tone="green">Patient</Badge></div>
            <input type="hidden" name="relationship" value="self" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Input name="display_name" required maxLength={120} placeholder="الاسم الكامل" autoComplete="off" />
              <Input name="national_id" required inputMode="numeric" maxLength={20} placeholder="رقم البطاقة / QID" autoComplete="off" />
              <Input name="nationality" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="رمز الجنسية، مثال QA" autoComplete="off" />
              <Input name="date_of_birth" type="date" />
              <Input name="phone" required type="tel" placeholder="+974…" autoComplete="off" />
              <Select name="gender" defaultValue=""><option value="">الجنس (اختياري)</option><option value="female">أنثى</option><option value="male">ذكر</option><option value="other">آخر</option><option value="prefer_not_to_say">أفضل عدم الإفصاح</option></Select>
              <Input name="username" required minLength={2} maxLength={10} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,9}" title="2 إلى 10 أحرف أو أرقام إنجليزية؛ ويسمح بـ . أو _ أو -" autoComplete="off" placeholder="اسم الدخول المختصر (Nickname)" />
              <Input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="البريد الإلكتروني" />
              <Input name="password" type="password" required minLength={4} maxLength={10} pattern="[A-Za-z0-9]{4,10}" title="4 إلى 10 أحرف أو أرقام إنجليزية فقط" autoComplete="new-password" className="sm:col-span-2" placeholder="كلمة المرور: 4–10 أحرف أو أرقام" />
            </div>
            <Button className="mt-4 w-full">إنشاء حساب المريض</Button>
          </form>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-[#092b56]">العملاء التشغيليون الحاليون</h2><p className="mt-1 text-xs leading-5 text-slate-500">الإيقاف يلغي العضوية واسم المستخدم تشغيليًا ويحفظ أثر المراجعة؛ لا يحذف المواعيد أو بيانات المرضى.</p></div><Badge tone="blue">{activeOperationalClients.length} نشط</Badge></div>
        {operationalClients === null ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">تعذر تحميل السجل التشغيلي الآن. لم يتم إجراء أي تغيير.</p> : operationalClients.length === 0 ? <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600">لا توجد حسابات عميل تشغيلي بعد.</p> : <div className="mt-5 space-y-3">{operationalClients.map((client) => <div key={client.operator_account_id} className="rounded-[22px] bg-slate-50/85 p-4 ring-1 ring-slate-200/70"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-[#092b56]">{client.username}</div><div className="mt-1 text-xs font-bold text-slate-500">{client.clinic_name} · {client.branch_name}</div><div className="mt-1 text-xs text-slate-500">أُنشئ: {new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(client.created_at))}</div></div><Badge tone={client.revoked_at || client.status !== "active" ? "slate" : "green"}>{client.revoked_at || client.status !== "active" ? "موقوف" : "نشط"}</Badge></div>{!client.revoked_at && client.status === "active" && <form action={revokeOperationalClientAccount} className="mt-3"><input type="hidden" name="operator_account_id" value={client.operator_account_id} /><Button className="min-h-9 bg-slate-700 px-4 py-1 text-xs hover:bg-slate-800">إيقاف الوصول مع حفظ السجل</Button></form>}</div>)}</div>}
      </Card>

      <Card className="border border-red-200 bg-red-50/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-red-900">حذف حسابات المرضى</h2><p className="mt-1 text-xs leading-5 text-red-800">متاح للمدير الأعلى فقط. يوقف الوصول ويؤرشف الملف؛ لا يعرض هذا القسم الهوية أو الهاتف أو البريد، ولا يكسر سجلات الحجوزات.</p></div><Badge tone="red">Restricted</Badge></div>
        {patientAccounts === null ? <p className="mt-5 rounded-2xl bg-white/85 p-4 text-sm font-bold text-red-800">تعذر تحميل قائمة حسابات المرضى الآن. لم يتم إجراء أي تغيير.</p> : patientAccounts.length === 0 ? <p className="mt-5 rounded-2xl bg-white/85 p-4 text-sm font-bold text-slate-600">لا توجد حسابات مرضى نشطة قابلة للإدارة الآن.</p> : <div className="mt-5 space-y-3">{patientAccounts.map((patient) => <div key={patient.user_id} className="rounded-[22px] bg-white/85 p-4 ring-1 ring-red-100"><div className="font-black text-[#092b56]">{patient.display_name}</div><p className="mt-1 text-xs font-bold text-slate-500">أُنشئ: {new Intl.DateTimeFormat("ar-QA", { dateStyle: "medium", timeZone: "Asia/Qatar" }).format(new Date(patient.created_at))}</p><form action={deletePatientAccountAsAdmin} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input type="hidden" name="target_user_id" value={patient.user_id} /><Input name="confirmation" required pattern="DELETE" dir="ltr" autoComplete="off" placeholder="اكتب DELETE للتأكيد" /><Button className="bg-red-700 hover:bg-red-800">حذف الحساب</Button></form></div>)}</div>}
      </Card>
    </section>
  );
}
