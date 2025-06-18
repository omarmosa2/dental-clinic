import { useEffect } from 'react'
import { usePatientStore } from '../store/patientStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { usePaymentStore } from '../store/paymentStore'
import { useDashboardStore } from '../store/dashboardStore'

/**
 * Custom hook for real-time data synchronization across all stores
 * Ensures that when data changes in one store, all related stores are updated
 */
export const useRealTimeSync = () => {
  const loadPatients = usePatientStore(state => state.loadPatients)
  const loadAppointments = useAppointmentStore(state => state.loadAppointments)
  const loadPayments = usePaymentStore(state => state.loadPayments)
  const refreshDashboardStats = useDashboardStore(state => state.refreshStats)

  useEffect(() => {
    // Listen for patient deletion events
    const handlePatientDeleted = async (event: CustomEvent) => {
      const { patientId, patientName } = event.detail
      
      console.log(`🔄 Real-time sync: Patient ${patientName} (${patientId}) deleted, updating all stores...`)
      
      // The individual stores will handle their own updates via their event listeners
      // This is just for additional coordination and logging
      
      // Optional: Force refresh dashboard stats after a short delay
      setTimeout(async () => {
        try {
          await refreshDashboardStats()
          console.log('📊 Dashboard stats refreshed via real-time sync')
        } catch (error) {
          console.error('Error refreshing dashboard stats:', error)
        }
      }, 200)
    }

    // Listen for appointment changes that might affect other stores
    const handleAppointmentChanged = async (event: CustomEvent) => {
      const { type, appointmentId } = event.detail
      
      console.log(`🔄 Real-time sync: Appointment ${type} (${appointmentId})`)
      
      // Refresh dashboard stats when appointments change
      setTimeout(async () => {
        try {
          await refreshDashboardStats()
        } catch (error) {
          console.error('Error refreshing dashboard stats after appointment change:', error)
        }
      }, 100)
    }

    // Listen for payment changes that might affect other stores
    const handlePaymentChanged = async (event: CustomEvent) => {
      const { type, paymentId } = event.detail
      
      console.log(`🔄 Real-time sync: Payment ${type} (${paymentId})`)
      
      // Refresh dashboard stats when payments change
      setTimeout(async () => {
        try {
          await refreshDashboardStats()
        } catch (error) {
          console.error('Error refreshing dashboard stats after payment change:', error)
        }
      }, 100)
    }

    // Add event listeners
    window.addEventListener('patient-deleted', handlePatientDeleted as EventListener)
    window.addEventListener('appointment-changed', handleAppointmentChanged as EventListener)
    window.addEventListener('payment-changed', handlePaymentChanged as EventListener)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('patient-deleted', handlePatientDeleted as EventListener)
      window.removeEventListener('appointment-changed', handleAppointmentChanged as EventListener)
      window.removeEventListener('payment-changed', handlePaymentChanged as EventListener)
    }
  }, [refreshDashboardStats])

  // Return functions for manual synchronization if needed
  return {
    syncAll: async () => {
      console.log('🔄 Manual sync: Refreshing all stores...')
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadPayments(),
          refreshDashboardStats()
        ])
        console.log('✅ Manual sync completed successfully')
      } catch (error) {
        console.error('❌ Manual sync failed:', error)
      }
    },
    
    syncAfterPatientDeletion: async (patientId: string, patientName: string) => {
      console.log(`🔄 Sync after patient deletion: ${patientName} (${patientId})`)
      
      // Emit custom event to trigger all store updates
      window.dispatchEvent(new CustomEvent('patient-deleted', {
        detail: { patientId, patientName }
      }))
      
      // Additional manual refresh as backup
      setTimeout(async () => {
        try {
          await refreshDashboardStats()
        } catch (error) {
          console.error('Error in backup sync after patient deletion:', error)
        }
      }, 300)
    }
  }
}

/**
 * Hook for components that need to trigger data refresh
 */
export const useDataRefresh = () => {
  const loadPatients = usePatientStore(state => state.loadPatients)
  const loadAppointments = useAppointmentStore(state => state.loadAppointments)
  const loadPayments = usePaymentStore(state => state.loadPayments)
  const loadDashboardStats = useDashboardStore(state => state.loadStats)

  return {
    refreshPatients: loadPatients,
    refreshAppointments: loadAppointments,
    refreshPayments: loadPayments,
    refreshDashboard: loadDashboardStats,
    refreshAll: async () => {
      await Promise.all([
        loadPatients(),
        loadAppointments(),
        loadPayments(),
        loadDashboardStats()
      ])
    }
  }
}
