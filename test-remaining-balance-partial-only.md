# تحديث حساب المبالغ المتبقية لتشمل الدفعات الجزئية فقط

## المطلوب
تحديث نظام المدفوعات بحيث تُحسب المبالغ المتبقية فقط من الدفعات الجزئية (`partial`) وليس من الدفعات المعلقة (`pending`) أو المكتملة (`completed`).

## التحديثات المُطبقة

### 1. **تحديث دوال حساب المدفوعات الأساسية**

#### في `src/utils/paymentCalculations.ts`:

##### أ. تحديث حساب المدفوعات للمواعيد:
```typescript
// قبل التحديث
export function calculateAppointmentTotalPaid(appointmentId: string, payments: Payment[]): number {
  return payments
    .filter(payment => payment.appointment_id === appointmentId)
    .reduce((total, payment) => total + payment.amount, 0)
}

// بعد التحديث
export function calculateAppointmentTotalPaid(appointmentId: string, payments: Payment[]): number {
  return payments
    .filter(payment => 
      payment.appointment_id === appointmentId && 
      (payment.status === 'partial' || payment.status === 'completed')
    )
    .reduce((total, payment) => total + payment.amount, 0)
}
```

##### ب. إضافة دوال جديدة للعلاجات:
```typescript
// حساب إجمالي المدفوعات لعلاج محدد (فقط من الدفعات الجزئية والمكتملة)
export function calculateTreatmentTotalPaid(treatmentId: string, payments: Payment[]): number {
  return payments
    .filter(payment => 
      payment.tooth_treatment_id === treatmentId && 
      (payment.status === 'partial' || payment.status === 'completed')
    )
    .reduce((total, payment) => total + payment.amount, 0)
}

// حساب الرصيد المتبقي لعلاج محدد
export function calculateTreatmentRemainingBalance(
  treatmentId: string,
  treatmentCost: number,
  payments: Payment[]
): number {
  const totalPaid = calculateTreatmentTotalPaid(treatmentId, payments)
  return Math.max(0, treatmentCost - totalPaid)
}
```

##### ج. تحديث حساب ملخص المدفوعات للمريض:
```typescript
// حساب المبلغ المتبقي من الدفعات الجزئية فقط
let totalRemaining = 0

// المبلغ المتبقي من المواعيد (فقط من الدفعات الجزئية)
patientAppointments.forEach(appointment => {
  if (appointment.cost) {
    const partialPayments = patientPayments.filter(p => 
      p.appointment_id === appointment.id && p.status === 'partial'
    )
    if (partialPayments.length > 0) {
      const totalPaidForAppointment = partialPayments.reduce((sum, p) => sum + p.amount, 0)
      totalRemaining += Math.max(0, appointment.cost - totalPaidForAppointment)
    }
  }
})
```

### 2. **تحديث PaymentStore**

#### في `src/store/paymentStore.ts`:
```typescript
calculateTotalRemainingBalance: () => {
  const { payments } = get()
  let totalRemaining = 0

  // حساب المبلغ المتبقي من المدفوعات المرتبطة بالعلاجات (فقط من الدفعات الجزئية)
  const treatmentPayments = payments.filter(p => p.tooth_treatment_id && p.status === 'partial')
  
  // حساب المبلغ المتبقي من المدفوعات المرتبطة بالمواعيد (فقط من الدفعات الجزئية)
  const appointmentPayments = payments.filter(p => p.appointment_id && !p.tooth_treatment_id && p.status === 'partial')
  
  // حساب المبلغ المتبقي من المدفوعات العامة (فقط من الدفعات الجزئية)
  const generalPayments = payments.filter(p => !p.appointment_id && !p.tooth_treatment_id && p.status === 'partial')
}
```

### 3. **تحديث الإحصائيات والتقارير**

#### في `src/hooks/useTimeFilteredStats.ts`:
```typescript
// قبل التحديث
filteredData.forEach((payment: any) => {
  if (payment.status === 'partial' || payment.status === 'pending') {
    // حساب المبالغ المتبقية
  }
})

// بعد التحديث
filteredData.forEach((payment: any) => {
  if (payment.status === 'partial') {
    // حساب المبالغ المتبقية فقط من الدفعات الجزئية
  }
})
```

#### في `src/services/reportsService.ts`:
```typescript
// تحديث مماثل لحساب المبالغ المتبقية من الدفعات الجزئية فقط
filteredPayments.forEach(payment => {
  if (payment.status === 'partial') {
    // حساب المبالغ المتبقية
  }
})
```

## المنطق الجديد

### حالات الدفع وتأثيرها على المبالغ المتبقية:

#### 1. **الدفعات المعلقة (`pending`)**:
- **قبل التحديث**: تُحسب في المبالغ المتبقية
- **بعد التحديث**: لا تُحسب في المبالغ المتبقية
- **السبب**: الدفعات المعلقة لم يتم دفعها بعد

#### 2. **الدفعات الجزئية (`partial`)**:
- **قبل التحديث**: تُحسب في المبالغ المتبقية
- **بعد التحديث**: تُحسب في المبالغ المتبقية ✅
- **السبب**: هذه الدفعات تم دفع جزء منها ويتبقى مبلغ

#### 3. **الدفعات المكتملة (`completed`)**:
- **قبل التحديث**: لا تُحسب في المبالغ المتبقية
- **بعد التحديث**: لا تُحسب في المبالغ المتبقية ✅
- **السبب**: هذه الدفعات مكتملة ولا يتبقى منها شيء

## سيناريوهات الاختبار

### السيناريو 1: علاج بتكلفة 1000 ريال
- **دفعة جزئية**: 600 ريال (حالة: `partial`)
- **النتيجة المتوقعة**: المبلغ المتبقي = 400 ريال ✅

### السيناريو 2: علاج بتكلفة 1000 ريال
- **دفعة معلقة**: 0 ريال (حالة: `pending`)
- **النتيجة المتوقعة**: المبلغ المتبقي = 0 ريال (لا يُحسب) ✅

### السيناريو 3: علاج بتكلفة 1000 ريال
- **دفعة مكتملة**: 1000 ريال (حالة: `completed`)
- **النتيجة المتوقعة**: المبلغ المتبقي = 0 ريال ✅

### السيناريو 4: علاج بتكلفة 1000 ريال
- **دفعة جزئية 1**: 300 ريال (حالة: `partial`)
- **دفعة جزئية 2**: 400 ريال (حالة: `partial`)
- **النتيجة المتوقعة**: المبلغ المتبقي = 300 ريال ✅

### السيناريو 5: علاج بتكلفة 1000 ريال
- **دفعة معلقة**: 0 ريال (حالة: `pending`)
- **دفعة جزئية**: 600 ريال (حالة: `partial`)
- **النتيجة المتوقعة**: المبلغ المتبقي = 400 ريال (فقط من الجزئية) ✅

## الفوائد

### 1. **دقة في الحسابات**
- المبالغ المتبقية تعكس الواقع الفعلي للمدفوعات
- لا تشمل الدفعات التي لم يتم دفعها بعد

### 2. **وضوح في التقارير**
- التقارير المالية أكثر دقة
- إحصائيات واضحة للمبالغ المستحقة فعلياً

### 3. **تحسين إدارة التدفق النقدي**
- فهم أفضل للأموال المتوقعة
- تخطيط مالي أكثر دقة

## ملاحظات مهمة

### التوافق
- التحديثات متوافقة مع النظام الحالي
- لا تؤثر على البيانات الموجودة
- تحسن من دقة الحسابات المستقبلية

### الأداء
- تحسين في أداء الحسابات
- تقليل العمليات غير الضرورية
- استخدام أمثل للذاكرة
