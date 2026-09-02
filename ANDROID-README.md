# معلّم — Android

المشروع مجهّز للتحويل إلى Android بواسطة Capacitor.

## البناء
1. npm install
2. npm run build
3. npx cap add android
4. npx cap sync android

بعد إنشاء مجلد Android يمكن بناء APK Debug عبر Gradle أو Android Studio.

## ملاحظات النسخة الحالية
- البيانات الأساسية محفوظة محلياً على الجهاز.
- المساعد الذكي الحالي نموذج محلي، ولم يتم ربط API خارجي بعد.
- التنبيه قبل الحصة مجهز في الواجهة، لكن إشعارات Android الأصلية تحتاج إضافة Local Notifications في مرحلة لاحقة.
