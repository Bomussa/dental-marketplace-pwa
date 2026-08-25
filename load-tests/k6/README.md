# سيناريوهات k6 للبحث والحجز في Staging

هذه الملفات تختبر مسارات التطبيق الفعلية ولا تستهدف النطاق الإنتاجي. تحتوي `shared.js` على بوابة توقف التنفيذ إن لم تكن `TARGET_ENV=staging` و`LOAD_TEST_CONFIRMATION=STAGING_ONLY`، أو إن كان `BASE_URL` هو `mmc-mms.com` أو `www.mmc-mms.com`. هذه البوابة دفاع إضافي وليست بديلًا عن موافقة Vercel وSupabase واختيار نطاق Staging الصحيح.

## ما الذي يختبره كل سيناريو؟

| الملف | تدفق التطبيق | نمط الحمل | هل يكتب بيانات؟ |
|---|---|---|---|
| `search-flow.js` | `GET /api/search` بالـvariant والفرز والتاريخ ونصف القطر الفعلية | `ramping-arrival-rate`، مناسب للبحث العام | لا |
| `booking-flow.js` | `POST /api/book` بجلسة مريض اختبار وoffer وslot وpatient profile | `per-vu-iterations`؛ **حجز واحد لكل VU** | نعم، في Staging فقط |
| `shared.js` | التحقق من البيئة والرؤوس وقراءة المتغيرات | مشترك | لا |

يعيد `GET /api/search` خطأ 400 للمعلمات غير الصالحة، و503 عند تعذر البحث. لذلك يمرر سيناريو البحث `variant` صالحًا من بيانات Staging ويعد الاستجابة صحيحة فقط إذا كانت 200 وتحوي `offers` و`count` والـvariant المطلوب. يحتاج `POST /api/book` إلى جلسة مصادقة وorigin صحيح و`offer_id` و`slot_id` و`patient_profile_id` و`idempotency_key`؛ ويرجع 201 عند إنشاء الحجز. [1]

## بيانات Staging المطلوبة

أنشئ هذه البيانات في **Supabase Staging أو Branch مخصص للاختبار**، ولا تنسخ بيانات مريض أو حجز أو هاتف أو كلمة مرور من الإنتاج.

| نوع البيانات | الحد الأدنى المطلوب | قاعدة العزل |
|---|---:|---|
| Variant للبحث | واحد على الأقل | يوضع UUID في `TEST_VARIANT_ID` |
| عروض وslots | عروض قابلة للبحث وslots مفتوحة مرتبطة بالـvariant | لا تستخدم معرفات إنتاج |
| مرضى اختبار | مريض واحد موثّق الهاتف لكل حجز مخطط | مريض واحد لاختبار حجز واحد |
| جلسات اختبار | جلسة قصيرة العمر لكل مريض اختبار | تخزن كأسرار، لا في Git أو لقطة شاشة |
| Fixtures حجز | offer وslot وpatient profile وجلسة لكل VU | slot فريد في كل fixture ولا يعاد استخدامه بين المولدات |

ابدأ بنسخ `fixtures/booking-fixtures.example.json` إلى `fixtures/booking-fixtures.private.json`، ثم استبدل القيم الوصفية بمعرفات Staging فقط. هذا الملف الخاص تجاهله Git عمدًا. يحدد الحقل `cookie_env` **اسم متغير سر** يحمل رأس Cookie الكامل لجلسة Staging قصيرة العمر، مثل `K6_BOOKING_COOKIE_001`؛ ولا يحمل الملف نفسه cookie أو token.

```json
[
  {
    "fixture_id": "booking-001",
    "cookie_env": "K6_BOOKING_COOKIE_001",
    "offer_id": "staging-offer-uuid",
    "slot_id": "unique-staging-slot-uuid",
    "patient_profile_id": "staging-patient-profile-uuid"
  }
]
```

تحتاج جلسة Supabase SSR عادةً إلى جميع cookies التي يرسلها المتصفح لجلسة الاختبار. يخزن السر كقيمة رأس `Cookie` كاملة في مخزن أسرار CI أو أداة أسرار محلية، وليس في fixture. تنشأ حسابات المرضى الاختبارية وتُوثق أرقامها بالمسار المعتمد في بيئة Staging، ثم تؤخذ cookies من جلسة تلك البيئة فقط. لا تُنشأ كلمات مرور أو جلسات مباشرة في SQL، ولا تستخدم الجلسات الحقيقية.

## تشغيل فحص أولي للبحث

توفر k6 المتغيرات للنص عبر `__ENV` عند تمريرها بعلامة `-e`. تستخدم السيناريوهات هذا الأسلوب للتكوين، ولا تضع قيمة سرية في الشفرة. [2]

```bash
export BASE_URL='https://your-staging-deployment.vercel.app'
export TARGET_ENV='staging'
export LOAD_TEST_CONFIRMATION='STAGING_ONLY'
export RUN_ID='staging-search-20260825-001'
export TEST_VARIANT_ID='staging-variant-uuid'
export TEST_SEARCH_LAT='25.2854'
export TEST_SEARCH_LNG='51.5310'

k6 run \
  -e BASE_URL -e TARGET_ENV -e LOAD_TEST_CONFIRMATION -e RUN_ID \
  -e TEST_VARIANT_ID -e TEST_SEARCH_LAT -e TEST_SEARCH_LNG \
  -e SEARCH_MAX_RPS=20 -e SEARCH_PREALLOCATED_VUS=40 -e SEARCH_MAX_VUS=200 \
  --summary-export=artifacts/k6/search-smoke.json \
  load-tests/k6/search-flow.js
```

ابدأ من `SEARCH_MAX_RPS=20` فقط. بعد نجاح baseline ومراجعة traces ومقاييس قاعدة البيانات، ارفع المستوى وفق خطة التصعيد المعتمدة. لا تفسر `SEARCH_MAX_RPS` على أنه عدد المستخدمين؛ إنه معدل بدء iterations في الثانية. تستخدم k6 سيناريوهات مستقلة ومُنفِّذات مختلفة لتشكيل الحمل، ومنها `ramping-arrival-rate` و`per-vu-iterations`. [3]

## تشغيل اختبار الحجز

لا تشغّل اختبار الحجز إلا بعد إنشاء fixtures فريدة، ومراجعة أن كل slot فريد، وتأكيد أن تنظيف بيانات Staging ممكن. يجري السيناريو **حجزًا واحدًا فقط لكل VU**، ويولّد مفتاح تكرار ثابتًا من `RUN_ID` و`fixture_id`؛ لذلك فإن إعادة تشغيل نفس `RUN_ID` لن تنشئ محاولة منطقية ثانية لنفس fixture في التطبيق إذا دعم RPC التكرار كما هو مصمم.

لا تمرر قيمة cookie الحقيقية في سطر الأوامر. في CI، تُحقن الأسرار من مخزن أسرار النظام إلى البيئة المقنّعة. محليًا، اقرأ القيمة إدخاليًا في متغير shell غير محفوظ في التاريخ، ثم مرر الاسم عبر بيئة التنفيذ الموثوقة.

```bash
export BASE_URL='https://your-staging-deployment.vercel.app'
export TARGET_ENV='staging'
export LOAD_TEST_CONFIRMATION='STAGING_ONLY'
export BOOKING_WRITE_CONFIRMATION='STAGING_TEST_DATA_ONLY'
export RUN_ID='staging-booking-20260825-001'
export BOOKING_VUS=10
export BOOKING_FIXTURES_PATH='./fixtures/booking-fixtures.private.json'

# تُحقن هذه القيم من مخزن أسرار؛ لا تُكتب هنا ولا في fixture ولا في Git.
# export K6_BOOKING_COOKIE_001='sb-...=...; sb-...=...'

k6 run \
  -e BASE_URL -e TARGET_ENV -e LOAD_TEST_CONFIRMATION -e BOOKING_WRITE_CONFIRMATION \
  -e RUN_ID -e BOOKING_VUS -e BOOKING_FIXTURES_PATH \
  -e K6_BOOKING_COOKIE_001 \
  --summary-export=artifacts/k6/booking-smoke.json \
  load-tests/k6/booking-flow.js
```

إذا كان هناك 30 VU حجز موزعة على ثلاثة مولدات، أنشئ **ثلاثة fixtures private منفصلة لا تتداخل**، كل منها يحمل 10 slots ومرضى وجلسات فريدة، ثم شغّل كل مولد بـ`BOOKING_VUS=10`. لا تشارك fixture أو slot بين مولدين. لا ترفع هذا السيناريو إلى مئات الحجوزات في الدقيقة؛ المسار يطبق حدًا مقداره 10 محاولات حجز للمستخدم في الساعة، وهو قيد وظيفي وأمني يجب أن يظل مفعّلًا. [1]

## خطة تشغيل موزعة

| المرحلة | البحث | الحجز | المولدات | شرط الانتقال |
|---|---:|---:|---:|---|
| Smoke | 5–20 RPS | 5–10 حجوزات فريدة | مولد واحد | جميع checks ناجحة وعدم وجود 5xx |
| Ramp | 20–100 RPS | دفعات قصيرة منفصلة | مولدان | p95 أقل من 4 ثوانٍ ومؤشرات Supabase سليمة |
| Peak | يقسم الهدف بين 2–3 مولدات | لا يخلط مع peak البحث إلا بعد اعتماد | 2–3 مولدات | p99 أقل من 8 ثوانٍ، بلا تشبع أو حجب |
| Soak | معدل ثابت 60–120 دقيقة | يوقف عادةً بعد تحقق التزامن | 2–3 مولدات | استقرار errors والموارد والتكلفة |

يضبط كل مولد `RUN_ID` مميزًا مثل `staging-search-20260825-eu-west-01` ويضيفه النص إلى رأس `x-load-test-run`. يسهل ذلك فلترة Vercel Logs وSupabase Logs. يوزع `SEARCH_MAX_RPS` بين المولدات؛ فإذا كان الهدف الكلي 300 RPS وثلاثة مولدات متساوية، يبدأ كل منها عند 100 RPS، ثم يقارن **RPS الفعلي** في خرج k6 مع المقاييس الخادمة.

## معايير الإيقاف والتحقق اللاحق

يتوقف أي ramp إذا تجاوزت أخطاء 5xx غير المتوقعة 1% لمدة دقيقتين، أو تجاوز p99 8 ثوانٍ، أو ظهرت أخطاء اتصالات/CPU/IO مستمرة في Supabase، أو تجاوزت تكلفة الاختبار سقفها، أو ظهر أثر على الإنتاج. بعد تشغيل الحجز، يقارن عدد عداد `booking_created` بعدد الحجوزات الاختبارية المتوقعة، ويتحقق أن كل booking ينتمي إلى fixture وslot اختباريين، ثم يحذف بيانات التشغيل من Staging وفق إجراء التنظيف المعتمد.

## التحقق قبل التنفيذ

نفذ هذه القائمة قبل أي اختبار حي:

1. ثبّت k6 على مولدات الحمل؛ هذه البيئة الحالية تحققت من صياغة JavaScript فقط ولا تحتوي k6 runtime.
2. تأكد أن `BASE_URL` نطاق Staging HTTPS وليس نطاق الإنتاج، وأن متغيرات البوابات صحيحة.
3. راجع fixtures: لا تكرار في `slot_id` أو `patient_profile_id` بين المولدات.
4. تحقق أن كل cookie قصيرة العمر وتخص Staging، وأن ملف fixtures الخاص غير متتبع في Git.
5. فعّل المراقبة، وحدد من يملك قرار الإيقاف، وسقف التكلفة ونافذة التنفيذ.
6. ابدأ بـSmoke فقط، ولا تنتقل إلى Ramp أو Peak بلا موافقة تشغيلية ونتائج المرحلة السابقة.

## المراجع

[1]: ../../app/api/book/route.ts "عقد الحجز وقيود الجلسة والأصل والحدود"
[2]: https://grafana.com/docs/k6/latest/using-k6/environment-variables/ "Grafana k6 — Environment variables"
[3]: https://grafana.com/docs/k6/latest/using-k6/scenarios/ "Grafana k6 — Scenarios"
[4]: ../../docs/DISTRIBUTED_LOAD_TEST_BLUEPRINT_2026-08-25.md "مخطط اختبار الحمل الموزع لـVercel وSupabase"
