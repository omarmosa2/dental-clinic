import { ToothInfo } from '@/types'

// Permanent teeth data (adult teeth) - ordered from right to left as requested
export const PERMANENT_TEETH_DATA: ToothInfo[] = [
  // Upper jaw - right to left (28,27,26,25,24,23,22,21,11,12,13,14,15,16,17,18)
  { number: 28, name: 'Third Molar', arabicName: 'ضرس العقل', position: 'upper', side: 'right', type: 'molar' },
  { number: 27, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'upper', side: 'right', type: 'molar' },
  { number: 26, name: 'First Molar', arabicName: 'رحى أولى', position: 'upper', side: 'right', type: 'molar' },
  { number: 25, name: 'Second Premolar', arabicName: 'ضاحك ثاني', position: 'upper', side: 'right', type: 'premolar' },
  { number: 24, name: 'First Premolar', arabicName: 'ضاحك أول', position: 'upper', side: 'right', type: 'premolar' },
  { number: 23, name: 'Canine', arabicName: 'ناب', position: 'upper', side: 'right', type: 'canine' },
  { number: 22, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'upper', side: 'right', type: 'incisor' },
  { number: 21, name: 'Central Incisor', arabicName: 'ثنية', position: 'upper', side: 'right', type: 'incisor' },
  { number: 11, name: 'Central Incisor', arabicName: 'ثنية', position: 'upper', side: 'left', type: 'incisor' },
  { number: 12, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'upper', side: 'left', type: 'incisor' },
  { number: 13, name: 'Canine', arabicName: 'ناب', position: 'upper', side: 'left', type: 'canine' },
  { number: 14, name: 'First Premolar', arabicName: 'ضاحك أول', position: 'upper', side: 'left', type: 'premolar' },
  { number: 15, name: 'Second Premolar', arabicName: 'ضاحك ثاني', position: 'upper', side: 'left', type: 'premolar' },
  { number: 16, name: 'First Molar', arabicName: 'رحى أولى', position: 'upper', side: 'left', type: 'molar' },
  { number: 17, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'upper', side: 'left', type: 'molar' },
  { number: 18, name: 'Third Molar', arabicName: 'ضرس العقل', position: 'upper', side: 'left', type: 'molar' },

  // Lower jaw - right to left (38,37,36,35,34,33,32,31,41,42,43,44,45,46,47,48)
  { number: 38, name: 'Third Molar', arabicName: 'ضرس العقل', position: 'lower', side: 'right', type: 'molar' },
  { number: 37, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'lower', side: 'right', type: 'molar' },
  { number: 36, name: 'First Molar', arabicName: 'رحى أولى', position: 'lower', side: 'right', type: 'molar' },
  { number: 35, name: 'Second Premolar', arabicName: 'ضاحك ثاني', position: 'lower', side: 'right', type: 'premolar' },
  { number: 34, name: 'First Premolar', arabicName: 'ضاحك أول', position: 'lower', side: 'right', type: 'premolar' },
  { number: 33, name: 'Canine', arabicName: 'ناب', position: 'lower', side: 'right', type: 'canine' },
  { number: 32, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'lower', side: 'right', type: 'incisor' },
  { number: 31, name: 'Central Incisor', arabicName: 'ثنية', position: 'lower', side: 'right', type: 'incisor' },
  { number: 41, name: 'Central Incisor', arabicName: 'ثنية', position: 'lower', side: 'left', type: 'incisor' },
  { number: 42, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'lower', side: 'left', type: 'incisor' },
  { number: 43, name: 'Canine', arabicName: 'ناب', position: 'lower', side: 'left', type: 'canine' },
  { number: 44, name: 'First Premolar', arabicName: 'ضاحك أول', position: 'lower', side: 'left', type: 'premolar' },
  { number: 45, name: 'Second Premolar', arabicName: 'ضاحك ثاني', position: 'lower', side: 'left', type: 'premolar' },
  { number: 46, name: 'First Molar', arabicName: 'رحى أولى', position: 'lower', side: 'left', type: 'molar' },
  { number: 47, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'lower', side: 'left', type: 'molar' },
  { number: 48, name: 'Third Molar', arabicName: 'ضرس العقل', position: 'lower', side: 'left', type: 'molar' },
]

// Primary teeth data (baby teeth) - ordered from right to left as requested
export const PRIMARY_TEETH_DATA: ToothInfo[] = [
  // Upper jaw - right to left (65, 64, 63, 62, 61, 51, 52, 53, 54, 55)
  { number: 65, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'upper', side: 'right', type: 'molar' },
  { number: 64, name: 'First Molar', arabicName: 'رحى أولى', position: 'upper', side: 'right', type: 'molar' },
  { number: 63, name: 'Canine', arabicName: 'ناب', position: 'upper', side: 'right', type: 'canine' },
  { number: 62, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'upper', side: 'right', type: 'incisor' },
  { number: 61, name: 'Central Incisor', arabicName: 'ثنية', position: 'upper', side: 'right', type: 'incisor' },
  { number: 51, name: 'Central Incisor', arabicName: 'ثنية', position: 'upper', side: 'left', type: 'incisor' },
  { number: 52, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'upper', side: 'left', type: 'incisor' },
  { number: 53, name: 'Canine', arabicName: 'ناب', position: 'upper', side: 'left', type: 'canine' },
  { number: 54, name: 'First Molar', arabicName: 'رحى أولى', position: 'upper', side: 'left', type: 'molar' },
  { number: 55, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'upper', side: 'left', type: 'molar' },

  // Lower jaw - right to left (75, 74, 73, 72, 71, 81, 82, 83, 84, 85)
  { number: 75, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'lower', side: 'right', type: 'molar' },
  { number: 74, name: 'First Molar', arabicName: 'رحى أولى', position: 'lower', side: 'right', type: 'molar' },
  { number: 73, name: 'Canine', arabicName: 'ناب', position: 'lower', side: 'right', type: 'canine' },
  { number: 72, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'lower', side: 'right', type: 'incisor' },
  { number: 71, name: 'Central Incisor', arabicName: 'ثنية', position: 'lower', side: 'right', type: 'incisor' },
  { number: 81, name: 'Central Incisor', arabicName: 'ثنية', position: 'lower', side: 'left', type: 'incisor' },
  { number: 82, name: 'Lateral Incisor', arabicName: 'رباعية', position: 'lower', side: 'left', type: 'incisor' },
  { number: 83, name: 'Canine', arabicName: 'ناب', position: 'lower', side: 'left', type: 'canine' },
  { number: 84, name: 'First Molar', arabicName: 'رحى أولى', position: 'lower', side: 'left', type: 'molar' },
  { number: 85, name: 'Second Molar', arabicName: 'رحى ثانية', position: 'lower', side: 'left', type: 'molar' },
]

// Default to permanent teeth for backward compatibility
export const TEETH_DATA = PERMANENT_TEETH_DATA

// Helper functions
export const getToothInfo = (toothNumber: number, isPrimary: boolean = false): ToothInfo | undefined => {
  const teethData = isPrimary ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
  return teethData.find(tooth => tooth.number === toothNumber)
}

export const getTeethData = (isPrimary: boolean = false): ToothInfo[] => {
  return isPrimary ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
}

export const getUpperTeeth = (isPrimary: boolean = false): ToothInfo[] => {
  const teethData = isPrimary ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
  const upperTeeth = teethData.filter(tooth => tooth.position === 'upper')

  if (isPrimary) {
    // For primary teeth, maintain the order as defined (right to left: 65,64,63,62,61,51,52,53,54,55)
    const order = [65, 64, 63, 62, 61, 51, 52, 53, 54, 55]
    return order.map(num => upperTeeth.find(tooth => tooth.number === num)).filter(Boolean) as ToothInfo[]
  } else {
    // For permanent teeth, maintain the order as defined (right to left: 28,27,26,25,24,23,22,21,11,12,13,14,15,16,17,18)
    const order = [28, 27, 26, 25, 24, 23, 22, 21, 11, 12, 13, 14, 15, 16, 17, 18]
    return order.map(num => upperTeeth.find(tooth => tooth.number === num)).filter(Boolean) as ToothInfo[]
  }
}

export const getLowerTeeth = (isPrimary: boolean = false): ToothInfo[] => {
  const teethData = isPrimary ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
  const lowerTeeth = teethData.filter(tooth => tooth.position === 'lower')

  if (isPrimary) {
    // For primary teeth, maintain the order as defined (right to left: 75,74,73,72,71,81,82,83,84,85)
    const order = [75, 74, 73, 72, 71, 81, 82, 83, 84, 85]
    return order.map(num => lowerTeeth.find(tooth => tooth.number === num)).filter(Boolean) as ToothInfo[]
  } else {
    // For permanent teeth, maintain the order as defined (right to left: 38,37,36,35,34,33,32,31,41,42,43,44,45,46,47,48)
    const order = [38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48]
    return order.map(num => lowerTeeth.find(tooth => tooth.number === num)).filter(Boolean) as ToothInfo[]
  }
}

export const getTeethByType = (type: ToothInfo['type'], isPrimary: boolean = false): ToothInfo[] => {
  const teethData = isPrimary ? PRIMARY_TEETH_DATA : PERMANENT_TEETH_DATA
  return teethData.filter(tooth => tooth.type === type)
}

// Treatment type options with Arabic labels - International Dental Standards
export const TREATMENT_TYPES = [
  // ===== PREVENTIVE TREATMENTS (العلاجات الوقائية) =====
  { value: 'healthy', label: 'سليم', color: '#22c55e', category: 'preventive' },
  { value: 'cleaning', label: 'تنظيف', color: '#06b6d4', category: 'preventive' },
  { value: 'fluoride', label: 'فلورايد', color: '#0ea5e9', category: 'preventive' },
  { value: 'sealant', label: 'حشو وقائي', color: '#14b8a6', category: 'preventive' },
  { value: 'scaling', label: 'تقليح', color: '#06b6d4', category: 'preventive' },

  // ===== RESTORATIVE TREATMENTS (الترميمية - المحافظة) =====
  { value: 'filling_metal', label: 'حشو معدني', color: '#64748b', category: 'restorative' },
  { value: 'filling_cosmetic', label: 'حشو تجميلي', color: '#f97316', category: 'restorative' },
  { value: 'filling_glass_ionomer', label: 'حشو زجاجي', color: '#fb7185', category: 'restorative' },
  { value: 'inlay', label: 'حشو داخلي', color: '#a855f7', category: 'restorative' },
  { value: 'onlay', label: 'حشو خارجي', color: '#8b5cf6', category: 'restorative' },

  // ===== ENDODONTIC TREATMENTS (علاج العصب) =====
  { value: 'nerve_extraction', label: 'استئصال عصب', color: '#ef4444', category: 'endodontic' },
  { value: 'pulp_therapy', label: 'مداولة لبية', color: '#dc2626', category: 'endodontic' },
  { value: 'direct_pulp_cap', label: 'ضغطية مباشرة', color: '#f87171', category: 'endodontic' },
  { value: 'indirect_pulp_cap', label: 'ضغطية غير مباشرة', color: '#fca5a5', category: 'endodontic' },
  { value: 'retreatment', label: 'إعادة معالجة', color: '#b91c1c', category: 'endodontic' },
  { value: 'deep_pulp_treatment', label: 'معالجة لبية عميقة', color: '#991b1b', category: 'endodontic' },

  // ===== SURGICAL TREATMENTS (العلاجات الجراحية) =====
  { value: 'extraction_simple', label: 'قلع بسيط', color: '#6b7280', category: 'surgical' },
  { value: 'extraction_surgical', label: 'قلع جراحي', color: '#4b5563', category: 'surgical' },
  { value: 'implant', label: 'زراعة', color: '#10b981', category: 'surgical' },
  { value: 'bone_graft', label: 'ترقيع عظم', color: '#059669', category: 'surgical' },
  { value: 'sinus_lift', label: 'رفع الجيب الفكي', color: '#047857', category: 'surgical' },
  { value: 'gum_surgery', label: 'جراحة لثة', color: '#065f46', category: 'surgical' },
  { value: 'apical_resection', label: 'قطع ذروة', color: '#374151', category: 'surgical' },

  // ===== COSMETIC TREATMENTS (العلاجات التجميلية) =====
  { value: 'veneer_porcelain', label: 'قشرة خزفية', color: '#ec4899', category: 'cosmetic' },
  { value: 'veneer_composite', label: 'قشرة مركبة', color: '#f472b6', category: 'cosmetic' },
  { value: 'whitening', label: 'تبييض', color: '#fbbf24', category: 'cosmetic' },
  { value: 'bonding', label: 'ربط تجميلي', color: '#f59e0b', category: 'cosmetic' },
  { value: 'contouring', label: 'تشكيل تجميلي', color: '#d97706', category: 'cosmetic' },
  { value: 'polish', label: 'بوليش', color: '#eab308', category: 'cosmetic' },

  // ===== ORTHODONTIC TREATMENTS (علاجات التقويم) =====
  { value: 'orthodontic_metal', label: 'تقويم معدني', color: '#6366f1', category: 'orthodontic' },
  { value: 'orthodontic_ceramic', label: 'تقويم خزفي', color: '#8b5cf6', category: 'orthodontic' },
  { value: 'orthodontic_clear', label: 'تقويم شفاف', color: '#a855f7', category: 'orthodontic' },
  { value: 'retainer', label: 'مثبت', color: '#7c3aed', category: 'orthodontic' },
  { value: 'space_maintainer', label: 'حافظ مسافة', color: '#5b21b6', category: 'orthodontic' },

  // ===== PERIODONTAL TREATMENTS (علاجات اللثة) =====
  { value: 'scaling_periodontal', label: 'تقليح', color: '#0891b2', category: 'periodontal' },
  { value: 'subgingival_scaling', label: 'تقليح تحت لثوي', color: '#0e7490', category: 'periodontal' },
  { value: 'deep_cleaning', label: 'تنظيف عميق', color: '#0891b2', category: 'periodontal' },
  { value: 'root_planing', label: 'تسوية الجذور', color: '#0e7490', category: 'periodontal' },
  { value: 'gum_graft', label: 'ترقيع لثة', color: '#155e75', category: 'periodontal' },
  { value: 'pocket_reduction', label: 'تقليل الجيوب', color: '#164e63', category: 'periodontal' },

  // ===== PEDIATRIC TREATMENTS (علاجات الأطفال) =====
  { value: 'pediatric_filling', label: 'حشوة', color: '#f472b6', category: 'pediatric' },
  { value: 'pulp_amputation', label: 'بتر لب', color: '#ec4899', category: 'pediatric' },
  { value: 'pediatric_pulp_treatment', label: 'معالجة لبية', color: '#db2777', category: 'pediatric' },
  { value: 'pulp_therapy_pediatric', label: 'علاج عصب لبني', color: '#f472b6', category: 'pediatric' },
  { value: 'stainless_crown', label: 'تاج ستانلس', color: '#9ca3af', category: 'pediatric' },
  { value: 'space_maintainer_fixed', label: 'حافظ مسافة ثابت', color: '#6b7280', category: 'pediatric' },
  { value: 'space_maintainer_removable', label: 'حافظ مسافة متحرك', color: '#4b5563', category: 'pediatric' },

  // ===== PROSTHETIC TREATMENTS (التعويضات) =====
  { value: 'crown_metal', label: 'تاج معدني', color: '#6b7280', category: 'prosthetic' },
  { value: 'crown_ceramic', label: 'تاج خزفي', color: '#8b5cf6', category: 'prosthetic' },
  { value: 'crown_zirconia', label: 'تاج زيركونيا', color: '#a855f7', category: 'prosthetic' },
  { value: 'bridge', label: 'جسر', color: '#f59e0b', category: 'prosthetic' },
] as const

export type TreatmentType = typeof TREATMENT_TYPES[number]['value']

// Treatment categories for organization
export const TREATMENT_CATEGORIES = [
  { value: 'preventive', label: 'العلاجات الوقائية', color: '#22c55e', icon: '🛡️' },
  { value: 'restorative', label: 'الترميمية (المحافظة)', color: '#f97316', icon: '🔧' },
  { value: 'endodontic', label: 'علاج العصب', color: '#ef4444', icon: '🦷' },
  { value: 'surgical', label: 'العلاجات الجراحية', color: '#6b7280', icon: '⚔️' },
  { value: 'cosmetic', label: 'العلاجات التجميلية', color: '#ec4899', icon: '✨' },
  { value: 'orthodontic', label: 'علاجات التقويم', color: '#6366f1', icon: '📐' },
  { value: 'periodontal', label: 'علاجات اللثة', color: '#0891b2', icon: '🌿' },
  { value: 'pediatric', label: 'علاجات الأطفال', color: '#f472b6', icon: '👶' },
  { value: 'prosthetic', label: 'التعويضات', color: '#8b5cf6', icon: '👑' },
] as const

export type TreatmentCategory = typeof TREATMENT_CATEGORIES[number]['value']

// Helper functions for treatment management
export const getTreatmentsByCategory = (category: TreatmentCategory) => {
  return TREATMENT_TYPES.filter(treatment => treatment.category === category)
}

export const getTreatmentByValue = (value: string) => {
  return TREATMENT_TYPES.find(treatment => treatment.value === value)
}

export const getCategoryInfo = (category: TreatmentCategory) => {
  return TREATMENT_CATEGORIES.find(cat => cat.value === category)
}

// Get treatment color by value (for backward compatibility)
export const getTreatmentColor = (treatmentValue: string): string => {
  const treatment = getTreatmentByValue(treatmentValue)
  return treatment?.color || '#22c55e' // Default to healthy color
}

// Treatment status options
export const TREATMENT_STATUS_OPTIONS = [
  { value: 'planned', label: 'مخطط', color: '#3b82f6' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: '#eab308' },
  { value: 'completed', label: 'مكتمل', color: '#22c55e' },
  { value: 'cancelled', label: 'ملغي', color: '#6b7280' },
] as const

// Image type options
export const IMAGE_TYPE_OPTIONS = [
  { value: 'before', label: 'قبل العلاج', icon: '📷' },
  { value: 'after', label: 'بعد العلاج', icon: '✨' },
  { value: 'xray', label: 'أشعة سينية', icon: '🦴' },
  { value: 'clinical', label: 'صورة سريرية', icon: '🔬' },
] as const
