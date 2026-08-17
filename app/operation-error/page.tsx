import Link from "next/link";
import { AlertCircleIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import type { OperationArea, OperationFailureCode } from "@/lib/operation-feedback";

const messages: Record<OperationFailureCode, { title: string; body: string }> = {
  invalid: {
    title: "راجع البيانات المدخلة",
    body: "لم يتم حفظ التغيير لأن بعض البيانات غير صالحة. ارجع وعدّل الحقول ثم حاول مرة أخرى.",
  },
  forbidden: {
    title: "هذه العملية غير مسموحة",
    body: "لم يتم تنفيذ التغيير لأن حسابك لا يملك الصلاحية المطلوبة لهذا السجل.",
  },
  conflict: {
    title: "تعارض مع الحالة الحالية",
    body: "تعذر تنفيذ التغيير بسبب تعارض مع الحالة الحالية. ارجع وحدّث الصفحة قبل إعادة المحاولة.",
  },
  unavailable: {
    title: "تعذر تأكيد اكتمال العملية",
    body: "حدث عطل أثناء تنفيذ الطلب. ارجع وحدّث الصفحة للتحقق من الحالة الفعلية قبل إعادة المحاولة.",
  },
};

function safeArea(value: string | string[] | undefined): OperationArea {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "admin" ? "admin" : "clinic";
}

function safeCode(value: string | string[] | undefined): OperationFailureCode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "invalid" || raw === "forbidden" || raw === "conflict" ? raw : "unavailable";
}

export default async function OperationErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string | string[]; code?: string | string[] }>;
}) {
  const query = await searchParams;
  const area = safeArea(query.area);
  const code = safeCode(query.code);
  const message = messages[code];
  const backHref = area === "admin" ? "/admin" : "/clinic";
  const backLabel = area === "admin" ? "العودة إلى لوحة الإدارة" : "العودة إلى لوحة العيادة";

  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
      <Card className="p-7 text-center sm:p-9">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <AlertCircleIcon size={27} />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-red-600">لم تكتمل العملية كما هو متوقع</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{message.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-slate-500">{message.body}</p>
        <Link
          href={backHref}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0B5CAD] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_-14px_rgba(0,122,255,.9)] transition hover:bg-[#084884]"
        >
          {backLabel}
        </Link>
      </Card>
    </main>
  );
}
