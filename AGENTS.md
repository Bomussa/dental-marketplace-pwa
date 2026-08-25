# تعليمات العمل الآمن — منصة أسناني / MMC-MMS

هذا الملف هو مرجع العمل المختصر لأي Agent أو مهندس. يقرأ مع [README.md](README.md) و[`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md)، ولا يحل محلهما.

## الهوية ومصدر الحقيقة

| العنصر | القاعدة |
|---|---|
| المستودع | `Bomussa/dental-marketplace-pwa` فقط. |
| الفرع الإنتاجي | `main`؛ لا يُدفع إليه إلا إصدار موثق ومراجع. |
| الفرع التجريبي | `staging`؛ يستخدم فقط مع Supabase Staging `yrlwoxlxizxgrodtbdcp`. |
| Production | نطاق `www.mmc-mms.com` ومشروع Supabase `bqvcukxfsnchvkgejolz` ومشروع Vercel `dental-marketplace-pwa`. |
| مصدر الحقيقة | GitHub للكود، `supabase/migrations/` لتغيرات المخطط، وREADME للحالة الهندسية الحالية. |

## قواعد البيانات والأمن

لا تنشئ مريضًا أو حجزًا أو موعدًا أو عرضًا أو حساب اختبار في Production. لا تنقل صفوفًا أو PII أو sessions أو cookies أو بيانات اعتماد بين Staging وProduction. أي DDL يكون في migration مصدرية قابلة للتتبع؛ راجع المشروع المستهدف والتبعيات ثم تحقق بقراءة SQL بعد التطبيق.

> دوال `public.*_server` هي خادمية فقط. لا تمنحها `anon` أو `authenticated`. يبقى بحث الزائر بأقل صلاحيات، وتبقى RLS وملكية المريض وقيود الحجز الذرية ومفتاح idempotency حواجز إلزامية لا يجوز تجاوزها من الواجهة.

لا تضع أسرارًا أو `.env*` أو JWT أو مفاتيح Vercel/Supabase/Twilio/OpenAI أو dumps أو سجلات حساسة في Git أو الوثائق أو مخرجات الاختبارات.

## الاختبار والنشر

اختبر تغييرات الكتابة والحجز والسباق وIDOR وRLS في Staging فقط وبوسم بيانات اختبار واضح ثم نظفها. لا تشغل K6 أو stress أو booking concurrency على Production؛ فحص Production يكون HTTPS والصفحة والبحث العام و`/api/health` والسجلات فقط، ومن دون كتابة.

قبل دفع `main`: شغّل `npm run verify`، راجع `git diff --check` و`git status`، وتأكد أن التغييرات المقصودة فقط متتبعة. يتطلب `npm run test:e2e` إعدادات Supabase public محلية صالحة؛ لا تنسخ قيم Production إليه. بعد النشر تأكد من أن Vercel `READY` وأن commit النشر يطابق GitHub، وافحص runtime errors وpostconditions للمهاجرات.

## الرجوع والتوثيق

لا تستخدم rollback للنشر كبديل لعكس DDL. عند الحاجة إلى تغيير صلاحيات أو مخطط بعد الإنتاج أضف migration عكسية صريحة ومراجعة. حدّث README و`docs/CURRENT_PRODUCTION_STATUS.md` و`supabase/REMOTE_APPLIED_MIGRATIONS.md` عند تغير المسارات أو العقود أو المخطط أو حالة الإصدار؛ حدّث `docs/SOURCE_MANIFEST.md` عند تغير خريطة الملفات المهمة.
