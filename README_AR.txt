إصلاح نشر موقع NT2 على GitHub Pages
=====================================

سبب الخطأ:
ملف package-lock.json الأصلي يحتوي على 493 رابطًا إلى سجل حزم داخلي
لا يستطيع GitHub Actions الوصول إليه. تم استبدالها بروابط registry.npmjs.org العامة.

الملفات:
1) package-lock.json
   ارفعه إلى جذر المستودع واستبدل الملف القديم.

2) deploy.yml
   ارفعه إلى:
   .github/workflows/deploy.yml
   واستبدل الملف القديم.

بعد رفع الملفين:
- لا تضغط Run workflow يدويًا.
- سيبدأ تشغيل جديد تلقائيًا بسبب push إلى main.
- افتح Actions وانتظر نجاح Build website ثم Publish website.

تم اختبار package-lock.json المصحح:
- npm ci نجح
- 7 اختبارات نجحت
- npm run build نجح
