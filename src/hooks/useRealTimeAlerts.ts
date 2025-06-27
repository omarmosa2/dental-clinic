import { useEffect, useCallback } from 'react'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useGlobalStore } from '@/store/globalStore'

/**
 * Hook لإدارة التحديثات في الوقت الفعلي للتنبيهات
 * يضمن أن أي تعديل على التنبيهات يتم تحديثه فوراً في جميع أنحاء التطبيق
 */
export function useRealTimeAlerts() {
  const { loadAlerts } = useGlobalStore()

  // دالة لإعادة تحميل التنبيهات
  const refreshAlerts = useCallback(() => {
    console.log('🔄 Real-time alerts refresh triggered')
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    console.log('🔔 Setting up real-time alerts listeners...')

    // دالة معالجة تغيير البيانات
    const handleDataChanged = async (event?: any) => {
      console.log('📡 Data changed, refreshing alerts...', event?.type || 'unknown')

      // تأخير قصير للسماح للبيانات بالتحديث في قاعدة البيانات
      setTimeout(async () => {
        try {
          await refreshAlerts()
          console.log('✅ Alerts refreshed after data change')
        } catch (error) {
          console.error('❌ Error refreshing alerts after data change:', error)
        }
      }, 100)
    }

    // دوال معالجة الأحداث
    const handleAlertsChanged = () => {
      console.log('🔔 Alerts changed event received')
      refreshAlerts()
    }

    const handleAlertUpdated = (data: any) => {
      console.log('🔔 Alert updated event received:', data)
      refreshAlerts()
    }

    const handleAlertCreated = (data: any) => {
      console.log('🔔 Alert created event received:', data)
      refreshAlerts()
    }

    const handleAlertDeleted = (data: any) => {
      console.log('🔔 Alert deleted event received:', data)
      refreshAlerts()
    }

    // تسجيل المستمعين للأحداث المباشرة
    SmartAlertsService.addEventListener('alerts:changed', handleAlertsChanged)
    SmartAlertsService.addEventListener('alert:updated', handleAlertUpdated)
    SmartAlertsService.addEventListener('alert:created', handleAlertCreated)
    SmartAlertsService.addEventListener('alert:deleted', handleAlertDeleted)

    // تسجيل المستمعين لأحداث window
    window.addEventListener('alerts:alerts:changed', handleAlertsChanged)
    window.addEventListener('alerts:alert:updated', (e: any) => handleAlertUpdated(e.detail))
    window.addEventListener('alerts:alert:created', (e: any) => handleAlertCreated(e.detail))
    window.addEventListener('alerts:alert:deleted', (e: any) => handleAlertDeleted(e.detail))

    // أحداث تغيير البيانات للتوافق
    const dataChangeEvents = [
      'patient-added', 'patient-updated', 'patient-deleted', 'patient-changed',
      'appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed',
      'payment-added', 'payment-updated', 'payment-deleted', 'payment-changed',
      'treatment-added', 'treatment-updated', 'treatment-deleted', 'treatment-changed',
      'prescription-added', 'prescription-updated', 'prescription-deleted', 'prescription-changed',
      'inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed'
    ]

    // تسجيل المستمعين لأحداث تغيير البيانات
    dataChangeEvents.forEach(eventName => {
      window.addEventListener(eventName, handleDataChanged)
    })

    // دالة التنظيف
    return () => {
      console.log('🔔 Cleaning up real-time alerts listeners...')

      // إزالة مستمعي الأحداث المباشرة
      SmartAlertsService.removeEventListener('alerts:changed', handleAlertsChanged)
      SmartAlertsService.removeEventListener('alert:updated', handleAlertUpdated)
      SmartAlertsService.removeEventListener('alert:created', handleAlertCreated)
      SmartAlertsService.removeEventListener('alert:deleted', handleAlertDeleted)

      // إزالة مستمعي أحداث window
      window.removeEventListener('alerts:alerts:changed', handleAlertsChanged)
      window.removeEventListener('alerts:alert:updated', (e: any) => handleAlertUpdated(e.detail))
      window.removeEventListener('alerts:alert:created', (e: any) => handleAlertCreated(e.detail))
      window.removeEventListener('alerts:alert:deleted', (e: any) => handleAlertDeleted(e.detail))

      // إزالة مستمعي أحداث تغيير البيانات
      dataChangeEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleDataChanged)
      })
    }
  }, [refreshAlerts])

  return {
    refreshAlerts
  }
}

/**
 * Hook مبسط لاستخدام التحديثات في الوقت الفعلي
 * يمكن استخدامه في أي مكون يحتاج لمراقبة تغييرات التنبيهات
 */
export function useAlertUpdates() {
  const { alerts, unreadAlertsCount, loadAlerts } = useGlobalStore()

  // إعداد التحديثات في الوقت الفعلي
  useRealTimeAlerts()

  return {
    alerts,
    unreadAlertsCount,
    refreshAlerts: loadAlerts
  }
}

/**
 * Hook لمراقبة تنبيه محدد
 */
export function useAlertMonitor(alertId: string) {
  const { alerts } = useGlobalStore()

  // العثور على التنبيه المحدد
  const alert = alerts.find(a => a.id === alertId)

  useEffect(() => {
    if (!alertId) return

    const handleAlertUpdated = (data: any) => {
      if (data.alertId === alertId) {
        console.log(`🔔 Monitored alert ${alertId} updated:`, data.updates)
      }
    }

    const handleAlertDeleted = (data: any) => {
      if (data.alertId === alertId) {
        console.log(`🔔 Monitored alert ${alertId} deleted`)
      }
    }

    // تسجيل المستمعين
    SmartAlertsService.addEventListener('alert:updated', handleAlertUpdated)
    SmartAlertsService.addEventListener('alert:deleted', handleAlertDeleted)

    return () => {
      // تنظيف المستمعين
      SmartAlertsService.removeEventListener('alert:updated', handleAlertUpdated)
      SmartAlertsService.removeEventListener('alert:deleted', handleAlertDeleted)
    }
  }, [alertId])

  return alert
}
