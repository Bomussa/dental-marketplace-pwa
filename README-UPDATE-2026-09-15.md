# أسناني قطر — تحديث هندسي موثّق — 2026-09-15

> **سجل تحديث مستقل للحالة التي تم التحقق منها في 2026-09-15.**
>
> أُنشئ هذا الملف أولًا على فرع تحديث مستقل لحماية `README.md` التاريخي من الاستبدال. **لا يُعتبر هذا الملف جزءًا من `main` إلا بعد دمج PR #29 بنجاح.**
>
> **المشروع:** `Bomussa/dental-marketplace-pwa`
> **المنتج:** أسناني قطر
> **النطاق:** البحث عن خدمات الأسنان، المقارنة، الأسعار والعروض، التوفر والمواعيد، الحجز وإدارة الحجز.
> **الحدود:** ليس نظام سجلات طبية، ولا يهدف إلى التشخيص أو تخزين الأشعة أو الوصفات أو السجل العلاجي.

---

## 1. قاعدة التحقق ودرجة اليقين

هذا المستند يميز بين ثلاث حالات:

- **مثبت:** تمت مطابقته مع مصدر حي أو ملف فعلي في المستودع أثناء إعداد التحديث.
- **تاريخي:** معلومة صحيحة في وثيقة/حالة سابقة، لكنها ليست ادعاءً للحالة الحالية إلا إذا أُعيد التحقق منها.
- **غير مثبت:** لا يجوز عرضه كحقيقة حالية.

لا تُحوّل هذه الوثيقة أي نتيجة غير مثبتة إلى ادعاء نجاح أو جاهزية.

---

## 2. الحالة الصحيحة لـ GitHub وقت إعداد PR #29

| العنصر | الحالة المثبتة |
|---|---|
| Repository | `Bomussa/dental-marketplace-pwa` |
| Base branch | `main` |
| Base HEAD وقت إنشاء PR #29 | `e2d96c4d483cb6d7dfd1d71086b65026d8f10e1c` |
| Update branch | `docs/update-2026-09-15-readme` |
| PR | `#29` |
| PR title | `docs: add verified 2026-09-15 engineering update` |
| PR state وقت التحديث | **OPEN** |
| Merged وقت التحديث | **NO / FALSE** |
| Mergeable وقت التحقق | `true` |
| PR head SHA | `3a402abc6121f993bd68f66003ba851f132ce767` |
| Changed files | `1` |
| Additions | `911` قبل هذه المراجعة |
| Deletions | `0` |

**تصحيح جوهري:** لا يجوز القول إن `README-UPDATE-2026-09-15.md` موجود في `main` قبل نجاح دمج PR #29. الملف موجود على فرع التحديث، وPR #29 هو الذي ينقله إلى `main` عند الدمج.

---

## 3. README.md القديم محفوظ

لم يتم استبدال `README.md` ضمن PR #29. جرد `main` وقت التحقق أظهر:

```text
README.md
```

وبـblob SHA:

```text
00f7f2212f94a08e4a5edf01052299f40bf1de0a
```

وحجم يقارب 86.7 KB.

الهدف من الملف الجديد هو إضافة سجل حديث دون حذف المحتوى التاريخي. تحديث ملف موجود عبر GitHub Contents API يستبدل محتوى الملف، لذلك لا يجوز إعادة بناء README كبير من مقتطفات ناقصة. citeturn0search0

---

## 4. ما هو مثبت من بنية `main`

جرد Git الحالي يؤكد وجود البنية الأساسية التالية في `main` وقت إعداد المراجعة:

```text
.env.example
.github/
.github/workflows/
.github/workflows/ci.yml
.gitignore
AGENTS.md
CHANGELOG.md
README.md
app/
app/about/
app/about/page.tsx
app/account/
app/account/actions.ts
app/account/page.tsx
app/admin/
app/admin/actions.ts
app/admin/page.tsx
app/api/
app/api/admin/
app/api/admin/reports/
app/api/admin/reports/activity-csv/
app/api/admin/reports/activity-csv/route.ts
app/api/admin/reports/csv/
app/api/admin/reports/csv/route.ts
app/api/book/
app/api/book/route.ts
app/api/choices/
app/api/choices/route.ts
app/api/device-installations/
app/api/device-installations/route.ts
app/api/health/
app/api/health/route.ts
app/api/locale/
app/api/locale/route.ts
app/api/patient-booking-registration/
app/api/patient-booking-registration/route.ts
app/api/patient-phone-verification/
app/api/patient-phone-verification/confirm/
app/api/patient-phone-verification/confirm/route.ts
app/api/patient-phone-verification/start/
app/api/patient-phone-verification/start/route.ts
app/api/search/
```

هذه **قائمة تحقق جزئية للبنية** وليست جردًا يدّعي أنه كل ملف في المستودع. لا يُسمح باستخدامها كبديل عن شجرة Git الكاملة إذا كان المطلوب جرد كل ملف حرفيًا.

---

## 5. لماذا لم أضع قائمة مزعومة بأنها كل الملفات؟

لأن الجرد الجزئي لا يثبت الاكتمال. شجرة Git الحالية تحتوي على مسارات أكثر من القائمة المختصرة أعلاه. لذلك تم تصحيح صياغة الوثيقة من «خريطة جميع الملفات الحالية» إلى «مسارات رئيسية مثبتة».

**معيار الدقة:** إذا لم تتم مطابقة اسم الملف مع شجرة Git الفعلية في نفس المراجعة، فلا يوصف بأنه «موجود حاليًا».

---

## 6. أدوات وتقنيات مثبتة في `main`

الأرقام التالية مأخوذة من حالة `package.json` التي تم التحقق منها في المراجعة السابقة، ويجب اعتبارها حالة ذلك الـHEAD فقط:

| العنصر | الإصدار المثبت في ذلك الـHEAD |
|---|---:|
| Next.js | `16.3.4` |
| React | `19.2.8` |
| React DOM | `19.2.8` |
| TypeScript | `5.8.3` |
| Supabase JS | `2.111.0` |
| Supabase SSR | `0.12.4` |
| Zod | `4.4.3` |
| Playwright | `1.62.0` |
| Vitest | `4.1.10` |
| ESLint | `9.39.5` |
| Tailwind CSS | `4.3.3` |
| Node CI | `24.x` |
| package version | `0.1.0`، وليس GitHub Release |

إذا تغير `main` بعد إعداد هذا التحديث، يجب إعادة فحص `package.json` قبل اعتبار الأرقام «الحالية».

---

## 7. Change Gate وCI

الحالة الموثقة للـHEAD السابق تضمنت:

```text
scripts/change-gate.mjs
docs/CHANGE_GATE.md
```

وكانت منظومة التحقق تتضمن `change:gate` مع مسارات التحقق والبناء وCI.

الـChange Gate يفحص جوانب مثل:

- `git diff --check`.
- التطابق الحرفي بين ملفات المصدر.
- إنشاء ملف مصدر جديد مطابق حرفيًا لملف موجود.
- مؤشرات تعارض التصديرات.
- لمس الحدود الحساسة مثل migrations وAPI وSupabase وRLS وbooking وidempotency.

**حدود الدليل:** Change Gate لا يثبت وحده صحة RLS، أو صحة الحجز المتزامن، أو تجربة Safari الحقيقية، أو سلامة الإنتاج بالكامل. هذه تحتاج أدلة واختبارات مستقلة.

---

## 8. Production Database — الحالة الموثقة في تدقيق 2026-09-15

```text
Project: qatar-dental-dev
Ref: bqvcukxfsnchvkgejolz
Region: eu-central-1
PostgreSQL: 17.6.1.155 / major 17
Status: ACTIVE_HEALTHY
```

الأرقام التي تم تسجيلها في التدقيق:

| العنصر | القيمة |
|---|---:|
| Public tables | **50** |
| Tables with RLS | **50/50** |
| Public indexes | **198** |
| RLS policies | **105** |
| Functions | **49** |

هذه الأرقام هي جرد للكائنات الحية وقت التدقيق وليست وعدًا بأنها ستبقى ثابتة بعد أي migration لاحقة.

---

## 9. Booking Waitlist — فصل قاعدة البيانات عن كود التطبيق

تم توثيق وجود جدول في Production باسم:

```text
booking_waitlist
```

والفهارس الموثقة:

```text
booking_waitlist_account_status_idx
booking_waitlist_active_patient_offer_uidx
booking_waitlist_offer_status_created_idx
booking_waitlist_pkey
booking_waitlist_variant_idx
```

والسياسة الموثقة:

```text
booking_waitlist_select_own
```

والدوال الموثقة في تدقيق قاعدة البيانات:

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

**قاعدة التوثيق:** وجود هذه الكائنات في Production لا يساوي تلقائيًا وجود واجهة waitlist مكتملة في `main`.

---

## 10. Migration history وschema drift

تم توثيق migration حية في Production باسم:

```text
20260914065930_pr28_waitlist_read_rpc_alignment_20260914
```

لكن لا يجوز وصفها بأنها موجودة في `main` إلا بعد مطابقة ملفها داخل `supabase/migrations/` في نفس الـcommit.

Supabase توضح أن migrations هي آلية تتبع تغييرات المخطط، وأن التاريخ البعيد والمحلي يجب أن يبقيا متزامنين. كما أن تغييرات قاعدة البيانات المباشرة على remote تتجاوز سجل migrations ويمكن أن تسبب مشاكل مزامنة؛ لذلك يجب أن تمر تغييرات المخطط المستقبلية عبر migration files قابلة للتتبع. citeturn0search1turn0search2turn0search5

إذا كان remote يحتوي على schema غير ممثل في Git، فالحل الصحيح هو تحديد الفرق وإعادته إلى migration/version control، وليس إخفاء الاختلاف في README. Supabase توفر `db pull` و`migration list` و`migration repair` لمعالجة حالات اختلاف التاريخ. citeturn0search1turn0search5turn0search7

---

## 11. ما لا يجوز اعتباره مثبتًا من هذا الملف وحده

لا يجوز لهذا README وحده أن يدّعي:

- أن كل اختبارات Safari الحقيقية نجحت.
- أن كل أجهزة iPhone وAndroid اختُبرت فعليًا.
- أن concurrent booking خالٍ من race condition في كل الظروف.
- أن Security Advisor بلا ملاحظات.
- أن leaked-password protection مفعّل.
- أن Production لا يحتوي أي بيانات اصطناعية إلا إذا تم فحص المصدر والبيانات نفسها.
- أن waitlist منشورة كواجهة للمستخدم.
- أن PR #29 مدمج قبل تحقق GitHub من `merged=true`.
- أن Vercel Production يشير إلى آخر commit بعد أي تغيير لاحق.

---

## 12. Security finding المعروف وقت التدقيق

تم تسجيل finding من Supabase Security Advisor:

```text
auth_leaked_password_protection
```

وحالته في التدقيق كانت أن حماية كلمات المرور المسرّبة غير مفعّلة.

لذلك لا يجوز وصف الحالة الأمنية بأنها «نظيفة بالكامل» قبل معالجة هذا finding وإعادة تشغيل Security Advisor.

---

## 13. الفرق عن README التاريخي

الهدف من هذا الملف ليس إعادة كتابة README القديم، بل إضافة طبقة زمنية دقيقة:

| الموضوع | README التاريخي | هذا التحديث |
|---|---|---|
| التاريخ | أقدم | 2026-09-15 |
| README الأصلي | محفوظ | محفوظ |
| HEAD | أقدم | `e2d96c4...` وقت التدقيق |
| Change Gate | أقدم/غير موثق بهذه الصياغة | موثق كطبقة تحقق |
| Production DB | أرقام تاريخية | 50/50 RLS، 198 indexes، 105 policies، 49 functions وقت التدقيق |
| Waitlist | غير موجودة/أقدم | موجودة في Production DB وفق التدقيق، دون ادعاء أنها UI في `main` |
| PR #29 | غير موجود | تحديث وثائقي مستقل، غير مدمج وقت آخر تحقق |

---

## 14. قواعد الصيانة بعد هذا التحديث

1. لا تستبدل `README.md` الكبير بإعادة بناء جزئية.
2. أي معلومة تتغير مع الزمن يجب أن تحمل تاريخ/commit أو مصدرًا واضحًا.
3. لا تكتب في README أن PR أو migration «موجود في main» قبل تحقق GitHub من ذلك.
4. لا تعتبر schema Production جزءًا من Git حتى يكون migration المقابل موجودًا ومطابقًا.
5. لا تحذف indexes أو policies لمجرد أنها تبدو غير مستخدمة دون دليل workload وتأثير regression.
6. لا تعتبر CI الأخضر بديلًا عن اختبار الإنتاج الحقيقي.
7. لا تضع أسرارًا أو Service Role keys أو tokens في README.
8. لا تُدخل بيانات وهمية إلى Production.

---

## 15. بوابة الاعتماد النهائية

لا يُعلن «التحديث مكتمل ومنشور» إلا بعد تحقق جميع الآتي:

- [ ] PR #29 أصبح `merged=true`.
- [ ] الملف يظهر فعلًا على `main`.
- [ ] `README.md` القديم لم يتغير إلا إذا كان هناك تغيير مقصود ومثبت.
- [ ] commit الدمج معروف ومثبت.
- [ ] CI للـcommit النهائي أخضر.
- [ ] شجرة Git النهائية مطابقة للمسارات التي يدعي README أنها موجودة.
- [ ] Production deployment يشير إلى commit المقصود.
- [ ] migration history متسقة مع migrations في Git أو يوجد توثيق صريح للـdrift وإصلاحه.
- [ ] Security Advisor أعيد فحصه بعد أي إصلاحات أمنية.
- [ ] لا يوجد ادعاء غير مثبت بجاهزية ميزة أو اختبار أو بيانات.

**الحالة عند إنشاء هذا التحديث:** الوثيقة مصححة، لكن اعتمادها النهائي يتطلب تحقق الدمج والنشر والـCI بعد الدمج؛ لا يتم الادعاء بذلك مسبقًا.

---

## 16. مصدر الحقيقة

بالنسبة للكود: Git commit محدد في `Bomussa/dental-marketplace-pwa`.

بالنسبة لمخطط Production: حالة Supabase الفعلية + migration history.

بالنسبة للنشر: حالة Vercel deployment الفعلية.

بالنسبة للاختبارات: GitHub Actions job/run الفعلي، وليس نص README.

بالنسبة للميزات: كود التطبيق + قاعدة البيانات + اختبار المسار الحقيقي، وليس مجرد وجود اسم في وثيقة.

هذا الفصل بين المصادر يمنع خلط حالة Git مع حالة Production DB أو حالة Vercel.
