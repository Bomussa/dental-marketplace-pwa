# فهرس المصادر التشغيلي

> هذا الفهرس يشرح **أين** توجد المسؤوليات التنفيذية في `Bomussa/dental-marketplace-pwa`. أما العقود والقواعد التشغيلية والحالة الحية فهي في [README الجذري](../README.md) و[`CURRENT_PRODUCTION_STATUS.md`](CURRENT_PRODUCTION_STATUS.md). لا يسرد هذا الملف كل أصل بصري أو تقرير تاريخي صغير.

## خريطة سريعة

| المجال | الملفات أو المجلدات المرجعية | المسؤولية |
|---|---|---|
| تطبيق الويب | `app/`، `components/`، `lib/` | Next.js App Router وReact وطبقات الأعمال. |
| البحث والمقارنة | `app/page.tsx`، `app/results/page.tsx`، `app/api/search/route.ts`، `lib/search-offers.ts`، `lib/search-query.ts`، `lib/treatment-catalog.server.ts`، `components/search-form.tsx` | اختيار العلاج الدقيق، البحث، الفرز، النطاق المكاني والزمني، وcache الكتالوج. |
| الحجز | `components/book-button.tsx`، `app/api/book/route.ts`، `app/account/actions.ts`، `lib/booking-intent.client.ts`، `lib/operations.server.ts` | إعداد نية الحجز، idempotency، حارس الكتابة، واستدعاء `book_slot_server`. |
| المريض والهوية | `app/login/`، `app/account/`، `app/api/patient-booking-registration/route.ts`، `app/api/patient-phone-verification/`، `lib/account-auth.server.ts`، `lib/auth-claims.server.ts`، `lib/phone-verification.server.ts` | التسجيل والدخول والجلسات وملفات المرضى وOTP. |
| العيادة والعميل التشغيلي | `app/clinic/`، `app/clinic/bookings/page.tsx`، `components/clinic-booking-status-form.tsx`، `lib/clinic-role-display.ts`، `lib/client-booking-workspace.ts` | الفروع والعروض والمواعيد وصلاحيات receptionist وواجهة الحجوزات المقيدة. |
| الإدارة | `app/admin/`، `components/super-admin-user-management.tsx`، `components/admin-choice-analytics.tsx`، `lib/activity-report.ts` | الحوكمة والكتالوج والتقارير وإدارة العملاء التشغيليين. |
| الدعم | `components/support-chat.tsx`، `app/api/support/route.ts`، `lib/support-model.server.ts`، `lib/support-public-fallback.ts` | إجابة زائر عامة آمنة ومحادثات المستخدم المصادق من دون تشخيص. |
| API والحراس | `app/api/`، `lib/validation.ts`، `lib/public-write-request-guard.ts`، `lib/operations.server.ts`، `lib/server-readiness.ts` | Route Handlers وZod وrate limits والمهلات وعمليات الامتياز. |
| Supabase | `lib/supabase/`، `lib/database.types.ts`، `supabase/migrations/`، `supabase/tests/acceptance.sql` | العملاء العام/SSR/الخادمي والأنواع والترحيلات وRLS/RPC/constraints. |
| التحديث اللحظي | `components/*-live-refresh.tsx`، `components/use-realtime-router-refresh.ts`، `lib/clinic-realtime-refresh.ts` | إعادة الجلب المعتمدة على Realtime تحت RLS. |
| PWA والواجهة | `app/manifest.ts`، `app/pwa/icon/[size]/route.tsx`، `public/sw.js`، `components/mobile-navigation.tsx`، `components/ui.tsx` | Manifest وservice worker وأيقونات وتجربة الهاتف. |
| الاختبارات | `tests/`، `tests/e2e/home.spec.ts`، `load-tests/k6/`، `scripts/safe-load-test.mjs` | Vitest وPlaywright وK6 المحروس؛ لا يستخدم K6 على Production. |
| بوابة الجودة والنشر | `package.json`، `scripts/predeploy-check.mjs`، `scripts/production-readiness-check.mjs`، `.github/workflows/ci.yml`، `docs/DEPLOYMENT_RUNBOOK.md` | أوامر build/verify وCI وتسلسل النشر والرجوع. |

## ملفات الجذر الحاكمة

| الملف | الاستخدام |
|---|---|
| [`README.md`](../README.md) | المصدر الهندسي وعقود المسارات ومتغيرات البيئة وقواعد العمل. |
| [`AGENTS.md`](../AGENTS.md) | قواعد العمل الآمن للمهندسين والوكلاء، وقيود Staging/Production. |
| [`CHANGELOG.md`](../CHANGELOG.md) | الإصلاحات والإصدارات المؤثرة فقط. |
| [`docs/CURRENT_PRODUCTION_STATUS.md`](CURRENT_PRODUCTION_STATUS.md) | سجل الإصدار والحالة الحالية والـrollback والقيود. |
| [`supabase/REMOTE_APPLIED_MIGRATIONS.md`](../supabase/REMOTE_APPLIED_MIGRATIONS.md) | سجل المطابقة الفعلي بين ملفات الترحيل وProduction. |

## ترحيلات وbaseline أساسية

| الموقع | الغرض |
|---|---|
| `supabase/migrations/20260825191000_harden_public_function_execute.sql` إلى `20260825195000_allow_authenticated_search_rpc.sql` | الحصر الأمني لـRPC: دوال `_server` خادمية، والبحث باستثناءات قراءة ضيقة. |
| `supabase/baselines/20260825000000_asnani_current_schema_snapshot.sql` | baseline مخطط خالٍ من البيانات لإعادة بناء Staging، وليس مصدرًا لإدخال بيانات Production. |
| `supabase/baselines/README.md` | تسلسل baseline ثم مهاجرات التقوية الخمس. |
| `scripts/generate-schema-baseline.py` و`scripts/verify-schema-baseline.py` | توليد ومقارنة جرد المخطط من دون أسرار أو صفوف أعمال. |

## أوامر التحقق

| الأمر | المجال |
|---|---|
| `npm run verify` | predeploy وTypeScript وlint وVitest وbuild. |
| `npm run test:e2e` | Playwright محلي؛ يحتاج إعدادات Supabase public محلية صالحة ولا يقبل نسخ أسرار Production. |
| `npm run test:e2e` مع بيئة غير مهيأة | نتيجة متوقعة: blocked محليًا بسبب غياب URL/key، وليست دليل فشل للإصدار المنشور. |
| `TARGET_ENV=staging ... k6 run load-tests/k6/search-flow.js` | K6 للبحث في Staging فقط مع الحراس وإقرار البيئة. |

> لا تحفظ قيم متغيرات البيئة أو secrets أو بيانات مستخدمين في هذا الفهرس. لا تُنشأ بيانات اختبار في Production؛ اقرأ `AGENTS.md` قبل أي عمل كتابة أو migration.
