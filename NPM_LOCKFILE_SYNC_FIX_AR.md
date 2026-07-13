# تقرير إصلاح عدم تزامن package-lock.json

## المشكلة

توقف GitHub Actions عند خطوة `npm ci --no-audit --no-fund` قبل فحص TypeScript، وظهرت الرسالتان:

- `Missing: @emnapi/core@1.11.2 from lock file`
- `Missing: @emnapi/runtime@1.11.2 from lock file`

## السبب الجذري

كان `package.json` و`package-lock.json` غير متزامنين من ناحية موضع اعتمادين اختياريين عابرين. كان ملف القفل يضع `@emnapi/core` و`@emnapi/runtime` داخل مسار متداخل خاص بـ`@rolldown/binding-wasm32-wasi`، بينما شجرة الاعتمادات الحالية التي يتحقق منها npm 10.9.8 تحتاج سجليهما في المستوى الأعلى من `node_modules` أيضًا. لذلك رفض `npm ci` تنفيذ التثبيت النظيف.

هذه المشكلة ليست في GitHub Pages أو ملف workflow، وليست خطأ TypeScript في عارض PDF.

## الإصلاح

- أُعيد توليد بنية `package-lock.json` من `package.json`.
- أضيف السجلان الصحيحان:
  - `node_modules/@emnapi/core` بالإصدار `1.11.2`
  - `node_modules/@emnapi/runtime` بالإصدار `1.11.2`
- أزيل موضعهما المتداخل غير المتوافق مع فحص npm الحالي.
- بقي `pdfjs-dist` مثبتًا بالإصدار الثابت `6.1.200`.
- لم يُعدّل `package.json` أو workflow.
- أزيلت أي روابط سجل npm داخلية، وجميع روابط الحزم في ملف القفل تستخدم `registry.npmjs.org`.

## التحقق

تم الاختبار باستخدام npm `10.9.8`، وهو الإصدار الظاهر في سجل GitHub Actions:

- `npm ci --no-audit --no-fund`: ناجح، 426 حزمة.
- `npm run check`: ناجح.
- TypeScript: ناجح.
- Vitest: 10 ملفات اختبار، 43 اختبارًا ناجحًا.
- `npm run build`: ناجح.
- PDF.js worker موجود داخل `dist/assets`.
- PWA build: ناجح.
- لا توجد روابط npm داخلية في `package.json` أو `package-lock.json`.

## الملفات المعدلة

- `package-lock.json`
- `NPM_LOCKFILE_SYNC_FIX_AR.md`

## تعليمات الرفع

يجب استبدال `package-lock.json` الموجود في المستودع بالنسخة المصححة ورفعه في نفس commit. لا يكفي تعديل `package.json` لأن GitHub Actions يستخدم `npm ci`، الذي يعتمد على التطابق الكامل بين الملفين.
