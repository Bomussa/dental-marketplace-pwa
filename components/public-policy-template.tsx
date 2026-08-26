type PolicyKind = "privacy" | "terms";
type Locale = "ar" | "en";

const policyCopy: Record<Locale, Record<PolicyKind, { kicker: string; title: string; intro: string; sections: string[]; noticeTitle: string; notice: string }>> = {
  ar: {
    privacy: {
      kicker: "إطار محتوى قيد الاعتماد",
      title: "الخصوصية وحماية البيانات",
      intro: "هذه الصفحة هي المسار الرسمي المخصص لسياسة الخصوصية في المنصة. لا تصبح أي صياغة قانونية نافذة قبل اعتمادها من مالك الخدمة أو المستشار المختص.",
      sections: ["بيانات الحساب وملف المريض", "بيانات الهاتف والتحقق", "بيانات الحجز ومشاركتها اللازمة لتنفيذ الخدمة", "الاحتفاظ والحذف وحقوق المستخدم", "قنوات التواصل والشكاوى"],
      noticeTitle: "المحتوى القانوني يحتاج اعتماداً",
      notice: "سيُنشر النص القانوني النهائي هنا بعد اعتماده. لا تعتمد هذه الصفحة حالياً كبيان للحقوق أو الالتزامات أو مدة الاحتفاظ بالبيانات.",
    },
    terms: {
      kicker: "إطار محتوى قيد الاعتماد",
      title: "شروط استخدام المنصة",
      intro: "هذه الصفحة هي المسار الرسمي المخصص لشروط استخدام المنصة. لا تصبح أي صياغة قانونية نافذة قبل اعتمادها من مالك الخدمة أو المستشار المختص.",
      sections: ["نطاق خدمة المقارنة والحجز", "حدود المعلومات الصحية وعدم تقديم التشخيص", "العروض والأسعار والتوفر", "الحجوزات والإلغاء والمسؤوليات", "آلية التواصل وحل الشكاوى"],
      noticeTitle: "المحتوى القانوني يحتاج اعتماداً",
      notice: "سيُنشر النص القانوني النهائي هنا بعد اعتماده. لا تعتمد هذه الصفحة حالياً كشرط ملزم أو ضمان لخدمة أو سعر أو موعد.",
    },
  },
  en: {
    privacy: {
      kicker: "Approval-required content framework",
      title: "Privacy and data protection",
      intro: "This is the official route reserved for the platform privacy policy. No legal wording becomes effective until it is approved by the service owner or qualified adviser.",
      sections: ["Account and patient-profile data", "Phone and verification data", "Booking data and necessary sharing to deliver the service", "Retention, deletion, and user rights", "Contact and complaint channels"],
      noticeTitle: "Legal content requires approval",
      notice: "The final legal text will be published here after approval. This page must not currently be relied on as a statement of rights, obligations, or data-retention periods.",
    },
    terms: {
      kicker: "Approval-required content framework",
      title: "Platform terms of use",
      intro: "This is the official route reserved for the platform terms of use. No legal wording becomes effective until it is approved by the service owner or qualified adviser.",
      sections: ["Scope of the comparison and booking service", "Health-information limitations and no diagnosis", "Offers, pricing, and availability", "Bookings, cancellations, and responsibilities", "Contact and complaint process"],
      noticeTitle: "Legal content requires approval",
      notice: "The final legal text will be published here after approval. This page must not currently be relied on as a binding term or a guarantee of any service, price, or appointment.",
    },
  },
};

export function PublicPolicyTemplate({ locale, kind }: { locale: Locale; kind: PolicyKind }) {
  const copy = policyCopy[locale][kind];
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <section className="rounded-[28px] border border-[#0a5e92]/10 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
        <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#087d90]">{copy.kicker}</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#092b56] sm:text-4xl">{copy.title}</h1>
        <p className="mt-5 text-sm font-medium leading-7 text-slate-600 sm:text-base">{copy.intro}</p>
        <ul className="mt-7 grid gap-3 border-y border-slate-100 py-6 text-sm font-bold leading-6 text-slate-700">
          {copy.sections.map((section) => <li key={section} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B5CAD]" />{section}</li>)}
        </ul>
        <aside className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" role="note">
          <h2 className="text-sm font-black">{copy.noticeTitle}</h2>
          <p className="mt-2 text-sm font-medium leading-6">{copy.notice}</p>
        </aside>
      </section>
    </main>
  );
}
