# فهرس المصادر التشغيلي

> هذا الفهرس يشرح **أين** توجد المسؤوليات التنفيذية في `Bomussa/dental-marketplace-pwa`. أما العقود والقواعد التشغيلية والحالة الحية فهي في [README الجذري](../README.md) و[`CURRENT_PRODUCTION_STATUS.md`](CURRENT_PRODUCTION_STATUS.md). لا يسرد هذا الملف كل أصل بصري أو تقرير تاريخي صغير.

## خريطة سريعة

| المجال | الملفات أو المجلدات المرجعية | المسؤولية |
|---|---|---|
| تطبيق الويب | `app/`، `components/`، `lib/` | Next.js App Router وReact وطبقات الأعمال. |
| البحث والمقارنة | `app/page.tsx`، `app/results/page.tsx`، `app/api/search/route.ts`، `lib/search-offers.ts`، `lib/search-query.ts`، `lib/treatment-catalog.server.ts`، `components/search-form.tsx` | اختيار العلاج الدقيق، البحث، الفرز، النطاق المكاني والزمني، تفضيل جنس الممارس، رابط الاتجاهات من بيانات الفرع المنشورة، وcache الكتالوج. |
| الحجز | `components/book-button.tsx`، `app/api/book/route.ts`، `app/account/actions.ts`، `lib/booking-intent.client.ts`، `lib/operations.server.ts`، `components/account-booking-notifications.tsx` | إعداد نية الحجز، idempotency، حارس الكتابة، واستدعاء `book_slot_server`، وعرض تأكيد الحجز المحفوظ داخل الحساب. |
| المريض والهوية | `app/login/`، `app/account/`، `app/api/patient-booking-registration/route.ts`، `app/api/patient-phone-verification/`، `lib/account-auth.server.ts`، `lib/auth-claims.server.ts`، `lib/phone-verification.server.ts` | nickname المريض القصير والفريد، التسجيل والدخول والجلسات ومنع تكرار الهوية/الهاتف وملفات المرضى وOTP وحذف الحساب المؤرشف. |
| العيادة والعميل التشغيلي | `app/clinic/`، `app/clinic/bookings/page.tsx`، `components/clinic-booking-actions.tsx`، `components/clinic-booking-status-form.tsx`، `lib/clinic-booking-attendance.ts`، `lib/clinic-role-display.ts`، `lib/client-booking-workspace.ts` | الفروع والعروض والمواعيد وصلاحيات receptionist وواجهة الحجوزات المقيدة، مع مصدر موحد لإجراءات الحالة والحضور. |
| الإدارة | `app/admin/`، `components/super-admin-user-management.tsx`، `components/admin-choice-analytics.tsx`، `lib/activity-report.ts` | الحوكمة والكتالوج والتقارير وإدارة العملاء التشغيليين. |
| الدعم | `components/support-chat.tsx`، `app/api/support/route.ts`، `lib/support-model.server.ts`، `lib/support-public-fallback.ts` | إجابة زائر عامة آمنة ومحادثات المستخدم المصادق من دون تشخيص. |
| API والحراس | `app/api/`، `lib/validation.ts`، `lib/public-write-request-guard.ts`، `lib/operations.server.ts`، `lib/server-readiness.ts` | Route Handlers وZod وrate limits والمهلات وعمليات الامتياز. |
| Supabase | `lib/supabase/`، `lib/database.types.ts`، `supabase/migrations/`، `supabase/tests/acceptance.sql` | العملاء العام/SSR/الخادمي والأنواع والترحيلات وRLS/RPC/constraints، بما فيها تفرد الهاتف وقناة `in_app` وجنس الممارس وحذف حساب المريض المقيد. |
| التحديث اللحظي | `components/*-live-refresh.tsx`، `components/use-realtime-router-refresh.ts`، `lib/clinic-realtime-refresh.ts` | إعادة الجلب المعتمدة على Realtime تحت RLS. |
| PWA والواجهة | `app/manifest.ts`، `app/pwa/icon/[size]/route.tsx`، `public/sw.js`، `components/mobile-navigation.tsx`، `components/ui.tsx` | Manifest وservice worker وأيقونات وتجربة الهاتف. |
| صفحات السياسات | `app/privacy/page.tsx`، `app/terms/page.tsx`، `components/public-policy-template.tsx` | مسارات عامة ثنائية اللغة وروابطها؛ تعرض إطاراً تقنياً صريحاً أن النص القانوني يحتاج اعتماد المالك/المختص ولا تمثل سياسة نافذة قبله. |
| الاختبارات | `tests/`، `tests/treatment-catalog-resilience.test.ts`، `tests/e2e/home.spec.ts`، `tests/e2e/accessibility.spec.ts`، `tests/production-readiness-check.test.ts`، `load-tests/k6/`، `scripts/safe-load-test.mjs` | Vitest وPlaywright وaxe WCAG A/AA وK6 المحروس؛ اختبار الكتالوج يثبت تحويل مهلة عابرة إلى حالة خطأ واجهة بدلاً من رفض SSR. لا يستخدم K6 على Production. |
| بوابة الجودة والنشر | `package.json`، `scripts/predeploy-check.mjs`، `scripts/production-readiness-check.mjs`، `.github/workflows/ci.yml`، `docs/DEPLOYMENT_RUNBOOK.md`، `docs/MAINTENANCE_MANUAL_AR.md` | أوامر build/verify وCI وتسلسل النشر والرجوع ودورة الصيانة الآمنة؛ بوابة الجاهزية قراءة فقط وتفحص العقود العامة والرؤوس والبحث. |

## ملفات الجذر الحاكمة

| الملف | الاستخدام |
|---|---|
| [`README.md`](../README.md) | المصدر الهندسي وعقود المسارات ومتغيرات البيئة وقواعد العمل. |
| [`AGENTS.md`](../AGENTS.md) | قواعد العمل الآمن للمهندسين والوكلاء، وقيود Staging/Production. |
| [`CHANGELOG.md`](../CHANGELOG.md) | الإصلاحات والإصدارات المؤثرة فقط. |
| [`docs/CURRENT_PRODUCTION_STATUS.md`](CURRENT_PRODUCTION_STATUS.md) | سجل الإصدار والحالة الحالية والـrollback والقيود. |
| [`supabase/REMOTE_APPLIED_MIGRATIONS.md`](../supabase/REMOTE_APPLIED_MIGRATIONS.md) | سجل المطابقة الفعلي بين ملفات الترحيل وProduction. |
| [`docs/ARCHITECTURE_AND_CODE_MAP_AR.md`](ARCHITECTURE_AND_CODE_MAP_AR.md) | الرسم المعماري، فهرس المسارات، الطبقات، الخوارزميات وحدود كل مجموعة ملفات. |
| [`docs/MAINTENANCE_MANUAL_AR.md`](MAINTENANCE_MANUAL_AR.md) | صيانة المصدر والنشر والحوادث والـfixtures وK6 مع فصل Production/Staging. |
| [`docs/operations-manual/OPERATIONS_MANUAL_AR.md`](operations-manual/OPERATIONS_MANUAL_AR.md) | طريقة الاستخدام العملية للزائر والمريض والعميل التشغيلي والعيادة والإدارة. |

## ترحيلات وbaseline أساسية

| الموقع | الغرض |
|---|---|
| `supabase/migrations/20260825191000_harden_public_function_execute.sql` إلى `20260825195000_allow_authenticated_search_rpc.sql` | الحصر الأمني لـRPC: دوال `_server` خادمية، والبحث باستثناءات قراءة ضيقة. |
| `supabase/migrations/20260826100000_patient_experience_integrity_v1.sql` | تفرد هاتف المريض وnickname القصير، جنس الممارس وفلتر البحث، إشعار الحجز `in_app` وبيانات المكان، والحذف الذاتي المؤرشف المقيد. |
| `supabase/migrations/20260826103000_patient_account_admin_management_v1.sql` | قائمة مرضى دنيا وإجراء حذف مقيد للمدير الأعلى فقط. |
| `supabase/migrations/20260826130000_notification_outbox_rls_initplan_v1.sql` | تحسين أداء RLS لقراءة إشعارات الحساب مع إبقاء ملكية المريض وحارس الحساب واستثناء المدير الأعلى. |
| `supabase/migrations/20260826193000_booking_patient_rls_recursion_fix_v1.sql` إلى `20260826194500_booking_patient_rls_helper_search_path_v1.sql` | كسر حلقة RLS بين `bookings` و`patient_profiles` مع حارس خاص لملف المريض الذاتي غير المؤرشف وتنفيذ مقيد لـ`authenticated` داخل السياسة ومسار بحث `pg_catalog` ثابت. |
| `supabase/migrations/20260826230000_consolidate_patient_profiles_select_policy_v1.sql` | يوحد سياسة SELECT لملفات المرضى: يمنع القراءة الذاتية بعد الأرشفة مع إبقاء وصول موظفي الفرع المخول للحجز المرتبط. طُبق في Staging ثم Production بالنسخة البعيدة `20260827000621` مع postconditions قراءة فقط. |
| `supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql` | baseline مخطط خالٍ من البيانات لإعادة بناء Staging، وليس مصدرًا لإدخال بيانات Production. |
| `supabase/baselines/README.md` | تسلسل baseline ثم مهاجرات التقوية الخمس. |
| `scripts/generate-schema-baseline.py` و`scripts/verify-schema-baseline.py` | توليد ومقارنة جرد المخطط من دون أسرار أو صفوف أعمال. |

## أوامر التحقق

| الأمر | المجال |
|---|---|
| `npm run verify` | predeploy وTypeScript وlint وVitest وbuild، بما فيها اختبار `booking-rls-recursion.test.ts` لعقد منع الحلقة. |
| `npm run test:e2e` | Playwright محلي؛ يحتاج إعدادات Supabase public محلية صالحة ولا يقبل نسخ أسرار Production. |
| `npm run test:e2e` مع بيئة غير مهيأة | نتيجة متوقعة: blocked محليًا بسبب غياب URL/key، وليست دليل فشل للإصدار المنشور. |
| `TARGET_ENV=staging ... k6 run load-tests/k6/search-flow.js` | K6 للبحث في Staging فقط مع الحراس وإقرار البيئة. |
| `TARGET_ENV=staging ... k6 run load-tests/k6/booking-flow.js` | حجز K6 مصغر في Staging فقط؛ يحتاج fixture خاصًا وcookie قصير العمر ولا ينفذ عند غياب بيانات تشغيلية مخولة. |
| `TARGET_ENV=staging ... k6 run load-tests/k6/booking-integrity-flow.js` | تحقق retry بنفس مفتاح idempotency أو سباق عدة حسابات على slot واحد؛ يتطلب `BOOKING_INTEGRITY_MODE=retry|concurrency` وfixtures معزولة ولا ينفذ من دون حراس Staging. |

> لا تحفظ قيم متغيرات البيئة أو secrets أو بيانات مستخدمين في هذا الفهرس. لا تُنشأ بيانات اختبار في Production؛ اقرأ `AGENTS.md` قبل أي عمل كتابة أو migration.
