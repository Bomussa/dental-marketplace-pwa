# أسناني قطر — MMC-MMS

> **المرجع الهندسي والتشغيلي الحالي للمستودع.**
>
> تمت مزامنة هذا الملف بعد التحقق المباشر من GitHub وVercel وSupabase في **2026-09-07**. أي حالة تاريخية يجب قراءتها كسجل زمني، بينما الحالة الحالية يحكمها المصدر الحي في GitHub/Vercel/Supabase.
>
> **مهم:** هذا المشروع هو `Bomussa/dental-marketplace-pwa` فقط. لا علاقة تشغيلية له بمستودعي `Bomussa/love` أو `Bomussa/love-api`.

## 1. تعريف المشروع ونطاقه

**أسناني قطر (MMC-MMS)** منصة رقمية لسوق خدمات الأسنان في قطر. الهدف التشغيلي هو:

`ابحث ← قارن ← اختر ← احجز`

المنصة تقوم باكتشاف خدمات الأسنان، مطابقة النوع العلاجي الدقيق، مقارنة عروض الأسعار ونطاقها، إظهار التوفر والمواعيد، ثم إنشاء وإدارة الحجز. وهي ليست جهة تشخيص أو علاج أو اعتماد طبي، ولا يجوز للكود اختراع سعر أو موعد أو معلومة عن شمول الخدمة.

المنتج Mobile-first وRTL ويدعم العربية والإنجليزية وPWA، مع طبقات server-side وPostgreSQL/RLS/RPC لضمان سلامة العمليات الحساسة.

**الموقع Production:** `https://www.mmc-mms.com`

---

# 2. الحالة الحالية الموثقة — 2026-09-07

| العنصر | الحالة الفعلية التي تم التحقق منها |
|---|---|
| GitHub | `Bomussa/dental-marketplace-pwa` |
| Default branch | `main` |
| أحدث commit على main | `153d2e134827e61b4cf10a189b091330e8571879` — `docs: synchronize README with current GitHub Vercel and Supabase state` |
| commit الميزة السابقة | `84addac162e3b0a36d2729056b760502bb0ae8d1` — إضافة `/about` |
| Vercel project | `dental-marketplace-pwa` |
| Vercel project ID | `prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr` |
| Vercel team | `team_aFtFTvzgabqENB5bOxn4SiO7` |
| Framework | Next.js |
| Node.js | `24.x` |
| Production deployment الحالي | `dpl_HXUvTBS27pjDdKLFk8pV3jfhADv5` |
| Production state | `READY` |
| Production commit | `153d2e134827e61b4cf10a189b091330e8571879` |
| Production branch | `main` |
| Production region | `iad1` |
| Bundler | Turbopack |
| Production aliases | `www.mmc-mms.com`, `mmc-mms.com`, `dental-marketplace-pwa.vercel.app`, `dental-marketplace-pwa-bomussa.vercel.app`, `dental-marketplace-pwa-git-main-bomussa.vercel.app` |
| Supabase Production | `qatar-dental-dev` |
| Supabase ref | `bqvcukxfsnchvkgejolz` |
| Supabase region | `eu-central-1` |
| Supabase status | `ACTIVE_HEALTHY` |
| PostgreSQL | `17.6.1.155` / engine 17 |
| Supabase Staging | `asnani-staging` / `yrlwoxlxizxgrodtbdcp` |
| Production Edge Functions | لا توجد Edge Functions منشورة حاليًا (`[]`) |
| آخر migration Production | `20260906074120_remove_duplicate_account_username_index` |
| public tables | 49، وكلها RLS-enabled في الجرد الحالي |
| Security Advisor | تحذير واحد: `auth_leaked_password_protection` |
| Performance Advisor | INFO لعدد من unused indexes؛ ليست أخطاء تشغيلية |
| Vercel runtime errors | لا توجد أخطاء runtime مجمعة خلال آخر 7 أيام عند التحقق |

**تصحيح مهم عن الحالة السابقة:** لم يعد صحيحًا القول إن Production متأخر عن `main`. تم نشر commit `153d2e134827e61b4cf10a189b091330e8571879` إلى Production بنجاح، وحالة deployment الحالية `READY`.

---

# 3. دليل النشر الحالي

Production deployment:

```text
Deployment: dpl_HXUvTBS27pjDdKLFk8pV3jfhADv5
State: READY
Target: production
Source: git
Branch: main
Git SHA: 153d2e134827e61b4cf10a189b091330e8571879
Commit: docs: synchronize README with current GitHub Vercel and Supabase state
Region: iad1
Bundler: turbopack
```

Vercel build logs أثبتت بالتتابع:

```text
predeploy checks
TypeScript
ESLint
Vitest
Next.js production build
25/25 static pages generated
Deployment completed
```

نتيجة الاختبارات في هذا deployment:

```text
30 test files passed
107 tests passed
1 skipped
```

لا توجد أخطاء runtime مجمعة في آخر 7 أيام وفق Vercel Runtime Errors عند آخر تحقق.

---

# 4. المعمارية الكاملة

```text
User Browser / PWA
        │
        ▼
Next.js App Router
        │
        ├── Server Components
        ├── Client Components
        ├── Server Actions
        ├── Route Handlers (/api/*)
        └── root proxy.ts
                │
                ▼
        Validation / normalization
                │
                ▼
        Server-only domain operations
                │
                ▼
        Supabase client / RPC
                │
                ▼
        PostgreSQL
        ├── RLS
        ├── grants
        ├── constraints
        ├── triggers
        ├── indexes
        ├── exclusion/concurrency rules
        └── transactional booking logic
                │
                ├── Auth
                └── Realtime
```

Next.js 16 يستخدم convention باسم `proxy.ts` بدل `middleware.ts`. الـProxy ليس طبقة التفويض الوحيدة؛ التحقق من الصلاحية يجب أن يبقى داخل Server Actions/Route Handlers/RPC/RLS حسب العملية. هذا يتوافق مع توجيهات Next.js الحالية. citeturn2search0turn2search1

---

# 5. طبقات المشروع: أين أجد الكود؟

| المسار | الدور |
|---|---|
| `app/` | صفحات App Router، layouts، Server Actions، Route Handlers، metadata/PWA/SEO |
| `components/` | UI والمكونات التفاعلية والتحديث اللحظي |
| `lib/` | domain logic، validation، auth، Supabase clients، search، pricing، notifications، support |
| `supabase/migrations/` | المصدر المتسلسل لتغييرات PostgreSQL/RLS/RPC/indexes/triggers |
| `supabase/baselines/` | baseline schema موثق |
| `supabase/tests/` | اختبارات قبول قاعدة البيانات |
| `tests/` | Vitest والاختبارات التكاملية الخفيفة |
| `tests/e2e/` | Playwright E2E |
| `load-tests/k6/` | سيناريوهات البحث والحجز وسلامة الحجز تحت الحمل |
| `scripts/` | readiness، predeploy، schema baseline، role simulation، safe load، type sync |
| `docs/` | runbooks، خرائط الكود، تقارير التدقيق، evidence |
| `public/` | service worker، offline shell، assets |
| `presentations/` | مواد العرض وليست runtime |
| `proxy.ts` | طبقة الطلبات الأمامية/تحديث جلسة Supabase والـrequest handling |

---

# 6. المسارات والصفحات

```text
/                         home/search
/about                    vision & goals
/results                  search results/comparison
/login                    account login
/auth/confirm             auth confirmation
/auth/forgot-password     password recovery start
/auth/update-password     password update
/auth/signout             POST signout
/account                  patient account
/clinic                   clinic workspace
/clinic/bookings          clinic operational bookings
/admin                    platform administration
/privacy                  privacy policy
/terms                    terms
/operation-error          safe operational error surface
/manifest.webmanifest     PWA manifest
/pwa/icon/[size]          dynamic PWA icon
/robots.txt               SEO crawler rules
/sitemap.xml              SEO sitemap
```

Route Handlers في Next.js تكون داخل `app` في ملفات `route.ts` وتدعم HTTP methods القياسية. citeturn2search3turn2search5

---

# 7. جميع Route Handlers الحالية

```text
app/api/health/route.ts
app/api/search/route.ts
app/api/book/route.ts
app/api/choices/route.ts
app/api/device-installations/route.ts
app/api/locale/route.ts
app/api/patient-booking-registration/route.ts
app/api/patient-phone-verification/start/route.ts
app/api/patient-phone-verification/confirm/route.ts
app/api/support/route.ts
app/api/admin/reports/csv/route.ts
app/api/admin/reports/activity-csv/route.ts
```

| Endpoint | Method | نقطة التنفيذ الأساسية |
|---|---|---|
| `/api/health` | GET | health response آمنة ومحدودة |
| `/api/search` | GET | `lib/search-query.ts` + `lib/search-offers.ts` + Supabase search RPC |
| `/api/book` | POST | `lib/booking-intent.client.ts` → server operation → `book_slot_server`/booking RPC |
| `/api/choices` | POST | guard + server ingestion إلى `customer_choice_events` |
| `/api/device-installations` | POST | guarded server registration |
| `/api/locale` | GET/POST | locale contract |
| `/api/patient-booking-registration` | POST | patient/account booking registration |
| `/api/patient-phone-verification/start` | POST | server OTP adapter + challenge |
| `/api/patient-phone-verification/confirm` | POST | OTP confirmation + atomic finalize |
| `/api/support` | POST | safety routing + knowledge/fallback/model adapter |
| `/api/admin/reports/csv` | GET | authenticated admin export |
| `/api/admin/reports/activity-csv` | GET | authenticated activity export |

**قاعدة أمنية:** لا تعتمد API على إخفاء عناصر الواجهة. Route Handler نفسه يتحقق من session/claims/ownership/role، ثم RPC/RLS يفرض الحد النهائي.

---

# 8. Server Actions

```text
app/account/actions.ts
app/admin/actions.ts
app/clinic/actions.ts
app/login/actions.ts
app/actions/locale.ts
```

أي تعديل في بيانات حساسة يجب أن يبقى server-side، مع validation وauthorization وعدم الثقة في قيم العميل.

---

# 9. الملفات الرئيسية في `app/`

```text
app/about/page.tsx
app/account/actions.ts
app/account/page.tsx
app/actions/locale.ts
app/admin/actions.ts
app/admin/page.tsx
app/api/admin/reports/activity-csv/route.ts
app/api/admin/reports/csv/route.ts
app/api/book/route.ts
app/api/choices/route.ts
app/api/device-installations/route.ts
app/api/health/route.ts
app/api/locale/route.ts
app/api/patient-booking-registration/route.ts
app/api/patient-phone-verification/confirm/route.ts
app/api/patient-phone-verification/start/route.ts
app/api/search/route.ts
app/api/support/route.ts
app/apple-icon.tsx
app/auth/confirm/page.tsx
app/auth/forgot-password/page.tsx
app/auth/signout/route.ts
app/auth/update-password/page.tsx
app/clinic/actions.ts
app/clinic/bookings/page.tsx
app/clinic/page.tsx
app/globals.css
app/icon.tsx
app/layout.tsx
app/login/actions.ts
app/login/page.tsx
app/manifest.ts
app/operation-error/page.tsx
app/page.tsx
app/privacy/page.tsx
app/pwa/icon/[size]/route.tsx
app/results/page.tsx
app/robots.ts
app/sitemap.ts
app/terms/page.tsx
```

---

# 10. المكونات `components/`

```text
components/account-booking-notifications.tsx
components/account-live-refresh.tsx
components/activity-report-card.tsx
components/admin-analytics-live-refresh.tsx
components/admin-choice-analytics.tsx
components/app-icon-artwork.tsx
components/book-button.tsx
components/brand-lockup.tsx
components/clinic-booking-actions.tsx
components/clinic-booking-status-form.tsx
components/clinic-live-refresh.tsx
components/device-installation-registrar.tsx
components/forgot-password-form.tsx
components/icons.tsx
components/locale-provider.tsx
components/locale-toggle.tsx
components/mobile-navigation.tsx
components/price-scope-fields.tsx
components/price-scope-summary.tsx
components/print-report-button.tsx
components/public-policy-template.tsx
components/results-live-refresh.tsx
components/search-form.tsx
components/site-header.tsx
components/super-admin-user-management.tsx
components/support-chat.tsx
components/ui.tsx
components/update-password-form.tsx
components/use-realtime-router-refresh.ts
```

المكونات لا تمنح صلاحيات. أي button أو UI state هو presentation؛ authorization الحقيقي في server/database.

---

# 11. المكتبات `lib/` ومكان كل مسؤولية

```text
lib/account-auth.server.ts
lib/account-copy.ts
lib/account-nationality-options.ts
lib/activity-report.ts
lib/admin-copy.ts
lib/auth-claims.server.ts
lib/booking-intent.client.ts
lib/choice-event-guard.ts
lib/choice-events.client.ts
lib/client-booking-workspace.ts
lib/clinic-booking-attendance.ts
lib/clinic-copy.ts
lib/clinic-realtime-refresh.ts
lib/clinic-role-display.ts
lib/customer-choice-analytics.ts
lib/database.types.ts
lib/device-installation.client.ts
lib/i18n/ar.ts
lib/i18n/en.ts
lib/i18n/index.ts
lib/models.ts
lib/money-input.ts
lib/notifications.server.ts
lib/operation-feedback.ts
lib/operational-client-branches.ts
lib/operations.server.ts
lib/phone-verification.server.ts
lib/price-scope.ts
lib/price.ts
lib/public-write-request-guard.ts
lib/realtime-refresh-policy.ts
lib/search-offers.ts
lib/search-query.ts
lib/server-readiness.ts
lib/supabase/admin.ts
lib/supabase/client.ts
lib/supabase/proxy.ts
lib/supabase/server.ts
lib/support-model.server.ts
lib/support-public-fallback.ts
lib/treatment-catalog.server.ts
lib/validation.ts
```

### خريطة الإصلاحات والبحث

- validation/Zod → `lib/validation.ts`
- authorization claims → `lib/auth-claims.server.ts`
- server operations → `lib/operations.server.ts`
- search query parsing → `lib/search-query.ts`
- offer search/domain mapping → `lib/search-offers.ts`
- price representation → `lib/price.ts`, `lib/money-input.ts`
- price scope rules → `lib/price-scope.ts`
- booking intent → `lib/booking-intent.client.ts`
- public write guard → `lib/public-write-request-guard.ts`
- OTP/Twilio adapter → `lib/phone-verification.server.ts`
- notifications → `lib/notifications.server.ts`
- support/model routing → `lib/support-model.server.ts`, `lib/support-public-fallback.ts`
- treatment catalog → `lib/treatment-catalog.server.ts`
- Supabase browser client → `lib/supabase/client.ts`
- Supabase SSR client → `lib/supabase/server.ts`
- Supabase session/proxy integration → `lib/supabase/proxy.ts`
- privileged server client → `lib/supabase/admin.ts`
- database-generated types → `lib/database.types.ts`
- readiness checks → `lib/server-readiness.ts`

---

# 12. Supabase Production

```text
Project: qatar-dental-dev
Ref: bqvcukxfsnchvkgejolz
Region: eu-central-1
Status: ACTIVE_HEALTHY
PostgreSQL: 17.6.1.155
```

Supabase هو PostgreSQL فعلي، وRLS هو طبقة authorization داخل قاعدة البيانات؛ لا ينبغي اعتبار UI أو Route Handler وحده حدًا أمنيًا. citeturn0search0turn0search3

## 12.1 الجداول العامة — 49

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

كل هذه الجداول كانت `rls_enabled=true` في الجرد الحالي. توجد أيضًا قيود FK/check/unique وتوليد UUID حسب الجدول.

## 12.2 مجموعات البيانات

```text
Identity/Auth:
profiles, account_usernames, patient_profiles, consent_records

Clinic/Branch:
clinics, branches, clinic_memberships, clinic_operator_accounts,
clinic_operator_account_events

Verification/Governance:
verification_records, suspensions, audit_events

Treatment/Search:
treatment_catalog, treatment_variants, branch_service_offers,
availability_slots, instant_slots, branch_hours, branch_hour_exceptions,
resources, practitioners

Booking:
bookings, booking_status_history, idempotency_keys,
booking_attendance_events

Price/Trust:
offer_revisions, price_disputes, clinic_fee_rules

Finance:
payment_intents, payment_events, reconciliation_exceptions,
settlement_periods, accounting_journals, accounting_journal_lines,
report_exports

Notifications:
notification_preferences, notification_subscriptions,
notification_templates, notification_outbox,
notification_delivery_attempts

Support:
support_knowledge_articles, support_conversations, support_messages

Telemetry:
customer_choice_events, device_installations, rate_limit_buckets,
feature_flags
```

---

# 13. PostgreSQL functions / RPC

الأسماء الظاهرة في Production catalog عند آخر جرد:

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

**ملاحظة:** `book_slot` له overload؛ عدد الأسماء ليس بالضرورة عدد function signatures.

Supabase يوصي بتقييد EXECUTE على الدوال الحساسة، واستخدام `security invoker` افتراضيًا أو ضبط `search_path` بعناية عند الحاجة إلى `security definer`. كما يمكن استخدام Postgres logs و`raise` لتسجيل أخطاء الدوال المعقدة. citeturn0search4

---

# 14. Edge Functions

الجرد المباشر لـProduction:

```text
[]
```

أي لا توجد Supabase Edge Functions منشورة حاليًا. المسارات الخادمية التشغيلية موجودة في Next.js/Vercel، بينما منطق البيانات الحرج موجود في PostgreSQL/RPC/RLS.

---

# 15. Migrations — آخر حالة Production

آخر migration مطبق:

```text
20260906074120_remove_duplicate_account_username_index
```

المigrations الأخيرة:

```text
20260828210145_harden_booking_eligibility_and_client_privileges_v2
20260828211437_normalize_account_username_case_v1
20260906074120_remove_duplicate_account_username_index
```

المصدر:

```text
supabase/migrations/*.sql
```

والتوثيق:

```text
supabase/REMOTE_APPLIED_MIGRATIONS.md
supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql
```

Supabase migration history منفصلة عن Git history، لذلك يجب الحفاظ على تطابق ملفات `supabase/migrations` مع تاريخ قاعدة البيانات وعدم إجراء DDL إنتاجي غير موثق. citeturn0search2turn0search5

---

# 16. تدفق البحث

```text
treatment_catalog
      ↓
treatment_variants
      ↓
search query validation
      ↓
search_dental_offers
      ↓
branch_service_offers
      ↓
availability / instant slots
      ↓
results page
```

المطابقة تعتمد على `treatment_variants.id`، وليس على نص حر فقط، لتقليل خلط الخدمات المختلفة.

العروض تحتوي على نطاقات السعر ومجال الشمول والتحقق وحالة العرض ووقت السريان.

---

# 17. تدفق السعر وسلامة السعر

العملة الحالية: `QAR`.

الأنواع:

```text
fixed
from
range
package
consultation_required
```

التمثيل المالي يستخدم minor units:

```text
min_minor
max_minor
```

ونطاق السعر محفوظ في `price_scope`، مع دوال:

```text
is_valid_price_scope
is_price_scope_publishable
enforce_public_offer_price_scope
```

المبدأ: لا ينشر العرض العام إذا كان نطاقه غير صالح، ولا يتم اختراع تكلفة مفقودة من الواجهة.

---

# 18. تدفق الحجز وسلامة التزامن

```text
Treatment
  ↓
Exact Variant
  ↓
Search
  ↓
Eligible Offer
  ↓
Eligible Slot
  ↓
Patient Account/Profile
  ↓
Phone verification when required
  ↓
POST /api/book
  ↓
Server validation
  ↓
book_slot_server / booking RPC
  ↓
transaction
  ├── idempotency
  ├── slot conflict protection
  ├── practitioner/resource overlap protection
  ├── offer snapshot
  ├── booking record
  ├── status history
  └── notification outbox where applicable
```

الحالات الموجودة في schema:

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

لا يجوز للمتصفح تنفيذ `INSERT` مباشر إلى `bookings` كبديل لمسار الحجز الذري.

---

# 19. أين أبحث عن الخطأ؟ — خريطة التشخيص

| المشكلة | ابدأ من |
|---|---|
| الصفحة لا تظهر | `app/<route>/page.tsx` ثم `app/layout.tsx` ثم Vercel build/runtime |
| API 4xx/5xx | `app/api/<route>/route.ts` ثم `lib/validation.ts` ثم `lib/operations.server.ts` ثم RPC/RLS |
| بحث خاطئ | `app/api/search/route.ts` → `lib/search-query.ts` → `lib/search-offers.ts` → `search_dental_offers` |
| سعر خاطئ/غير قابل للنشر | `lib/price.ts` → `lib/price-scope.ts` → `branch_service_offers` → price RPC/triggers |
| حجز مكرر | `app/api/book/route.ts` → idempotency → `book_slot_server` → `idempotency_keys`/`bookings` |
| تعارض موعد | `availability_slots` → booking RPC → overlap constraints/indexes |
| مشكلة صلاحية مريض | `lib/auth-claims.server.ts` → `patient_profiles` RLS → booking policies/RPC |
| مشكلة صلاحية عيادة | `clinic_memberships` → operator accounts → server RPC → RLS |
| مشكلة Super Admin | `app/admin/actions.ts` → `auth-claims.server.ts` → admin RPCs → `audit_events` |
| مشكلة OTP | start/confirm routes → `lib/phone-verification.server.ts` → `patient_phone_verification_challenges` → Twilio env |
| مشكلة دعم | `/api/support` → `lib/support-model.server.ts` → fallback → support tables |
| مشكلة notifications | `lib/notifications.server.ts` → outbox → delivery attempts → provider adapter |
| مشكلة Realtime | component live-refresh → `use-realtime-router-refresh.ts` → `realtime-refresh-policy.ts` → Supabase Realtime/RLS |
| مشكلة session | `proxy.ts` → `lib/supabase/proxy.ts` → `lib/supabase/server.ts` |
| مشكلة PWA | `app/manifest.ts`, `public/sw.js`, `public/offline.html` |
| مشكلة SEO | `app/robots.ts`, `app/sitemap.ts`, metadata/layout |
| مشكلة build | Vercel build logs → `package.json` → `next.config.ts` → typecheck/lint/test/build |
| مشكلة Production فقط | Vercel deployment/runtime logs أولًا، ثم Supabase live state |
| مشكلة DB/RLS | migration + table definition + policy/grant + RPC + `supabase/tests/acceptance.sql` |

---

# 20. السجلات والأدلة

## GitHub

المصدر لتاريخ الكود:

```text
commits
pull requests
.github/workflows/ci.yml
CHANGELOG.md
docs/*
```

## Vercel

المصدر لتشغيل التطبيق:

```text
Deployment state
Build logs
Runtime logs
Runtime Errors
Domains/Aliases
Git commit metadata
```

آخر تحقق: لا توجد runtime errors مجمعة خلال آخر 7 أيام.

## Supabase

المصدر لسلامة البيانات:

```text
live schema
migrations
RLS
RPC/function catalog
Security Advisor
Performance Advisor
Postgres logs
```

أي debug logging يجب ألا يسجل secrets أو OTP أو كلمات مرور أو PII غير الضرورية. يمكن للدوال PostgreSQL استخدام `raise` بمستويات مناسبة وفق إرشادات Supabase. citeturn0search4

---

# 21. Security Advisor — الحالة الفعلية

التحذير الحالي:

```text
auth_leaked_password_protection
Level: WARN
Leaked Password Protection Disabled
```

المعنى: Supabase Auth لا يفعّل حاليًا فحص كلمات المرور المسربة. هذا **تحسين أمني مطلوب** وليس دليل اختراق.

الإجراء الموصى به: تفعيل Leaked Password Protection قبل اعتبار hardening الأمني مكتملًا، وفق سياسة المنتج. citeturn0search7

---

# 22. Performance Advisor — الحالة الفعلية

يوجد عدد من `unused_index` بمستوى `INFO`. أمثلة موثقة:

```text
branch_service_offers_public_search_idx
clinic_operator_accounts_membership_idx
clinic_operator_account_events_operator_account_idx
idx_bookings_clinic_patient_created_at
bookings_clinic_start_at_idx
no_active_practitioner_overlap
no_active_resource_overlap
customer_choice_events_session_idx
customer_choice_events_variant_idx
customer_choice_events_treatment_idx
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
notification_outbox_template_id_idx
support_messages_conversation_idx
report_exports_settlement_period_id_idx
bookings_booked_by_user_created_idx
accounting_journals_reversed_journal_id_idx
```

لا يتم حذف index لمجرد ظهوره كـunused؛ بعض الفهارس موجودة لحماية التزامن/القيود أو لاستخدامات مستقبلية، ويجب إثبات عدم الحاجة قبل DDL.

---

# 23. RLS والامتيازات

كل جدول exposed في `public` يجب أن يملك RLS/grants مناسبة. RLS ليس مجرد filter في التطبيق؛ هو authorization داخل PostgreSQL ويمكنه حماية الوصول حتى عند استخدام أدوات أخرى تصل إلى قاعدة البيانات. توصي Supabase باختبارات allow/deny لـSELECT/INSERT/UPDATE/DELETE والأدوار ذات الصلة. citeturn0search3turn0search11

القواعد المحلية للمشروع:

1. لا direct browser write إلى الجداول الحساسة.
2. لا service-role في Client Component.
3. لا اعتبار إخفاء button authorization.
4. العمليات الحرجة تمر عبر server/RPC.
5. RLS هو الحاجز النهائي على البيانات المعروضة.
6. كل تغيير schema يجب أن يكون migration.
7. بعد DDL يعاد فحص RLS/grants/advisors.

---

# 24. الأدوار والصلاحيات

## Patient

- public search/comparison
- account
- patient profiles المسموح بها
- own bookings
- notifications
- eligible reviews

## Clinic membership roles

```text
owner
manager
receptionist
pricing_manager
viewer
```

## Clinic operator

`clinic_operator_accounts` مرتبط بعضوية وعيادة/فرع، والوصول مقيد server-side/RPC/RLS.

## Platform admin / Super Admin

العمليات الأعلى امتيازًا تمر عبر claims + server actions + privileged RPCs + audit trail. وجود رابط `/admin` لا يعني أن المستخدم يملك الصلاحية.

---

# 25. Authentication / Patient Accounts

الجداول الرئيسية:

```text
auth.users
profiles
account_usernames
patient_profiles
clinic_memberships
clinic_operator_accounts
```

`patient_profiles` في Production تحتوي قيودًا فعلية للـnational ID والهاتف والجنسية والعلاقة والجنس، ومنها:

```text
national_id: 11 digits when present
nationality: ISO alpha-2 uppercase when present
phone: E.164 when present
phone_verified_at
archived_at
```

لا تحفظ كلمات المرور في `public` ولا في README ولا في logs.

---

# 26. OTP / Twilio

الكود:

```text
app/api/patient-phone-verification/start/route.ts
app/api/patient-phone-verification/confirm/route.ts
lib/phone-verification.server.ts
patient_phone_verification_challenges
```

Environment contract:

```text
TWILIO_VERIFY_SERVICE_SID
TWILIO_API_KEY
TWILIO_API_SECRET
```

وجود adapter أو environment variable **لا يثبت وحده** أن مزود SMS يعمل end-to-end في Production؛ إثبات التفعيل يتطلب اختبارًا تشغيليًا فعليًا.

---

# 27. Support / Assistant

```text
app/api/support/route.ts
components/support-chat.tsx
lib/support-model.server.ts
lib/support-public-fallback.ts
support_knowledge_articles
support_conversations
support_messages
```

القواعد:

- لا تشخيص طبي.
- لا اختراع سعر/موعد.
- emergency/medical/privacy/billing/abuse لها safety categories.
- knowledge articles المعتمدة مصدر مقيد عندما تكون متاحة.
- fallback محلي آمن عند غياب provider خارجي.

---

# 28. Realtime

```text
components/account-live-refresh.tsx
components/admin-analytics-live-refresh.tsx
components/clinic-live-refresh.tsx
components/results-live-refresh.tsx
components/use-realtime-router-refresh.ts
lib/clinic-realtime-refresh.ts
lib/realtime-refresh-policy.ts
```

Realtime للتحديث/إعادة التحقق، وليس بديلًا عن RLS أو server authorization.

---

# 29. Notifications

```text
notification_templates
notification_preferences
notification_subscriptions
notification_outbox
notification_delivery_attempts
lib/notifications.server.ts
```

الـschema يعرف قنوات/حالات delivery، لكن وجود الجداول لا يعني أن كل provider خارجي مفعّل.

---

# 30. Environment Variables

المصدر: `.env.example`

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

القواعد:

```text
NEXT_PUBLIC_*                 public-safe values only
SUPABASE_SECRET_KEY           server-only
SUPABASE_SERVICE_ROLE_KEY     server-only legacy fallback
OPENAI_API_KEY                server-only
TWILIO_*                      server-only
```

لا توجد أسرار فعلية في README أو Git.

---

# 31. package.json والتقنيات الفعلية

`package.json` الحالي:

```text
next ^16.3.1
react 19.2.8
react-dom 19.2.8
@supabase/ssr 0.12.4
@supabase/supabase-js 2.111.0
zod 4.4.3
@axe-core/playwright 4.13.0
@playwright/test 1.62.0
@tailwindcss/postcss 4.3.3
@types/node 26.1.2
@types/react 19.2.18
@types/react-dom 19.2.3
eslint 9.39.5
eslint-config-next ^16.3.1
tailwindcss 4.3.3
typescript 5.8.3
vitest 4.1.10
```

اسم package: `qatar-dental-dev`

الإصدار: `0.1.0`

---

# 32. Scripts التشغيل والتحقق

```text
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run test
npm run test:watch
npm run test:e2e
npm run predeploy:check
npm run verify
npm run verify:e2e
npm run check:production
npm run vercel-build
```

المعاني:

- `typecheck`: TypeScript.
- `lint`: ESLint.
- `test`: Vitest.
- `test:e2e`: build + Playwright.
- `predeploy:check`: readiness/secrets/critical path gates.
- `verify`: predeploy + typecheck + lint + tests + build.
- `check:production`: readiness read-only check.
- `vercel-build`: نفس بوابة البناء المستخدمة على Vercel.

---

# 33. الاختبارات الموجودة

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

tests/e2e/accessibility.spec.ts
tests/e2e/home.spec.ts
tests/e2e/password-reset.spec.ts

supabase/tests/acceptance.sql
```

آخر Vercel build أثبت `30/30` test files و`107` tests passed و`1` skipped.

---

# 34. K6 / Load Testing

```text
load-tests/k6/README.md
load-tests/k6/booking-flow.js
load-tests/k6/booking-integrity-flow.js
load-tests/k6/search-flow.js
load-tests/k6/shared.js
load-tests/k6/fixtures/booking-fixtures.example.json
```

`booking-integrity-flow.js` مخصص لاختبارات سلامة الحجز/التزامن. لا تشغل load أو booking creation الحقيقي على Production دون بيئة/تفويض واضحين.

---

# 35. Scripts المشروع

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

# 36. Supabase source tree

```text
supabase/REMOTE_APPLIED_MIGRATIONS.md
supabase/seed.dev.sql
supabase/baselines/README.md
supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql
supabase/migrations/*.sql
supabase/tests/acceptance.sql
```

لا توجد Edge Function source files تشغيلية في الشجرة الحالية لأن Production لا يحتوي Edge Functions منشورة.

---

# 37. PWA / SEO / Static

```text
app/manifest.ts
app/robots.ts
app/sitemap.ts
app/pwa/icon/[size]/route.tsx
app/icon.tsx
app/apple-icon.tsx
public/sw.js
public/offline.html
public/visuals/clinical-aurora-hero.webp
```

Next.js App Router هو file-system based، لذلك إضافة/تغيير `page.tsx`, `layout.tsx`, `route.ts`, `robots.ts`, `sitemap.ts`, `manifest.ts` تغيّر behavior/route مباشرة. citeturn2search9turn2search11

---

# 38. الملفات الجذرية المهمة

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

# 39. التوثيق التشغيلي داخل `docs/`

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

التقارير المؤرخة evidence تاريخية. لا تستخدمها وحدها لإثبات الحالة الحالية إذا اختلفت عن GitHub/Vercel/Supabase.

---

# 40. آخر تحديث وظيفي: `/about`

الملف:

```text
app/about/page.tsx
```

المسار:

```text
/about
```

والربط في:

```text
app/layout.tsx
```

المحتوى:

- الرؤية.
- 10 أهداف تشغيلية.
- دور المنصة.
- `ابحث ← قارن ← اختر ← احجز`.
- disclaimer بأن المنصة ليست جهة تشخيص أو علاج أو اعتماد طبي.
- العربية والإنجليزية.
- responsive/mobile-first.

تم نشر هذا التغيير في Production ضمن commit `153d2e134827e61b4cf10a189b091330e8571879`.

---

# 41. الاتصال GitHub → Vercel → Supabase

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
Production: bqvcukxfsnchvkgejolz
Staging:    yrlwoxlxizxgrodtbdcp
       │
       ├── Auth
       ├── PostgreSQL
       ├── RLS
       ├── RPC
       └── Realtime
```

المسار التشغيلي الفعلي ليس Browser → database مباشرة للعمليات الحساسة؛ المسار المقصود هو Browser → Next.js server → Supabase/RPC/RLS.

---

# 42. Local development

```bash
cp .env.example .env.local
npm install
npm run verify
npm run dev
```

Production build:

```bash
npm run build
npm run start -- -p 3000
```

لا تنسخ secrets Production إلى Git أو issue أو README.

---

# 43. قواعد التطوير والإصلاح

1. ابدأ بتحديد المسار الفعلي: route/component/lib/RPC/table.
2. اقرأ validation قبل تعديل API.
3. اقرأ authorization قبل تعديل UI صلاحيات.
4. اقرأ migration وRLS قبل تعديل schema.
5. لا تنشئ endpoint موازيًا لعملية حساسة موجودة أصلًا.
6. لا تكرر schema validation دون سبب.
7. لا direct browser write إلى الجداول الحساسة.
8. لا تستخدم service role في client bundle.
9. لا تعتبر Proxy authorization بديلًا عن authorization داخل Server Function/RPC/RLS. citeturn2search1
10. لا تضع بيانات وهمية في Production.
11. لا تستخدم fixture/example على أنه production data.
12. كل DDL يجب أن يكون migration.
13. بعد DDL أعد فحص RLS/grants/advisors/tests.
14. لا تحذف indexes دون قياس/سبب موثق.
15. لا تعتبر provider adapter دليل تفعيل provider.
16. لا تعتبر deployment Preview دليل Production.
17. لا تعتبر `READY` وحدها دليل سلامة business data؛ يجب أيضًا فحص DB/RLS/runtime.
18. أي endpoint/table/RPC/env contract جديد يجب أن يوثق هنا وفي الوثيقة المتخصصة.
19. لا تسجل secrets/OTP/passwords/PII غير الضرورية.
20. عند وجود خطأ Production: ابدأ من Vercel runtime/build ثم route/lib ثم RPC/RLS ثم live DB.

---

# 44. قاعدة البيانات: أين يوجد كل إصلاح؟

```text
Schema creation/change        → supabase/migrations/*.sql
RLS policy                    → corresponding migration
RPC logic                     → migration defining the function
Booking integrity             → bookings + availability_slots + booking RPCs
Duplicate booking protection  → idempotency_keys + book_slot logic
Patient authorization         → patient_profiles + RLS/helpers
Clinic authorization          → clinic_memberships + operator accounts + RPC/RLS
Price integrity               → branch_service_offers + price scope functions/triggers
Search trust                  → search_dental_offers + public search guards
Verification/activation      → verification_records + verify_and_activate_server
Audit trail                   → audit_events / operator events / status history
Notifications                 → notification_outbox + delivery_attempts
Finance                       → payment_* + reconciliation + accounting + settlement
Support                       → support_* tables + support model/fallback
Telemetry                     → customer_choice_events
Rate limiting                 → rate_limit_buckets + consume_rate_limit_server
```

---

# 45. Release verification sequence

الترتيب المعتمد:

```text
DISCOVER
  ↓
VERIFY
  ↓
FIX
  ↓
TEST
  ↓
RE-TEST
  ↓
CLEAN
  ↓
FINAL RELEASE CHECK
```

لا يعتبر العمل منتهيًا بمجرد تعديل الكود. يجب أن تكون الحالة متطابقة بين source tree وbuild وdeployment وdatabase migrations والـsecurity model.

---

# 46. ما هو مثبت الآن وما هو غير مثبت

## مثبت

- `main` يحتوي commit `153d2e134827e61b4cf10a189b091330e8571879`.
- نفس commit منشور حاليًا في Vercel Production.
- Production deployment `READY`.
- build نجح.
- TypeScript نجح.
- ESLint نجح.
- 30 test files نجحت.
- 107 tests نجحت و1 skipped.
- 25/25 static pages generated.
- Supabase Production `ACTIVE_HEALTHY`.
- آخر migration `20260906074120_remove_duplicate_account_username_index`.
- لا توجد Edge Functions منشورة.
- لا توجد runtime errors مجمعة خلال آخر 7 أيام.

## غير مثبت بمجرد وجود الكود

- أن Twilio يعمل end-to-end دون اختبار provider حي.
- أن كل عيادة حقيقية جاهزة تشغيليًا.
- أن كل موعد حقيقي متاح للحجز ما لم يظهر من availability الفعلية.
- أن كل notification provider خارجي مفعّل.
- أن K6 تم تشغيله على Production في آخر release.
- أن تحذير leaked password protection تم حله؛ هو **ما زال قائمًا** عند آخر فحص.

هذه التفرقة مقصودة لمنع تحويل وجود schema/code إلى ادعاء تشغيل غير مثبت.

---

# 47. مبدأ البيانات الحقيقية

Production يجب أن يعتمد على:

```text
real clinic records
real verified offers
real availability
real booking records
real authorization
real audit trail
```

لا تستخدم:

```text
mock clinics
fake prices
fake availability
fake booking confirmations
fake verification evidence
```

يمكن استخدام fixtures في الاختبارات المعزولة فقط، ويجب ألا تتسرب إلى public search أو Production business state.

---

# 48. سياسة تحديث README

يجب تحديث README عند أي تغيير في:

```text
GitHub structure/branch/commit
Vercel project/deployment/domain/runtime
Supabase project/schema/migration/RLS/RPC
API endpoint/method/contract
Auth/role/permission
Environment contract
Booking lifecycle
Search/treatment rules
Price rules
Notifications
Realtime
PWA/SEO
Tests/load tests
Security/performance findings
```

التاريخ الحالي للمزامنة: **2026-09-07**.

---

# 49. Source of Truth

عند التعارض:

```text
1. Supabase live schema + applied migrations
2. Vercel live deployment metadata + build/runtime logs
3. GitHub main source tree
4. dated docs/evidence
```

الوثائق القديمة لا تتغلب على الحالة الحية.

**هذا README لا يخفي وجود فجوات تشغيلية مثبتة، ولا يملأها بالتخمين. أي شيء غير مثبت مذكور صراحة كغير مثبت.**

---

## مراجع تقنية خارجية مستخدمة لتثبيت القواعد

- Next.js App Router / project structure / Route Handlers / Proxy.
- Supabase Database / RLS / Database Functions / migrations / testing.

هذه المراجع لا تستبدل كود المشروع أو الحالة الحية؛ تستخدم فقط لتثبيت الممارسات التقنية العامة.
