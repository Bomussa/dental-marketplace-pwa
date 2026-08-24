import "server-only";

export type PublicSupportLocale = "ar" | "en";

type PublicSupportAnswer = { answer: string; sources: string[] };

type PublicSupportRule = {
  pattern: RegExp;
  ar: PublicSupportAnswer;
  en: PublicSupportAnswer;
};

const rules: PublicSupportRule[] = [
  {
    pattern: /(?:العلاجات|الخدمات|treatments?|services?)/i,
    ar: { answer: "يمكنك اختيار العلاج من قائمة «ما العلاج الذي تبحث عنه؟» في الصفحة الرئيسية، ثم تحديد النوع الدقيق ومقارنة العروض المنشورة. لا نعرض تشخيصًا أو نرشح علاجًا طبيًا؛ اختر الخدمة التي طلبها منك طبيبك أو تواصل مع عيادة مؤهلة للاستفسار الطبي.", sources: ["دليل البحث والمقارنة"] },
    en: { answer: "Choose a treatment from the home-page treatment list, select the precise variant, then compare published offers. We do not diagnose or recommend medical treatment; choose the service requested by your clinician or contact a qualified clinic for medical questions.", sources: ["Search and comparison guide"] },
  },
  {
    pattern: /(?:سعر|الأسعار|تكلفة|رسوم|price|prices|cost|fee)/i,
    ar: { answer: "تظهر الأسعار أو نطاقاتها كما تنشرها العيادات المشاركة ضمن صفحة النتائج. راجع ما يتضمنه العرض وما لا يتضمنه قبل طلب الحجز؛ قد يتطلب بعض العلاجات استشارة لتحديد السعر النهائي.", sources: ["سياسة الأسعار المنشورة"] },
    en: { answer: "Prices or price ranges are shown as published by participating clinics on the results page. Review what is included and excluded before requesting a booking; some treatments require a consultation to determine the final price.", sources: ["Published pricing policy"] },
  },
  {
    pattern: /(?:موعد|حجز|احجز|التوفر|متاح|booking|book|appointment|availability|available)/i,
    ar: { answer: "ابدأ باختيار العلاج والنوع الدقيق، ثم استخدم فلتر الموعد والمسافة لعرض الخيارات. يتطلب إرسال طلب الحجز تسجيل الدخول لأن الطلب يرتبط بملف المريض وبيانات الموعد، أما السؤال العام عن الخطوات فلا يتطلب تسجيلًا.", sources: ["خطوات الحجز"] },
    en: { answer: "Start by choosing the treatment and precise variant, then use the appointment and distance filters to view options. Sending a booking request requires sign-in because it is linked to a patient profile and appointment details; general questions about the process do not require sign-in.", sources: ["Booking steps"] },
  },
  {
    pattern: /(?:إلغاء|الغاء|تعديل الحجز|cancel|change.*booking|reschedule)/i,
    ar: { answer: "بعد تسجيل الدخول، افتح «حجوزاتي» لمراجعة حالة الحجز. يظهر إجراء الإلغاء فقط للحالات التي تسمح بها قواعد الحجز. لا تستطيع المحادثة العامة الوصول إلى حجوزاتك أو تغييرها.", sources: ["إدارة الحجوزات"] },
    en: { answer: "After signing in, open " + "“My bookings” to review booking status. A cancellation option appears only for statuses allowed by the booking rules. Public chat cannot access or change your bookings.", sources: ["Booking management"] },
  },
  {
    pattern: /(?:حساب|تسجيل|كلمة المرور|بياناتي|خصوصية|account|sign.?in|password|my data|privacy)/i,
    ar: { answer: "تسجيل الدخول مطلوب فقط للوصول إلى حسابك أو ملفات المرضى أو الحجوزات. لا ترسل كلمة مرور أو رقمًا شخصيًا أو تفاصيل صحية عبر المحادثة العامة. استخدم صفحة الحساب لإدارة بياناتك المصرح بها.", sources: ["الخصوصية والحساب"] },
    en: { answer: "Sign-in is required only to access your account, patient profiles, or bookings. Do not send a password, national identifier, or health details in public chat. Use the account page to manage the data you are authorized to manage.", sources: ["Privacy and account"] },
  },
  {
    pattern: /(?:عيادة|العيادات|clinic|clinics)/i,
    ar: { answer: "تعرض المنصة العروض والمواعيد المنشورة من العيادات المشاركة فقط. يمكنك الانتقال إلى «للعيادات» إذا كنت ممثلًا لعيادة وتحتاج إلى مساحة التشغيل المصرح بها.", sources: ["معلومات العيادات المشاركة"] },
    en: { answer: "The platform displays published offers and slots from participating clinics only. Use the “For clinics” area if you represent a clinic and need the authorized operations workspace.", sources: ["Participating clinic information"] },
  },
  {
    pattern: /(?:مساعدة|استفسار|كيف|help|question|how)/i,
    ar: { answer: "يمكنني مساعدتك في فهم خطوات المقارنة والحجز والأسعار المنشورة والتوفر وسياسة الحساب. اكتب سؤالك باختصار، وتجنب إرسال أي بيانات شخصية أو صحية في هذه المحادثة العامة.", sources: ["دليل استخدام المنصة"] },
    en: { answer: "I can help explain comparison and booking steps, published prices, availability, and account policy. Ask your question briefly and avoid sending personal or health data in this public chat.", sources: ["Platform usage guide"] },
  },
];

const defaultAnswer: Record<PublicSupportLocale, PublicSupportAnswer> = {
  ar: {
    answer: "يمكنك السؤال عن المقارنة والحجز والأسعار المنشورة والتوفر والحساب. لا أستطيع تشخيص أعراض أو اقتراح علاج أو الوصول إلى حجوزات أو بيانات شخصية من المحادثة العامة. إذا كان سؤالك عن طلب حجز محدد أو حسابك، سجّل الدخول أولًا.",
    sources: ["حدود المساعدة العامة"],
  },
  en: {
    answer: "You can ask about comparison, booking, published prices, availability, and accounts. I cannot diagnose symptoms, recommend treatment, or access bookings or personal data from public chat. Sign in first for a specific booking or account question.",
    sources: ["Public support boundaries"],
  },
};

export function getPublicSupportFallback(locale: PublicSupportLocale, message: string): PublicSupportAnswer {
  const rule = rules.find((candidate) => candidate.pattern.test(message));
  return rule ? rule[locale] : defaultAnswer[locale];
}
