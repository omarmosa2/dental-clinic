# إصلاح مشكلة tooth_record_id في قاعدة البيانات

## المشكلة الحالية
خطأ في قاعدة البيانات: `NOT NULL constraint failed: dental_treatment_images.tooth_record_id`

هذا يعني أن جدول `dental_treatment_images` يحتوي على حقل `tooth_record_id` غير مطلوب ولم يتم تطبيق migration بشكل صحيح.

## الحلول المطبقة

### 1. إصلاح خطأ قاعدة البيانات
- ✅ Migration 6: إصلاح بنية جدول `dental_treatment_images`
- ✅ Migration 7: إعادة إنشاء الجدول بالقوة لضمان البنية الصحيحة
- ✅ إزالة حقل `tooth_record_id` غير المطلوب نهائياً

### 2. نظام رفع الصور
- ✅ معالج IPC أساسي: `files:uploadDentalImage` (يحفظ في userData)
- ✅ معالج IPC بديل: `files:saveDentalImage` (يحفظ في public/upload)
- ✅ نظام fallback للتطوير

### 3. واجهات محدثة
- ✅ `electron/main.ts` - معالجات IPC
- ✅ `electron/preload.ts` - واجهات API
- ✅ `src/types/global.d.ts` - تعريفات TypeScript

## خطوات الحل الفوري

### الطريقة الأولى: إعادة تشغيل التطبيق (الأسرع)

1. **إيقاف التطبيق**
```bash
# إيقاف عملية التطوير
Ctrl + C
```

2. **إعادة تشغيل التطبيق**
```bash
# إعادة تشغيل التطوير
npm run dev
```

Migration 7 سيتم تطبيقه تلقائياً وسيصلح المشكلة.

### الطريقة الثانية: حذف قاعدة البيانات (إذا لم تعمل الأولى)

1. **إيقاف التطبيق**
```bash
Ctrl + C
```

2. **حذف قاعدة البيانات**
```bash
# في Windows
del "%APPDATA%\dental-clinic\dental_clinic.db"

# في macOS/Linux
rm ~/Library/Application\ Support/dental-clinic/dental_clinic.db
```

3. **إعادة تشغيل التطبيق**
```bash
npm run dev
```

سيتم إنشاء قاعدة بيانات جديدة بالبنية الصحيحة.

### الطريقة الثالثة: تنظيف شامل

```bash
# إيقاف التطبيق
Ctrl + C

# حذف ملفات البناء المؤقتة
rm -rf dist/
rm -rf .next/
rm -rf node_modules/.cache/

# أو في Windows
rmdir /s dist
rmdir /s .next
rmdir /s node_modules\.cache

# إعادة بناء وتشغيل
npm run build:electron
npm run dev
```

### 4. التحقق من الواجهات
بعد إعادة التشغيل، ستظهر رسائل debug في console:
```
Preload: electronAPI exposed with keys: [...]
Preload: files API available: true
Preload: uploadDentalImage available: true
ToothDetailsDialog: window.electronAPI available: true
ToothDetailsDialog: files API available: true
ToothDetailsDialog: uploadDentalImage available: true
```

## اختبار النظام

### 1. فتح مربع حوار السن
- اذهب إلى صفحة علاج الأسنان
- اضغط على أي سن
- انتقل إلى تبويبة "الصور"

### 2. رفع صورة
- اختر نوع الصورة (قبل/بعد/أشعة/سريرية)
- حدد صورة من جهازك
- اضغط "حفظ"

### 3. التحقق من النتائج
- يجب أن تظهر الصورة في المعاينة
- يجب حفظ مسار الصورة في قاعدة البيانات
- يجب حفظ الملف في المجلد المناسب

## مسارات حفظ الصور

### الطريقة الأساسية (userData)
```
%APPDATA%/dental-clinic/dental_images/patientId/toothNumber/timestamp_filename.ext
```

### الطريقة البديلة (public/upload)
```
public/upload/dental_images/patientId/toothNumber/timestamp_filename.ext
```

## استكشاف الأخطاء

### إذا لم تعمل الواجهات
1. تأكد من إعادة تشغيل التطبيق كاملاً
2. تحقق من console للرسائل debug
3. تأكد من أن preload.ts يتم تحميله

### إذا فشل حفظ الصور
1. تحقق من صلاحيات الكتابة في المجلد
2. تأكد من وجود مساحة كافية على القرص
3. تحقق من console للأخطاء

### إذا لم تظهر الصور
1. تحقق من مسار الصورة في قاعدة البيانات
2. تأكد من وجود الملف في المجلد
3. تحقق من صلاحيات القراءة

## الملفات المحدثة
- `electron/main.ts` - معالجات IPC
- `electron/preload.ts` - واجهات API
- `src/components/dental/ToothDetailsDialog.tsx` - مكون الحوار
- `src/types/global.d.ts` - تعريفات TypeScript
- `src/services/databaseService.ts` - migration قاعدة البيانات

## ملاحظات مهمة
- يجب إعادة تشغيل التطبيق كاملاً لتحميل التحديثات
- النظام يدعم fallback للتطوير إذا لم تعمل واجهات Electron
- الصور تُحفظ بأسماء فريدة لتجنب التضارب
- النظام يدعم جميع تنسيقات الصور الشائعة
