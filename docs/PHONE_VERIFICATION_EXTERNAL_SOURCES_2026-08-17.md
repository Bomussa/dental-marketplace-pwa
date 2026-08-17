# مصادر تنفيذ تحقق الهاتف

استُخدمت المصادر الرسمية التالية لتصميم طبقة تحقق الهاتف. لا تُرسل أي رسالة خارجية من التطبيق ما لم تضبط بيانات اعتماد مزود معتمد في أسرار النشر.

| المصدر | النتيجة التقنية المستخدمة |
|---|---|
| [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login) | يتطلب تفعيل مصادقة الهاتف وضبط مزود SMS؛ يوضح أن OTP للهاتف يرسل ويؤكد برمز، وأن تغيير هاتف المستخدم يؤكد بـ`phone_change`. لم يعتمد التطبيق هذا المسار لتفادي تغيير جلسة أو هوية حساب الحجز عند التحقق من هاتف مريض تابع. |
| [Twilio Verify API](https://www.twilio.com/docs/verify/api) | يستخدم Verify بروتوكول HTTPS وBasic authentication بمفتاح API وسره. يبدأ الإرسال عبر `POST /v2/Services/{ServiceSid}/Verifications` بمعلمتي `To` و`Channel=sms`، وتؤكد الرموز عبر `POST /v2/Services/{ServiceSid}/VerificationCheck` بمعلمتي `To` و`Code`. الحالة المعتمدة هي `approved`. |
| [Twilio Verify SMS](https://www.twilio.com/docs/verify/sms) | يذكر أن بدء التحقق يعيد حالة `pending` وأنه ينبغي استعمال Verification Check لتأكيد الرمز، مع مراعاة موافقة المستلم ومخاطر الاحتيال. |
| [Twilio Node Verify Quickstart](https://www.twilio.com/docs/verify/quickstarts/node-express) | يؤكد متطلبات التشغيل: بيانات اعتماد Twilio وVerify Service SID، وتدفق بدء/فحص الرمز على الخادم. |

## متغيرات أسرار النشر المعتمدة

| المتغير | الغرض |
|---|---|
| `TWILIO_VERIFY_SERVICE_SID` | معرف خدمة Verify المهيأة لتطبيق أسناني قطر. |
| `TWILIO_API_KEY` | مفتاح API مخصص للإنتاج وبصلاحيات الحد الأدنى. |
| `TWILIO_API_SECRET` | سر مفتاح API؛ لا يظهر في المتصفح أو السجل أو المستودع. |

غياب أي متغير من هذه المتغيرات يجعل المسار يعيد استجابة عدم توافر آمنة؛ لا ينشئ التطبيق رمزًا محليًا ولا يضبط `phone_verified_at` بدون موافقة المزود الخارجي.
