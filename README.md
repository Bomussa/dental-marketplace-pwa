# أسناني قطر — MMC-MMS

> **المرجع الهندسي والتشغيلي الشامل للمشروع.**
>
> تمت مزامنة هذا الملف من الحالة الحية لـ GitHub وVercel وSupabase في **2026-09-07**. لا يُسمح باستخدام وثيقة تاريخية لإثبات حالة حالية إذا تعارضت مع المصدر الحي.
>
> **المستودع الوحيد لهذا المشروع:** `Bomussa/dental-marketplace-pwa`.
> **لا علاقة تشغيلية** لهذا المشروع بمستودعي `Bomussa/love` أو `Bomussa/love-api`.

---

## 1. تعريف المنتج ونطاقه

**أسناني قطر (MMC-MMS)** منصة سوق رقمية لخدمات الأسنان في قطر، ومسارها الأساسي:

`ابحث ← قارن ← اختر ← احجز`

المنتج:

- اكتشاف خدمات الأسنان.
- اختيار العلاج/الخدمة من كتالوج مضبوط.
- مطابقة `treatment_variant` بدلاً من الاعتماد على نص حر فقط.
- مقارنة عروض العيادات والأسعار ونطاق الشمول.
- عرض التوفر والمواعيد الفعلية.
- إنشاء وإدارة الحجز.
- حسابات المرضى وملفات المرضى التابعة للحساب.
- تشغيل العيادات والفروع والصلاحيات.
- تحقق/اعتماد الكيانات قبل تفعيلها للعامة.
- إشعارات، دعم، تقارير، تدقيق، وRealtime.
- PWA وSEO وواجهة RTL عربية/إنجليزية.

المنصة **ليست** جهة تشخيص أو علاج أو اعتماد طبي، ولا يجوز للكود اختراع سعر أو موعد أو معلومة عن شمول الخدمة.

لا تُستخدم المنصة كـEMR ولا لتخزين السجلات الطبية أو الصور التشخيصية أو الوصفات الطبية ضمن نطاق هذا المنتج.

Production:

- `https://www.mmc-mms.com`
- `www.mmc-mms.com`
- `mmc-mms.com`

---

# 2. الحالة الحية — 2026-09-07

| العنصر | الحالة الحالية المثبتة |
|---|---|
| GitHub | `Bomussa/dental-marketplace-pwa` |
| Default branch | `main` |
| HEAD | `5c565b665fc2d059049774491ff38edaf86d8733` |
| HEAD message | `docs: make README production-current and exhaustive engineering map` |
| Vercel project | `dental-marketplace-pwa` |
| Vercel project ID | `prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr` |
| Vercel team | `team_aFtFTvzgabqENB5bOxn4SiO7` |
| Framework | Next.js |
| Node runtime | `24.x` |
| Bundler | Turbopack |
| Current Production deployment | `dpl_E3Je2mPSjbC7iNQd2MbFXbQvotgf` |
| Deployment state | `READY` |
| Deployment target | `production` |
| Deployment region | `iad1` |
| Deployment source | Git |
| Deployment commit | `5c565b665fc2d059049774491ff38edaf86d8733` |
| Production aliases | `www.mmc-mms.com`, `mmc-mms.com`, `dental-marketplace-pwa.vercel.app`, `dental-marketplace-pwa-bomussa.vercel.app`, `dental-marketplace-pwa-git-main-bomussa.vercel.app` |
| Supabase Production | `qatar-dental-dev` |
| Supabase ref | `bqvcukxfsnchvkgejolz` |
| Supabase region | `eu-central-1` |
| Supabase status | `ACTIVE_HEALTHY` |
| PostgreSQL | `17.6.1.155` / engine 17 |
| Supabase Staging | `asnani-staging` / `yrlwoxlxizxgrodtbdcp` |
| Public base tables | `49` |
| Public tables with RLS | `49 / 49` |
| Public indexes | `193` |
| Public RLS policies | `104` |
| Public triggers | `57` |
| Public functions | `46` names/signatures may exceed this when overloads are counted separately |
| Installed extensions | `7` |
| Production Edge Functions | `0` deployed |
| Latest applied migration | `20260906074120_remove_duplicate_account_username_index` |

### Security/performance state

- Security Advisor: **1 WARN** — `auth_leaked_password_protection` (Leaked Password Protection Disabled).
- Performance Advisor: INFO findings for unused indexes.
- هذه ليست علامة على اختراق؛ لكنها ليست حالة "zero warnings".
- لا تُحذف الفهارس INFO تلقائياً؛ يجب إثبات عدم الحاجة من workload فعلي.

---

# 3. المعمارية التشغيلية

```text
Browser / PWA
    │
    ▼
Next.js App Router
    ├── Server Components
    ├── Client Components
    ├── Server Actions
    ├── Route Handlers (/api/*)
    └── proxy.ts
            │
            ▼
Validation / normalization / auth checks
            │
            ▼
Server-only domain operations
            │
            ▼
Supabase client / PostgreSQL RPC
            │
            ▼
PostgreSQL
    ├── RLS
    ├── Grants
    ├── Constraints
    ├── Exclusion constraints
    ├── Unique constraints
    ├── Triggers
    ├── Indexes
    └── Transactional state transitions
            │
            ├── Auth
            └── Realtime
```

العمليات الحساسة لا تعتمد على حماية الواجهة. الـUI والـProxy ليسا authorization boundary نهائيًا؛ الحماية الفعلية موزعة بين Server Actions/Route Handlers وRPC وRLS وPostgres constraints.

---

# 4. هيكل المستودع الكامل المهم للتشغيل

```text
.env.example
.github/workflows/ci.yml
AGENTS.md
CHANGELOG.md
README.md
app/
components/
docs/
eslint.config.mjs
lib/
load-tests/k6/
next.config.ts
package.json
package-lock.json
playwright.config.ts
postcss.config.mjs
presentations/
proxy.ts
public/
scripts/
supabase/
tests/
todo.md
tsconfig.json
vercel.json
vitest.config.mts
```

## 4.1 App Router

```text
app/page.tsx
app/about/page.tsx
app/results/page.tsx
app/login/page.tsx
app/login/actions.ts
app/account/page.tsx
app/account/actions.ts
app/clinic/page.tsx
app/clinic/actions.ts
app/clinic/bookings/page.tsx
app/admin/page.tsx
app/admin/actions.ts
app/privacy/page.tsx
app/terms/page.tsx
app/operation-error/page.tsx
app/layout.tsx
app/globals.css
app/manifest.ts
app/robots.ts
app/sitemap.ts
app/icon.tsx
app/apple-icon.tsx
app/pwa/icon/[size]/route.tsx
app/auth/confirm/page.tsx
app/auth/forgot-password/page.tsx
app/auth/update-password/page.tsx
app/auth/signout/route.ts
app/actions/locale.ts
```

## 4.2 API Route Handlers

```text
GET   /api/health
GET   /api/search
POST  /api/book
POST  /api/choices
POST  /api/device-installations
GET   /api/locale
POST  /api/locale
POST  /api/patient-booking-registration
POST  /api/patient-phone-verification/start
POST  /api/patient-phone-verification/confirm
POST  /api/support
GET   /api/admin/reports/csv
GET   /api/admin/reports/activity-csv
```

المصدر البرمجي:

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

## 4.3 Components

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

## 4.4 lib/

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

### مسؤوليات lib الأساسية

| الملف | المسؤولية |
|---|---|
| `validation.ts` | validation/contracts |
| `auth-claims.server.ts` | claims/authorization context |
| `operations.server.ts` | server-only domain operations |
| `search-query.ts` | search parsing/validation |
| `search-offers.ts` | search result mapping |
| `price.ts` | monetary representation |
| `money-input.ts` | money input normalization |
| `price-scope.ts` | price inclusion/scope rules |
| `booking-intent.client.ts` | booking intent payload |
| `public-write-request-guard.ts` | public write abuse controls |
| `phone-verification.server.ts` | OTP provider adapter |
| `notifications.server.ts` | notification orchestration |
| `support-model.server.ts` | model-backed support adapter |
| `support-public-fallback.ts` | safe fallback support |
| `treatment-catalog.server.ts` | treatment catalog reads |
| `realtime-refresh-policy.ts` | Realtime refresh policy |
| `lib/supabase/*` | browser/SSR/proxy/admin Supabase clients |

---

# 5. Supabase source tree

```text
supabase/REMOTE_APPLIED_MIGRATIONS.md
supabase/seed.dev.sql
supabase/baselines/README.md
supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql
supabase/migrations/*.sql
supabase/tests/acceptance.sql
```

لا توجد Edge Function source files تشغيلية منشورة حاليًا؛ الجرد الحي للـProduction يعيد `[]`.

---

# 6. Production database — inventory كامل

## 6.1 الجداول الـ49

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

**RLS:** `49/49` public base tables مفعّل عليها Row Level Security.

## 6.2 تعريف الأعمدة الفعلي

السطور التالية هي جرد مباشر من `information_schema.columns` في Production، بما في ذلك النوع وNULLability وdefaults.

```text
account_usernames:
  user_id uuid NOT NULL
  username text NOT NULL
  disabled_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

accounting_journal_lines:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  journal_id uuid NOT NULL
  line_no smallint NOT NULL
  account_code text NOT NULL
  debit_minor integer NOT NULL DEFAULT 0
  credit_minor integer NOT NULL DEFAULT 0
  memo text
  created_at timestamptz NOT NULL DEFAULT now()

accounting_journals:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  branch_id uuid
  settlement_period_id uuid
  source_type text NOT NULL
  source_id text NOT NULL
  journal_type text NOT NULL
  status text NOT NULL DEFAULT 'draft'
  currency char(1) NOT NULL DEFAULT 'QAR'
  occurred_at timestamptz NOT NULL DEFAULT now()
  description text NOT NULL
  metadata jsonb NOT NULL DEFAULT '{}'
  created_by uuid NOT NULL
  posted_by uuid
  posted_at timestamptz
  reversed_journal_id uuid
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

audit_events:
  id bigint NOT NULL
  actor_id uuid
  action text NOT NULL
  target_type text NOT NULL
  target_id text
  metadata jsonb NOT NULL DEFAULT '{}'
  created_at timestamptz NOT NULL DEFAULT now()

availability_slots:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  branch_id uuid NOT NULL
  practitioner_id uuid
  resource_id uuid
  start_at timestamptz NOT NULL
  end_at timestamptz NOT NULL
  status text NOT NULL DEFAULT 'draft'
  freshness_at timestamptz NOT NULL DEFAULT now()
  expires_at timestamptz
  created_by uuid
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  variant_id uuid NOT NULL

booking_attendance_events:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  booking_id uuid NOT NULL
  event_type text NOT NULL
  reason text
  occurred_at timestamptz NOT NULL DEFAULT now()
  recorded_by uuid NOT NULL
  source_type text NOT NULL DEFAULT 'clinic_ui'
  source_id text
  created_at timestamptz NOT NULL DEFAULT now()
  sequence_no integer NOT NULL

booking_status_history:
  id bigint NOT NULL
  booking_id uuid NOT NULL
  from_status text
  to_status text NOT NULL
  actor_id uuid
  reason text
  created_at timestamptz NOT NULL DEFAULT now()

bookings:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  patient_id uuid NOT NULL
  clinic_id uuid NOT NULL
  branch_id uuid NOT NULL
  practitioner_id uuid
  resource_id uuid
  slot_id uuid NOT NULL
  offer_id uuid NOT NULL
  start_at timestamptz NOT NULL
  end_at timestamptz NOT NULL
  booking_period tstzrange
  status text NOT NULL DEFAULT 'pending_hold'
  offer_snapshot jsonb NOT NULL
  idempotency_key text NOT NULL
  booking_code text NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  booked_by_user_id uuid NOT NULL
  patient_profile_id uuid NOT NULL

branch_hour_exceptions:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  branch_id uuid NOT NULL
  local_date date NOT NULL
  open_time time
  close_time time
  is_closed boolean NOT NULL DEFAULT false
  reason text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

branch_hours:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  branch_id uuid NOT NULL
  weekday smallint NOT NULL
  open_time time
  close_time time
  is_closed boolean NOT NULL DEFAULT false
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

branch_service_offers:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  branch_id uuid NOT NULL
  variant_id uuid NOT NULL
  price_type text NOT NULL
  min_minor integer
  max_minor integer
  currency char(1) NOT NULL DEFAULT 'QAR'
  consultation_included boolean
  xray_included boolean
  anesthesia_included boolean
  lab_included boolean
  included_items jsonb NOT NULL DEFAULT '[]'
  excluded_items jsonb NOT NULL DEFAULT '[]'
  materials jsonb NOT NULL DEFAULT '{}'
  visit_count integer
  follow_up_terms text
  notes text
  effective_from timestamptz NOT NULL DEFAULT now()
  effective_to timestamptz
  clinic_attested_at timestamptz
  last_verified_at timestamptz
  verified_by uuid
  status text NOT NULL DEFAULT 'draft'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  duration_minutes integer NOT NULL DEFAULT 30
  price_scope jsonb NOT NULL
  scope_confirmed_at timestamptz

branches:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  name text NOT NULL
  address_line text
  area text
  location geography
  timezone text NOT NULL DEFAULT 'Asia/Qatar'
  status text NOT NULL DEFAULT 'pending'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

clinic_fee_rules:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  branch_id uuid
  fee_type text NOT NULL
  fixed_minor integer
  rate_bps integer
  currency char(1) NOT NULL DEFAULT 'QAR'
  effective_from timestamptz NOT NULL DEFAULT now()
  effective_to timestamptz
  status text NOT NULL DEFAULT 'active'
  created_by uuid NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

clinic_memberships:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  clinic_id uuid NOT NULL
  branch_id uuid
  role text NOT NULL
  status text NOT NULL DEFAULT 'active'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

clinic_operator_account_events:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  operator_account_id uuid
  operator_user_id uuid NOT NULL
  actor_user_id uuid NOT NULL
  event_type text NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()

clinic_operator_accounts:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  user_id uuid NOT NULL
  membership_id uuid NOT NULL
  slot_no smallint NOT NULL
  created_by uuid NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  revoked_at timestamptz

clinics:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  legal_name text NOT NULL
  display_name text NOT NULL
  status text NOT NULL DEFAULT 'pending'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  is_synthetic boolean NOT NULL DEFAULT false

consent_records:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  consent_type text NOT NULL
  policy_version text NOT NULL
  policy_hash text NOT NULL
  action text NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()

customer_choice_events:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  event_id uuid NOT NULL
  session_id uuid NOT NULL
  event_name text NOT NULL
  page_path text NOT NULL DEFAULT '/'
  treatment_id uuid
  variant_id uuid
  offer_id uuid
  slot_id uuid
  choice_value jsonb NOT NULL DEFAULT '{}'
  created_at timestamptz NOT NULL DEFAULT now()

 device_installations:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  installation_id uuid NOT NULL
  account_id uuid
  device_label text
  platform text
  browser text
  device_class text
  app_version text
  first_seen_at timestamptz NOT NULL DEFAULT now()
  last_seen_at timestamptz NOT NULL DEFAULT now()
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

feature_flags:
  key text NOT NULL
  enabled boolean NOT NULL DEFAULT false
  config jsonb NOT NULL DEFAULT '{}'
  updated_at timestamptz NOT NULL DEFAULT now()

idempotency_keys:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  scope text NOT NULL
  user_id uuid
  key text NOT NULL
  request_hash text
  response_ref text
  expires_at timestamptz NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()

instant_slots:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  slot_id uuid NOT NULL
  offer_id uuid NOT NULL
  arrival_deadline timestamptz NOT NULL
  publish_at timestamptz NOT NULL DEFAULT now()
  expires_at timestamptz NOT NULL
  status text NOT NULL DEFAULT 'draft'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

notification_delivery_attempts:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  outbox_id uuid NOT NULL
  attempt_no integer NOT NULL
  provider text NOT NULL
  provider_message_id text
  status text NOT NULL
  error_code text
  error_detail text
  attempted_at timestamptz NOT NULL DEFAULT now()
  delivered_at timestamptz

notification_outbox:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  recipient_user_id uuid NOT NULL
  template_id uuid
  event_type text NOT NULL
  event_id text NOT NULL
  channel text NOT NULL
  locale text NOT NULL
  payload jsonb NOT NULL DEFAULT '{}'
  dedupe_key text NOT NULL
  status text NOT NULL DEFAULT 'pending'
  attempt_count integer NOT NULL DEFAULT 0
  next_attempt_at timestamptz NOT NULL DEFAULT now()
  provider text
  provider_message_id text
  last_error_code text
  last_error_at timestamptz
  sent_at timestamptz
  created_by uuid
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

notification_preferences:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  channel text NOT NULL
  purpose text NOT NULL
  enabled boolean NOT NULL DEFAULT false
  destination_ref text
  consented_at timestamptz
  revoked_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

notification_subscriptions:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  channel text NOT NULL
  endpoint text NOT NULL
  consented_at timestamptz NOT NULL DEFAULT now()
  revoked_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()

a notification_templates:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  template_key text NOT NULL
  channel text NOT NULL
  locale text NOT NULL
  version integer NOT NULL DEFAULT 1
  subject text
  body text NOT NULL
  status text NOT NULL DEFAULT 'draft'
  created_by uuid NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

offer_revisions:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  offer_id uuid NOT NULL
  revision_no integer NOT NULL
  previous_snapshot jsonb NOT NULL DEFAULT '{}'
  proposed_snapshot jsonb NOT NULL DEFAULT '{}'
  reason text NOT NULL
  status text NOT NULL DEFAULT 'draft'
  requested_by uuid NOT NULL
  reviewed_by uuid
  reviewed_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

patient_phone_verification_challenges:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  account_id uuid NOT NULL
  patient_profile_id uuid NOT NULL
  phone text NOT NULL
  code_hash text NOT NULL
  status text NOT NULL DEFAULT 'pending'
  attempt_count integer NOT NULL DEFAULT 0
  expires_at timestamptz NOT NULL
  consumed_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

patient_profiles:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  account_id uuid NOT NULL
  display_name text NOT NULL
  relationship text NOT NULL DEFAULT 'self'
  date_of_birth date
  gender text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  archived_at timestamptz
  national_id text
  nationality text
  phone text
  phone_verified_at timestamptz

payment_events:
  id bigint NOT NULL
  payment_intent_id uuid
  provider_event_id text NOT NULL
  event_type text NOT NULL
  raw_hash text NOT NULL
  received_at timestamptz NOT NULL DEFAULT now()

payment_intents:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  booking_id uuid NOT NULL
  provider text NOT NULL
  amount_minor integer NOT NULL
  currency char(1) NOT NULL DEFAULT 'QAR'
  status text NOT NULL
  provider_ref text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

practitioners:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  display_name text NOT NULL
  license_ref text
  active boolean NOT NULL DEFAULT false
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  gender text

price_disputes:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  booking_id uuid
  offer_id uuid
  branch_id uuid NOT NULL
  reporter_id uuid NOT NULL
  description text NOT NULL
  evidence jsonb NOT NULL DEFAULT '{}'
  status text NOT NULL DEFAULT 'open'
  resolution text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

profiles:
  id uuid NOT NULL
  display_name text
  phone text
  locale text NOT NULL DEFAULT 'ar'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

rate_limit_buckets:
  scope text NOT NULL
  subject_key text NOT NULL
  window_started_at timestamptz NOT NULL
  request_count integer NOT NULL DEFAULT 0
  expires_at timestamptz NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

reconciliation_exceptions:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  payment_intent_id uuid
  booking_id uuid
  exception_type text NOT NULL
  status text NOT NULL DEFAULT 'open'
  owner_id uuid
  notes text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

report_exports:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid
  settlement_period_id uuid
  report_kind text NOT NULL
  format text NOT NULL
  filters jsonb NOT NULL DEFAULT '{}'
  content_hash text
  status text NOT NULL DEFAULT 'queued'
  requested_by uuid NOT NULL
  generated_at timestamptz
  expires_at timestamptz
  created_at timestamptz NOT NULL DEFAULT now()

resources:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  branch_id uuid NOT NULL
  resource_type text NOT NULL
  name text NOT NULL
  active boolean NOT NULL DEFAULT true
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

reviews:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  booking_id uuid NOT NULL
  patient_id uuid NOT NULL
  clinic_id uuid NOT NULL
  practitioner_id uuid
  rating smallint NOT NULL
  review_text text
  status text NOT NULL DEFAULT 'pending'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

settlement_periods:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  clinic_id uuid NOT NULL
  period_start date NOT NULL
  period_end date NOT NULL
  period_kind text NOT NULL
  status text NOT NULL DEFAULT 'open'
  currency char(1) NOT NULL DEFAULT 'QAR'
  created_by uuid NOT NULL
  approved_by uuid
  closed_by uuid
  approved_at timestamptz
  closed_at timestamptz
  notes text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

support_conversations:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  locale text NOT NULL
  status text NOT NULL DEFAULT 'open'
  safety_category text
  escalation_reason text
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  closed_at timestamptz

support_knowledge_articles:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  slug text NOT NULL
  locale text NOT NULL
  version integer NOT NULL DEFAULT 1
  title text NOT NULL
  body_markdown text NOT NULL
  category text NOT NULL
  audience text NOT NULL DEFAULT 'public'
  status text NOT NULL DEFAULT 'draft'
  approved_by uuid
  approved_at timestamptz
  created_by uuid NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

support_messages:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  conversation_id uuid NOT NULL
  role text NOT NULL
  content text NOT NULL
  policy_version text
  safety_category text
  confidence numeric
  sources jsonb NOT NULL DEFAULT '[]'
  created_at timestamptz NOT NULL DEFAULT now()

suspensions:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  subject_type text NOT NULL
  subject_id uuid NOT NULL
  severity text NOT NULL
  reason text NOT NULL
  status text NOT NULL DEFAULT 'active'
  appeal_text text
  created_by uuid
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

treatment_catalog:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  code text NOT NULL
  category text NOT NULL
  name_ar text NOT NULL
  name_en text NOT NULL
  comparison_version integer NOT NULL DEFAULT 1
  active boolean NOT NULL DEFAULT true
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

treatment_variants:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  catalog_id uuid NOT NULL
  variant_key text NOT NULL
  name_ar text NOT NULL
  name_en text NOT NULL
  attributes jsonb NOT NULL DEFAULT '{}'
  active boolean NOT NULL DEFAULT true
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

verification_records:
  id uuid NOT NULL DEFAULT gen_random_uuid()
  subject_type text NOT NULL
  subject_id uuid NOT NULL
  source text NOT NULL
  identifier text
  status text NOT NULL
  verified_at timestamptz
  expires_at timestamptz
  evidence jsonb NOT NULL DEFAULT '{}'
  created_by uuid
  created_at timestamptz NOT NULL DEFAULT now()
```

> **ملاحظة تدقيق:** أسماء الأنواع/الـdefaults أعلاه هي تمثيل README للـlive schema. المرجع الحرفي الكامل يبقى `lib/database.types.ts` + live catalog + migration chain.

---

# 7. Constraints / PK / UNIQUE / FK / CHECK / EXCLUDE

الجرد التالي مباشر من `pg_constraint` في Production. كل جدول له PK/UNIQUE/FK/CHECK/EXCLUDE حسب القائمة.

```text
account_usernames:
  PK user_id
  UNIQUE/format username regex
  FK user_id -> auth.users(id) ON DELETE CASCADE

accounting_journal_lines:
  PK id
  UNIQUE (journal_id,line_no)
  CHECK account_code in clinic_payable/platform_fee_revenue/adjustment_clearing
  CHECK exactly one of debit_minor/credit_minor is > 0
  CHECK debit_minor >= 0; credit_minor >= 0; line_no > 0; memo <= 500
  FK journal_id -> accounting_journals RESTRICT

accounting_journals:
  PK id
  UNIQUE (source_type,source_id,journal_type)
  CHECK source_type = attendance|attendance_reversal|manual_adjustment|period_correction
  CHECK journal_type = platform_fee_accrual|platform_fee_reversal|manual_adjustment
  CHECK status = draft|posted|reversed|void
  CHECK posted status requires posted_by + posted_at
  CHECK currency = QAR
  CHECK description trimmed length 3..500
  FK clinic/branch/settlement_period/users/reversed_journal

audit_events:
  PK id
  FK actor_id -> auth.users SET NULL

availability_slots:
  PK id
  CHECK end_at > start_at
  CHECK expires_at is null or expires_at > created_at
  CHECK status = draft|published|held|consumed|expired|cancelled
  FK branch/practitioner/resource/creator/variant

booking_attendance_events:
  PK id
  UNIQUE (booking_id,event_type,source_type,source_id)
  CHECK event_type = checked_in|attendance_reversed
  CHECK source_type = clinic_ui|admin_ui|api
  CHECK sequence_no > 0
  CHECK reason null or trimmed length 3..500
  FK booking + recorded_by

booking_status_history:
  PK id
  FK booking_id CASCADE; actor_id SET NULL

bookings:
  PK id
  UNIQUE booking_code
  UNIQUE (patient_id,idempotency_key)
  CHECK end_at > start_at
  CHECK status = pending_hold|pending_clinic_confirmation|confirmed|checked_in|completed|patient_cancelled|clinic_cancelled|no_show|expired|failed
  EXCLUDE practitioner_id + booking_period overlap for active booking states
  EXCLUDE resource_id + booking_period overlap for active booking states
  FK patient/clinic/branch/practitioner/resource/slot/offer/patient_profile/booked_by

branch_hour_exceptions:
  PK id
  UNIQUE (branch_id,local_date)
  CHECK closed => times null; open => both times present

branch_hours:
  PK id
  UNIQUE (branch_id,weekday)
  CHECK weekday 0..6
  CHECK closed => times null; open => both times present

branch_service_offers:
  PK id
  CHECK effective_to > effective_from when present
  CHECK price shape matches price_type
  CHECK currency = QAR
  CHECK duration 5..480
  CHECK visit_count null or > 0
  CHECK status = draft|active|needs_review|stale|suspended|archived
  CHECK is_valid_price_scope(price_scope)
  EXCLUDE active effective period overlap per branch+variant
  FK branch/variant/verified_by

branches:
  PK id
  UNIQUE (id,clinic_id)
  CHECK status = pending|active|suspended|archived
  FK clinic CASCADE

clinic_fee_rules:
  PK id
  CHECK fee type determines fixed_minor vs rate_bps
  CHECK effective_to > effective_from when present
  CHECK rate_bps 0..10000; fixed_minor >= 0
  CHECK currency = QAR
  CHECK status = draft|active|archived
  FK clinic/branch/created_by

clinic_memberships:
  PK id
  CHECK role = owner|manager|receptionist|pricing_manager|viewer
  CHECK status = invited|active|suspended|revoked
  FK user/clinic/branch including composite branch+clinic integrity

clinic_operator_accounts:
  PK id
  CHECK slot_no in 1,2
  FK clinic/user/membership/created_by

clinics:
  PK id
  CHECK status = pending|active|suspended|rejected|archived

consent_records:
  PK id
  CHECK action = granted|withdrawn
  FK user

customer_choice_events:
  PK id
  UNIQUE event_id
  CHECK event name allowlist
  CHECK page_path length 1..300
  CHECK choice_value is object and <=4096 bytes
  CHECK selection/search/booking payload contracts
  FK treatment/variant/offer/slot SET NULL

device_installations:
  PK id
  UNIQUE installation_id
  CHECK device class mobile|tablet|desktop|unknown
  CHECK label/browser/platform/version lengths
  FK account SET NULL

feature_flags:
  PK key

idempotency_keys:
  PK id
  UNIQUE (scope,user_id,key)
  FK user CASCADE

instant_slots:
  PK id
  UNIQUE slot_id
  CHECK expires_at > publish_at
  CHECK arrival_deadline >= publish_at
  CHECK status = draft|published|consumed|expired|cancelled
  FK slot CASCADE; offer RESTRICT

notification_delivery_attempts:
  PK id
  UNIQUE (outbox_id,attempt_no)
  CHECK attempt_no 1..10
  CHECK status = accepted|delivered|failed|rejected|suppressed
  FK outbox RESTRICT

notification_outbox:
  PK id
  UNIQUE dedupe_key
  CHECK attempt_count 0..10
  CHECK channel email|push|in_app
  CHECK locale ar|en
  CHECK event allowlist
  CHECK status pending|processing|sent|failed|suppressed|dead_letter|stored
  FK recipient/template/creator

notification_preferences:
  PK id
  UNIQUE (user_id,channel,purpose)
  CHECK enabled requires consented_at and no revoked_at
  FK user

notification_subscriptions:
  PK id
  UNIQUE (user_id,channel,endpoint)
  CHECK channel web_push|email|sms
  FK user

notification_templates:
  PK id
  UNIQUE (template_key,channel,locale,version)
  CHECK key regex, version > 0, locale ar|en, channel email|push|in_app
  CHECK body length 1..4000; subject <=200
  FK created_by

offer_revisions:
  PK id
  UNIQUE (offer_id,revision_no)
  CHECK revision_no > 0
  CHECK reason length 3..500
  CHECK approved/rejected requires reviewed_by + reviewed_at
  CHECK status draft|submitted|approved|rejected|superseded
  FK offer/requested_by/reviewed_by

patient_phone_verification_challenges:
  PK id
  CHECK attempt_count 0..5
  CHECK expires_at > created_at
  CHECK E.164 phone
  CHECK consumed_at contract
  CHECK status pending|verified|expired|cancelled
  FK account/profile

patient_profiles:
  PK id
  CHECK display_name length 1..120
  CHECK DOB >=1900-01-01 and <=CURRENT_DATE when present
  CHECK gender allowlist
  CHECK national_id exactly 11 digits when present
  CHECK nationality uppercase ISO alpha-2 when present
  CHECK phone E.164 when present
  CHECK phone_verified_at requires phone
  FK account RESTRICT

payment_events:
  PK id
  UNIQUE provider_event_id
  FK payment_intent CASCADE

payment_intents:
  PK id
  CHECK amount_minor >=0
  CHECK currency = QAR
  CHECK status allowlist
  FK booking RESTRICT

practitioners:
  PK id
  CHECK gender null/female/male
  FK clinic CASCADE

price_disputes:
  PK id
  CHECK status open|clinic_response|under_review|resolved|rejected
  FK booking/offer SET NULL; branch/reporter RESTRICT

profiles:
  PK id
  CHECK locale ar|en
  FK auth.users CASCADE

rate_limit_buckets:
  PK (scope,subject_key,window_started_at)
  CHECK scope 3..80; subject_key 3..160; request_count >=0; expires_at > window_started_at

reconciliation_exceptions:
  PK id
  CHECK status open|investigating|resolved|ignored
  FK payment/booking/owner SET NULL

report_exports:
  PK id
  CHECK report_kind weekly|monthly|annual|settlement|attendance
  CHECK format csv|pdf
  CHECK status queued|generated|expired|failed
  FK clinic/settlement/requester

resources:
  PK id
  CHECK type chair|room|equipment|pool
  FK branch CASCADE

reviews:
  PK id
  UNIQUE booking_id
  CHECK rating 1..5
  CHECK status pending|published|hidden|disputed|removed
  FK booking/clinic/patient RESTRICT; practitioner SET NULL

settlement_periods:
  PK id
  UNIQUE (clinic_id,period_start,period_end,period_kind)
  CHECK end >= start
  CHECK approved/closed statuses require corresponding actor/timestamp
  CHECK currency = QAR
  CHECK period kind weekly|monthly|annual|manual
  CHECK status open|proposed|approved|closed|void
  FK clinic/users

support_conversations:
  PK id
  CHECK locale ar|en
  CHECK status open|escalated|closed
  CHECK safety category standard|medical|emergency|privacy|billing|abuse
  FK user RESTRICT

support_knowledge_articles:
  PK id
  UNIQUE (slug,locale,version)
  CHECK slug regex; version >0; title 3..200; body 10..20000
  CHECK category booking|pricing|availability|account|clinic|policy|safety
  CHECK audience public|clinic|admin
  CHECK approved status requires approver+timestamp
  FK creator/approver

support_messages:
  PK id
  CHECK content 1..6000
  CHECK role user|assistant|system|human_agent
  CHECK confidence 0..1
  CHECK safety category allowlist
  FK conversation RESTRICT

suspensions:
  PK id
  CHECK subject type clinic|branch|practitioner|offer|user
  CHECK severity warning|restricted|suspended|blocked
  CHECK status active|lifted|appealed
  FK creator SET NULL

treatment_catalog:
  PK id
  UNIQUE code
  CHECK comparison_version >0

treatment_variants:
  PK id
  UNIQUE (catalog_id,variant_key)
  FK catalog CASCADE

verification_records:
  PK id
  CHECK subject type clinic|branch|practitioner
  CHECK status pending|verified|failed|expired|revoked
  FK created_by SET NULL
```

---

# 8. Index inventory — 193 live indexes

هذه القائمة هي أسماء الفهارس الحية في `pg_indexes`. بعض الفهارس جزء من UNIQUE/PK/EXCLUDE constraints، وبعضها لتحسين البحث/الـRLS/التقارير/التزامن.

```text
account_usernames: account_usernames_normalized_unique, account_usernames_pkey
accounting_journal_lines: accounting_journal_lines_journal_id_line_no_key, accounting_journal_lines_journal_idx, accounting_journal_lines_pkey
accounting_journals: accounting_journals_branch_id_idx, accounting_journals_clinic_status_idx, accounting_journals_created_by_idx, accounting_journals_period_idx, accounting_journals_pkey, accounting_journals_posted_by_idx, accounting_journals_reversed_journal_id_idx, accounting_journals_source_type_source_id_journal_type_key
audit_events: audit_actor_idx, audit_events_pkey, audit_target_idx
availability_slots: availability_branch_time_idx, availability_practitioner_time_idx, availability_resource_time_idx, availability_slots_created_by_idx, availability_slots_no_duplicate_operational_slot, availability_slots_pkey, availability_slots_public_search_idx, availability_variant_time_idx
booking_attendance_events: booking_attendance_booking_sequence_uidx, booking_attendance_events_booking_id_event_type_source_type_key, booking_attendance_events_pkey, booking_attendance_events_recorded_by_idx, booking_attendance_occurred_idx
booking_status_history: booking_history_booking_idx, booking_status_history_actor_idx, booking_status_history_pkey
bookings: bookings_booked_by_idempotency_key_key, bookings_booked_by_user_created_idx, bookings_booking_code_key, bookings_branch_idx, bookings_clinic_idx, bookings_clinic_start_at_idx, bookings_offer_idx, bookings_patient_id_idempotency_key_key, bookings_patient_idx, bookings_patient_profile_idx, bookings_pkey, idx_bookings_clinic_patient_created_at, no_active_practitioner_overlap, no_active_resource_overlap, one_active_booking_per_slot
branch_hour_exceptions: branch_hour_exceptions_branch_id_local_date_key, branch_hour_exceptions_pkey
branch_hours: branch_hours_branch_id_weekday_key, branch_hours_branch_idx, branch_hours_pkey
branch_service_offers: branch_service_offers_no_active_effective_overlap, branch_service_offers_pkey, branch_service_offers_public_search_idx, offers_branch_variant_idx, offers_current_idx, offers_variant_idx, offers_verified_by_idx
branches: branches_clinic_idx, branches_id_clinic_id_key, branches_location_gist, branches_pkey
clinic_fee_rules: clinic_fee_rules_branch_id_idx, clinic_fee_rules_created_by_idx, clinic_fee_rules_effective_idx, clinic_fee_rules_pkey
clinic_memberships: clinic_memberships_branch_clinic_idx, clinic_memberships_branch_idx, clinic_memberships_clinic_idx, clinic_memberships_pkey, clinic_memberships_unique_scope, clinic_memberships_user_idx
clinic_operator_account_events: clinic_operator_account_events_actor_user_idx, clinic_operator_account_events_clinic_created_idx, clinic_operator_account_events_operator_account_idx, clinic_operator_account_events_operator_user_idx, clinic_operator_account_events_pkey
clinic_operator_accounts: clinic_operator_accounts_active_slot_unique, clinic_operator_accounts_active_user_unique, clinic_operator_accounts_clinic_created_idx, clinic_operator_accounts_created_by_idx, clinic_operator_accounts_membership_idx, clinic_operator_accounts_pkey
clinics: clinics_pkey
consent_records: consent_records_pkey, consent_records_user_idx
customer_choice_events: customer_choice_events_created_idx, customer_choice_events_event_id_key, customer_choice_events_name_idx, customer_choice_events_offer_idx, customer_choice_events_pkey, customer_choice_events_session_idx, customer_choice_events_slot_idx, customer_choice_events_treatment_idx, customer_choice_events_variant_idx
device_installations: device_installations_account_last_seen_idx, device_installations_installation_id_key, device_installations_pkey
feature_flags: feature_flags_pkey
idempotency_keys: idempotency_keys_pkey, idempotency_keys_scope_user_id_key_key, idempotency_keys_user_idx
instant_slots: instant_slots_offer_idx, instant_slots_pkey, instant_slots_slot_id_key
notification_delivery_attempts: notification_delivery_attempts_outbox_id_attempt_no_key, notification_delivery_attempts_outbox_idx, notification_delivery_attempts_pkey, notification_delivery_provider_message_idx
notification_outbox: notification_outbox_created_by_idx, notification_outbox_dedupe_key_key, notification_outbox_dispatch_idx, notification_outbox_pkey, notification_outbox_provider_message_idx, notification_outbox_recipient_idx, notification_outbox_template_id_idx
notification_preferences: notification_preferences_pkey, notification_preferences_user_id_channel_purpose_key
notification_subscriptions: notification_subscriptions_pkey, notification_subscriptions_user_id_channel_endpoint_key
notification_templates: notification_templates_created_by_idx, notification_templates_pkey, notification_templates_template_key_channel_locale_version_key
offer_revisions: offer_revisions_offer_created_idx, offer_revisions_offer_id_revision_no_key, offer_revisions_pkey, offer_revisions_requested_by_idx, offer_revisions_reviewed_by_idx
patient_phone_verification_challenges: patient_phone_verification_challenges_account_idx, patient_phone_verification_challenges_pkey, patient_phone_verification_challenges_profile_pending_idx
patient_profiles: patient_profiles_account_active_idx, patient_profiles_national_id_key, patient_profiles_one_active_self_per_account, patient_profiles_phone_key, patient_profiles_pkey
payment_events: payment_events_intent_idx, payment_events_pkey, payment_events_provider_event_id_key
payment_intents: payment_intents_booking_idx, payment_intents_pkey
practitioners: practitioners_clinic_active_gender_idx, practitioners_clinic_idx, practitioners_pkey
price_disputes: price_disputes_booking_idx, price_disputes_branch_status_idx, price_disputes_offer_idx, price_disputes_pkey, price_disputes_reporter_idx
profiles: profiles_pkey
rate_limit_buckets: rate_limit_buckets_expiry_idx, rate_limit_buckets_pkey
reconciliation_exceptions: reconciliation_booking_idx, reconciliation_exceptions_pkey, reconciliation_owner_idx, reconciliation_payment_idx
report_exports: report_exports_clinic_id_idx, report_exports_pkey, report_exports_requested_idx, report_exports_settlement_period_id_idx
resources: resources_branch_idx, resources_pkey
reviews: reviews_booking_id_key, reviews_clinic_status_idx, reviews_patient_idx, reviews_pkey, reviews_practitioner_idx
settlement_periods: settlement_periods_approved_by_idx, settlement_periods_clinic_id_period_start_period_end_period_key, settlement_periods_clinic_status_idx, settlement_periods_closed_by_idx, settlement_periods_created_by_idx, settlement_periods_pkey
support_conversations: support_conversations_pkey, support_conversations_user_idx
support_knowledge_articles: support_knowledge_active_idx, support_knowledge_articles_approved_by_idx, support_knowledge_articles_created_by_idx, support_knowledge_articles_pkey, support_knowledge_articles_slug_locale_version_key
support_messages: support_messages_conversation_idx, support_messages_pkey
suspensions: suspensions_created_by_idx, suspensions_pkey
treatment_catalog: treatment_catalog_code_key, treatment_catalog_pkey
treatment_variants: treatment_variants_catalog_id_variant_key_key, treatment_variants_catalog_idx, treatment_variants_pkey
verification_records: verification_records_created_by_idx, verification_records_pkey, verification_records_subject_idx
```

---

# 9. Trigger inventory — 57 live triggers

```text
account_usernames:
  account_usernames_enforce_patient_nickname [INSERT/BEFORE]
  account_usernames_enforce_patient_nickname [UPDATE/BEFORE]
  account_usernames_touch_updated_at [UPDATE/BEFORE]

accounting_journal_lines:
  accounting_journal_lines_posted_guard [DELETE/BEFORE]
  accounting_journal_lines_posted_guard [INSERT/BEFORE]
  accounting_journal_lines_posted_guard [UPDATE/BEFORE]

accounting_journals:
  accounting_journals_guard_update [UPDATE/BEFORE]

availability_slots:
  availability_touch_updated_at [UPDATE/BEFORE]
  slot_publication_gate [INSERT/BEFORE]
  slot_publication_gate [UPDATE/BEFORE]

booking_attendance_events:
  attendance_notification_outbox [INSERT/AFTER]

bookings:
  booking_confirmed_notification_outbox [INSERT/AFTER]
  booking_confirmed_notification_outbox [UPDATE/AFTER]
  booking_insert_slot_sync [INSERT/AFTER]
  booking_status_slot_sync [UPDATE/AFTER]
  bookings_log_status [UPDATE/AFTER]
  bookings_snapshot_immutable [UPDATE/BEFORE]
  bookings_state_machine [UPDATE/BEFORE]
  bookings_touch_updated_at [UPDATE/BEFORE]

branch_hour_exceptions:
  branch_hour_exceptions_touch_updated_at [UPDATE/BEFORE]
branch_hours:
  branch_hours_touch_updated_at [UPDATE/BEFORE]

branch_service_offers:
  branch_service_offers_public_scope_guard [INSERT/BEFORE]
  branch_service_offers_public_scope_guard [UPDATE/BEFORE]
  offer_activation_gate [INSERT/BEFORE]
  offer_activation_gate [UPDATE/BEFORE]
  offer_verification_fields_guard [INSERT/BEFORE]
  offer_verification_fields_guard [UPDATE/BEFORE]
  offers_touch_updated_at [UPDATE/BEFORE]

branches:
  branches_compliance_status_guard [INSERT/BEFORE]
  branches_compliance_status_guard [UPDATE/BEFORE]
  branches_touch_updated_at [UPDATE/BEFORE]
  branches_verified_activation [INSERT/BEFORE]
  branches_verified_activation [UPDATE/BEFORE]

clinic_memberships:
  memberships_touch_updated_at [UPDATE/BEFORE]

clinics:
  clinics_compliance_status_guard [INSERT/BEFORE]
  clinics_compliance_status_guard [UPDATE/BEFORE]
  clinics_touch_updated_at [UPDATE/BEFORE]
  clinics_verified_activation [INSERT/BEFORE]
  clinics_verified_activation [UPDATE/BEFORE]

device_installations:
  device_installations_touch_updated_at [UPDATE/BEFORE]

instant_slots:
  instant_slots_touch_updated_at [UPDATE/BEFORE]

patient_phone_verification_challenges:
  patient_phone_verification_challenges_touch_updated_at [UPDATE/BEFORE]
patient_profiles:
  patient_profiles_touch_updated_at [UPDATE/BEFORE]
payment_intents:
  payment_intents_touch_updated_at [UPDATE/BEFORE]

practitioners:
  practitioners_touch_updated_at [UPDATE/BEFORE]
  practitioners_verified_activation [INSERT/BEFORE]
  practitioners_verified_activation [UPDATE/BEFORE]

price_disputes:
  price_disputes_touch_updated_at [UPDATE/BEFORE]
profiles:
  profiles_touch_updated_at [UPDATE/BEFORE]
reconciliation_exceptions:
  reconciliation_touch_updated_at [UPDATE/BEFORE]
resources:
  resources_touch_updated_at [UPDATE/BEFORE]

reviews:
  review_status_guard [INSERT/BEFORE]
  review_status_guard [UPDATE/BEFORE]
  reviews_touch_updated_at [UPDATE/BEFORE]

suspensions:
  suspensions_touch_updated_at [UPDATE/BEFORE]
treatment_catalog:
  treatment_catalog_touch_updated_at [UPDATE/BEFORE]
treatment_variants:
  treatment_variants_touch_updated_at [UPDATE/BEFORE]
```

---

# 10. PostgreSQL functions / RPC — live signatures

## 10.1 Public RPC/functions

```text
admin_customer_choice_analytics(p_days integer) -> jsonb [invoker]
archive_patient_account_server(p_actor_id uuid,p_target_user_id uuid) -> void [definer]
audit_clinic_operator_password_reset(p_operator_account_id uuid) -> void [definer]
audit_clinic_operator_password_reset_server(p_actor_id uuid,p_operator_account_id uuid) -> void [definer]
book_slot(p_slot_id uuid,p_offer_id uuid,p_idempotency_key text) -> TABLE(booking_id uuid,booking_code text,booking_status text) [definer]
book_slot(p_slot_id uuid,p_offer_id uuid,p_idempotency_key text,p_patient_profile_id uuid) -> TABLE(...) [definer]
book_slot_server(p_actor_id uuid,p_slot_id uuid,p_offer_id uuid,p_idempotency_key text,p_patient_profile_id uuid) -> TABLE(...) [definer]
cancel_booking_server(p_actor_id uuid,p_booking_id uuid) -> text [definer]
change_booking_status_server(p_actor_id uuid,p_booking_id uuid,p_status text) -> text [definer]
clinic_activity_report_server(p_actor_id uuid,p_clinic_id uuid,p_start date,p_end date,p_granularity text) -> jsonb [definer]
clinic_booking_patient_details(p_booking_ids uuid[]) -> TABLE(...) [invoker]
complete_patient_phone_verification_server(p_actor_id uuid,p_challenge_id uuid,p_patient_profile_id uuid) -> TABLE(...) [definer]
consume_rate_limit_server(p_scope text,p_subject_key text,p_limit integer,p_window_seconds integer) -> boolean [definer]
create_branch_application(p_clinic_id uuid,p_name text,p_area text,p_address_line text,p_lat double precision,p_lng double precision) -> uuid [invoker]
create_clinic_application(p_legal_name text,p_display_name text) -> uuid [invoker]
create_settlement_period(p_clinic_id uuid,p_period_start date,p_period_end date,p_period_kind text,p_notes text) -> uuid [definer]
create_settlement_period_server(p_actor_id uuid,p_clinic_id uuid,p_period_start date,p_period_end date,p_period_kind text,p_notes text) -> uuid [definer]
enforce_public_offer_price_scope() -> trigger [invoker]
financial_report_summary(p_clinic_id uuid,p_start date,p_end date) -> jsonb [definer]
financial_report_summary_server(p_actor_id uuid,p_clinic_id uuid,p_start date,p_end date) -> jsonb [definer]
handle_new_account_patient_profile() -> trigger [definer]
is_price_scope_publishable(p_scope jsonb) -> boolean [invoker, immutable]
is_valid_price_scope(p_scope jsonb) -> boolean [invoker, immutable]
list_clinic_operator_accounts(p_clinic_id uuid) -> TABLE(...) [definer]
list_clinic_operator_accounts_server(p_actor_id uuid,p_clinic_id uuid) -> TABLE(...) [definer]
list_operational_client_accounts_server(p_actor_id uuid) -> TABLE(...) [definer]
list_patient_accounts_for_admin(p_actor_id uuid,p_limit integer) -> TABLE(...) [definer]
platform_activity_report_server(p_actor_id uuid,p_start date,p_end date,p_granularity text) -> jsonb [definer]
provision_clinic_operator_account(p_clinic_id uuid,p_user_id uuid,p_username text) -> uuid [definer]
provision_clinic_operator_account_server(p_actor_id uuid,p_clinic_id uuid,p_user_id uuid,p_username text) -> uuid [definer]
provision_operational_client_account_server(p_actor_id uuid,p_clinic_id uuid,p_branch_id uuid,p_user_id uuid,p_username text) -> uuid [definer]
record_booking_check_in(p_booking_id uuid,p_reason text) -> uuid [definer]
record_booking_check_in_server(p_actor_id uuid,p_booking_id uuid,p_reason text) -> uuid [definer]
register_device_installation_guarded_server(p_account_id uuid,p_installation_id uuid,p_device_label text,p_platform text,p_browser text,p_device_class text,p_app_version text,p_client_subject_key text,p_installation_subject_key text) -> text [definer]
register_device_installation_server(p_account_id uuid,p_installation_id uuid,p_device_label text,p_platform text,p_browser text,p_device_class text,p_app_version text) -> uuid [definer]
request_offer_revision(p_offer_id uuid,p_price_type text,p_min_minor integer,p_max_minor integer,p_duration_minutes integer,p_reason text) -> uuid [definer]
request_offer_revision_server(p_actor_id uuid,p_offer_id uuid,p_price_type text,p_min_minor integer,p_max_minor integer,p_duration_minutes integer,p_reason text) -> uuid [definer]
reverse_booking_attendance(p_booking_id uuid,p_reason text) -> uuid [definer]
reverse_booking_attendance_server(p_actor_id uuid,p_booking_id uuid,p_reason text) -> uuid [definer]
review_offer_revision(p_revision_id uuid,p_approve boolean,p_reason text) -> uuid [definer]
review_offer_revision_server(p_actor_id uuid,p_revision_id uuid,p_approve boolean,p_reason text) -> uuid [definer]
revoke_clinic_operator_account(p_operator_account_id uuid) -> void [definer]
revoke_clinic_operator_account_server(p_actor_id uuid,p_operator_account_id uuid) -> void [definer]
revoke_operational_client_account_server(p_actor_id uuid,p_operator_account_id uuid) -> void [definer]
search_dental_offers(p_variant_id uuid,p_lat double precision,p_lng double precision,p_radius_km double precision,p_practitioner_gender text) -> TABLE(...) [invoker, stable]
verify_and_activate_server(p_actor_id uuid,p_subject_type text,p_subject_id uuid,p_source text,p_identifier text) -> void [definer]
```

## 10.2 Private schema helpers

```text
activity_report_json(...)
book_slot_internal(...)
create_clinic_application_internal(...)
enforce_booking_state_transition()
enforce_offer_activation()
enforce_patient_nickname()
enforce_slot_publication()
enforce_verified_activation()
enqueue_attendance_notifications()
enqueue_booking_confirmed_notifications()
guard_accounting_journal_lines()
guard_accounting_journal_update()
guard_compliance_status_change()
guard_offer_verification_fields()
guard_review_status()
handle_new_auth_user()
has_active_self_patient_profile(uuid)
has_branch_access(uuid,text[])
has_clinic_role(uuid,uuid,text[])
has_clinic_role_for_actor(uuid,uuid,uuid,text[])
is_account_login_disabled(uuid)
is_clinic_member(uuid,text[])
is_platform_admin()
is_platform_admin_for_actor(uuid)
is_platform_super_admin_for_actor(uuid)
log_booking_status_change()
prevent_booking_snapshot_mutation()
sync_slot_on_booking_insert()
sync_slot_on_booking_status()
touch_account_username_updated_at()
touch_device_installation_updated_at()
touch_patient_phone_verification_challenge_updated_at()
touch_patient_profile_updated_at()
touch_updated_at()
```

الدوال الحساسة `SECURITY DEFINER` يجب أن تبقى server-side ومقيدة بالـEXECUTE/grants، مع `search_path` مضبوطًا وفق migration التي أنشأتها. لا يعتبر وجود الدالة وحده دليلًا على صلاحية الاستدعاء من العميل.

---

# 11. RLS — 104 policy في Production

كل public base table مفعّل عليه RLS. القائمة التالية هي **كل policy names** الموجودة حاليًا، مع العملية والـrole. المصدر الحرفي للتعبير `USING/WITH CHECK` هو `pg_policies` في Production؛ لا يتم اختصار policy إلى UI behavior.

```text
account_usernames:
  deny client access to account usernames | ALL | RESTRICTIVE | anon,authenticated

accounting_journal_lines:
  journal lines follow visible journal | SELECT | PERMISSIVE | public

accounting_journals:
  journals admin or clinic owner read | SELECT | PERMISSIVE | public

audit_events:
  audit_events_client_deny | SELECT | PERMISSIVE | authenticated

availability_slots:
  availability_anon_select | SELECT | PERMISSIVE | anon
  availability_authenticated_delete | DELETE | PERMISSIVE | authenticated
  availability_authenticated_insert | INSERT | PERMISSIVE | authenticated
  availability_authenticated_select | SELECT | PERMISSIVE | authenticated
  availability_authenticated_update | UPDATE | PERMISSIVE | authenticated

booking_attendance_events:
  attendance visible to related clinic | SELECT | PERMISSIVE | public

booking_status_history:
  booking_history_select | SELECT | PERMISSIVE | authenticated

bookings:
  bookings_select | SELECT | PERMISSIVE | public

branch_hour_exceptions:
  branch_exceptions_anon_select | SELECT | PERMISSIVE | anon
  branch_exceptions_auth_select | SELECT | PERMISSIVE | authenticated
  branch_exceptions_staff_delete | DELETE | PERMISSIVE | authenticated
  branch_exceptions_staff_insert | INSERT | PERMISSIVE | authenticated
  branch_exceptions_staff_update | UPDATE | PERMISSIVE | authenticated

branch_hours:
  branch_hours_anon_select | SELECT | PERMISSIVE | anon
  branch_hours_auth_select | SELECT | PERMISSIVE | authenticated
  branch_hours_staff_delete | DELETE | PERMISSIVE | authenticated
  branch_hours_staff_insert | INSERT | PERMISSIVE | authenticated
  branch_hours_staff_update | UPDATE | PERMISSIVE | authenticated

branch_service_offers:
  offers_authenticated_delete | DELETE | PERMISSIVE | authenticated
  offers_authenticated_insert | INSERT | PERMISSIVE | authenticated
  offers_authenticated_select | SELECT | PERMISSIVE | authenticated
  offers_authenticated_update | UPDATE | PERMISSIVE | authenticated
  offers_public_select | SELECT | PERMISSIVE | anon

branches:
  branches_authenticated_select | SELECT | PERMISSIVE | authenticated
  branches_authorized_update | UPDATE | PERMISSIVE | authenticated
  branches_member_insert | INSERT | PERMISSIVE | authenticated
  branches_public_select | SELECT | PERMISSIVE | anon

clinic_fee_rules:
  clinic fee rules admin only | ALL | PERMISSIVE | public

clinic_memberships:
  memberships_authorized_update | UPDATE | PERMISSIVE | authenticated
  memberships_manage_insert | INSERT | PERMISSIVE | authenticated
  memberships_select | SELECT | PERMISSIVE | authenticated

clinic_operator_account_events:
  deny client access to clinic operator account events | ALL | RESTRICTIVE | anon,authenticated

clinic_operator_accounts:
  deny client access to clinic operator accounts | ALL | RESTRICTIVE | anon,authenticated

clinics:
  clinics_authenticated_select | SELECT | PERMISSIVE | authenticated
  clinics_authorized_update | UPDATE | PERMISSIVE | authenticated
  clinics_public_select | SELECT | PERMISSIVE | anon

consent_records:
  consents_insert_own | INSERT | PERMISSIVE | authenticated
  consents_select_own | SELECT | PERMISSIVE | authenticated

customer_choice_events:
  platform admins can read customer choice events | SELECT | PERMISSIVE | authenticated

device_installations:
  device_installations_no_client_access | ALL | PERMISSIVE | authenticated

feature_flags:
  feature_flags_platform_admin_delete | DELETE | PERMISSIVE | authenticated
  feature_flags_platform_admin_insert | INSERT | PERMISSIVE | authenticated
  feature_flags_platform_admin_update | UPDATE | PERMISSIVE | authenticated
  feature_flags_read | SELECT | PERMISSIVE | anon,authenticated

idempotency_keys:
  idempotency_keys_client_deny | SELECT | PERMISSIVE | authenticated

instant_slots:
  instant_slots_anon_select | SELECT | PERMISSIVE | anon
  instant_slots_auth_select | SELECT | PERMISSIVE | authenticated
  instant_slots_staff_delete | DELETE | PERMISSIVE | authenticated
  instant_slots_staff_insert | INSERT | PERMISSIVE | authenticated
  instant_slots_staff_update | UPDATE | PERMISSIVE | authenticated

notification_delivery_attempts:
  notification attempts admin only | SELECT | PERMISSIVE | public

notification_outbox:
  users read own notification outbox | SELECT | PERMISSIVE | public

notification_preferences:
  users manage own notification preferences | ALL | PERMISSIVE | public

notification_subscriptions:
  notifications_own | ALL | PERMISSIVE | authenticated

notification_templates:
  notification templates admin only | ALL | PERMISSIVE | public

offer_revisions:
  offer revisions visible to related clinic | SELECT | PERMISSIVE | public

patient_phone_verification_challenges:
  patient_phone_verification_challenges_no_client_access | ALL | PERMISSIVE | authenticated

patient_profiles:
  patient_profiles_authenticated_select | SELECT | PERMISSIVE | authenticated

payment_events:
  payment_events_client_deny | SELECT | PERMISSIVE | authenticated

payment_intents:
  payment_intents_select | SELECT | PERMISSIVE | authenticated

practitioners:
  practitioners_authenticated_select | SELECT | PERMISSIVE | authenticated
  practitioners_authorized_update | UPDATE | PERMISSIVE | authenticated
  practitioners_member_insert | INSERT | PERMISSIVE | authenticated
  practitioners_public_select | SELECT | PERMISSIVE | anon

price_disputes:
  price_disputes_authorized_update | UPDATE | PERMISSIVE | authenticated
  price_disputes_insert | INSERT | PERMISSIVE | authenticated
  price_disputes_select | SELECT | PERMISSIVE | authenticated

profiles:
  profiles_insert_own | INSERT | PERMISSIVE | authenticated
  profiles_select_own | SELECT | PERMISSIVE | authenticated
  profiles_update_own | UPDATE | PERMISSIVE | authenticated

rate_limit_buckets:
  rate_limit_buckets_no_client_access | ALL | PERMISSIVE | authenticated

reconciliation_exceptions:
  reconciliation_client_deny | SELECT | PERMISSIVE | authenticated

report_exports:
  report exports requester or admin | SELECT | PERMISSIVE | public

resources:
  resources_staff | ALL | PERMISSIVE | authenticated

reviews:
  reviews_anon_select | SELECT | PERMISSIVE | anon
  reviews_auth_select | SELECT | PERMISSIVE | authenticated
  reviews_authorized_update | UPDATE | PERMISSIVE | authenticated
  reviews_insert_completed | INSERT | PERMISSIVE | authenticated

settlement_periods:
  settlement periods admin or clinic owner read | SELECT | PERMISSIVE | public

support_conversations:
  support conversations belong to user | SELECT | PERMISSIVE | public

support_knowledge_articles:
  approved public knowledge is readable | SELECT | PERMISSIVE | public
  support knowledge admin insert | INSERT | PERMISSIVE | authenticated
  support knowledge admin update | UPDATE | PERMISSIVE | authenticated

support_messages:
  support messages visible to conversation owner | SELECT | PERMISSIVE | public

suspensions:
  suspensions_platform_admin_insert | INSERT | PERMISSIVE | authenticated
  suspensions_platform_admin_select | SELECT | PERMISSIVE | authenticated
  suspensions_platform_admin_update | UPDATE | PERMISSIVE | authenticated

treatment_catalog:
  treatment_catalog_anon_active | SELECT | PERMISSIVE | anon
  treatment_catalog_authenticated | SELECT | PERMISSIVE | authenticated
  treatment_catalog_platform_admin_delete | DELETE | PERMISSIVE | authenticated
  treatment_catalog_platform_admin_insert | INSERT | PERMISSIVE | authenticated
  treatment_catalog_platform_admin_update | UPDATE | PERMISSIVE | authenticated

treatment_variants:
  treatment_variants_anon_active | SELECT | PERMISSIVE | anon
  treatment_variants_authenticated | SELECT | PERMISSIVE | authenticated
  treatment_variants_platform_admin_delete | DELETE | PERMISSIVE | authenticated
  treatment_variants_platform_admin_insert | INSERT | PERMISSIVE | authenticated
  treatment_variants_platform_admin_update | UPDATE | PERMISSIVE | authenticated

verification_records:
  verification_authorized_select | SELECT | PERMISSIVE | authenticated
  verification_platform_admin_insert | INSERT | PERMISSIVE | authenticated
  verification_platform_admin_update | UPDATE | PERMISSIVE | authenticated
```

### Policy expression source of truth

للحصول على **النص الحرفي الكامل** لكل `USING` و`WITH CHECK` في Production:

```sql
select
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

لا تُنسخ policy expressions يدويًا إلى README إذا تغيّرت في migration؛ عندها يجب تحديث هذا الجرد فورًا.

---

# 12. Grants / Data API privilege inventory

الـRLS وحده ليس privilege model. توجد grants مستقلة للـ`anon`, `authenticated`, `service_role`، ويجب قراءتها مع policies. الجرد الحي يثبت أن الجداول الحساسة تعتمد على service-role/server/RPC بالإضافة إلى RLS، بينما بعض الجداول العامة لها SELECT للـanon.

أهم نمط ظاهر:

```text
Public search/read surfaces:
  anon SELECT on approved/public-safe tables such as clinics, branches,
  branch_service_offers, availability_slots, practitioners, treatment catalog,
  treatment variants, instant slots, reviews and related public surfaces.

Sensitive/server-only surfaces:
  service_role has full table privileges.
  account/operator/device/idempotency/payment/reconciliation and verification
  tables intentionally lack normal client mutation grants in the live catalog.

Authenticated operational surfaces:
  selected INSERT/UPDATE/DELETE grants exist for clinic operational tables,
  but RLS still restricts rows and role scope.
```

**للتدقيق الحرفي:**

```sql
select table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) privileges
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated','service_role')
group by table_name,grantee
order by table_name,grantee;
```

---

# 13. Realtime

المكونات/السياسات المرتبطة:

```text
components/account-live-refresh.tsx
components/admin-analytics-live-refresh.tsx
components/clinic-live-refresh.tsx
components/results-live-refresh.tsx
components/use-realtime-router-refresh.ts
lib/clinic-realtime-refresh.ts
lib/realtime-refresh-policy.ts
```

Realtime يستخدم للتحديث وإعادة التحقق، وليس authorization بديلًا. أي بيانات تصل إلى العميل يجب أن تمر بقيود الوصول المناسبة.

---

# 14. Search — التدفق الحقيقي

```text
treatment_catalog
    ↓
treatment_variants
    ↓
search query validation
    ↓
search_dental_offers()
    ↓
branch_service_offers
    ↓
availability_slots / instant_slots
    ↓
results
```

`search_dental_offers` يعيد معلومات العرض/العيادة/الفرع/الموقع/السعر/scope/التوفر/التقييم، ويقبل:

```text
p_variant_id
p_lat
p_lng
p_radius_km
p_practitioner_gender
```

لا يُسمح بخلط variant مختلف لمجرد تشابه الاسم النصي.

---

# 15. Price Integrity

العملة: `QAR`.

`branch_service_offers.price_type`:

```text
fixed
from
range
package
consultation_required
```

القيم المالية تستخدم minor units:

```text
min_minor
max_minor
```

Scope:

```text
registration
examination
xray
diagnostics
anesthesia
laboratory
medications
```

الدوال:

```text
is_valid_price_scope(jsonb)
is_price_scope_publishable(jsonb)
enforce_public_offer_price_scope()
```

لا يجوز إنشاء سعر مفقود من الواجهة أو تحويل `consultation_required` إلى سعر ثابت.

---

# 16. Booking Integrity

الحجز يمر بالمسار:

```text
Search
  ↓
Exact Variant
  ↓
Eligible Offer
  ↓
Eligible Slot
  ↓
Authenticated Patient
  ↓
Patient Profile
  ↓
Phone verification when required
  ↓
POST /api/book
  ↓
Server validation
  ↓
book_slot_server / book_slot
  ↓
transaction
  ├── idempotency
  ├── slot state synchronization
  ├── practitioner overlap exclusion
  ├── resource overlap exclusion
  ├── offer snapshot
  ├── status history
  └── notification outbox
```

حالات الحجز الحية:

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

`bookings.offer_snapshot` جزء من سلامة السعر التاريخي؛ لا يتم تغيير snapshot الخاص بالحجز بعد إنشائه وفق trigger `bookings_snapshot_immutable`.

---

# 17. Verification / Activation

الكيانات:

```text
clinics
branches
practitioners
branch_service_offers
verification_records
suspensions
```

الدالة المركزية:

```text
verify_and_activate_server(...)
```

وتوجد triggers مثل:

```text
clinics_compliance_status_guard
clinics_verified_activation
branches_compliance_status_guard
branches_verified_activation
practitioners_verified_activation
offer_activation_gate
offer_verification_fields_guard
slot_publication_gate
```

الهدف: عدم اعتبار record موجودًا = record public/verified.

---

# 18. Patient / Authentication / OTP

الجداول:

```text
auth.users
profiles
account_usernames
patient_profiles
patient_phone_verification_challenges
consent_records
```

قيود patient profile الحالية:

```text
national_id: 11 digits when present
nationality: uppercase ISO alpha-2 when present
phone: E.164 when present
phone_verified_at requires phone
DOB cannot be future
relationship: self|child|spouse|parent|other
gender: female|male|other|prefer_not_to_say
```

OTP source:

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

وجود adapter لا يثبت وحده نجاح provider end-to-end.

---

# 19. Clinic roles

```text
owner
manager
receptionist
pricing_manager
viewer
```

العضوية في `clinic_memberships`، والوصول إلى الفرع يمر عبر helpers مثل:

```text
private.has_branch_access
private.has_clinic_role
private.is_clinic_member
private.is_platform_admin
```

صلاحيات Super Admin لا تُستنتج من رابط `/admin`; يتم التحقق من claims/server/RPC/RLS.

---

# 20. Notifications

```text
notification_preferences
notification_subscriptions
notification_templates
notification_outbox
notification_delivery_attempts
```

قنوات schema:

```text
email
push
in_app
web_push
sms
```

Outbox event types:

```text
booking_requested
booking_confirmed
booking_cancelled
booking_updated
attendance_recorded
price_updated
support_reply
manual
```

الـoutbox يعتمد على dedupe key وattempt count وdelivery attempts.

---

# 21. Support / Assistant

```text
app/api/support/route.ts
components/support-chat.tsx
lib/support-model.server.ts
lib/support-public-fallback.ts
support_knowledge_articles
support_conversations
support_messages
```

Safety categories:

```text
standard
medical
emergency
privacy
billing
abuse
```

لا يقدم النظام تشخيصًا طبيًا أو يخترع معلومات تشغيلية.

---

# 22. Finance / Settlement

```text
payment_intents
payment_events
reconciliation_exceptions
clinic_fee_rules
settlement_periods
accounting_journals
accounting_journal_lines
report_exports
```

العملة `QAR`، والمبالغ minor units.

القيود تمنع journal lines غير المتوازنة على مستوى line (`debit` أو `credit`، وليس الاثنين)، وتمنع تعديل journal posted عبر triggers.

---

# 23. Audit / Telemetry / Rate limiting

```text
audit_events
clinic_operator_account_events
booking_status_history
booking_attendance_events
customer_choice_events
rate_limit_buckets
idempotency_keys
device_installations
```

`customer_choice_events` موصوف في schema بأنه first-party product telemetry، وdirect browser INSERT ليس مسار ingestion؛ المسار يمر عبر server API.

---

# 24. PWA / SEO / Static

```text
app/manifest.ts
app/robots.ts
app/sitemap.ts
app/pwa/icon/[size]/route.tsx
public/sw.js
public/offline.html
public/visuals/clinical-aurora-hero.webp
```

Service Worker لا يمنح صلاحية وصول إلى البيانات الخاصة؛ caching لا يغير authorization.

---

# 25. Environment contract — بدون أسرار

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
NEXT_PUBLIC_*                 values safe for browser
SUPABASE_SECRET_KEY           server-only
SUPABASE_SERVICE_ROLE_KEY     server-only
OPENAI_API_KEY                server-only
TWILIO_*                      server-only
```

لا يتم وضع secrets الفعلية في README أو Git.

---

# 26. package/runtime

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

Node runtime على Vercel: `24.x`.

---

# 27. Scripts

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

Scripts repository:

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

# 28. Tests

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

آخر Production build الذي تم التحقق منه قبل تحديث README:

```text
30 test files passed
107 tests passed
1 skipped
25/25 static pages generated
TypeScript passed
ESLint passed
Next.js production build passed
```

---

# 29. K6 / load testing

```text
load-tests/k6/README.md
load-tests/k6/booking-flow.js
load-tests/k6/booking-integrity-flow.js
load-tests/k6/search-flow.js
load-tests/k6/shared.js
load-tests/k6/fixtures/booking-fixtures.example.json
```

`booking-integrity-flow.js` يركز على concurrency/idempotency/booking integrity. لا يُشغل load test أو إنشاء حجوزات حقيقية على Production دون بيئة اختبار/تفويض مناسب.

---

# 30. Migrations

المصدر:

```text
supabase/migrations/*.sql
```

آخر migration Production:

```text
20260906074120_remove_duplicate_account_username_index
```

Baseline:

```text
supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql
```

Remote record:

```text
supabase/REMOTE_APPLIED_MIGRATIONS.md
```

### سلسلة الإصلاحات المهمة

تشمل migrations الخاصة بـ:

```text
customer choice ingestion/analytics
synthetic clinic isolation/public search guards
finance core
notification/support core
server-only operational RPCs
performance indexes/RLS
patient profiles/device installations
booking server-only hardening
rate limits
booking cancellation
offer verification/activation
clinic booking state transitions
attendance sequencing
secure patient booking realtime
patient details RLS hardening
clinic mutation role hardening
admin catalog governance
localized notifications/choice events
treatment catalog/price scope transparency
username/password/operator accounts
public search coordinates
operator RPC lockdown
activity reporting
critical mutation server-only policies
phone verification atomic finalize
fail-closed client privileges
financial report optimization
RLS policy consolidation
device registration guard
Super Admin operational client management
public function execute hardening
patient experience integrity
patient account admin management
booking patient RLS recursion fix
booking eligibility/client privilege hardening
account username normalization
duplicate username index removal
```

كل DDL جديد يجب أن يضاف كـmigration، وليس تعديلًا يدويًا غير مسجل في Production.

---

# 31. Production deployment evidence

Current deployment:

```text
Deployment: dpl_E3Je2mPSjbC7iNQd2MbFXbQvotgf
State: READY
Target: production
Source: git
Branch: main
SHA: 5c565b665fc2d059049774491ff38edaf86d8733
Region: iad1
Bundler: turbopack
Alias error: null
```

Current commit message:

```text
docs: make README production-current and exhaustive engineering map
```

Production aliases are attached to this deployment. The deployment is therefore the published Production build corresponding to this README commit.

---

# 32. Diagnostics — أين أبحث عن أي خلل؟

| المشكلة | نقطة البداية |
|---|---|
| UI | `app/*`, `components/*`, browser/runtime logs |
| API 4xx/5xx | `app/api/*/route.ts` → `validation.ts` → `operations.server.ts` → RPC/RLS |
| Search | `search-query.ts` → `search-offers.ts` → `search_dental_offers` |
| Price | `price.ts` → `price-scope.ts` → `branch_service_offers` → price triggers/functions |
| Booking duplicate | `/api/book` → idempotency → `book_slot_server` → `idempotency_keys`/constraints |
| Slot conflict | `availability_slots` → `book_slot` → exclusion/unique constraints |
| Patient access | `auth-claims.server.ts` → `patient_profiles` → booking RLS/helpers |
| Clinic access | `clinic_memberships` → `has_branch_access`/`is_clinic_member` → RPC/RLS |
| Super Admin | `app/admin/actions.ts` → claims → server RPC → audit |
| OTP | start/confirm route → phone adapter → challenge table → Twilio config |
| Notifications | `notifications.server.ts` → outbox → delivery attempts |
| Realtime | live-refresh components → refresh policy → Supabase Realtime/RLS |
| PWA | manifest/service worker/offline |
| SEO | metadata/robots/sitemap |
| Build | Vercel build logs → package/config → typecheck/lint/test/build |
| Production runtime | Vercel runtime logs/errors ثم Supabase live state |
| DB/RLS | migration → table → grants → policies → RPC → acceptance tests |

---

# 33. Security findings — يجب عدم إخفائها

## Security Advisor

```text
auth_leaked_password_protection
Level: WARN
Title: Leaked Password Protection Disabled
```

هذا يعني أن Supabase Auth لا يرفض حاليًا كلمات المرور الموجودة ضمن dataset لكلمات المرور المخترقة. ليس دليلًا على compromise، لكنه hardening gap حقيقي.

## Performance Advisor

توجد INFO findings مرتبطة بـunused indexes، ومنها:

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
support_messages_conversation_idx
report_exports_settlement_period_id_idx
bookings_booked_by_user_created_idx
accounting_journals_reversed_journal_id_idx
notification_outbox_template_id_idx
```

لا تحذف هذه الفهارس فقط لأن Advisor صنفها unused؛ بعضها قد يدعم constraints أو workload غير ظاهر في العينة الحالية.

---

# 34. Data integrity rules

1. لا mock data في Production business state.
2. لا fake clinic/offer/availability/booking.
3. لا service-role key في browser.
4. لا direct client writes للجداول الحساسة.
5. لا ثقة في button visibility كصلاحية.
6. لا إنشاء سعر غير موجود.
7. لا إنشاء موعد غير موجود.
8. لا اعتبار record verified لمجرد وجوده.
9. لا تعديل booking snapshot التاريخي.
10. لا تكرار booking mutation دون idempotency.
11. لا تجاوز RLS بواسطة API/UI assumptions.
12. لا تغيير schema بدون migration.
13. لا حذف index بدون evidence.
14. لا logging لـpassword/OTP/secrets أو PII غير الضرورية.
15. لا اعتبار Preview deployment = Production.
16. لا اعتبار Vercel READY وحده دليلًا على سلامة business data.

---

# 35. Source of Truth hierarchy

عند التعارض:

```text
1. Supabase live schema / RLS / grants / RPC catalog / applied migrations
2. Vercel live deployment / build / runtime state
3. GitHub main source tree
4. dated docs and evidence
```

التوثيق التاريخي لا يتغلب على الحالة الحية.

---

# 36. Release process

العملية المعتمدة:

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

لا يعتبر العمل مكتملًا لمجرد أن الكود compile. يجب أن تتطابق:

```text
GitHub source
Vercel deployment
Production runtime
Supabase migration state
Supabase schema
RLS
Grants
RPC security
Tests
```

---

# 37. Local development

```bash
cp .env.example .env.local
npm install
npm run verify
npm run dev
```

Production-like local build:

```bash
npm run build
npm run start -- -p 3000
```

لا تضع أسرار Production في Git أو README أو issues.

---

# 38. Documentation map

المستودع يحتوي على توثيق واسع، ومن أهم الملفات:

```text
docs/ARCHITECTURE_AND_CODE_MAP_AR.md
docs/ACCESS_CONTROL_VERIFICATION_2026-08-24.md
docs/BOOKING_ACCESS_REALTIME_CONTRACT_2026-08-17.md
docs/CURRENT_PRODUCTION_STATUS.md
docs/DEPLOYMENT_RUNBOOK.md
docs/MAINTENANCE_MANUAL_AR.md
docs/OPERATIONS_MANUAL_AR.md
docs/PRODUCTION_LAUNCH_READINESS_AUDIT_2026-08-18.md
docs/PRODUCTION_READINESS_AUDIT_2026-08-15.md
docs/RELEASE_READINESS_AUDIT_2026-08-25.md
docs/RLS_ROLE_SIMULATION_RESULTS_2026-08-18.md
docs/SUPPORT_AND_ACCESS_GOVERNANCE_2026-08-24.md
docs/TEST_REPORT.md
docs/TREATMENT_CATALOG_AND_PRICE_SCOPE_AUDIT_2026-08-18.md
docs/SOURCE_MANIFEST.md
```

كما توجد evidence/screenshots وتقارير load/PWA/UI/OTP/production verification تحت `docs/`.

---

# 39. README maintenance contract

يجب تحديث README عند تغيير أي من:

```text
GitHub branches/commits/tree
Vercel project/deployment/domain/runtime
Supabase project/region/status
schema/table/column/constraint/index/trigger
RLS policy/grant
RPC/function/signature/security mode
API route/method/contract
Auth/role/permission
environment variable contract
booking lifecycle
search/treatment logic
price/scope logic
notification/realtime behavior
PWA/SEO
tests/load tests
security/performance findings
```

بعد أي DDL أو RLS أو privilege change يجب إعادة جرد:

```text
Tables
RLS
Policies
Grants
Constraints
Indexes
Triggers
Functions
Advisors
Migrations
Tests
Production deployment
```

---

# 40. مبدأ الدقة

هذا الملف لا يحول "وجود كود" إلى "تشغيل مثبت".

مثال:

- وجود Twilio adapter ≠ إثبات أن SMS provider يعمل end-to-end.
- وجود notification tables ≠ إثبات أن كل provider الخارجي مفعّل.
- وجود booking RPC ≠ إثبات وجود availability حقيقية لكل عيادة.
- وجود Vercel READY ≠ إثبات خلو قاعدة البيانات من كل warning.
- وجود RLS enabled ≠ إثبات أن كل policy صحيحة؛ لذلك توجد acceptance/role tests.

الحالة التي يمكن إثباتها الآن:

```text
Production deployment: READY
Production commit: 5c565b665fc2d059049774491ff38edaf86d8733
Supabase: ACTIVE_HEALTHY
Public tables: 49
RLS enabled: 49/49
Policies: 104
Indexes: 193
Triggers: 57
Public function catalog: 46 names, with overloads
Edge Functions: 0
Latest migration: 20260906074120_remove_duplicate_account_username_index
Security Advisor: 1 WARN
Performance Advisor: INFO unused-index findings
```

**هذه هي النسخة التي يجب أن يبدأ منها أي مهندس جديد لفهم المشروع قبل تعديل الكود أو قاعدة البيانات.**
