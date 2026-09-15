# أسناني قطر — تحديث هندسي موثّق — 2026-09-15

> **هذا الملف هو سجل تحديث مستقل للحالة التي تم التحقق منها في 2026-09-15.**
>
> تم وضعه كملف جديد في `main` حتى لا يتم حذف أو استبدال `README.md` القديم أو فقد أي جزء من مرجعه التفصيلي. هذا الملف يشرح الفروقات والتحديثات التي ثبتت بعد النسخة القديمة، ويشير صراحةً إلى النقاط التي لا يجوز اعتبارها مدمجة في `main` ما لم يثبت ذلك.
>
> **المشروع:** `Bomussa/dental-marketplace-pwa`
> **المنتج:** أسناني قطر
> **المجال:** البحث عن خدمات الأسنان، المقارنة، الأسعار والعروض، التوفر والمواعيد، الحجز وإدارة الحجز.
> **الحدود:** ليس نظام سجلات طبية، ولا يهدف إلى التشخيص أو تخزين الأشعة أو الوصفات أو السجل العلاجي.

---

## 1. لماذا أضيف هذا الملف بدل استبدال README.md؟

الـREADME القديم شامل جدًا ويحتوي على جرد تاريخي واسع. حالته القديمة كانت مرتبطة بتدقيق 2026-09-07 وتحتوي أرقامًا أصبحت غير محدثة، كما أن بعض قوائم الملفات والمخطط أصبحت متأخرة عن الحالة الحالية.

لذلك اتُّخذ القرار الآمن التالي:

1. **عدم حذف أو استبدال `README.md` الحالي.**
2. إضافة هذا الملف كمرجع تحديث مؤرخ 2026-09-15.
3. توثيق الفرق بين الحالة القديمة والحالة الحالية المثبتة.
4. عدم اعتبار أي PR مفتوح أو migration غير موجودة في `main` جزءًا من كود `main`.
5. عدم اختراع أرقام أو أسماء دوال أو نتائج اختبار غير متحقق منها.

بهذا الأسلوب لا يحدث فقد للمعلومات القديمة، وفي الوقت نفسه توجد وثيقة حديثة واضحة للحالة الجديدة.

---

## 2. الحالة الحالية لـ GitHub

| العنصر | القيمة المثبتة |
|---|---|
| Repository | `Bomussa/dental-marketplace-pwa` |
| Branch | `main` |
| Current HEAD | `e2d96c4d483cb6d7dfd1d71086b65026d8f10e1c` |
| HEAD message | `chore: enforce change duplication and conflict gate (#27)` |
| Commit verification | GitHub signature verified |
| Package version | `0.1.0` في `package.json`؛ **ليس GitHub Release** |
| Framework | Next.js `16.3.4` |
| React | `19.2.8` |
| TypeScript | `5.8.3` |
| Supabase JS | `2.111.0` |
| Supabase SSR | `0.12.4` |
| Zod | `4.4.3` |
| Playwright | `1.62.0` |
| Vitest | `4.1.10` |
| ESLint | `9.39.5` |
| Tailwind CSS | `4.3.3` |
| Node CI | `24.x` |

الـHEAD الحالي يحتوي على إضافة **Change Gate** وربطها بـCI وأوامر `verify` و`vercel-build`. التغيير موثق في commit الحالي نفسه.

---

## 3. ما الذي تغير عن README القديم؟

### 3.1 الحالة الزمنية

**القديم:** كان يقول إن آخر مزامنة هي 2026-09-07.

**الحالي:** هذه الوثيقة مؤرخة **2026-09-15** وتفصل الحالة الحالية عن السجل التاريخي.

### 3.2 HEAD

**القديم:** كان يوثق HEAD أقدم:

```text
5c565b665fc2d059049774491ff38edaf86d8733
```

**الحالي:**

```text
e2d96c4d483cb6d7dfd1d71086b65026d8f10e1c
```

والـcommit الحالي أضاف بوابة منع التكرار والتعارض قبل الوصول إلى `main`.

### 3.3 بوابة Change Gate

أصبحت المنظومة تحتوي على:

```text
scripts/change-gate.mjs
docs/CHANGE_GATE.md
```

والـGate يدخل ضمن:

```bash
npm run verify
npm run vercel-build
```

وفي Pull Request إلى `main` يعمل تلقائيًا باستخدام `CHANGE_GATE_BASE_SHA`.

الـGate يفحص، من بين أمور أخرى:

- `git diff --check`.
- الملفات المصدرية المتطابقة حرفيًا.
- الملف المصدر الجديد الذي يكون نسخة مطابقة لملف موجود.
- تضارب تعريفات التصدير كتحذير معلوماتي وليس كحكم semantic مطلق.
- لمس حدود حساسة مثل migrations وAPI وSupabase وRLS وbooking وidempotency.

**مهم:** الـGate لا يدعي أنه يثبت وحده صحة RLS أو الحجز المتزامن أو تجربة Safari الحقيقية؛ هذه تحتاج اختبارات مستقلة.

### 3.4 package scripts

أصبح `package.json` يتضمن:

```text
change:gate
repo:metrics
verify
verify:e2e
check:production
vercel-build
```

والـ`verify` يشمل `change:gate` قبل TypeScript وESLint والاختبارات والبناء.

### 3.5 CI

CI الحالي يستخدم Node 24 و`npm ci` ويشمل:

- Change Gate في Pull Requests.
- Runtime dependency audit.
- Critical dependency gates.
- TypeScript.
- ESLint.
- Vitest.
- Production build.
- Public Playwright E2E.
- Desktop Chrome وMobile Chrome عبر إعداد Playwright.

---

## 4. الحالة الحالية لقاعدة البيانات Production

المشروع يستخدم Supabase Production:

```text
Project: qatar-dental-dev
Ref: bqvcukxfsnchvkgejolz
Region: eu-central-1
PostgreSQL: 17.6.1.155 / major 17
Status: ACTIVE_HEALTHY
```

### الأرقام الحالية المثبتة

| العنصر | القديم في README | الحالي المثبت |
|---|---:|---:|
| Public tables | 49 | **50** |
| Tables with RLS | 49/49 | **50/50** |
| Public indexes | 193 | **198** |
| RLS policies | 104 | **105** |
| Functions | 46 | **49** |

لا تعني زيادة العدد أن كل زيادة ميزة مستقلة؛ الأرقام هي جرد للكائنات الحية في Production.

---

## 5. التغيير الجديد في Production: Booking Waitlist

أصبح Production يحتوي على جدول:

```text
booking_waitlist
```

وله حاليًا خمسة indexes مثبتة:

```text
booking_waitlist_account_status_idx
booking_waitlist_active_patient_offer_uidx
booking_waitlist_offer_status_created_idx
booking_waitlist_pkey
booking_waitlist_variant_idx
```

وله سياسة القراءة التالية:

```text
booking_waitlist_select_own
```

وهي `SELECT` للمستخدم `authenticated` فقط ضمن نطاق الحساب.

والوظائف الثلاث الحية الخاصة بالـwaitlist هي:

```text
join_booking_waitlist_server(
  p_actor_id uuid,
  p_offer_id uuid,
  p_patient_profile_id uuid
)

list_booking_waitlist_server(
  p_actor_id uuid
)

withdraw_booking_waitlist_server(
  p_actor_id uuid,
  p_waitlist_id uuid
)
```

هذه المعلومات تم التحقق منها مباشرة من PostgreSQL Production بتاريخ 2026-09-15.

### تنبيه مهم جدًا حول waitlist

وجود هذه الكائنات في Production Database **لا يعني أن واجهة waitlist أصبحت جزءًا من `main`**.

التحقق من GitHub يبين أن migration المسماة:

```text
20260914065930_pr28_waitlist_read_rpc_alignment_20260914.sql
```

ليست موجودة في `main` عند هذا التدقيق، كما أن البحث عن `booking_waitlist` في كود `main` لم يعثر على تنفيذ واجهة مطابق.

لذلك الحالة الصحيحة هي:

```text
Production DB: waitlist schema/functions موجودة
main application code: لا نعلن waitlist كميزة مكتملة في main
```

لا يجوز دمج هاتين الحالتين في وصف واحد أو الادعاء أن الميزة منشورة للمستخدمين ما لم يثبت دمج الكود.

---

## 6. آخر Migration معروفة في Production

آخر migration الحية التي تم التحقق منها في الجرد الحالي هي:

```text
20260914065930_pr28_waitlist_read_rpc_alignment_20260914
```

وبسبب اختلاف تاريخ/مسار المصدر عن فرع `main`، يجب التعامل مع **migration history في Supabase** باعتبارها مصدر حقيقة لحالة قاعدة البيانات، بينما `supabase/migrations/` هو مصدر الحقيقة لتغييرات المخطط التي يجب تتبعها في المستودع.

لا ينبغي إجراء DDL مباشر جديد في Production خارج migration قابلة للتتبع.

---

## 7. ما بقي صحيحًا من README القديم

المعلومات التالية ما زالت جزءًا من العقد العام للمشروع ولم يتم إسقاطها من هذا التحديث:

- المستودع الوحيد هو `Bomussa/dental-marketplace-pwa`.
- الفرع الإنتاجي هو `main`.
- المشروع منفصل عن `Bomussa/love` و`Bomussa/love-api`.
- المنتج أسناني قطر وليس نظام EMR.
- البحث يعتمد على `treatment_variant` وليس نصًا حرًا فقط.
- السعر والموعد والعرض يجب أن تكون مصدرها قاعدة البيانات/العرض المصرح، ولا يجوز للواجهة اختراعها.
- الحجز يجب أن يكون خادميًا وذريًا مع idempotency وضوابط الملكية.
- RLS وPostgres constraints هما جزء من حدود الأمان، وليست الواجهة وحدها حاجز الصلاحية.
- العمليات الخادمية المميزة تبقى في server-only code.
- مفاتيح Service Role/Secret لا تدخل client bundle.
- OTP يعتمد على مزود خادمي عند تهيئته؛ غياب مزود OTP لا يجب أن يتحول إلى نجاح وهمي.
- K6 والحجوزات التجريبية والكتابة وfixtures تخص Staging المعزول، وليست Production.
- بيانات `seed.dev.sql` اصطناعية وموسومة DEV ولا يجوز تشغيلها في Production.

---

## 8. خريطة التطبيق الحالية المثبتة

### App Router

المسارات الحالية المهمة التي تم التحقق من وجودها في `main` تشمل:

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
```

### API

```text
GET  /api/health
GET  /api/search
POST /api/book
POST /api/choices
POST /api/device-installations
GET/POST /api/locale
POST /api/patient-booking-registration
POST /api/patient-phone-verification/start
POST /api/patient-phone-verification/confirm
POST /api/support
GET /api/admin/reports/csv
GET /api/admin/reports/activity-csv
```

### أهم حدود الخادم

```text
lib/account-auth.server.ts
lib/auth-claims.server.ts
lib/operations.server.ts
lib/phone-verification.server.ts
lib/notifications.server.ts
lib/support-model.server.ts
lib/support-public-fallback.ts
lib/treatment-catalog.server.ts
lib/public-write-request-guard.ts
lib/realtime-refresh-policy.ts
lib/supabase/admin.ts
lib/supabase/client.ts
lib/supabase/proxy.ts
lib/supabase/server.ts
lib/validation.ts
```

---

## 9. البحث والمقارنة

المسار الحالي يستخدم:

```text
lib/search-query.ts
lib/search-offers.ts
app/api/search/route.ts
app/results/page.tsx
components/search-form.tsx
lib/treatment-catalog.server.ts
```

يدعم البحث خيارات:

```text
balanced
price
distance
rating
soonest
```

ومواعيد:

```text
earliest
today
tomorrow
```

كما توجد تفضيلات جنس الممارس:

```text
female
male
```

ويتم فرز `balanced` باستخدام أوزان مطبقة على السعر والتقييم ووقت الموعد والمسافة، بينما الفرز المباشر يطبق المفاضلة المناسبة مع fallback ثابت.

### العلاجات البارزة

القائمة الحالية المثبتة في `components/search-form.tsx`:

```text
whitening
root_canal
composite_filling
tooth_extraction
scaling
```

ويؤكد اختبار `tests/featured-treatments.test.ts` ترتيبها عند توفرها، مع fallback إلى أول خمسة عناصر نشطة عند عدم توفر العناصر المخصصة.

---

## 10. شفافية الأسعار

`lib/price.ts` يمثل أسعار QAR بوحدات صغرى ثم يحولها إلى عرض عملة قطرية.

`lib/price-scope.ts` يعرف نطاق السعر للعناصر:

```text
registration
examination
xray
diagnostics
anesthesia
laboratory
medications
```

وحالاتها:

```text
included
excluded
assessment_required
not_applicable
```

الهدف هو منع عرض رقم مالي بلا توضيح لما يشمله أو لا يشمله العرض.

---

## 11. الحجز

المسار الأساسي:

```text
components/book-button.tsx
        ↓
lib/booking-intent.client.ts
        ↓
app/api/book/route.ts
        ↓
validation + origin/body guards + rate limit
        ↓
server-side auth claims
        ↓
Supabase/PostgreSQL RPC
        ↓
booking + snapshot + status history + audit
```

`app/api/book/route.ts` يفرض، من الكود الحالي، مصادقة الخادم، وفحص origin، وحدًا لحجم الطلب، وقراءة آمنة للطلب قبل parsing، ثم يمرر الطلب إلى طبقة العمليات/قاعدة البيانات.

لا يعتبر إرسال الطلب من الواجهة بحد ذاته حجزًا ناجحًا؛ مصدر الحقيقة النهائي هو نتيجة العملية الخادمية وقاعدة البيانات.

---

## 12. حساب المريض والدخول

الدخول يستخدم username/password وليس Magic Link كمسار الدخول الأساسي.

`app/login/actions.ts` يطبق rate limits منفصلة للعميل ولـusername، ويستخدم رسالة فشل موحدة، ويقبل عقد nickname للمريض من 2–10 أحرف، مع إبقاء عقد حسابات التشغيل الأوسع.

`lib/account-auth.server.ts` يجهز حساب المريض ومسار الملف، مع منع التعارضات المعروفة مثل:

```text
username_taken
email_taken
national_id_taken
phone_taken
```

صفحة الاستعادة موجودة، وصفحة تحديث كلمة المرور موجودة.

---

## 13. OTP / الهاتف

المسارات:

```text
/api/patient-phone-verification/start
/api/patient-phone-verification/confirm
```

والمحول:

```text
lib/phone-verification.server.ts
```

يعتمد على إعدادات Twilio الخادمية عند التشغيل الفعلي. إذا لم تكن إعدادات المزود موجودة، فالنتيجة الصحيحة هي حالة عدم توفر آمنة، وليست تأكيدًا وهميًا.

لا يجوز وضع مفاتيح Twilio أو Supabase السرية أو Service Role في Git أو متغيرات `NEXT_PUBLIC_*`.

---

## 14. الصلاحيات: الإدارة والعيادة والعميل التشغيلي

الإدارة تستخدم claims من `app_metadata`:

```text
platform_admin === true
```

والعمليات التي تتطلب المدير الأعلى تتحقق أيضًا من:

```text
platform_super_admin === true
```

العيادة تعتمد على العضوية والدور والفرع، والعميل التشغيلي يستخدم `access_scope=clinic_bookings_only` قبل الدخول إلى مساحة `/clinic/bookings`.

وجود عنصر مخفي في الواجهة لا يمثل صلاحية. الحماية النهائية في server actions/RPC/RLS.

---

## 15. Realtime

يوجد hook مركزي:

```text
components/use-realtime-router-refresh.ts
```

وسياسة:

```text
lib/realtime-refresh-policy.ts
```

القيم الحالية:

```text
Debounce: 320 ms
Max wait: 1500 ms
Reconnect base: 1000 ms
Reconnect max: 30000 ms
Max exponent: 5
```

الـRealtime يعيد جلب الصفحة ولا يصبح مصدر حقيقة بديلًا عن Postgres. RLS هو الذي يحدد ما يمكن أن يظهر للمستخدم.

توجد أسطح تحديث منفصلة للحساب والعيادة والإدارة والنتائج.

---

## 16. PWA وOffline

`app/manifest.ts` يعرف التطبيق باسم:

```text
أسناني قطر
```

ويدعم 192 و512 icon sizes بصيغتي `any` و`maskable`.

Service worker:

```text
public/sw.js
```

يستخدم cache عام محدودًا لصفحة offline فقط. المسارات الخاصة:

```text
/account
/clinic
/admin
/auth
/api
```

لا يتم استبدالها بصفحة offline من الذاكرة المؤقتة. هذا مقصود حتى لا تظهر بيانات قديمة أو خاصة.

---

## 17. SEO والأمان في Next.js

`next.config.ts` يفرض headers تشمل:

```text
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy
```

والصفحات الحساسة تستخدم `X-Robots-Tag: noindex, nofollow, noarchive`.

`robots.ts` يمنع فهرسة مسارات الإدارة والحساب والدخول وAPI والعيادة والنتائج ومسارات الأخطاء.

`app/sitemap.ts` يولد sitemap للمسار العام.

---

## 18. صفحات الخصوصية والشروط

يوجد:

```text
/privacy
/terms
```

لكن `components/public-policy-template.tsx` يصرح بأن النص القانوني النهائي **قيد الاعتماد** ولا يجوز اعتبار الصفحة اعتمادًا قانونيًا نهائيًا قبل اعتماد المالك أو المختص.

هذا توثيق تقني، وليس رأيًا أو اعتمادًا قانونيًا.

---

## 19. الدعم

واجهة الدعم:

```text
components/support-chat.tsx
```

والمسار:

```text
app/api/support/route.ts
```

مع:

```text
lib/support-model.server.ts
lib/support-public-fallback.ts
```

الـfallback يقدم معلومات عامة عن البحث والأسعار والحجز والحساب، ولا يدعي التشخيص الطبي أو اختراع سعر/موعد. توجد بوابة safety للإشارات الطبية/الطارئة.

---

## 20. الاختبارات الحالية في المستودع

### Unit / regression

توجد اختبارات لعدة عقود، ومنها:

```text
tests/featured-treatments.test.ts
tests/treatment-catalog-resilience.test.ts
tests/booking-rls-recursion.test.ts
tests/production-readiness-check.test.ts
```

اختبار catalog resilience يثبت أن timeout تشغيلي مؤقت يتحول إلى:

```text
{ treatments: [], variants: [], hasError: true }
```

بدل إسقاط SSR بالكامل.

اختبار RLS recursion يثبت وجود helper خاص لمسار ملف المريض المؤرشف، وعدم جعل `bookings_select` يستعلم `patient_profiles` مباشرة تحت RLS caller.

### E2E

Playwright مضبوط على:

```text
chromium
mobile-chrome
```

ويستخدم worker واحدًا لأن الاختبارات تشارك أصلًا محليًا وتغير حالة network/service worker.

يوجد اختبار WCAG آلي عبر axe لصفحة البداية وتسجيل الدخول.

### K6

يوجد سيناريو:

```text
load-tests/k6/booking-integrity-flow.js
```

لكن حارس السيناريو يرفض التشغيل ما لم تكن البيئة Staging، ويتطلب:

```text
TARGET_ENV=staging
BOOKING_WRITE_CONFIRMATION=STAGING_TEST_DATA_ONLY
BOOKING_INTEGRITY_MODE=retry|concurrency
```

ولا يجوز تشغيل هذا السيناريو على Production.

---

## 21. قاعدة بيانات التطوير والبيانات الاصطناعية

`supabase/seed.dev.sql` موسوم بوضوح بأنه **DEV ONLY** ويستخدم عيادات synthetic.

البيانات الاصطناعية لا يجوز اعتبارها بيانات عيادات حقيقية في Production.

اختبارات القبول في:

```text
supabase/tests/acceptance.sql
```

تغطي، من بين أمور أخرى، بحث root canal molar، النطاق الجغرافي، منع وصول anon إلى audit data، وإخفاء synthetic clinics عن البحث العام والقراءات المباشرة.

---

## 22. Baseline ومصدر الحقيقة للمخطط

يوجد baseline في:

```text
supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql
```

وهو baseline خالٍ من صفوف البيانات والحسابات وكلمات المرور والجلسات.

ويُستخدم لإعادة بناء قاعدة جديدة مع دلتا الصلاحيات الموثقة، وليس لتطبيقه فوق Production يحمل التاريخ التدريجي نفسه.

سجل migration البعيد:

```text
supabase/REMOTE_APPLIED_MIGRATIONS.md
```

يجب استخدامه عند مقارنة local migration history مع Production.

---

## 23. Vercel والنشر

المشروع:

```text
Vercel project: dental-marketplace-pwa
Project ID: prj_Dj3iqScGPVpMZdbluhw7YUwNBbSr
Team: bomousa-mmc
Team ID: team_aFtFTvzgabqENB5bOxn4SiO7
```

`vercel.json` يحدد:

```text
framework = nextjs
buildCommand = npm run vercel-build
```

وبذلك تمر عملية البناء عبر بوابات المشروع قبل إنتاج artifact.

### Production

النطاق التقني المرتبط بالمشروع هو:

```text
https://www.mmc-mms.com/
```

**تنبيه تسمية:** اسم النطاق يحتوي `mmc-mms.com` لأسباب بنية الاستضافة الحالية، لكن المنتج الموثق هنا هو **أسناني قطر**. لا يجوز الخلط بين هذا المستودع ومستودعات MMC-MMS الأخرى.

---

## 24. الأمن الحالي: ما الذي لا يجوز ادعاؤه؟

Security Advisor الحالي ليس `zero warnings`.

يوجد تحذير مثبت:

```text
auth_leaked_password_protection
Leaked Password Protection Disabled
```

هذا لا يثبت اختراقًا، لكنه يعني أن الحالة الأمنية ليست بلا ملاحظات.

Performance Advisor لديه INFO findings، خصوصًا indexes تم الإبلاغ عنها كغير مستخدمة. لا يجوز حذف index تلقائيًا لمجرد ظهوره كـunused؛ يجب إثبات عدم الحاجة من workload فعلي.

---

## 25. الفرق المختصر بين الوثيقة القديمة وهذه الوثيقة

| المجال | README القديم | تحديث 2026-09-15 |
|---|---|---|
| تاريخ الحالة | 2026-09-07 | 2026-09-15 |
| HEAD | `5c565b...` | `e2d96c4...` |
| Change Gate | غير موجود في الجرد القديم | موجود ومربوط بـCI وverify |
| tables | 49 | 50 |
| RLS tables | 49/49 | 50/50 |
| indexes | 193 | 198 |
| policies | 104 | 105 |
| functions | 46 | 49 |
| waitlist DB | غير موجود في الجرد القديم | موجود في Production DB |
| waitlist main code | غير مثبت | لا نعتبره موجودًا في `main` ما دام الكود/المigration غير موجودين في main |
| package version | قد يُفهم خطأ كإصدار | `0.1.0` هو package.json فقط |
| Security Advisor | WARN واحد | WARN واحد؛ لا ندعي zero warnings |
| CI | أقدم | Node 24 + npm ci + audits + TypeScript + ESLint + tests + build + public E2E + Change Gate |

---

## 26. نقاط قديمة يجب عدم نسخها إلى وثيقة حالية دون تحقق

هناك معلومات في README القديم لا يجوز إعادة استخدامها كحالة حية، ومنها:

- تاريخ المزامنة 2026-09-07.
- HEAD القديم `5c565b...`.
- عدادات 49/193/104/46.
- آخر migration القديم `20260906074120_remove_duplicate_account_username_index`.
- أي claim بأن جميع قوائم الملفات القديمة ما زالت مطابقة حرفيًا للمستودع.
- أي claim بأن waitlist موجودة في واجهة `main` لمجرد أنها موجودة في Production DB.
- أي نتائج Production قديمة مرتبطة بنشر أقدم من HEAD الحالي.
- أي حالة `READY` لنشر قديم لا يطابق commit الحالي.

ومن أمثلة المعلومات التي ثبت أنها قديمة في README القديم: الإشارة إلى `app/actions/locale.ts`؛ فمسار `app/actions` لم يكن موجودًا في `main` عند التحقق الحالي، بينما مسار اللغة الفعلي موجود في `app/api/locale/route.ts` وطبقة i18n.

---

## 27. قواعد الصيانة بعد هذا التحديث

قبل إنشاء ملف أو endpoint أو SQL object جديد:

```text
DISCOVER
  ↓
VERIFY
  ↓
MINIMAL CHANGE
  ↓
TEST
  ↓
RE-TEST
  ↓
CLEAN
  ↓
FINAL RELEASE CHECK
```

المبدأ ليس تقليل عدد الملفات بالقوة، بل:

```text
Single Source of Truth
+
Single Responsibility
+
Zero Unnecessary Duplication
```

لا يتم حذف أو دمج كود فقط لأن أسماء الملفات متشابهة. يجب إثبات التكافؤ الوظيفي، وحدود الصلاحيات، وعقد API، وسلوك UX قبل consolidation.

---

## 28. معايير عدم الإعلان عن الجاهزية

لا يجوز إعلان المشروع `READY` لمجرد نجاح build أو CI.

يبقى الحكم محجوزًا إذا كان أحد الآتي غير مثبت:

- Production deployment يطابق commit المطلوب.
- الصفحة العامة وhealth/search تعمل قراءة فقط.
- RLS/grants/constraints متوافقة مع عقد الأمان.
- مسار الحجز الذري مثبت في بيئة الاختبار المناسبة.
- concurrency/idempotency مثبتة في Staging عند الحاجة.
- OTP الحقيقي مثبت عندما يكون مطلوبًا في مسار العمل.
- العيادات والعروض والمواعيد الحقيقية معتمدة قبل اعتبارها بيانات تشغيل عامة.
- لا توجد بيانات synthetic معروضة للعامة.
- لا توجد secrets في repository/client bundle.
- migrations المحلية والبعيدة مفهومة ومتوافقة.

نجاح Change Gate لا يلغي أي بند من هذه البنود.

---

## 29. نتيجة تدقيق هذه الوثيقة

**حالة هذا الملف:** تم إنشاؤه كمرجع تحديث مستقل في `main` بتاريخ 2026-09-15.

**ما يثبته:**

- الفرق الأساسي بين الجرد القديم والحالي.
- HEAD الحالي.
- إضافة Change Gate.
- أرقام Production الحالية التي تم التحقق منها.
- وجود waitlist في Production DB وتفاصيلها الأساسية.
- الفصل الصريح بين Production DB و`main` code.
- العقود الحالية المهمة للبحث والحجز والدخول وRLS وRealtime وPWA وCI.
- الملاحظات الأمنية التي لا يجوز إخفاؤها.

**ما لا يدعيه:**

- أنه بديل حرفي عن كل سطر في README القديم.
- أن كل ميزة مخططة أو PR مفتوحة أصبحت Production-ready.
- أن وجود جدول في Production يعني أن واجهة المستخدم منشورة.
- أن نجاح CI وحده يثبت كل سيناريوهات الاستخدام الحقيقي.
- أن Security Advisor بلا تحذيرات.

---

## 30. المصدر المرجعي

للحالة الحالية استخدم بالترتيب:

1. GitHub `main` للكود المنشور في المصدر.
2. Supabase Production للمخطط والكائنات الحية.
3. Vercel للنشر الفعلي وcommit النشر.
4. `supabase/REMOTE_APPLIED_MIGRATIONS.md` لتاريخ migrations الموثق.
5. `docs/CHANGE_GATE.md` لقواعد منع التكرار والتعارض.
6. `AGENTS.md` و`docs/DEPLOYMENT_RUNBOOK.md` و`docs/MAINTENANCE_MANUAL_AR.md` لقواعد التشغيل الآمن.
7. هذا الملف لتلخيص فرق 2026-09-15 دون حذف المرجع القديم.

> **قاعدة نهائية:** لا تُستخدم هذه الوثيقة أو README القديم أو أي تقرير تاريخي لإثبات حالة حية إذا تعارض مع GitHub/Supabase/Vercel بعد التحقق المباشر.
