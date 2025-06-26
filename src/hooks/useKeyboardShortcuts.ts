import { useEffect } from 'react'
import { enhanceKeyboardEvent, matchesShortcut } from '@/utils/arabicKeyboardMapping'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  action: () => void
  description: string
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Hook لإدارة اختصارات لوحة المفاتيح
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان المستخدم يكتب في input أو textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      // استخدام الدالة المحسنة لمعالجة أحداث لوحة المفاتيح
      const enhanced = enhanceKeyboardEvent(event)

      // البحث عن الاختصار المطابق مع دعم الأحرف العربية
      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          matchesShortcut(enhanced.originalKey, shortcut.key) &&
          !!shortcut.ctrlKey === enhanced.ctrlKey &&
          !!shortcut.altKey === enhanced.altKey &&
          !!shortcut.shiftKey === enhanced.shiftKey
        )
      })

      if (matchingShortcut) {
        enhanced.preventDefault()
        matchingShortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])

  return {
    shortcuts: shortcuts.map(shortcut => ({
      ...shortcut,
      displayKey: formatShortcutDisplay(shortcut)
    }))
  }
}

/**
 * تنسيق عرض الاختصار
 */
function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  // إذا كان الاختصار يحتوي على مفاتيح تحكم، عرضها
  if (shortcut.ctrlKey || shortcut.altKey || shortcut.shiftKey) {
    const parts: string[] = []

    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.altKey) parts.push('Alt')
    if (shortcut.shiftKey) parts.push('Shift')

    parts.push(shortcut.key.toUpperCase())

    return parts.join('+')
  }

  // إذا كان مفتاح واحد فقط، عرضه بدون إضافات
  return shortcut.key.toUpperCase()
}

/**
 * اختصارات النظام الافتراضية
 */
export const defaultShortcuts = {


  // التنقل (0-9) - اختصارات الأرقام
  dashboard: {
    key: '0',
    description: 'لوحة التحكم',
    arabicKey: '٠',
    category: 'تنقل'
  },

  patients: {
    key: '1',
    description: 'المرضى',
    arabicKey: '١',
    category: 'تنقل'
  },

  appointments: {
    key: '2',
    description: 'المواعيد',
    arabicKey: '٢',
    category: 'تنقل'
  },

  payments: {
    key: '3',
    description: 'الدفعات',
    arabicKey: '٣',
    category: 'تنقل'
  },

  inventory: {
    key: '4',
    description: 'المخزون',
    arabicKey: '٤',
    category: 'تنقل'
  },

  labs: {
    key: '5',
    description: 'المختبرات',
    arabicKey: '٥',
    category: 'تنقل'
  },

  medications: {
    key: '6',
    description: 'الأدوية والوصفات',
    arabicKey: '٦',
    category: 'تنقل'
  },

  treatments: {
    key: '7',
    description: 'العلاجات السنية',
    arabicKey: '٧',
    category: 'تنقل'
  },

  clinicNeeds: {
    key: '8',
    description: 'احتياجات العيادة',
    arabicKey: '٨',
    category: 'تنقل'
  },

  reports: {
    key: '9',
    description: 'التقارير',
    arabicKey: '٩',
    category: 'تنقل'
  },

  // إضافة جديد - اختصارات ASD
  newPatient: {
    key: 'a',
    description: 'مريض جديد',
    arabicKey: 'ش',
    category: 'إضافة'
  },

  newAppointment: {
    key: 's',
    description: 'موعد جديد',
    arabicKey: 'س',
    category: 'إضافة'
  },

  newPayment: {
    key: 'd',
    description: 'دفعة جديدة',
    arabicKey: 'ي',
    category: 'إضافة'
  },

  // عمليات عامة
  refresh: {
    key: 'r',
    description: 'تحديث',
    arabicKey: 'ق',
    category: 'عمليات'
  },

  escape: {
    key: 'Escape',
    description: 'إغلاق',
    arabicKey: 'Escape',
    category: 'عمليات'
  },

  settings: {
    key: 'F1',
    description: 'الإعدادات',
    arabicKey: 'F1',
    category: 'عمليات'
  },

  search: {
    key: 'f',
    description: 'بحث في الصفحة',
    arabicKey: 'ب',
    category: 'بحث'
  }
}

/**
 * Hook للاختصارات الافتراضية للنظام
 */
export function useSystemShortcuts({
  onNavigateToDashboard,
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToInventory,
  onNavigateToLabs,
  onNavigateToMedications,
  onNavigateToTreatments,
  onNavigateToClinicNeeds,
  onNavigateToReports,
  onNavigateToSettings,
  onNewPatient,
  onNewAppointment,
  onNewPayment,
  onRefresh,
  enabled = true
}: {
  onNavigateToDashboard?: () => void
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToInventory?: () => void
  onNavigateToLabs?: () => void
  onNavigateToMedications?: () => void
  onNavigateToTreatments?: () => void
  onNavigateToClinicNeeds?: () => void
  onNavigateToReports?: () => void
  onNavigateToSettings?: () => void
  onNewPatient?: () => void
  onNewAppointment?: () => void
  onNewPayment?: () => void
  onRefresh?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = [


    // التنقل
    ...(onNavigateToDashboard ? [{
      ...defaultShortcuts.dashboard,
      action: onNavigateToDashboard
    }] : []),

    ...(onNavigateToPatients ? [{
      ...defaultShortcuts.patients,
      action: onNavigateToPatients
    }] : []),

    ...(onNavigateToAppointments ? [{
      ...defaultShortcuts.appointments,
      action: onNavigateToAppointments
    }] : []),

    ...(onNavigateToPayments ? [{
      ...defaultShortcuts.payments,
      action: onNavigateToPayments
    }] : []),

    ...(onNavigateToInventory ? [{
      ...defaultShortcuts.inventory,
      action: onNavigateToInventory
    }] : []),

    ...(onNavigateToLabs ? [{
      ...defaultShortcuts.labs,
      action: onNavigateToLabs
    }] : []),

    ...(onNavigateToMedications ? [{
      ...defaultShortcuts.medications,
      action: onNavigateToMedications
    }] : []),

    ...(onNavigateToTreatments ? [{
      ...defaultShortcuts.treatments,
      action: onNavigateToTreatments
    }] : []),

    ...(onNavigateToClinicNeeds ? [{
      ...defaultShortcuts.clinicNeeds,
      action: onNavigateToClinicNeeds
    }] : []),

    ...(onNavigateToReports ? [{
      ...defaultShortcuts.reports,
      action: onNavigateToReports
    }] : []),

    // الإعدادات
    ...(onNavigateToSettings ? [{
      ...defaultShortcuts.settings,
      action: onNavigateToSettings
    }] : []),

    // إضافة جديد
    ...(onNewPatient ? [{
      ...defaultShortcuts.newPatient,
      action: onNewPatient
    }] : []),

    ...(onNewAppointment ? [{
      ...defaultShortcuts.newAppointment,
      action: onNewAppointment
    }] : []),

    ...(onNewPayment ? [{
      ...defaultShortcuts.newPayment,
      action: onNewPayment
    }] : []),

    // عمليات عامة
    ...(onRefresh ? [{
      ...defaultShortcuts.refresh,
      action: onRefresh
    }] : []),


  ]

  return useKeyboardShortcuts({ shortcuts, enabled })
}

/**
 * Hook لعرض مساعدة الاختصارات
 */
export function useShortcutsHelp() {
  const allShortcuts = Object.entries(defaultShortcuts).map(([key, shortcut]) => ({
    id: key,
    key: shortcut.key,
    description: shortcut.description,
    arabicKey: shortcut.arabicKey,
    category: shortcut.category,
    displayKey: `${shortcut.key.toUpperCase()}${shortcut.arabicKey ? ` / ${shortcut.arabicKey}` : ''}`
  }))

  const groupedShortcuts = {
    تنقل: allShortcuts.filter(s => s.category === 'تنقل'),
    إضافة: allShortcuts.filter(s => s.category === 'إضافة'),
    بحث: allShortcuts.filter(s => s.category === 'بحث'),
    عمليات: allShortcuts.filter(s => s.category === 'عمليات'),
    مساعدة: allShortcuts.filter(s => s.category === 'مساعدة')
  }

  return {
    allShortcuts,
    groupedShortcuts
  }
}
