/**
 * مركز الترجمة العربية لجميع بيانات النظام
 * Arabic Translation Center for all system data
 */

// ترجمة أنواع العلاجات
export const getTreatmentNameInArabic = (treatmentType: string): string => {
  if (!treatmentType) return 'غير محدد'

  const treatmentMap: { [key: string]: string } = {
    // Preventive treatments - العلاجات الوقائية
    'healthy': 'سليم',
    'cleaning': 'تنظيف',
    'deep_cleaning': 'تنظيف عميق',
    'fluoride': 'فلورايد',
    'sealant': 'حشو وقائي',
    'scaling': 'تقليح',
    'subgingival_scaling': 'تقليح تحت اللثة',

    // Restorative treatments - الترميمية (المحافظة)
    'filling_metal': 'حشو معدني',
    'filling_cosmetic': 'حشو تجميلي',
    'filling_glass_ionomer': 'حشو زجاجي',
    'inlay': 'حشو داخلي',
    'onlay': 'حشو خارجي',

    // Endodontic treatments - علاج العصب
    'nerve_extraction': 'استئصال عصب',
    'pulp_therapy': 'مداولة لبية',
    'direct_pulp_cap': 'ضغطية مباشرة',
    'indirect_pulp_cap': 'ضغطية غير مباشرة',
    'retreatment': 'إعادة معالجة',
    'deep_pulp_treatment': 'معالجة لبية عميقة',

    // Surgical treatments - العلاجات الجراحية
    'extraction': 'قلع',
    'simple_extraction': 'قلع بسيط',
    'surgical_extraction': 'قلع جراحي',
    'apical_resection': 'استئصال قمي',
    'root_tip_extraction': 'استئصال قمة الجذر',

    // Cosmetic treatments - العلاجات التجميلية
    'whitening': 'تبييض',
    'veneer': 'قشرة تجميلية',
    'bonding': 'ربط تجميلي',
    'polish': 'تلميع',

    // Orthodontic treatments - علاجات التقويم
    'orthodontic_metal': 'تقويم معدني',
    'orthodontic_ceramic': 'تقويم سيراميك',
    'orthodontic_clear': 'تقويم شفاف',
    'retainer': 'مثبت',

    // Periodontal treatments - علاجات اللثة
    'gum_treatment': 'علاج اللثة',
    'periodontal_therapy': 'علاج دواعم السن',
    'gum_surgery': 'جراحة اللثة',

    // Pediatric treatments - علاجات الأطفال
    'pulp_amputation': 'بتر اللب',
    'pulp_treatment': 'علاج اللب',
    'space_maintainer': 'حافظ مسافة',

    // Prosthetic treatments - التعويضات
    'metal_crown': 'تاج معدني',
    'crown_metal': 'تاج معدني',
    'ceramic_crown': 'تاج سيراميك',
    'crown_ceramic': 'تاج سيراميك',
    'zirconia_crown': 'تاج زيركونيا',
    'bridge': 'جسر',
    'partial_denture': 'طقم جزئي',
    'complete_denture': 'طقم كامل',
    'implant': 'زراعة',

    // Legacy treatments
    'preventive': 'علاج وقائي',
    'pulp_cap': 'ضغطية لب',
    'extraction_simple': 'قلع بسيط',

    // Additional common treatments
    'crown': 'تاج',
    'filling': 'حشو',
    'root_canal': 'علاج عصب',
    'tooth_extraction': 'قلع سن',
    'dental_cleaning': 'تنظيف أسنان',
    'teeth_whitening': 'تبييض أسنان',
    'dental_crown': 'تاج سني',
    'dental_filling': 'حشو سني'
  }

  return treatmentMap[treatmentType] || treatmentType
}

// ترجمة فئات العلاجات
export const getCategoryNameInArabic = (category: string): string => {
  if (!category) return 'غير محدد'

  // If category is already in Arabic, return it
  if (category && (category.includes('العلاجات') || category.includes('علاج') || category.includes('التعويضات'))) {
    return category
  }

  // Map English categories to Arabic
  const categoryMap: { [key: string]: string } = {
    'preventive': 'العلاجات الوقائية',
    'restorative': 'الترميمية (المحافظة)',
    'endodontic': 'علاج العصب',
    'surgical': 'العلاجات الجراحية',
    'cosmetic': 'العلاجات التجميلية',
    'orthodontic': 'علاجات التقويم',
    'periodontal': 'علاجات اللثة',
    'pediatric': 'علاجات الأطفال',
    'prosthetic': 'التعويضات'
  }

  return categoryMap[category] || category
}

// ترجمة حالات العلاجات
export const getStatusLabelInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'planned': 'مخطط',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'pending': 'معلق',
    'active': 'نشط',
    'inactive': 'غير نشط'
  }

  return statusLabels[status] || status
}

// ترجمة حالات المواعيد
export const getAppointmentStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'scheduled': 'مجدول',
    'confirmed': 'مؤكد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'no_show': 'لم يحضر',
    'rescheduled': 'أعيد جدولته'
  }

  return statusLabels[status] || status
}

// ترجمة حالات المدفوعات
export const getPaymentStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'pending': 'معلق',
    'completed': 'مكتمل',
    'partial': 'جزئي',
    'cancelled': 'ملغي',
    'refunded': 'مسترد'
  }

  return statusLabels[status] || status
}

// ترجمة طرق الدفع
export const getPaymentMethodInArabic = (method: string): string => {
  if (!method) return 'غير محدد'

  const methodLabels: { [key: string]: string } = {
    'cash': 'نقدي',
    'card': 'بطاقة',
    'bank_transfer': 'تحويل بنكي',
    'check': 'شيك',
    'installment': 'تقسيط'
  }

  return methodLabels[method] || method
}

// ترجمة أولويات احتياجات العيادة
export const getPriorityLabelInArabic = (priority: string): string => {
  if (!priority) return 'غير محدد'

  const priorityLabels: { [key: string]: string } = {
    'urgent': 'عاجل',
    'high': 'عالي',
    'medium': 'متوسط',
    'low': 'منخفض'
  }

  return priorityLabels[priority] || priority
}

// ترجمة حالات احتياجات العيادة
export const getClinicNeedStatusInArabic = (status: string): string => {
  if (!status) return 'غير محدد'

  const statusLabels: { [key: string]: string } = {
    'pending': 'معلق',
    'ordered': 'مطلوب',
    'received': 'مستلم',
    'cancelled': 'ملغي'
  }

  return statusLabels[status] || status
}

// ترجمة أنواع المخزون
export const getInventoryTypeInArabic = (type: string): string => {
  if (!type) return 'غير محدد'

  const typeLabels: { [key: string]: string } = {
    'medication': 'دواء',
    'equipment': 'معدات',
    'supplies': 'مستلزمات',
    'material': 'مواد'
  }

  return typeLabels[type] || type
}

// دالة شاملة لترجمة أي نص حسب النوع
export const translateToArabic = (text: string, type: 'treatment' | 'category' | 'status' | 'appointment_status' | 'payment_status' | 'payment_method' | 'priority' | 'clinic_need_status' | 'inventory_type'): string => {
  switch (type) {
    case 'treatment':
      return getTreatmentNameInArabic(text)
    case 'category':
      return getCategoryNameInArabic(text)
    case 'status':
      return getStatusLabelInArabic(text)
    case 'appointment_status':
      return getAppointmentStatusInArabic(text)
    case 'payment_status':
      return getPaymentStatusInArabic(text)
    case 'payment_method':
      return getPaymentMethodInArabic(text)
    case 'priority':
      return getPriorityLabelInArabic(text)
    case 'clinic_need_status':
      return getClinicNeedStatusInArabic(text)
    case 'inventory_type':
      return getInventoryTypeInArabic(text)
    default:
      return text
  }
}
