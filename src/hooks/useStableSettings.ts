import { useEffect, useState, useRef } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import type { ClinicSettings } from '../types'

/**
 * Hook لضمان استقرار الإعدادات وعدم اختفائها أثناء تغيير الثيم
 * يحتفظ بنسخة مستقرة من الإعدادات ويمنع الوميض أو الاختفاء المؤقت
 */
export function useStableSettings() {
  const { settings, isLoading, loadSettings } = useSettingsStore()
  const [stableSettings, setStableSettings] = useState<ClinicSettings | null>(null)
  const lastValidSettings = useRef<ClinicSettings | null>(null)
  const isInitialized = useRef(false)

  // تحديث الإعدادات المستقرة عند تغيير الإعدادات الأصلية
  useEffect(() => {
    if (settings && settings.clinic_name && settings.clinic_name !== 'عيادة الأسنان') {
      // حفظ الإعدادات الصالحة
      lastValidSettings.current = settings
      setStableSettings(settings)
      isInitialized.current = true
    } else if (!isInitialized.current && !isLoading) {
      // محاولة استعادة من النسخة الاحتياطية في Local Storage
      try {
        const backupStr = localStorage.getItem('dental-clinic-settings-backup')
        if (backupStr) {
          const backup = JSON.parse(backupStr)
          if (backup.clinic_name && backup.clinic_name !== 'عيادة الأسنان') {
            setStableSettings(backup as ClinicSettings)
            lastValidSettings.current = backup as ClinicSettings
          }
        }
      } catch (error) {
        console.warn('Failed to restore settings from backup:', error)
      }
      isInitialized.current = true
    }
  }, [settings, isLoading])

  // تحميل الإعدادات عند التهيئة إذا لم تكن موجودة
  useEffect(() => {
    if (!settings && !isLoading && !stableSettings) {
      loadSettings()
    }
  }, [settings, isLoading, stableSettings, loadSettings])

  // إرجاع الإعدادات المستقرة أو آخر إعدادات صالحة
  const finalSettings = stableSettings || lastValidSettings.current

  return {
    settings: finalSettings,
    isLoading: isLoading && !finalSettings, // إخفاء loading إذا كانت لدينا إعدادات مستقرة
    hasValidSettings: Boolean(finalSettings && finalSettings.clinic_name && finalSettings.clinic_name !== 'عيادة الأسنان'),
    refreshSettings: loadSettings
  }
}

/**
 * Hook للحصول على قيم محددة من الإعدادات مع ضمان الاستقرار
 */
export function useStableSettingsValue<T>(
  selector: (settings: ClinicSettings | null) => T,
  fallback: T
): T {
  const { settings } = useStableSettings()
  
  try {
    return settings ? selector(settings) : fallback
  } catch (error) {
    console.warn('Error selecting settings value:', error)
    return fallback
  }
}

/**
 * Hook للحصول على اسم العيادة مع ضمان الاستقرار
 */
export function useStableClinicName(): string {
  return useStableSettingsValue(
    (settings) => settings?.clinic_name || 'عيادة الأسنان',
    'عيادة الأسنان'
  )
}

/**
 * Hook للحصول على اسم الدكتور مع ضمان الاستقرار
 */
export function useStableDoctorName(): string {
  return useStableSettingsValue(
    (settings) => settings?.doctor_name || 'د. محمد أحمد',
    'د. محمد أحمد'
  )
}

/**
 * Hook للحصول على شعار العيادة مع ضمان الاستقرار
 */
export function useStableClinicLogo(): string {
  return useStableSettingsValue(
    (settings) => settings?.clinic_logo || '',
    ''
  )
}

/**
 * Hook للحصول على معلومات الاتصال مع ضمان الاستقرار
 */
export function useStableContactInfo() {
  const { settings } = useStableSettings()
  
  return {
    phone: settings?.clinic_phone || '',
    email: settings?.clinic_email || '',
    address: settings?.clinic_address || ''
  }
}
