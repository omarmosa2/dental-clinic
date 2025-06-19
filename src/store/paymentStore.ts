import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Payment } from '../types'

interface PaymentState {
  payments: Payment[]
  filteredPayments: Payment[]
  selectedPayment: Payment | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  paymentMethodFilter: string
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  totalRemainingBalance: number
  partialPaymentsCount: number
  monthlyRevenue: { [key: string]: number }
  paymentMethodStats: { [key: string]: number }
}

interface PaymentActions {
  // Data operations
  loadPayments: () => Promise<void>
  createPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  searchPayments: (query: string) => void

  // UI state
  setSelectedPayment: (payment: Payment | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setPaymentMethodFilter: (method: string) => void
  filterPayments: () => void
  clearError: () => void

  // Analytics
  calculateTotalRevenue: () => void
  calculatePendingAmount: () => void
  calculateOverdueAmount: () => void
  calculateTotalRemainingBalance: () => void
  calculatePartialPaymentsCount: () => void
  calculateMonthlyRevenue: () => void
  calculatePaymentMethodStats: () => void
  getPaymentsByPatient: (patientId: string) => Payment[]
  getPaymentsByAppointment: (appointmentId: string) => Payment[]
  getPaymentsByDateRange: (startDate: Date, endDate: Date) => Payment[]

  // Payment status operations
  markAsCompleted: (id: string) => Promise<void>
  markAsPending: (id: string) => Promise<void>
  markAsFailed: (id: string) => Promise<void>
  markAsRefunded: (id: string) => Promise<void>
}

type PaymentStore = PaymentState & PaymentActions

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    (set, get) => {
      // Listen for patient deletion events to update payments
      if (typeof window !== 'undefined') {
        window.addEventListener('patient-deleted', (event: any) => {
          const { patientId } = event.detail
          const { payments, selectedPayment } = get()

          // Remove payments for deleted patient
          const updatedPayments = payments.filter(p => p.patient_id !== patientId)

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.patient_id === patientId ? null : selectedPayment
          })

          // Recalculate all analytics immediately
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateOverdueAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()

          console.log(`💰 Removed ${payments.length - updatedPayments.length} payments for deleted patient ${patientId}`)
        })
      }

      return {
        // Initial state
        payments: [],
        filteredPayments: [],
        selectedPayment: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        statusFilter: 'all',
        paymentMethodFilter: 'all',
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        totalRemainingBalance: 0,
        partialPaymentsCount: 0,
        monthlyRevenue: {},
        paymentMethodStats: {},

      // Data operations
      loadPayments: async () => {
        set({ isLoading: true, error: null })
        try {
          const payments = await window.electronAPI.payments.getAll()
          set({
            payments,
            filteredPayments: payments, // Initialize filtered payments with all payments
            isLoading: false
          })

          // Calculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateOverdueAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load payments',
            isLoading: false
          })
        }
      },

      createPayment: async (paymentData) => {
        set({ isLoading: true, error: null })
        try {
          const newPayment = await window.electronAPI.payments.create(paymentData)
          const { payments } = get()
          const updatedPayments = [...payments, newPayment]

          set({
            payments: updatedPayments,
            isLoading: false
          })

          // Recalculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateOverdueAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create payment',
            isLoading: false
          })
        }
      },

      updatePayment: async (id, paymentData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedPayment = await window.electronAPI.payments.update(id, paymentData)
          const { payments, selectedPayment } = get()

          const updatedPayments = payments.map(p =>
            p.id === id ? updatedPayment : p
          )

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.id === id ? updatedPayment : selectedPayment,
            isLoading: false
          })

          // Recalculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateOverdueAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update payment',
            isLoading: false
          })
        }
      },

      deletePayment: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await window.electronAPI.payments.delete(id)
          const { payments, selectedPayment } = get()

          const updatedPayments = payments.filter(p => p.id !== id)

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.id === id ? null : selectedPayment,
            isLoading: false
          })

          // Recalculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateOverdueAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete payment',
            isLoading: false
          })
        }
      },

      searchPayments: (query) => {
        set({ searchQuery: query })
        get().filterPayments()
      },

      // UI state management
      setSelectedPayment: (payment) => {
        set({ selectedPayment: payment })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterPayments()
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status })
        get().filterPayments()
      },

      setPaymentMethodFilter: (method) => {
        set({ paymentMethodFilter: method })
        get().filterPayments()
      },

      filterPayments: () => {
        const { payments, searchQuery, statusFilter, paymentMethodFilter } = get()

        let filtered = payments

        // Apply search filter
        if (searchQuery) {
          filtered = filtered.filter(payment => {
            const patientName = payment.patient ?
              `${payment.patient.first_name} ${payment.patient.last_name}` : ''

            return (
              payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.amount.toString().includes(searchQuery) ||
              payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.status.toLowerCase().includes(searchQuery.toLowerCase())
            )
          })
        }

        // Apply status filter
        if (statusFilter !== 'all') {
          filtered = filtered.filter(payment => payment.status === statusFilter)
        }

        // Apply payment method filter
        if (paymentMethodFilter !== 'all') {
          filtered = filtered.filter(payment => payment.payment_method === paymentMethodFilter)
        }

        set({ filteredPayments: filtered })
      },

      clearError: () => {
        set({ error: null })
      },

      // Analytics
      calculateTotalRevenue: () => {
        const { payments } = get()
        const total = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, payment) => sum + payment.amount, 0)

        set({ totalRevenue: total })
      },

      calculatePendingAmount: () => {
        const { payments } = get()
        const pending = payments
          .filter(p => p.status === 'pending')
          .reduce((sum, payment) => sum + payment.amount, 0)

        set({ pendingAmount: pending })
      },

      calculateOverdueAmount: () => {
        const { payments } = get()
        const overdue = payments
          .filter(p => p.status === 'overdue')
          .reduce((sum, payment) => sum + payment.amount, 0)

        set({ overdueAmount: overdue })
      },

      calculateTotalRemainingBalance: () => {
        const { payments } = get()
        const totalRemaining = payments
          .reduce((sum, payment) => sum + (payment.remaining_balance || 0), 0)

        set({ totalRemainingBalance: totalRemaining })
      },

      calculatePartialPaymentsCount: () => {
        const { payments } = get()
        const partialCount = payments.filter(p => p.status === 'partial').length

        set({ partialPaymentsCount: partialCount })
      },

      calculateMonthlyRevenue: () => {
        const { payments } = get()
        const monthlyData: { [key: string]: number } = {}

        payments
          .filter(p => p.status === 'completed')
          .forEach(payment => {
            const month = new Date(payment.payment_date).toISOString().slice(0, 7) // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + payment.amount
          })

        set({ monthlyRevenue: monthlyData })
      },

      calculatePaymentMethodStats: () => {
        const { payments } = get()
        const methodStats: { [key: string]: number } = {}

        payments
          .filter(p => p.status === 'completed')
          .forEach(payment => {
            methodStats[payment.payment_method] = (methodStats[payment.payment_method] || 0) + payment.amount
          })

        set({ paymentMethodStats: methodStats })
      },

      getPaymentsByPatient: (patientId) => {
        const { payments } = get()
        return payments.filter(p => p.patient_id === patientId)
      },

      getPaymentsByAppointment: (appointmentId) => {
        const { payments } = get()
        return payments.filter(p => p.appointment_id === appointmentId)
      },

      getPaymentsByDateRange: (startDate, endDate) => {
        const { payments } = get()

        return payments.filter(payment => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate >= startDate && paymentDate <= endDate
        })
      },

      // Payment status operations
      markAsCompleted: async (id) => {
        await get().updatePayment(id, { status: 'completed' })
      },

      markAsPending: async (id) => {
        await get().updatePayment(id, { status: 'pending' })
      },

      markAsFailed: async (id) => {
        await get().updatePayment(id, { status: 'failed' })
      },

      markAsRefunded: async (id) => {
        await get().updatePayment(id, { status: 'refunded' })
      }
      }
    },
    {
      name: 'payment-store',
    }
  )
)
