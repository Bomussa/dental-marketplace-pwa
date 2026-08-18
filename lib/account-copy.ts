import type { Locale } from "@/lib/i18n";

type AccountCopy = {
  accountKicker: string; defaultName: string; privacy: string; signOut: string; allBookings: string; upcoming: string; completedVisits: string;
  familyKicker: string; familyTitle: string; familyCopy: string; self: string; child: string; spouse: string; parent: string; other: string;
  phoneVerified: string; phonePending: string; archive: string; fullName: string; namePlaceholder: string; relationship: string; nationalId: string; nationalIdPlaceholder: string;
  nationality: string; chooseNationality: string; birthDate: string; phone: string; saveProfile: string; verificationNote: string;
  bookingsKicker: string; bookingsTitle: string; noBookings: string; noBookingsCopy: string; defaultBooking: string; cancelBooking: string; visitStatus: string; reviewAvailable: string; reviewTitle: string; reviewPlaceholder: string; submitReview: string;
  bookingErrors: Record<string, string>; bookingSuccess: string; profileErrors: Record<string, string>; profileSuccess: Record<string, string>; reviewErrors: Record<string, string>; reviewSuccess: string;
};

const nationalities = {
  QA: ["قطر", "Qatar"], SA: ["السعودية", "Saudi Arabia"], AE: ["الإمارات", "United Arab Emirates"], BH: ["البحرين", "Bahrain"],
  KW: ["الكويت", "Kuwait"], OM: ["عُمان", "Oman"], EG: ["مصر", "Egypt"], IN: ["الهند", "India"],
  PH: ["الفلبين", "Philippines"], PK: ["باكستان", "Pakistan"], BD: ["بنغلاديش", "Bangladesh"], JO: ["الأردن", "Jordan"],
  LB: ["لبنان", "Lebanon"], SY: ["سوريا", "Syria"], US: ["الولايات المتحدة", "United States"], GB: ["المملكة المتحدة", "United Kingdom"],
} as const;

const statusCopy = {
  pending_hold: ["قيد تأمين الموعد", "Holding appointment"],
  pending_clinic_confirmation: ["بانتظار تأكيد العيادة", "Awaiting clinic confirmation"],
  confirmed: ["مؤكد", "Confirmed"],
  checked_in: ["تم الوصول", "Checked in"],
  completed: ["مكتمل", "Completed"],
  patient_cancelled: ["ملغي من المريض", "Cancelled by patient"],
  clinic_cancelled: ["ملغي من العيادة", "Cancelled by clinic"],
  no_show: ["لم يحضر", "No show"],
  expired: ["انتهت صلاحية الحجز", "Booking expired"],
  failed: ["غير مكتمل", "Incomplete"],
} as const;

const copy: Record<Locale, AccountCopy> = {
  ar: {
    accountKicker: "حساب المريض", defaultName: "حسابي", privacy: "ملف شخصي مُقلّل البيانات، بدون تشخيصات أو صور أشعة أو وصفات.", signOut: "تسجيل الخروج",
    allBookings: "كل الحجوزات", upcoming: "قادمة أو قيد التأكيد", completedVisits: "زيارات مكتملة", familyKicker: "ملفات العائلة", familyTitle: "لمن تحجز المواعيد؟",
    familyCopy: "أضف بيانات الحجز الأساسية لكل شخص. لا نخزن تشخيصات أو صور أشعة أو وصفات هنا.", self: "أنا", child: "ابن/ابنة", spouse: "زوج/زوجة", parent: "أب/أم", other: "فرد من العائلة",
    phoneVerified: "هاتف متحقق", phonePending: "يتطلب تحققًا عند الحجز", archive: "أرشفة", fullName: "الاسم الكامل", namePlaceholder: "اسم الشخص كما سيظهر", relationship: "صلة القرابة", nationalId: "الرقم الشخصي", nationalIdPlaceholder: "11 رقمًا",
    nationality: "الجنسية", chooseNationality: "اختر الجنسية", birthDate: "تاريخ الميلاد", phone: "رقم الهاتف", saveProfile: "حفظ ملف المريض", verificationNote: "يُطلب رمز تحقق فعلي لرقم الهاتف عند تأكيد أول حجز لهذا الملف.",
    bookingsKicker: "الحجوزات", bookingsTitle: "حجوزاتي", noBookings: "لا توجد حجوزات بعد", noBookingsCopy: "ابدأ من البحث، واختر عرضًا لديه موعد صالح للحجز.", defaultBooking: "حجز أسنان", cancelBooking: "إلغاء الحجز", visitStatus: "حالة الزيارة", reviewAvailable: "يمكنك تقييم هذه الزيارة.", reviewTitle: "قيّم زيارتك الموثقة", reviewPlaceholder: "اكتب تجربتك بدون معلومات طبية حساسة", submitReview: "إرسال للمراجعة",
    bookingErrors: { forbidden: "لا تملك صلاحية إلغاء هذا الحجز.", not_cancellable: "لا يمكن إلغاء هذا الحجز في حالته الحالية أو بعد وقت الموعد.", invalid: "تعذر العثور على الحجز المطلوب.", unavailable: "خدمة إلغاء الحجز غير متاحة مؤقتًا. حاول مرة أخرى لاحقًا." },
    bookingSuccess: "تم إلغاء الحجز وتحديث حالته بنجاح.",
    profileErrors: { self_exists: "ملف «أنا» موجود بالفعل في حسابك.", duplicate_identity: "الرقم الشخصي مسجل مسبقًا في ملف آخر.", cannot_archive_self: "لا يمكن أرشفة ملفك الأساسي.", invalid: "بيانات الشخص غير صالحة أو لم يعد السجل متاحًا.", unavailable: "تعذر حفظ بيانات الشخص الآن. لم نعلن نجاح العملية؛ حاول مرة أخرى لاحقًا." },
    profileSuccess: { created: "تمت إضافة الشخص إلى حسابك وحفظه.", archived: "تمت أرشفة الشخص ولم يعد يظهر ضمن خيارات الحجز." },
    reviewErrors: { invalid: "بيانات التقييم غير صالحة.", not_eligible: "لا يمكن تقييم هذه الزيارة إلا بعد اكتمالها ومن الحساب صاحب الحجز.", duplicate: "تم إرسال تقييم لهذه الزيارة مسبقًا.", forbidden: "لا تملك صلاحية تقييم هذه الزيارة.", unavailable: "تعذر حفظ التقييم الآن. لم نعلن نجاح العملية؛ حاول مرة أخرى لاحقًا." },
    reviewSuccess: "تم حفظ تقييمك وإرساله للمراجعة.",
  },
  en: {
    accountKicker: "Patient account", defaultName: "My account", privacy: "A minimal personal profile with no diagnoses, X-rays, or prescriptions.", signOut: "Sign out",
    allBookings: "All bookings", upcoming: "Upcoming or awaiting confirmation", completedVisits: "Completed visits", familyKicker: "Family profiles", familyTitle: "Who are you booking for?",
    familyCopy: "Add the essential booking details for each person. We do not store diagnoses, X-rays, or prescriptions here.", self: "Me", child: "Child", spouse: "Spouse", parent: "Parent", other: "Family member",
    phoneVerified: "Phone verified", phonePending: "Verification required when booking", archive: "Archive", fullName: "Full name", namePlaceholder: "Name as it should appear", relationship: "Relationship", nationalId: "National ID", nationalIdPlaceholder: "11 digits",
    nationality: "Nationality", chooseNationality: "Choose nationality", birthDate: "Date of birth", phone: "Phone number", saveProfile: "Save patient profile", verificationNote: "A real phone verification code is required when confirming this profile's first booking.",
    bookingsKicker: "Bookings", bookingsTitle: "My bookings", noBookings: "No bookings yet", noBookingsCopy: "Start with a search, then choose an offer with a bookable appointment.", defaultBooking: "Dental booking", cancelBooking: "Cancel booking", visitStatus: "Visit status", reviewAvailable: "You can review this visit.", reviewTitle: "Review your verified visit", reviewPlaceholder: "Share your experience without sensitive medical information", submitReview: "Submit for review",
    bookingErrors: { forbidden: "You do not have permission to cancel this booking.", not_cancellable: "This booking cannot be cancelled in its current state or after its appointment time.", invalid: "The requested booking could not be found.", unavailable: "Booking cancellation is temporarily unavailable. Please try again later." },
    bookingSuccess: "Your booking was cancelled and its status was updated.",
    profileErrors: { self_exists: "Your primary profile already exists.", duplicate_identity: "This national ID is already registered to another profile.", cannot_archive_self: "Your primary profile cannot be archived.", invalid: "The person's details are invalid or the record is no longer available.", unavailable: "The person's details could not be saved. We did not mark the operation as successful; please try again later." },
    profileSuccess: { created: "The person was added to your account and saved.", archived: "The person was archived and no longer appears in booking choices." },
    reviewErrors: { invalid: "The review details are invalid.", not_eligible: "Only the account that owns a completed booking can review that visit.", duplicate: "A review for this visit has already been submitted.", forbidden: "You do not have permission to review this visit.", unavailable: "The review could not be saved. We did not mark the operation as successful; please try again later." },
    reviewSuccess: "Your review was saved and sent for moderation.",
  },
};

export function getAccountCopy(locale: Locale): AccountCopy {
  return copy[locale];
}

export function accountStatus(locale: Locale, status: string): string {
  const statusEntry = statusCopy[status as keyof typeof statusCopy];
  return statusEntry ? statusEntry[locale === "ar" ? 0 : 1] : status;
}

export function accountRelationship(locale: Locale, relationship: string): string {
  const key = relationship === "self" ? "self" : relationship === "child" ? "child" : relationship === "spouse" ? "spouse" : relationship === "parent" ? "parent" : "other";
  return copy[locale][key];
}

export function accountNationality(locale: Locale, nationality: string): string {
  const value = nationalities[nationality as keyof typeof nationalities];
  return value ? value[locale === "ar" ? 0 : 1] : nationality;
}

export const accountNationalityOptions = Object.keys(nationalities) as Array<keyof typeof nationalities>;
