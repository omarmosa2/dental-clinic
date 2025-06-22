# دليل أنماط أزرار الإجراءات

تم إنشاء نظام شامل لأنماط أزرار الإجراءات في جميع الجداول مع تأثيرات hover مختلفة لكل نوع من الأزرار.

## الفئات المتاحة

### 1. زر العرض (View/Eye)
```css
.action-btn-view
```
- **اللون**: أزرق أساسي (Primary)
- **Hover**: خلفية متدرجة زرقاء مع حدود
- **التأثير**: تكبير 105% + ظل

### 2. زر التعديل (Edit)
```css
.action-btn-edit
```
- **اللون**: أزرق (Blue-600)
- **Hover**: خلفية متدرجة زرقاء فاتحة
- **التأثير**: تكبير 105% + ظل

### 3. زر الحذف (Delete)
```css
.action-btn-delete
```
- **اللون**: أحمر تدميري (Destructive)
- **Hover**: خلفية متدرجة حمراء
- **التأثير**: تكبير 105% + ظل

### 4. زر الطباعة (Print)
```css
.action-btn-print
```
- **اللون**: أخضر (Green-600)
- **Hover**: خلفية متدرجة خضراء
- **التأثير**: تكبير 105% + ظل

### 5. زر الإيصال (Receipt)
```css
.action-btn-receipt
```
- **اللون**: بنفسجي (Purple-600)
- **Hover**: خلفية متدرجة بنفسجية
- **التأثير**: تكبير 105% + ظل

### 6. زر واتساب/الهاتف (WhatsApp/Phone)
```css
.action-btn-whatsapp
```
- **اللون**: أخضر زمردي (Emerald-600)
- **Hover**: خلفية متدرجة خضراء زمردية
- **التأثير**: تكبير 105% + ظل

### 7. زر التحذير (Warning)
```css
.action-btn-warning
```
- **اللون**: كهرماني (Amber-600)
- **Hover**: خلفية متدرجة كهرمانية
- **التأثير**: تكبير 105% + ظل

### 8. زر المعلومات (Info)
```css
.action-btn-info
```
- **اللون**: سماوي (Cyan-600)
- **Hover**: خلفية متدرجة سماوية
- **التأثير**: تكبير 105% + ظل

### 9. زر النجاح/الإكمال (Success)
```css
.action-btn-success
```
- **اللون**: أخضر داكن (Green-700)
- **Hover**: خلفية متدرجة خضراء داكنة
- **التأثير**: تكبير 105% + ظل

### 10. زر التحميل (Download)
```css
.action-btn-download
```
- **اللون**: نيلي (Indigo-600)
- **Hover**: خلفية متدرجة نيلية
- **التأثير**: تكبير 105% + ظل

### 11. الأزرار الأيقونية فقط
```css
.action-btn-icon
```
- **الحجم**: 8x8 بدون padding
- **التأثير**: تكبير 110% + ظل أكبر

## التأثيرات المشتركة

### تأثير الانزلاق (Shimmer Effect)
جميع الأزرار تحتوي على تأثير انزلاق ضوئي عند الـ hover:
- شريط ضوئي ينزلق من اليسار إلى اليمين
- مدة الانتقال: 0.5 ثانية
- شفافية: 20% أبيض

### دعم الوضع المظلم
جميع الأزرار تدعم الوضع المظلم تلقائياً:
- ألوان محسنة للوضع المظلم
- خلفيات مناسبة للوضع المظلم
- تباين محسن للنصوص

## كيفية الاستخدام

### مثال أساسي
```jsx
<Button
  variant="ghost"
  size="sm"
  className="action-btn-edit"
  onClick={() => handleEdit(item)}
>
  <Edit className="w-4 h-4 ml-1" />
  <span className="text-xs arabic-enhanced">تعديل</span>
</Button>
```

### مثال للأزرار الأيقونية
```jsx
<Button
  variant="ghost"
  size="sm"
  className="action-btn-delete action-btn-icon"
  onClick={() => handleDelete(item)}
  title="حذف العنصر"
>
  <Trash2 className="w-4 h-4" />
</Button>
```

## الجداول المحدثة

تم تطبيق الأنماط الجديدة على جميع الجداول التالية:

### ✅ الجداول المكتملة
- `PatientTable.tsx` - جدول المرضى
- `AppointmentTable.tsx` - جدول المواعيد
- `PaymentTable.tsx` - جدول المدفوعات
- `LabTable.tsx` - جدول المختبرات
- `LabOrderTable.tsx` - جدول طلبات المختبر
- `InventoryTable.tsx` - جدول المخزون
- `MedicationTable.tsx` - جدول الأدوية
- `PrescriptionTable.tsx` - جدول الوصفات الطبية

### أنواع الأزرار المستخدمة في كل جدول

#### جدول المرضى
- `action-btn-view` - عرض تفاصيل المريض
- `action-btn-edit` - تعديل بيانات المريض
- `action-btn-delete` - حذف المريض

#### جدول المواعيد
- `action-btn-edit` - تعديل الموعد
- `action-btn-delete` - حذف الموعد
- `action-btn-view` - عرض تفاصيل المريض

#### جدول المدفوعات
- `action-btn-receipt` - عرض الإيصال
- `action-btn-edit` - تعديل الدفعة
- `action-btn-delete` - حذف الدفعة

#### جدول المختبرات
- `action-btn-edit` - تعديل المختبر
- `action-btn-delete` - حذف المختبر

#### جدول طلبات المختبر
- `action-btn-view` - عرض تفاصيل الطلب
- `action-btn-edit` - تعديل الطلب
- `action-btn-delete` - حذف الطلب

#### جدول المخزون
- `action-btn-view` - عرض تفاصيل العنصر
- `action-btn-edit` - تعديل العنصر
- `action-btn-delete` - حذف العنصر

#### جدول الأدوية
- `action-btn-edit action-btn-icon` - تعديل الدواء
- `action-btn-delete action-btn-icon` - حذف الدواء

#### جدول الوصفات الطبية
- `action-btn-view action-btn-icon` - عرض التفاصيل
- `action-btn-print action-btn-icon` - طباعة الوصفة
- `action-btn-warning action-btn-icon` - تعديل الوصفة
- `action-btn-delete action-btn-icon` - حذف الوصفة

## ملاحظات مهمة

1. **الاتساق**: استخدم نفس الفئة لنفس نوع الإجراء في جميع الجداول
2. **إمكانية الوصول**: جميع الأزرار تدعم `title` للوصف
3. **الاستجابة**: الأنماط تعمل بشكل مثالي على جميع أحجام الشاشات
4. **الأداء**: التأثيرات محسنة للأداء مع `transform` و `opacity`

## التطوير المستقبلي

يمكن إضافة المزيد من أنواع الأزرار حسب الحاجة:
- `action-btn-share` - للمشاركة
- `action-btn-export` - للتصدير
- `action-btn-import` - للاستيراد
- `action-btn-archive` - للأرشفة
