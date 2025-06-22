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
