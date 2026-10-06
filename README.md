# NFC/Vault — NFC Digital Content Platform

منصة واحدة مركزية تبيع مكتبات رقمية عبر بطاقات NFC، مع عزل المنتج والترخيص وربط الترخيص بأول جهاز. المشروع مبني على React/Vite وExpress وtRPC وDrizzle/MySQL، ويعمل بخدمات Manus المُدارة.

## المنتجات

المنصة تبدأ بأربع مكتبات قابلة للتوسع من قاعدة البيانات:

| Slug | Product | Experience |
| --- | --- | --- |
| `foreign` | Foreign Music | New releases, trending, artists, albums, genres, playlists, favorites and recent playback |
| `quran` | Quran & Azkar | Surahs, reciters, morning/evening/sleep/after-prayer azkar and ruqyah |
| `arabic` | Arabic Music — Tarab & Art | Tarab, classics, romantic, oldies, concerts and Arabic artists |
| `shaabi` | Shaabi Music | Mahraganat, popular, trending, new releases, artists and playlists |

المحتوى التجريبي في seed هو metadata وروابط صور عامة فقط. قبل البيع التجاري، أضف مواد صوتية وصورًا تملك حقوق استخدامها عبر إدارة المحتوى أو Storage.

## التشغيل المحلي

```bash
pnpm install
pnpm dev
```

الخادم يستمع على `PORT` أو 3000. إذا كانت قاعدة البيانات متاحة، نفّذ الترحيلات ثم seed:

```bash
pnpm db:migrate
pnpm db:seed
```

أوامر التحقق والبناء:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

## Demo access

توجد بطاقات demo منطقية في وضع عدم وجود قاعدة بيانات، كما يزرع seed المنتجات والمحتوى عند استخدام قاعدة Manus. أمثلة الروابط:

- `/access/FR-DEMO01`
- `/access/QN-DEMO01`
- `/access/AR-DEMO01`
- `/access/SH-DEMO01`

كلمة مرور العرض: `demo1234`. لا تستخدمها في البطاقات التجارية.

## الأمان

- الروابط تستخدم access tokens عشوائية، لا IDs متسلسلة.
- كلمات مرور التراخيص تُخزّن بتجزئة `scrypt` مع salt.
- device credential يُخزّن hash فقط داخل `device_registrations`، ويصل للمتصفح عبر HttpOnly cookie.
- جلسة NFC منفصلة عن `webdev_app_session` الخاص بـManus OAuth، وPreview يستخدم `SameSite=None; Secure` عند HTTPS عبر proxy.
- IP إشارة مخاطرة وسجل فقط، وليس هوية الجهاز.
- كلمات المرور الصحيحة من جهاز غير مطابق تُرفض بالرسالتين العربية والإنجليزية وتُنشئ reset request.
- إجراءات الإدارة تتطلب Manus OAuth ودور `admin` أو `super_admin`، وكل العمليات الحساسة تسجل في audit log.
- الاستعلامات تستخدم Drizzle والمدخلات تُتحقق عبر Zod، والواجهة لا تعرض IDs الداخلية للزائر.

## قاعدة البيانات

قاعدة Manus المُدارة تزود التطبيق بـ`DATABASE_URL`. التطوير والنشر يستخدمان قاعدة المشروع نفسها؛ لذلك لا تنفذ عمليات حذف أو destructive migration دون نسخة/موافقة. المخطط والترحيلات موجودان في `drizzle/schema.ts` و`drizzle/`.

## النشر

القالب يستخدم Dockerfile الإنتاج الحالي، ويستجيب لـ`PORT` ويقدم `/api/health`. استخدم checkpoint من Webdev للنشر؛ لا تعتمد على working tree غير محفوظ. ملف `public/manus-routes.json` يعلن جميع صفحات التطبيق للمنصة.

## لوحة الإدارة

افتح `/admin` وسجّل الدخول بحساب Manus المرتبط بالمشروع. يستطيع المدير مراجعة الإحصاءات، المنتجات، التراخيص، البطاقات، المحتوى، المستخدمين وطلبات إعادة ضبط الجهاز. إعادة الضبط تلغي الجهاز القديم وتُسجل في audit log.
