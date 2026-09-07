# أسناني قطر — MMC-MMS

> **المرجع التشغيلي والهندسي الرئيسي للمستودع.**
>
> هذا README يصف الحالة التي تم التحقق منها مباشرة من GitHub وVercel وSupabase بتاريخ **2026-09-07**. لا يُستخدم أي رقم أو حالة قديمة على أنها حالة حالية إذا تعارضت مع المنصة الفعلية.

## 1. تعريف المشروع

**أسناني قطر (MMC-MMS)** منصة رقمية متخصصة في خدمات طب الأسنان في قطر. الاسم التشغيلي هو **Medical Marketplace Comparison – Medical Matching Service**.

المنتج يركز على:

- اكتشاف خدمات وعيادات الأسنان المشاركة.
- مطابقة **النوع العلاجي الدقيق** وليس اسم علاج عام فقط.
- مقارنة الأسعار ونطاق السعر وما يشمله العرض.
- معرفة التوفر والمواعيد.
- اختيار الموعد.
- إنشاء وإدارة الحجز.
- إدارة العلاقة التشغيلية بين المريض والعيادة.
- دعم ثنائي اللغة العربية/الإنجليزية.
- PWA وتجربة Mobile-first.

المنصة **ليست جهة تشخيص أو علاج أو اعتماد طبي**، ولا يجوز لها اختراع سعر أو موعد أو شمول علاجي غير مثبت من بيانات العيادة.

الموقع: **https://www.mmc-mms.com**

النطاقات المرتبطة بمشروع Vercel: `www.mmc-mms.com`، `mmc-mms.com`، وواجهات `vercel.app` الخاصة بالمشروع.

---

# 2. الحالة الحالية الموثقة — 2026-09-07

| العنصر | الحالة الحالية التي تم التحقق منها |
|---|---|
| GitHub repository | `Bomussa/dental-marketplace-pwa` |
| GitHub default branch | `main` |
| أحدث commit على `main` | `84addac162e3b0a36d2729056b760502bb0ae8d1` — `feat: add vision and goals screen` |
| آخر تعديل | إضافة `/about` لرؤية وأهداف أسناني وربطه من Footer، مع دعم العربية/الإنجليزية. |
| Vercel project | `dental-marketplace-pwa` |
| Vercel project ID | `prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr` |
| Vercel framework | Next.js |
| Vercel runtime | Node.js `24.x` بحسب إعداد المشروع الحالي |
| أحدث deployment معروف للمشروع | `dpl_45ZC9EiPh6oSwQkhXQtfyecHHkSz` |
| حالة أحدث deployment | `READY` |
| نوع أحدث deployment | `LAMBDAS` |
| أحدث deployment المؤكد | Preview للفرع `feat/vision-goals-screen`، وليس Production. |
| Preview URL | `https://dental-marketplace-40z349zgy-bomussa.vercel.app` |
| GitHub SHA للـPreview | `bd815f001175218b04d679e5ca33af40c0fca0d8` |
| Production آخر إصدار موثق في سجل المشروع | `6793cbd` عبر `dpl_7Zy57QrthkevQfwL3CppRw895GDA`، موثق في `docs/CURRENT_PRODUCTION_STATUS.md` بتاريخ 2026-09-01. |
| Supabase Production | `qatar-dental-dev` / ref `bqvcukxfsnchvkgejolz` |
| Supabase Production region | `eu-central-1` |
| Supabase Production status | `ACTIVE_HEALTHY` |
| Supabase PostgreSQL | PostgreSQL 17، الإصدار الحالي الظاهر `17.6.1.155` |
| Supabase Staging | `asnani-staging` / ref `yrlwoxlxizxgrodtbdcp` |
| Staging status | `ACTIVE_HEALTHY` |
| Staging region | `eu-central-1` |
| Supabase Edge Functions | لا توجد Edge Functions في مشروع Production عند آخر تحقق مباشر. |
| Production public tables | `49` جدولًا في `public` |
| Production public functions | `46` اسم دالة ظاهر في catalog؛ بعض الأسماء لها overloads لذلك قد يكون عدد signatures أعلى من عدد الأسماء. |
| آخر migration مطبق | `20260906074120_remove_duplicate_account_username_index` |
| Production RLS | مفعّل على جداول `public` التي تم جردها. |

### ملاحظة حاسمة عن GitHub ↔ Vercel

`main` يحتوي حاليًا على commit أحدث من آخر Production deployment المؤكد. آخر deployment الذي تم التحقق منه مباشرة من Vercel هو Preview للفرع `feat/vision-goals-screen` بحالة `READY`. لذلك **لا يُكتب في أي مكان أن Production يطابق commit `84addac` إلا بعد deployment Production جديد ناجح**.

---

# 3. آخر تحديث وظيفي

أضيفت شاشة:

`app/about/page.tsx`

المسار:

`/about`

وتعرض:

- اسم أسناني قطر.
- عنوان «رؤيتنا وأهدافنا».
- الرؤية المعتمدة.
- تعريفًا مختصرًا بدور المنصة.
- 10 أهداف تشغيلية واضحة.
- الخلاصة: `ابحث ← قارن ← اختر ← احجز`.
- تنبيه نطاق يوضح أن المنصة ليست جهة تشخيص أو علاج أو اعتماد طبي.
- العربية والإنجليزية وفق locale الموجود في المشروع.
- تصميم responsive متوافق مع النظام البصري الحالي.

كما تم تحديث:

`app/layout.tsx`

لإضافة رابط Footer إلى `/about` دون تغيير مسار البحث أو الحجز أو المصادقة أو الإدارة.

هذا التغيير لا يعدّل قاعدة البيانات ولا API ولا صلاحيات Supabase.

---

# 4. المعمارية العامة

```text
Browser / PWA
    │
    ▼
Next.js App Router + Proxy
    │
    ├── Server Components / Client Components
    ├── Server Actions
    └── Route Handlers /api/*
             │
             ▼
       Zod validation + normalization
             │
             ▼
       Server-only operations
             │
             ▼
       Supabase RPC / PostgreSQL
             │
             ├── RLS
             ├── constraints
             ├── triggers
             ├── indexes
             └── transactional booking logic
             │
             ▼
       Supabase Auth / Realtime / PostgreSQL
```

المبدأ الأساسي: **الواجهة ليست طبقة الصلاحية النهائية**. القرار الأمني يجب أن يُفرض في Route/Server Action/RPC/RLS بحسب العملية.

---

# 5. طبقات المشروع ومسؤولياتها

| المسار | المسؤولية |
|---|---|
| `app/` | App Router، الصفحات، layouts، Server Actions، Route Handlers. |
| `components/` | مكونات React للواجهة والتفاعل والتحديث اللحظي. |
| `lib/` | validation، auth، Supabase clients، العمليات الخادمية، التسعير، البحث، الإشعارات، i18n. |
| `supabase/` | migrations، baseline، seed التطوير، اختبارات قبول SQL. |
| `tests/` | اختبارات Vitest وPlaywright. |
| `load-tests/k6/` | سيناريوهات K6 للحمل والحجز والبحث، مع fixtures مثال فقط. |
| `scripts/` | predeploy، readiness، schema baseline، role simulation، safe load، مزامنة الأنواع. |
| `docs/` | أدلة التشغيل والتدقيق والإثبات التاريخي. |
| `public/` | service worker، offline shell، الأصول المرئية. |
| `presentations/` | مواد العرض التنفيذي وليست جزءًا من runtime. |

---

# 6. المسارات والصفحات الحالية

| المسار | الغرض |
|---|---|
| `/` | الصفحة الرئيسية والبحث والمقارنة والمساعد. |
| `/about` | الرؤية والأهداف. |
| `/results` | نتائج النوع العلاجي الدقيق والمقارنة. |
| `/login` | تسجيل الدخول والتسجيل للمستخدمين وفق عقد الحساب. |
| `/auth/confirm` | تأكيد تدفق جلسة خارجي قديم/محدد. |
| `/auth/forgot-password` | بدء استرداد كلمة المرور. |
| `/auth/update-password` | تحديث كلمة المرور بعد تدفق الاسترداد. |
| `/auth/signout` | تسجيل الخروج عبر POST من نفس الأصل. |
| `/account` | حساب المريض وملفات المرضى والحجوزات والإشعارات والمراجعات. |
| `/clinic` | مساحة العيادة للفروع والخدمات والعروض والمواعيد والحجوزات وفق الدور. |
| `/clinic/bookings` | مساحة العميل التشغيلي المقيد بحجوزات الفرع المخصص. |
| `/admin` | إدارة المنصة والكتالوج والعروض والمواعيد والمراجعات والدعم والتقارير. |
| `/privacy` | صفحة الخصوصية الحالية. |
| `/terms` | صفحة الشروط الحالية. |
| `/operation-error` | أخطاء تشغيلية آمنة. |
| `/manifest.webmanifest` | PWA manifest. |
| `/pwa/icon/[size]` | أيقونات PWA الديناميكية. |
| `/robots.txt` | SEO crawler policy. |
| `/sitemap.xml` | SEO sitemap. |

---

# 7. Route Handlers / API الحالية

جميع المدخلات الحساسة تمر عبر validation/normalization قبل العمليات. لا يجب كشف SQL أو secrets في response.

| Endpoint | Method | الغرض |
|---|---:|---|
| `/api/health` | GET | Health response عامة مختصرة؛ لا تكشف أسرارًا أو عدادات قاعدة البيانات. |
| `/api/search` | GET | البحث العام في عروض الأسنان وفق treatment variant والوقت والموقع والنطاق. |
| `/api/book` | POST | إنشاء الحجز عبر مسار ذري مع idempotency وقيود الأهلية. |
| `/api/choices` | POST | telemetry للأحداث المختارة عبر server ingestion. |
| `/api/device-installations` | POST | تسجيل/تحديث تثبيت الجهاز عبر المسار الخادمي. |
| `/api/locale` | GET/POST بحسب العقد الحالي | إدارة locale. |
| `/api/patient-booking-registration` | POST | تدفق تسجيل/تهيئة المريض المرتبط بالحجز وفق عقد الحساب. |
| `/api/patient-phone-verification/start` | POST | بدء تحقق الهاتف عبر adapter المزود الخارجي. |
| `/api/patient-phone-verification/confirm` | POST | تأكيد OTP واستهلاك challenge وتحديث `phone_verified_at`. |
| `/api/support` | POST | دعم المستخدم/الزائر مع safety routing وknowledge/fallback. |
| `/api/admin/reports/csv` | GET | تصدير تقرير إداري مصادق عليه. |
| `/api/admin/reports/activity-csv` | GET | تصدير تقرير النشاط وفق صلاحية الإدارة. |

### قواعد API الحرجة

- `/api/book` لا يُعامل ككتابة عادية؛ الحجز يعتمد على RPC ذري.
- `idempotency_key` يمنع إنشاء حجز مكرر عند إعادة المحاولة.
- التحقق من ملف المريض والهاتف يتم قبل الحجز وفق العقد الحالي.
- حدود المعدل مفروضة server-side/DB-side حسب العملية.
- telemetry لا يسمح بكتابة مباشرة من المتصفح إلى جدول الأحداث.
- support لا يقدم تشخيصًا طبيًا؛ حالات الطوارئ تمر بمسار سلامة ثابت.

---

# 8. المكونات الرئيسية

```text
components/
  account-booking-notifications.tsx
  account-live-refresh.tsx
  activity-report-card.tsx
  admin-analytics-live-refresh.tsx
  admin-choice-analytics.tsx
  app-icon-artwork.tsx
  book-button.tsx
  brand-lockup.tsx
  clinic-booking-actions.tsx
  clinic-booking-status-form.tsx
  clinic-live-refresh.tsx
  device-installation-registrar.tsx
  forgot-password-form.tsx
  icons.tsx
  locale-provider.tsx
  locale-toggle.tsx
  mobile-navigation.tsx
  price-scope-fields.tsx
  price-scope-summary.tsx
  print-report-button.tsx
  public-policy-template.tsx
  results-live-refresh.tsx
  search-form.tsx
  site-header.tsx
  super-admin-user-management.tsx
  support-chat.tsx
  ui.tsx
  update-password-form.tsx
  use-realtime-router-refresh.ts
```

---

# 9. المكتبات الخادمية والـdomain logic

```text
lib/
  account-auth.server.ts
  account-copy.ts
  account-nationality-options.ts
  activity-report.ts
  admin-copy.ts
  auth-claims.server.ts
  booking-intent.client.ts
  choice-event-guard.ts
  choice-events.client.ts
  client-booking-workspace.ts
  clinic-booking-attendance.ts
  clinic-copy.ts
  clinic-realtime-refresh.ts
  clinic-role-display.ts
  customer-choice-analytics.ts
  database.types.ts
  device-installation.client.ts
  i18n/ar.ts
  i18n/en.ts
  i18n/index.ts
  models.ts
  money-input.ts
  notifications.server.ts
  operation-feedback.ts
  operational-client-branches.ts
  operations.server.ts
  phone-verification.server.ts
  price-scope.ts
  price.ts
  public-write-request-guard.ts
  realtime-refresh-policy.ts
  search-offers.ts
  search-query.ts
  server-readiness.ts
  supabase/admin.ts
  supabase/client.ts
  supabase/proxy.ts
  supabase/server.ts
  support-model.server.ts
  support-public-fallback.ts
  treatment-catalog.server.ts
  validation.ts
```

### مصادر الحقيقة للكود

- `lib/validation.ts`: عقود Zod المركزية والتطبيع.
- `lib/operations.server.ts`: عمليات server-only الأساسية.
- `lib/database.types.ts`: الأنواع المولدة من Supabase.
- `lib/search-offers.ts`: طبقة البحث والعروض.
- `lib/price-scope.ts`: قواعد نطاق السعر.
- `lib/price.ts` و`lib/money-input.ts`: تحويلات ومبالغ QAR بوحدات صحيحة.
- `lib/auth-claims.server.ts`: claims الموثوقة للتفويض.
- `lib/public-write-request-guard.ts`: حارس الكتابة العامة.
- `lib/supabase/client.ts`: عميل المتصفح بمفتاح publishable.
- `lib/supabase/server.ts`: عميل SSR مع cookies.
- `lib/supabase/proxy.ts`: تحديث الجلسة عبر Proxy.
- `lib/supabase/admin.ts`: عميل server-only مميز؛ لا يخرج إلى bundle المتصفح.

---

# 10. Supabase Production — الحالة الحية

**Project:** `qatar-dental-dev`

**Ref:** `bqvcukxfsnchvkgejolz`

**Region:** `eu-central-1`

**Status:** `ACTIVE_HEALTHY`

**Database:** PostgreSQL 17 / `17.6.1.155`

## 10.1 الجداول العامة — 49

```text
account_usernames
accounting_journal_lines
accounting_journals
audit_events
availability_slots
booking_attendance_events
booking_status_history
bookings
branch_hour_exceptions
branch_hours
branch_service_offers
branches
clinic_fee_rules
clinic_memberships
clinic_operator_account_events
clinic_operator_accounts
clinics
consent_records
customer_choice_events
device_installations
feature_flags
idempotency_keys
instant_slots
notification_delivery_attempts
notification_outbox
notification_preferences
notification_subscriptions
notification_templates
offer_revisions
patient_phone_verification_challenges
patient_profiles
payment_events
payment_intents
practitioners
price_disputes
profiles
rate_limit_buckets
reconciliation_exceptions
report_exports
resources
reviews
settlement_periods
support_conversations
support_knowledge_articles
support_messages
suspensions
treatment_catalog
treatment_variants
verification_records
```

**RLS:** مفعّل على الجداول العامة التي تم جردها.

### مجالات البيانات

- الهوية: `profiles`, `account_usernames`, `patient_profiles`.
- العيادات والفروع: `clinics`, `branches`, `clinic_memberships`, `clinic_operator_accounts`.
- التحقق: `verification_records`, `suspensions`.
- الكتالوج: `treatment_catalog`, `treatment_variants`.
- العروض والأسعار: `branch_service_offers`, `offer_revisions`, `price_disputes`.
- المواعيد: `branch_hours`, `branch_hour_exceptions`, `resources`, `availability_slots`, `instant_slots`.
- الحجز: `bookings`, `booking_status_history`, `idempotency_keys`, `booking_attendance_events`.
- المريض والتحقق: `patient_profiles`, `patient_phone_verification_challenges`, `consent_records`, `device_installations`.
- الدفع/التسوية: `payment_intents`, `payment_events`, `reconciliation_exceptions`, `clinic_fee_rules`, `settlement_periods`, `accounting_journals`, `accounting_journal_lines`, `report_exports`.
- الإشعارات: `notification_subscriptions`, `notification_preferences`, `notification_templates`, `notification_outbox`, `notification_delivery_attempts`.
- الدعم: `support_knowledge_articles`, `support_conversations`, `support_messages`.
- التحليلات والحوكمة: `customer_choice_events`, `audit_events`, `feature_flags`, `rate_limit_buckets`.

## 10.2 وظائف PostgreSQL الحالية

الأسماء الظاهرة في catalog عند التحقق:

```text
admin_customer_choice_analytics
archive_patient_account_server
audit_clinic_operator_password_reset
audit_clinic_operator_password_reset_server
book_slot
book_slot_server
cancel_booking_server
change_booking_status_server
clinic_activity_report_server
clinic_booking_patient_details
complete_patient_phone_verification_server
consume_rate_limit_server
create_branch_application
create_clinic_application
create_settlement_period
create_settlement_period_server
enforce_public_offer_price_scope
financial_report_summary
financial_report_summary_server
handle_new_account_patient_profile
is_price_scope_publishable
is_valid_price_scope
list_clinic_operator_accounts
list_clinic_operator_accounts_server
list_operational_client_accounts_server
list_patient_accounts_for_admin
platform_activity_report_server
provision_clinic_operator_account
provision_clinic_operator_account_server
provision_operational_client_account_server
record_booking_check_in
record_booking_check_in_server
register_device_installation_guarded_server
register_device_installation_server
request_offer_revision
request_offer_revision_server
reverse_booking_attendance
reverse_booking_attendance_server
review_offer_revision
review_offer_revision_server
revoke_clinic_operator_account
revoke_clinic_operator_account_server
revoke_operational_client_account_server
search_dental_offers
verify_and_activate_server
```

يوجد overload لاسم `book_slot`؛ لذلك عدّ الأسماء لا يساوي بالضرورة عدد signatures الفعلي.

## 10.3 Edge Functions

آخر جرد مباشر لـSupabase Production أعاد:

`[]`

أي **لا توجد Supabase Edge Functions منشورة حاليًا في هذا المشروع**. المسارات الخادمية الحالية تعمل داخل Next.js/Vercel وتستخدم Supabase PostgreSQL/Auth من الخادم.

---

# 11. Supabase Staging

**Project:** `asnani-staging`

**Ref:** `yrlwoxlxizxgrodtbdcp`

**Region:** `eu-central-1`

**Status:** `ACTIVE_HEALTHY`

يُستخدم Staging لاختبارات الكتابة والـfixtures المعزولة عند الحاجة. لا يجوز نقل بيانات اختبار إلى Production، ولا استخدام بيانات اصطناعية لتجاوز بوابات التحقق أو صلاحيات العيادات.

---

# 12. آخر migrations مطبقة في Production

آخر migration مؤكد من Supabase هو:

```text
20260906074120_remove_duplicate_account_username_index
```

والـmigrations الأخيرة ذات الصلة:

```text
20260828210500_booking_eligibility_and_client_privileges_hardening_v1.sql
20260829230000_normalize_account_username_case_v1.sql
20260906074120_remove_duplicate_account_username_index.sql
```

سجل المصدر الكامل موجود في:

`supabase/migrations/`

وسجل الترحيلات البعيدة:

`supabase/REMOTE_APPLIED_MIGRATIONS.md`

Baseline الحالي:

`supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql`

واختبارات قبول قاعدة البيانات:

`supabase/tests/acceptance.sql`

---

# 13. قواعد الحجز وسلامة البيانات

## البحث

```text
treatment_catalog
      ↓
treatment_variants
      ↓
branch_service_offers
      ↓
availability_slots
      ↓
search_dental_offers
```

المطابقة تعتمد على `treatment_variants.id`، وليس نصًا حرًا قد يخلط خدمات مختلفة.

## السعر

عملة المنصة الحالية للعروض هي `QAR`.

العرض يحدد:

- `price_type`: fixed / from / range / package / consultation_required.
- `min_minor` و`max_minor` كوحدات صحيحة.
- `price_scope` للبنود التي تشملها أو تستثنيها الخدمة.
- وقت السريان والتحقق.
- حالة العرض.

لا يجب نشر عرض عام إذا كان نطاق السعر غير صالح للنشر وفق `is_price_scope_publishable` وtrigger الحماية المقابل.

## الحجز

المسار المنطقي:

```text
اختيار العلاج
  ↓
اختيار النوع الدقيق
  ↓
البحث
  ↓
العرض المؤهل
  ↓
موعد صالح
  ↓
تسجيل/دخول المريض
  ↓
ملف المريض
  ↓
تحقق الهاتف عند الحاجة
  ↓
POST /api/book
  ↓
book_slot_server
  ↓
transactional booking
  ↓
idempotency + conflict protection
  ↓
booking + status history + outbox حسب الحدث
```

الحالات المدعومة في `bookings` تشمل:

```text
pending_hold
pending_clinic_confirmation
confirmed
checked_in
completed
patient_cancelled
clinic_cancelled
no_show
expired
failed
```

لا يجب إنشاء حجز مباشر من المتصفح عبر جدول `bookings`.

---

# 14. الصلاحيات والأدوار

## المريض

يصل إلى:

- البحث والمقارنة العامة.
- حسابه.
- ملفات المرضى التابعة المسموح بها.
- الحجوزات الخاصة به.
- الإشعارات.
- المراجعات المسموح بها.

## العيادة

تعمل عبر `clinic_memberships`، والأدوار الحالية:

```text
owner
manager
receptionist
pricing_manager
viewer
```

## العميل التشغيلي

يستخدم `clinic_operator_accounts` مع نطاق وصول مقيد بالحجوزات/الفرع وفق العضوية. لا يعتمد الأمان على إخفاء رابط أو صفحة؛ RLS وRPC server-only هما الحاجز الحقيقي.

## مدير المنصة

يحتاج claims الإدارة المناسبة ويتم التحقق منها server-side/DB-side.

## Super Admin

العمليات الأعلى امتيازًا، مثل إدارة حسابات العملاء التشغيليين وإجراءات حسابات المرضى المقيدة، تمر عبر المسارات الخادمية وRPC المخصصة، ولا تمنح الواجهة أي امتياز بمجرد إظهار الزر.

---

# 15. المصادقة والحسابات

المشروع يستخدم Supabase Auth مع طبقة حساب داخلية تعتمد username/password وفق العقد الحالي.

الجداول ذات الصلة:

```text
auth.users
profiles
account_usernames
patient_profiles
clinic_memberships
clinic_operator_accounts
```

ملف المريض يمكن أن يحتوي على:

- الاسم المعروض.
- العلاقة `self/child/spouse/parent/other`.
- تاريخ الميلاد.
- الجنس.
- الرقم الوطني عند توفره وفق عقد التطبيق.
- الجنسية ISO alpha-2.
- الهاتف.
- `phone_verified_at`.
- `archived_at`.

كلمة المرور لا تُحفظ في `public` ولا تظهر في API أو README أو logs.

---

# 16. OTP / Twilio

التحقق من الهاتف موجود في الكود عبر:

```text
app/api/patient-phone-verification/start/route.ts
app/api/patient-phone-verification/confirm/route.ts
lib/phone-verification.server.ts
patient_phone_verification_challenges
```

عقود البيئة ذات الصلة:

```text
TWILIO_VERIFY_SERVICE_SID
TWILIO_API_KEY
TWILIO_API_SECRET
```

إذا لم تكن أسرار المزود مهيأة، يجب أن يفشل المسار بأمان؛ لا توجد بيانات اعتماد حقيقية في Git.

**لا تعتبر هذه الوثيقة تفعيلًا لـOTP الحقيقي ما لم يوجد تحقق تشغيلي مباشر من المزود في البيئة المستهدفة.**

---

# 17. الدعم والمساعد

المسار:

`/api/support`

المكونات:

```text
components/support-chat.tsx
lib/support-model.server.ts
lib/support-public-fallback.ts
support_knowledge_articles
support_conversations
support_messages
```

القواعد:

- الزائر يمكنه الحصول على دعم عام غير تشخيصي.
- المستخدم المصادق يمكن أن تكون له محادثة محفوظة وفق RLS.
- المقالات المعتمدة هي مصدر المعرفة المقيد عند توفرها.
- الحالات الطبية/الطارئة لا تمر إلى نموذج تشخيصي؛ تستخدم safety response.
- لا يُخترع سعر أو موعد أو سياسة.
- عند غياب خدمة خارجية، fallback محلي آمن هو المسار البديل.

---

# 18. Realtime

الـRealtime مستخدم لإعادة التحقق/التحديث في أسطح مختارة، وليس كبديل عن RLS.

المكونات الرئيسية:

```text
components/account-live-refresh.tsx
components/admin-analytics-live-refresh.tsx
components/clinic-live-refresh.tsx
components/results-live-refresh.tsx
components/use-realtime-router-refresh.ts
lib/clinic-realtime-refresh.ts
lib/realtime-refresh-policy.ts
```

تظل صلاحيات قاعدة البيانات هي الحكم النهائي للبيانات التي يمكن للمستخدم رؤيتها.

---

# 19. الإشعارات

البنية:

```text
notification_templates
notification_preferences
notification_subscriptions
notification_outbox
notification_delivery_attempts
```

الخدمة الخادمية:

`lib/notifications.server.ts`

القنوات المعرفة في المخطط تشمل `email`, `push`, `in_app`، مع دعم بنية SMS في subscriptions، بينما لا يعني وجود schema أن كل provider خارجي مفعّل في Production.

---

# 20. الأمن

الضوابط الحالية تشمل:

- RLS.
- Server-only RPCs للعمليات الحرجة.
- Zod validation.
- normalization للبيانات.
- rate limiting.
- idempotency.
- منع direct browser writes للعمليات الحساسة.
- CSP/PWA checks.
- فصل publishable Supabase key عن server secret.
- عدم وضع secrets في Git.
- حماية مسارات الإدارة والعيادات بالclaims/membership/RPC/RLS.
- منع ظهور بيانات synthetic/dev في البحث العام وفق migrations الحماية.

### Advisor الحالي في Supabase — Security

آخر فحص مباشر أظهر تحذيرًا واحدًا:

`auth_leaked_password_protection`

**Leaked Password Protection Disabled**

هذا يعني أن Supabase Auth لا يستخدم حاليًا فحص كلمات المرور المسربة مقابل HaveIBeenPwned.org. الحالة `WARN` وليست ادعاءً بأن النظام مخترق. يجب تفعيلها كتحسين أمني قبل اعتماد الوضع النهائي إذا كان متوافقًا مع سياسة المنتج.

### Advisor الحالي — Performance

ظهر عدد من `unused_index` كـ`INFO`، وليس كأخطاء تشغيلية. من أمثلتها:

```text
branch_service_offers_public_search_idx
clinic_operator_accounts_membership_idx
clinic_operator_account_events_operator_account_idx
idx_bookings_clinic_patient_created_at
bookings_clinic_start_at_idx
no_active_practitioner_overlap
no_active_resource_overlap
customer_choice_events_session_idx
branches_location_gist
availability_practitioner_time_idx
availability_resource_time_idx
bookings_offer_idx
payment_events_intent_idx
reconciliation_payment_idx
reviews_practitioner_idx
booking_attendance_occurred_idx
clinic_fee_rules_effective_idx
accounting_journals_period_idx
accounting_journal_lines_journal_idx
notification_outbox_dispatch_idx
support_messages_conversation_idx
```

لا يتم حذف index لمجرد ظهوره كـunused؛ يجب إثبات أنه غير مطلوب للخطط المستقبلية/قيود التزامن قبل أي DDL.

---

# 21. متغيرات البيئة

المصدر:

`.env.example`

الأسماء الحالية المتوقعة تشمل:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_BASE
OPENAI_API_KEY
TWILIO_VERIFY_SERVICE_SID
TWILIO_API_KEY
TWILIO_API_SECRET
PRODUCTION_READINESS_SEARCH_VARIANT
```

### القاعدة

- `NEXT_PUBLIC_*` فقط للقيم التي يمكن أن تكون عامة.
- `SUPABASE_SECRET_KEY` server-only.
- `SUPABASE_SERVICE_ROLE_KEY` legacy fallback server-only فقط عند الحاجة.
- مفاتيح OpenAI/Twilio server-only.
- لا توضع القيم الفعلية في README أو Git أو issue أو logs.

---

# 22. package.json والتقنيات

الاسم في `package.json`:

`qatar-dental-dev`

الإصدار:

`0.1.0`

التقنيات الحالية المثبتة في المستودع:

```text
Next.js ^16.3.1
React 19.2.8
React DOM 19.2.8
@supabase/ssr 0.12.4
@supabase/supabase-js 2.111.0
Zod 4.4.3
Tailwind CSS 4.3.3
@tailwindcss/postcss 4.3.3
TypeScript 5.8.3
ESLint 9.39.5
eslint-config-next ^16.3.1
Vitest 4.1.10
Playwright 1.62.0
@axe-core/playwright 4.13.0
Node types 26.1.2
```

---

# 23. أوامر التشغيل والتحقق

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run verify
npm run test:e2e
npm run check:production
npm run predeploy:check
npm run vercel-build
npm run start -- -p 3000
```

### معنى الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل Next.js محليًا. |
| `npm run typecheck` | فحص TypeScript دون إصدار ملفات. |
| `npm run lint` | ESLint. |
| `npm run test` | Vitest. |
| `npm run build` | Next.js production build. |
| `npm run verify` | predeploy + typecheck + lint + tests + build. |
| `npm run test:e2e` | build ثم Playwright. |
| `npm run check:production` | production readiness read-only check. |
| `npm run predeploy:check` | predeploy gates وكشف الأسرار والمسارات الحرجة. |
| `npm run vercel-build` | build command المستخدم في بيئة Vercel. |

---

# 24. الاختبارات

## Unit / integration-style tests

```text
tests/activity-report.test.ts
tests/booking-intent.test.ts
tests/booking-rls-recursion.test.ts
tests/choice-event-guard.test.ts
tests/client-booking-workspace.test.ts
tests/clinic-booking-attendance.test.ts
tests/clinic-realtime-refresh.test.ts
tests/clinic-role-display.test.ts
tests/customer-choice-analytics.test.ts
tests/device-installation-resilience.test.ts
tests/featured-treatments.test.ts
tests/health-route.test.ts
tests/i18n.test.ts
tests/locale-route.test.ts
tests/money-input.test.ts
tests/operation-feedback.test.ts
tests/operational-client-branches.test.ts
tests/patient-profiles-select-policy.test.ts
tests/phone-verification.test.ts
tests/price.test.ts
tests/production-readiness-check.test.ts
tests/realtime-refresh-policy.test.ts
tests/search-query-and-sort.test.ts
tests/server-operations.test.ts
tests/service-worker.test.ts
tests/supabase-public-connectivity.test.ts
tests/support-model.test.ts
tests/treatment-catalog-resilience.test.ts
tests/ui-design-system.test.ts
tests/validation.test.ts
```

## E2E

```text
tests/e2e/accessibility.spec.ts
tests/e2e/home.spec.ts
tests/e2e/password-reset.spec.ts
```

## Database acceptance

`supabase/tests/acceptance.sql`

## K6

```text
load-tests/k6/README.md
load-tests/k6/booking-flow.js
load-tests/k6/booking-integrity-flow.js
load-tests/k6/search-flow.js
load-tests/k6/shared.js
load-tests/k6/fixtures/booking-fixtures.example.json
```

**ممنوع تشغيل حمل هادم أو إنشاء حجوزات حقيقية في Production دون تفويض وخطة اختبار مستقلة.**

---

# 25. scripts

```text
scripts/generate-schema-baseline.py
scripts/predeploy-check.mjs
scripts/production-readiness-check.mjs
scripts/provision-role-simulation.mjs
scripts/safe-load-test.mjs
scripts/sync-supabase-types.mjs
scripts/verify-schema-baseline.py
```

---

# 26. Supabase source tree

```text
supabase/
  REMOTE_APPLIED_MIGRATIONS.md
  baselines/
    20260825000000_asnani_current_schema_snapshot.sql
    README.md
  migrations/
    *.sql — المصدر المتسلسل لكل تغييرات PostgreSQL/RLS/RPC/indexes/triggers
  seed.dev.sql
  tests/
    acceptance.sql
```

آخر migration source في `main`:

```text
supabase/migrations/20260906074120_remove_duplicate_account_username_index.sql
```

ولا توجد Edge Function files تشغيلية في شجرة Supabase الحالية، وهو متوافق مع جرد Supabase المباشر الذي أعاد صفر Edge Functions.

---

# 27. الملفات التنفيذية الرئيسية في app

```text
app/
  account/actions.ts
  account/page.tsx
  actions/locale.ts
  admin/actions.ts
  admin/page.tsx
  api/admin/reports/activity-csv/route.ts
  api/admin/reports/csv/route.ts
  api/book/route.ts
  api/choices/route.ts
  api/device-installations/route.ts
  api/health/route.ts
  api/locale/route.ts
  api/patient-booking-registration/route.ts
  api/patient-phone-verification/confirm/route.ts
  api/patient-phone-verification/start/route.ts
  api/search/route.ts
  api/support/route.ts
  apple-icon.tsx
  auth/confirm/page.tsx
  auth/forgot-password/page.tsx
  auth/signout/route.ts
  auth/update-password/page.tsx
  clinic/actions.ts
  clinic/bookings/page.tsx
  clinic/page.tsx
  globals.css
  icon.tsx
  layout.tsx
  login/actions.ts
  login/page.tsx
  manifest.ts
  operation-error/page.tsx
  page.tsx
  privacy/page.tsx
  pwa/icon/[size]/route.tsx
  results/page.tsx
  robots.ts
  sitemap.ts
  terms/page.tsx
  about/page.tsx
```

---

# 28. الملفات الجذرية المهمة

```text
.env.example
.github/workflows/ci.yml
.gitignore
AGENTS.md
CHANGELOG.md
README.md
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
package-lock.json
playwright.config.ts
postcss.config.mjs
proxy.ts
tsconfig.json
vercel.json
vitest.config.mts
todo.md
```

---

# 29. PWA وSEO

```text
app/manifest.ts
app/robots.ts
app/sitemap.ts
app/pwa/icon/[size]/route.tsx
public/sw.js
public/offline.html
```

الأصول الحالية:

```text
public/visuals/clinical-aurora-hero.webp
```

والـvisual evidence محفوظ في `docs/visual-proof/` و`docs/evidence/`.

---

# 30. الاتصال بين GitHub وVercel وSupabase

```text
GitHub
  Bomussa/dental-marketplace-pwa
        │
        │ Git integration
        ▼
Vercel
  Project: dental-marketplace-pwa
  Project ID: prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr
        │
        │ Next.js server/runtime
        ▼
Supabase
  Production ref: bqvcukxfsnchvkgejolz
  Staging ref:    yrlwoxlxizxgrodtbdcp
        │
        ├── Auth
        └── PostgreSQL + RLS + RPC + Realtime
```

لا توجد علاقة تشغيلية بين هذا المشروع وبين مستودعي `Bomussa/love` أو `Bomussa/love-api`. **هذا المشروع مستقل عنهما.**

---

# 31. Vercel — تفاصيل آخر Deployment تم التحقق منه

```text
Project: dental-marketplace-pwa
Project ID: prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr
Deployment: dpl_45ZC9EiPh6oSwQkhXQtfyecHHkSz
State: READY
URL: dental-marketplace-40z349zgy-bomussa.vercel.app
Source: git
Branch: feat/vision-goals-screen
GitHub PR: #19
GitHub commit: bd815f001175218b04d679e5ca33af40c0fca0d8
Bundler: turbopack
Region: iad1
```

هذا deployment يثبت Preview ناجحًا للميزة الجديدة. لا يثبت أنه Production.

---

# 32. Production status — ما يمكن وما لا يمكن قوله

### مثبت

- يوجد Production deployment سابق موثق بحالة `READY` في `docs/CURRENT_PRODUCTION_STATUS.md`.
- `main` الآن أحدث من ذلك الإصدار.
- آخر Preview مباشر للميزة الجديدة `READY`.
- Supabase Production `ACTIVE_HEALTHY`.
- آخر migration في Supabase Production هو `20260906074120`.

### غير مثبت حاليًا من آخر تحقق مباشر

- أن commit `84addac` منشور في Production.
- أن `/about` موجود على النطاق Production قبل نشر `main` الجديد.
- أن OTP الحقيقي يعمل end-to-end في Production.
- أن جميع العيادات التشغيلية الحقيقية معتمدة وجاهزة للحجز.
- أن Realtime للحجز قد خضع لاختبار تشغيلي حي حديث.
- أن K6 للحجز التشغيلي تم تشغيله على Production.

لا يجوز تحويل أي بند من القسم السابق إلى ادعاء جاهزية أو تفعيل إلا بعد إثبات مباشر.

---

# 33. التشغيل المحلي

```bash
cp .env.example .env.local
npm install
npm run verify
npm run test:e2e
npm run dev
```

لتشغيل build محليًا:

```bash
npm run build
npm run start -- -p 3000
```

يجب أن تكون قيم Supabase العامة الصحيحة موجودة في البيئة المحلية. لا تنسخ secrets Production إلى Git أو إلى ملفات قابلة للرفع.

---

# 34. قواعد التطوير وعدم التعارض

1. لا تكرر validation schema خارج `lib/validation.ts` دون سبب موثق.
2. لا تنشئ مسار حجز جديدًا خارج `/api/book` دون عقد أمني واضح ومراجعة.
3. لا تكتب مباشرة إلى الجداول الحساسة من المتصفح.
4. لا تعتمد على إخفاء الأزرار كصلاحية.
5. لا تستخدم service role/secret key في Client Component.
6. لا تضف أسعارًا أو عيادات أو مواعيد وهمية إلى Production.
7. لا تعدّل Production schema يدويًا دون migration مصدرية قابلة لإعادة التطبيق.
8. كل migration جديد يجب أن يظهر في `supabase/migrations/` ويُراجع تسلسله.
9. بعد أي DDL، أعد فحص RLS وRPC grants وSupabase Advisors.
10. لا تُعتبر Preview مساوية لـProduction.
11. لا تعتبر وجود schema/provider adapter دليلًا على تفعيل المزود الخارجي.
12. أي تغيير في endpoint أو table أو RPC أو environment contract يجب أن يرافقه تحديث README والوثيقة المتخصصة ذات الصلة.
13. لا تُكتب secrets أو PII أو بيانات اعتماد حقيقية في README أو docs أو issues.
14. لا تُستخدم البيانات الاصطناعية لتجاوز `verification/activation` gates.

---

# 35. الوثائق المرجعية داخل المستودع

الوثائق التشغيلية المهمة:

```text
docs/ARCHITECTURE_AND_CODE_MAP_AR.md
docs/DEPLOYMENT_RUNBOOK.md
docs/MAINTENANCE_MANUAL_AR.md
docs/CURRENT_PRODUCTION_STATUS.md
docs/RELEASE_READINESS_AUDIT_2026-08-25.md
docs/PRODUCTION_LAUNCH_READINESS_AUDIT_2026-08-18.md
docs/TREATMENT_CATALOG_AND_PRICE_SCOPE_AUDIT_2026-08-18.md
docs/BOOKING_ACCESS_REALTIME_CONTRACT_2026-08-17.md
docs/ACCESS_CONTROL_VERIFICATION_2026-08-24.md
docs/SUPPORT_AND_ACCESS_GOVERNANCE_2026-08-24.md
docs/INCIDENT_RESPONSE_AND_RECOVERY_AR.md
docs/OPERATIONS_MANUAL_AR.md
docs/SOURCE_MANIFEST.md
docs/TEST_REPORT.md
docs/README.md
```

تقارير التدقيق المؤرخة هي evidence/snapshots وليست بديلًا عن الحالة الحية في GitHub/Vercel/Supabase.

---

# 36. سياسة تحديث README

هذا الملف هو **وصف الحالة الحالية وليس سجلًا تاريخيًا جامدًا**.

عند حدوث أي تغيير في:

- GitHub branch/commit structure.
- Vercel project/deployment/domain.
- Supabase project/schema/migration/RLS/RPC.
- API endpoints.
- Auth/roles.
- environment contracts.
- booking rules.
- treatment/price rules.
- notification behavior.
- Realtime behavior.
- PWA/SEO paths.

يجب تحديث README في نفس دورة التغيير، مع إبقاء الوثائق التاريخية المؤرخة دون إعادة كتابة بأثر رجعي.

---

# 37. مصدر الحقيقة النهائي

عند وجود تعارض بين وثيقة قديمة والحالة الحية:

```text
Supabase live schema/migrations
        +
Vercel live deployment metadata
        +
GitHub main source tree
        ↓
الحالة التشغيلية الحالية
```

التقارير المؤرخة تحت `docs/` تستخدم لإثبات ما حدث في تاريخ محدد، وليست وحدها مصدرًا للحالة الحالية.

**آخر مزامنة موثقة لهذا README: 2026-09-07.**
