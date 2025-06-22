import { ToothInfo } from '@/types'

// Dental chart data with Arabic names and proper positioning
export const TEETH_DATA: ToothInfo[] = [
  // Upper jaw - right side (teeth 1-8)
  { number: 1, name: 'Third Molar', arabicName: 'ضرس العقل الأيمن العلوي', position: 'upper', side: 'right', type: 'molar' },
  { number: 2, name: 'Second Molar', arabicName: 'الضرس الثاني الأيمن العلوي', position: 'upper', side: 'right', type: 'molar' },
  { number: 3, name: 'First Molar', arabicName: 'الضرس الأول الأيمن العلوي', position: 'upper', side: 'right', type: 'molar' },
  { number: 4, name: 'Second Premolar', arabicName: 'الضاحك الثاني الأيمن العلوي', position: 'upper', side: 'right', type: 'premolar' },
  { number: 5, name: 'First Premolar', arabicName: 'الضاحك الأول الأيمن العلوي', position: 'upper', side: 'right', type: 'premolar' },
  { number: 6, name: 'Canine', arabicName: 'الناب الأيمن العلوي', position: 'upper', side: 'right', type: 'canine' },
  { number: 7, name: 'Lateral Incisor', arabicName: 'القاطع الجانبي الأيمن العلوي', position: 'upper', side: 'right', type: 'incisor' },
  { number: 8, name: 'Central Incisor', arabicName: 'القاطع المركزي الأيمن العلوي', position: 'upper', side: 'right', type: 'incisor' },

  // Upper jaw - left side (teeth 9-16)
  { number: 9, name: 'Central Incisor', arabicName: 'القاطع المركزي الأيسر العلوي', position: 'upper', side: 'left', type: 'incisor' },
  { number: 10, name: 'Lateral Incisor', arabicName: 'القاطع الجانبي الأيسر العلوي', position: 'upper', side: 'left', type: 'incisor' },
  { number: 11, name: 'Canine', arabicName: 'الناب الأيسر العلوي', position: 'upper', side: 'left', type: 'canine' },
  { number: 12, name: 'First Premolar', arabicName: 'الضاحك الأول الأيسر العلوي', position: 'upper', side: 'left', type: 'premolar' },
  { number: 13, name: 'Second Premolar', arabicName: 'الضاحك الثاني الأيسر العلوي', position: 'upper', side: 'left', type: 'premolar' },
  { number: 14, name: 'First Molar', arabicName: 'الضرس الأول الأيسر العلوي', position: 'upper', side: 'left', type: 'molar' },
  { number: 15, name: 'Second Molar', arabicName: 'الضرس الثاني الأيسر العلوي', position: 'upper', side: 'left', type: 'molar' },
  { number: 16, name: 'Third Molar', arabicName: 'ضرس العقل الأيسر العلوي', position: 'upper', side: 'left', type: 'molar' },

  // Lower jaw - right side (teeth 17-24)
  { number: 17, name: 'Third Molar', arabicName: 'ضرس العقل الأيمن السفلي', position: 'lower', side: 'right', type: 'molar' },
  { number: 18, name: 'Second Molar', arabicName: 'الضرس الثاني الأيمن السفلي', position: 'lower', side: 'right', type: 'molar' },
  { number: 19, name: 'First Molar', arabicName: 'الضرس الأول الأيمن السفلي', position: 'lower', side: 'right', type: 'molar' },
  { number: 20, name: 'Second Premolar', arabicName: 'الضاحك الثاني الأيمن السفلي', position: 'lower', side: 'right', type: 'premolar' },
  { number: 21, name: 'First Premolar', arabicName: 'الضاحك الأول الأيمن السفلي', position: 'lower', side: 'right', type: 'premolar' },
  { number: 22, name: 'Canine', arabicName: 'الناب الأيمن السفلي', position: 'lower', side: 'right', type: 'canine' },
  { number: 23, name: 'Lateral Incisor', arabicName: 'القاطع الجانبي الأيمن السفلي', position: 'lower', side: 'right', type: 'incisor' },
  { number: 24, name: 'Central Incisor', arabicName: 'القاطع المركزي الأيمن السفلي', position: 'lower', side: 'right', type: 'incisor' },

  // Lower jaw - left side (teeth 25-32)
  { number: 25, name: 'Central Incisor', arabicName: 'القاطع المركزي الأيسر السفلي', position: 'lower', side: 'left', type: 'incisor' },
  { number: 26, name: 'Lateral Incisor', arabicName: 'القاطع الجانبي الأيسر السفلي', position: 'lower', side: 'left', type: 'incisor' },
  { number: 27, name: 'Canine', arabicName: 'الناب الأيسر السفلي', position: 'lower', side: 'left', type: 'canine' },
  { number: 28, name: 'First Premolar', arabicName: 'الضاحك الأول الأيسر السفلي', position: 'lower', side: 'left', type: 'premolar' },
  { number: 29, name: 'Second Premolar', arabicName: 'الضاحك الثاني الأيسر السفلي', position: 'lower', side: 'left', type: 'premolar' },
  { number: 30, name: 'First Molar', arabicName: 'الضرس الأول الأيسر السفلي', position: 'lower', side: 'left', type: 'molar' },
  { number: 31, name: 'Second Molar', arabicName: 'الضرس الثاني الأيسر السفلي', position: 'lower', side: 'left', type: 'molar' },
  { number: 32, name: 'Third Molar', arabicName: 'ضرس العقل الأيسر السفلي', position: 'lower', side: 'left', type: 'molar' },
]

// Helper functions
export const getToothInfo = (toothNumber: number): ToothInfo | undefined => {
  return TEETH_DATA.find(tooth => tooth.number === toothNumber)
}

export const getUpperTeeth = (): ToothInfo[] => {
  return TEETH_DATA.filter(tooth => tooth.position === 'upper').sort((a, b) => a.number - b.number)
}

export const getLowerTeeth = (): ToothInfo[] => {
  return TEETH_DATA.filter(tooth => tooth.position === 'lower').sort((a, b) => a.number - b.number)
}

export const getTeethByType = (type: ToothInfo['type']): ToothInfo[] => {
  return TEETH_DATA.filter(tooth => tooth.type === type)
}

// Treatment type options with Arabic labels
export const TREATMENT_TYPES = [
  { value: 'healthy', label: 'سليم', color: '#22c55e' },
  { value: 'filling', label: 'حشو', color: '#f97316' },
  { value: 'root_canal', label: 'عصب', color: '#ef4444' },
  { value: 'crown', label: 'تاج', color: '#8b5cf6' },
  { value: 'extraction', label: 'خلع', color: '#6b7280' },
  { value: 'cleaning', label: 'تنظيف', color: '#06b6d4' },
  { value: 'implant', label: 'زراعة', color: '#10b981' },
  { value: 'bridge', label: 'جسر', color: '#f59e0b' },
  { value: 'veneer', label: 'قشرة', color: '#ec4899' },
  { value: 'orthodontic', label: 'تقويم', color: '#6366f1' },
] as const

export type TreatmentType = typeof TREATMENT_TYPES[number]['value']

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
