# نظام العلاجات السنية

## نظرة عامة

تم إضافة نظام شامل لإدارة العلاجات السنية يتضمن:

### الميزات الرئيسية

1. **مخطط الأسنان التفاعلي**
   - عرض جميع الأسنان الـ32 في جدول تفاعلي (2 صف × 16 عمود)
   - ألوان مختلفة لكل نوع علاج (سليم، حشو، عصب، تاج، إلخ)
   - أسماء عربية للأسنان مع أرقامها
   - تأثيرات بصرية عند التمرير والنقر

2. **إدارة بيانات المريض**
   - عرض معلومات المريض (الاسم، الجنس، العمر، رقم الهاتف)
   - إحصائيات سريعة (عدد العلاجات، الصور، الوصفات)
   - بحث متقدم بالاسم أو رقم الهاتف

3. **تفاصيل السن**
   - نافذة حوار شاملة لكل سن
   - العلاج الحالي والعلاج القادم
   - تفاصيل العلاج والملاحظات
   - حالة العلاج (مخطط، قيد التنفيذ، مكتمل، ملغي)
   - التكلفة والملاحظات

4. **إدارة الصور**
   - رفع صور متعددة لكل سن
   - أنواع مختلفة من الصور (قبل العلاج، بعد العلاج، أشعة سينية، صورة سريرية)
   - معاينة الصور وحذفها
   - تخزين الصور في مجلد public/upload

5. **ربط الوصفات**
   - ربط الوصفات الطبية بالعلاجات السنية
   - طباعة الوصفات الحرارية
   - إدارة الأدوية المرتبطة بكل علاج

### هيكل قاعدة البيانات

#### جدول dental_treatments
```sql
CREATE TABLE dental_treatments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  tooth_number INTEGER NOT NULL CHECK (
    (tooth_number >= 11 AND tooth_number <= 18) OR
    (tooth_number >= 21 AND tooth_number <= 28) OR
    (tooth_number >= 31 AND tooth_number <= 38) OR
    (tooth_number >= 41 AND tooth_number <= 48) OR
    (tooth_number >= 51 AND tooth_number <= 55) OR
    (tooth_number >= 61 AND tooth_number <= 65) OR
    (tooth_number >= 71 AND tooth_number <= 75) OR
    (tooth_number >= 81 AND tooth_number <= 85)
  ),
  tooth_name TEXT NOT NULL,
  current_treatment TEXT,
  next_treatment TEXT,
  treatment_details TEXT,
  treatment_status TEXT DEFAULT 'planned',
  treatment_color TEXT DEFAULT '#22c55e',
  cost DECIMAL(10,2),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);
```

#### جدول dental_treatment_images
```sql
CREATE TABLE dental_treatment_images (
  id TEXT PRIMARY KEY,
  dental_treatment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  tooth_number INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  image_type TEXT NOT NULL,
  description TEXT,
  taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

#### جدول dental_treatment_prescriptions
```sql
CREATE TABLE dental_treatment_prescriptions (
  id TEXT PRIMARY KEY,
  dental_treatment_id TEXT NOT NULL,
  prescription_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
```

### أنواع العلاجات والألوان

- **سليم**: أخضر (#22c55e)
- **حشو**: برتقالي (#f97316)
- **عصب**: أحمر (#ef4444)
- **تاج**: بنفسجي (#8b5cf6)
- **خلع**: رمادي (#6b7280)
- **تنظيف**: سماوي (#06b6d4)
- **زراعة**: أخضر فاتح (#10b981)
- **جسر**: أصفر (#f59e0b)
- **قشرة**: وردي (#ec4899)
- **تقويم**: أزرق (#6366f1)

### حالات العلاج

- **مخطط**: أزرق (#3b82f6)
- **قيد التنفيذ**: أصفر (#eab308)
- **مكتمل**: أخضر (#22c55e)
- **ملغي**: رمادي (#6b7280)

### أنواع الصور

- **قبل العلاج**: صور توثق حالة السن قبل بدء العلاج
- **بعد العلاج**: صور توثق النتيجة النهائية للعلاج
- **أشعة سينية**: صور الأشعة السينية للتشخيص
- **صورة سريرية**: صور سريرية أخرى مفيدة للتوثيق

### الاستخدام

1. **اختيار المريض**: استخدم البحث لاختيار المريض المطلوب
2. **عرض مخطط الأسنان**: سيظهر المخطط التفاعلي مع ألوان العلاجات
3. **النقر على السن**: انقر على أي سن لفتح نافذة التفاصيل
4. **إدارة العلاج**: أضف أو عدّل معلومات العلاج
5. **رفع الصور**: أضف صور توثيقية للعلاج
6. **ربط الوصفات**: اربط الوصفات الطبية بالعلاج

### التصميم المتجاوب

- **شاشات كبيرة**: عرض 16 سن في كل صف
- **شاشات متوسطة**: عرض 8 أسنان في كل صف
- **شاشات صغيرة**: عرض 4 أسنان في كل صف

### الدعم متعدد اللغات

- واجهة باللغة العربية مع دعم RTL
- أسماء الأسنان باللغة العربية
- تخطيط مناسب للقراءة من اليمين إلى اليسار

### التكامل مع النظام

- مترابط مع نظام المرضى
- مترابط مع نظام المواعيد
- مترابط مع نظام الوصفات والأدوية
- مترابط مع نظام المدفوعات (تكلفة العلاجات)

### الأمان والنسخ الاحتياطي

- جميع البيانات محفوظة في قاعدة البيانات المحلية
- الصور محفوظة في مجلد التطبيق
- دعم النسخ الاحتياطي والاستعادة
- حذف متتالي آمن للبيانات المترابطة

### المتطلبات التقنية

- React 18+
- TypeScript
- Zustand للإدارة الحالة
- shadcn/ui للمكونات
- Lucide React للأيقونات
- SQLite لقاعدة البيانات
- Electron للتطبيق المكتبي

### الملفات المضافة

- `src/pages/DentalTreatments.tsx` - الصفحة الرئيسية
- `src/components/dental/DentalChart.tsx` - مخطط الأسنان التفاعلي
- `src/components/dental/ToothDetailsDialog.tsx` - نافذة تفاصيل السن
- `src/store/dentalTreatmentStore.ts` - إدارة الحالة
- `src/data/teethData.ts` - بيانات الأسنان والعلاجات
- `src/types/index.ts` - تعريفات الأنواع (محدثة)
- `src/database/schema.sql` - هيكل قاعدة البيانات (محدث)
- `src/services/databaseService.ts` - خدمات قاعدة البيانات (محدثة)

### الخطوات التالية

1. اختبار النظام مع بيانات تجريبية
2. إضافة المزيد من أنواع العلاجات حسب الحاجة
3. تحسين واجهة المستخدم بناءً على التغذية الراجعة
4. إضافة تقارير خاصة بالعلاجات السنية
5. تطوير نظام التذكيرات للمواعيد القادمة
