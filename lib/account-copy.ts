import type { Locale } from "@/lib/i18n";
import { accountNationalityName } from "@/lib/account-nationality-options";
export { accountNationalityOptions } from "@/lib/account-nationality-options";

type AccountCopy = {
  accountKicker: string; defaultName: string; privacy: string; signOut: string; allBookings: string; upcoming: string; completedVisits: string;
  credentialsKicker: string; credentialsTitle: string; credentialsCopy: string; username: string; password: string; activateCredentials: string; credentialsSuccess: string; credentialsErrors: Record<string, string>;
  familyKicker: string; familyTitle: string; familyCopy: string; self: string; child: string; spouse: string; parent: string; other: string;
  phoneVerified: string; phonePending: string; archive: string; fullName: string; namePlaceholder: string; relationship: string; nationalId: string; nationalIdPlaceholder: string;
  nationality: string; chooseNationality: string; birthDate: string; phone: string; saveProfile: string; verificationNote: string;
  bookingsKicker: string; bookingsTitle: string; noBookings: string; noBookingsCopy: string; defaultBooking: string; cancelBooking: string; visitStatus: string; reviewAvailable: string; reviewTitle: string; reviewPlaceholder: string; submitReview: string;
  notificationsKicker: string; notificationsTitle: string; notificationsCopy: string; noNotifications: string; bookingConfirmation: string; bookingLocation: string; directions: string; directionsUnavailable: string; arriveEarly: string;
  accountDeletionKicker: string; accountDeletionTitle: string; accountDeletionCopy: string; accountDeletionConfirmation: string; accountDeletionButton: string; accountDeletionErrors: Record<string, string>;
  bookingErrors: Record<string, string>; bookingSuccess: string; profileErrors: Record<string, string>; profileSuccess: Record<string, string>; reviewErrors: Record<string, string>; reviewSuccess: string; liveConnected: string; liveDisconnected: string; liveConnecting: string; liveTooltip: string;
};

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
    credentialsKicker: "تأمين الدخول", credentialsTitle: "فعّل اسم المستخدم وكلمة المرور", credentialsCopy: "لأن حسابك أنشئ قبل اعتماد نظام الدخول الجديد، فعّل بيانات دخولك هنا مرة واحدة. لا تُخزن كلمة المرور ضمن ملفك الشخصي.", username: "اسم المستخدم", password: "كلمة المرور الجديدة", activateCredentials: "تفعيل بيانات الدخول", credentialsSuccess: "تم تفعيل اسم المستخدم وكلمة المرور لحسابك.", credentialsErrors: { invalid: "تحقق من اسم المستخدم وكلمة المرور.", username_taken: "اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.", unavailable: "تعذر تفعيل بيانات الدخول الآن. حاول لاحقًا." },
    allBookings: "كل الحجوزات", upcoming: "قادمة أو قيد التأكيد", completedVisits: "زيارات مكتملة", familyKicker: "ملفات العائلة", familyTitle: "لمن تحجز المواعيد؟",
    familyCopy: "أضف بيانات الحجز الأساسية لكل شخص. لا نخزن تشخيصات أو صور أشعة أو وصفات هنا.", self: "أنا", child: "ابن/ابنة", spouse: "زوج/زوجة", parent: "أب/أم", other: "فرد من العائلة",
    phoneVerified: "هاتف متحقق", phonePending: "يتطلب تحققًا عند الحجز", archive: "أرشفة", fullName: "الاسم الكامل", namePlaceholder: "اسم الشخص كما سيظهر", relationship: "صلة القرابة", nationalId: "الرقم الشخصي", nationalIdPlaceholder: "11 رقمًا",
    nationality: "الجنسية", chooseNationality: "اختر الجنسية", birthDate: "تاريخ الميلاد", phone: "رقم الهاتف", saveProfile: "حفظ ملف المريض", verificationNote: "يُطلب رمز تحقق فعلي لرقم الهاتف عند تأكيد أول حجز لهذا الملف.",
    bookingsKicker: "الحجوزات", bookingsTitle: "حجوزاتي", noBookings: "لا توجد حجوزات بعد", noBookingsCopy: "ابدأ من البحث، واختر عرضًا لديه موعد صالح للحجز.", defaultBooking: "حجز أسنان", cancelBooking: "إلغاء الحجز", visitStatus: "حالة الزيارة", reviewAvailable: "يمكنك تقييم هذه الزيارة.", reviewTitle: "قيّم زيارتك الموثقة", reviewPlaceholder: "اكتب تجربتك بدون معلومات طبية حساسة", submitReview: "إرسال للمراجعة",
    notificationsKicker: "تأكيدات الحجز", notificationsTitle: "إشعاراتي المحفوظة", notificationsCopy: "تُحفظ تأكيدات الحجز داخل حسابك ولا تُرسل برسائل نصية للحجز.", noNotifications: "لا توجد إشعارات حجز محفوظة بعد.", bookingConfirmation: "تأكيد الحجز", bookingLocation: "موقع العيادة", directions: "فتح الاتجاهات", directionsUnavailable: "لا تتوفر إحداثيات أو عنوان منشور لهذا الفرع.", arriveEarly: "يرجى الحضور قبل الموعد بـ 30 دقيقة.",
    accountDeletionKicker: "إدارة الحساب", accountDeletionTitle: "حذف حسابي", accountDeletionCopy: "سيُوقف الوصول ويُؤرشف ملفك الشخصي. تبقى الحجوزات وسجل التدقيق بالحد الأدنى اللازم للتشغيل ولا يمكن استعادتها عبر هذا الحساب.", accountDeletionConfirmation: "اكتب DELETE لتأكيد حذف الحساب", accountDeletionButton: "حذف حسابي نهائيًا", accountDeletionErrors: { invalid: "اكتب DELETE بالحروف الإنجليزية لتأكيد الحذف.", unavailable: "تعذر حذف الحساب الآن ولم نعلن نجاح العملية. حاول لاحقًا أو تواصل مع الإدارة.", partial: "أُرشف ملفك وأوقف اسم الدخول، لكن تعذر إكمال إزالة جلسة الدخول. تواصل مع الإدارة فورًا." },
    bookingErrors: { forbidden: "لا تملك صلاحية إلغاء هذا الحجز.", not_cancellable: "لا يمكن إلغاء هذا الحجز في حالته الحالية أو بعد وقت الموعد.", invalid: "تعذر العثور على الحجز المطلوب.", unavailable: "خدمة إلغاء الحجز غير متاحة مؤقتًا. حاول مرة أخرى لاحقًا." },
    bookingSuccess: "تم إلغاء الحجز وتحديث حالته بنجاح.",
    profileErrors: { self_exists: "ملف «أنا» موجود بالفعل في حسابك.", duplicate_identity: "لا يمكن استخدام هذا الرقم الشخصي لملف آخر.", duplicate_phone: "لا يمكن استخدام رقم الهاتف نفسه لملف مريض آخر.", cannot_archive_self: "لا يمكن أرشفة ملفك الأساسي.", invalid: "بيانات الشخص غير صالحة أو لم يعد السجل متاحًا.", unavailable: "تعذر حفظ بيانات الشخص الآن. لم نعلن نجاح العملية؛ حاول مرة أخرى لاحقًا." },
    profileSuccess: { created: "تمت إضافة الشخص إلى حسابك وحفظه.", archived: "تمت أرشفة الشخص ولم يعد يظهر ضمن خيارات الحجز." },
    reviewErrors: { invalid: "بيانات التقييم غير صالحة.", not_eligible: "لا يمكن تقييم هذه الزيارة إلا بعد اكتمالها ومن الحساب صاحب الحجز.", duplicate: "تم إرسال تقييم لهذه الزيارة مسبقًا.", forbidden: "لا تملك صلاحية تقييم هذه الزيارة.", unavailable: "تعذر حفظ التقييم الآن. لم نعلن نجاح العملية؛ حاول مرة أخرى لاحقًا." },
    reviewSuccess: "تم حفظ تقييمك وإرساله للمراجعة.", liveConnected: "تحديثات مباشرة", liveDisconnected: "التحديث المباشر غير متصل", liveConnecting: "جارٍ الاتصال…", liveTooltip: "تتحدث الحجوزات وحالة الملف تلقائيًا عند تغيرها",
  },
  en: {
    accountKicker: "Patient account", defaultName: "My account", privacy: "A minimal personal profile with no diagnoses, X-rays, or prescriptions.", signOut: "Sign out",
    credentialsKicker: "Secure sign-in", credentialsTitle: "Activate a username and password", credentialsCopy: "Because your account was created before the new sign-in system, activate your credentials here once. Your password is not stored in your personal profile.", username: "Username", password: "New password", activateCredentials: "Activate sign-in credentials", credentialsSuccess: "Your username and password are now active.", credentialsErrors: { invalid: "Check the username and password.", username_taken: "That username is already in use. Choose another one.", unavailable: "Your sign-in credentials could not be activated now. Please try again later." },
    allBookings: "All bookings", upcoming: "Upcoming or awaiting confirmation", completedVisits: "Completed visits", familyKicker: "Family profiles", familyTitle: "Who are you booking for?",
    familyCopy: "Add the essential booking details for each person. We do not store diagnoses, X-rays, or prescriptions here.", self: "Me", child: "Child", spouse: "Spouse", parent: "Parent", other: "Family member",
    phoneVerified: "Phone verified", phonePending: "Verification required when booking", archive: "Archive", fullName: "Full name", namePlaceholder: "Name as it should appear", relationship: "Relationship", nationalId: "National ID", nationalIdPlaceholder: "11 digits",
    nationality: "Nationality", chooseNationality: "Choose nationality", birthDate: "Date of birth", phone: "Phone number", saveProfile: "Save patient profile", verificationNote: "A real phone verification code is required when confirming this profile's first booking.",
    bookingsKicker: "Bookings", bookingsTitle: "My bookings", noBookings: "No bookings yet", noBookingsCopy: "Start with a search, then choose an offer with a bookable appointment.", defaultBooking: "Dental booking", cancelBooking: "Cancel booking", visitStatus: "Visit status", reviewAvailable: "You can review this visit.", reviewTitle: "Review your verified visit", reviewPlaceholder: "Share your experience without sensitive medical information", submitReview: "Submit for review",
    notificationsKicker: "Booking confirmations", notificationsTitle: "My saved notifications", notificationsCopy: "Booking confirmations are saved in your account and are not sent as booking SMS messages.", noNotifications: "No saved booking notifications yet.", bookingConfirmation: "Booking confirmation", bookingLocation: "Clinic location", directions: "Open directions", directionsUnavailable: "This branch has no published coordinates or address.", arriveEarly: "Please arrive 30 minutes before your appointment.",
    accountDeletionKicker: "Account management", accountDeletionTitle: "Delete my account", accountDeletionCopy: "Access will be stopped and your personal profile archived. Bookings and the minimum audit record needed for operations remain and cannot be recovered through this account.", accountDeletionConfirmation: "Type DELETE to confirm account deletion", accountDeletionButton: "Delete my account permanently", accountDeletionErrors: { invalid: "Type DELETE in English letters to confirm deletion.", unavailable: "Your account could not be deleted now. We did not report success; try again later or contact administration.", partial: "Your profile was archived and login name disabled, but ending the sign-in session could not be completed. Contact administration immediately." },
    bookingErrors: { forbidden: "You do not have permission to cancel this booking.", not_cancellable: "This booking cannot be cancelled in its current state or after its appointment time.", invalid: "The requested booking could not be found.", unavailable: "Booking cancellation is temporarily unavailable. Please try again later." },
    bookingSuccess: "Your booking was cancelled and its status was updated.",
    profileErrors: { self_exists: "Your primary profile already exists.", duplicate_identity: "This national ID cannot be used for another patient profile.", duplicate_phone: "The same phone number cannot be used for another patient profile.", cannot_archive_self: "Your primary profile cannot be archived.", invalid: "The person's details are invalid or the record is no longer available.", unavailable: "The person's details could not be saved. We did not mark the operation as successful; please try again later." },
    profileSuccess: { created: "The person was added to your account and saved.", archived: "The person was archived and no longer appears in booking choices." },
    reviewErrors: { invalid: "The review details are invalid.", not_eligible: "Only the account that owns a completed booking can review that visit.", duplicate: "A review for this visit has already been submitted.", forbidden: "You do not have permission to review this visit.", unavailable: "The review could not be saved. We did not mark the operation as successful; please try again later." },
    reviewSuccess: "Your review was saved and sent for moderation.", liveConnected: "Live updates", liveDisconnected: "Live updates disconnected", liveConnecting: "Connecting…", liveTooltip: "Bookings and profile status refresh automatically when they change",
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
  return accountNationalityName(locale, nationality);
}
