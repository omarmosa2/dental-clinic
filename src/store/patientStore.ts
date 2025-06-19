import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Patient } from '../types'

interface PatientState {
  patients: Patient[]
  selectedPatient: Patient | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filteredPatients: Patient[]
}

interface PatientActions {
  // Data operations
  loadPatients: () => Promise<void>
  createPatient: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>
  deletePatient: (id: string) => Promise<void>

  // UI state
  setSelectedPatient: (patient: Patient | null) => void
  setSearchQuery: (query: string) => void
  clearError: () => void

  // Search and filter
  searchPatients: (query: string) => Promise<void>
  filterPatients: () => void

  // Patient-related data
  getPatientAppointments: (patientId: string) => Promise<any[]>
  getPatientPayments: (patientId: string) => Promise<any[]>
  getPatientStats: (patientId: string) => Promise<{
    totalAppointments: number
    completedAppointments: number
    totalPayments: number
    totalAmountPaid: number
    lastAppointment?: string
    lastPayment?: string
  }>
}

type PatientStore = PatientState & PatientActions

export const usePatientStore = create<PatientStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      patients: [],
      selectedPatient: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filteredPatients: [],

      // Data operations
      loadPatients: async () => {
        set({ isLoading: true, error: null })
        try {
          const patients = await window.electronAPI?.patients?.getAll() || []
          set({
            patients,
            filteredPatients: patients,
            isLoading: false
          })
        } catch (error) {
          console.error('Error loading patients:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load patients',
            isLoading: false
          })
        }
      },

      createPatient: async (patientData) => {
        set({ isLoading: true, error: null })
        try {
          const newPatient = await window.electronAPI.patients.create(patientData)
          const { patients } = get()
          const updatedPatients = [...patients, newPatient]

          set({
            patients: updatedPatients,
            isLoading: false
          })

          // Update filtered patients if there's a search query
          get().filterPatients()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create patient',
            isLoading: false
          })
        }
      },

      updatePatient: async (id, patientData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedPatient = await window.electronAPI.patients.update(id, patientData)
          const { patients, selectedPatient } = get()

          const updatedPatients = patients.map(p =>
            p.id === id ? updatedPatient : p
          )

          set({
            patients: updatedPatients,
            selectedPatient: selectedPatient?.id === id ? updatedPatient : selectedPatient,
            isLoading: false
          })

          // Update filtered patients
          get().filterPatients()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update patient',
            isLoading: false
          })
        }
      },

      deletePatient: async (id) => {
        set({ isLoading: true, error: null })
        try {
          // Get patient info before deletion for notifications
          const { patients, selectedPatient } = get()
          const patientToDelete = patients.find(p => p.id === id)

          const success = await window.electronAPI.patients.delete(id)

          if (success) {
            const updatedPatients = patients.filter(p => p.id !== id)

            set({
              patients: updatedPatients,
              selectedPatient: selectedPatient?.id === id ? null : selectedPatient,
              isLoading: false
            })

            // Update filtered patients immediately
            get().filterPatients()

            // Notify other stores about patient deletion for real-time sync
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('patient-deleted', {
                detail: {
                  patientId: id,
                  patientName: patientToDelete ? patientToDelete.full_name : 'Unknown Patient'
                }
              }))
            }

            return { success: true, patientName: patientToDelete ? patientToDelete.full_name : 'Unknown Patient' }
          } else {
            throw new Error('Failed to delete patient')
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete patient',
            isLoading: false
          })
          throw error
        }
      },

      // UI state management
      setSelectedPatient: (patient) => {
        set({ selectedPatient: patient })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterPatients()
      },

      clearError: () => {
        set({ error: null })
      },

      // Search functionality
      searchPatients: async (query) => {
        set({ isLoading: true, error: null })
        try {
          if (query.trim() === '') {
            // If empty query, show all patients
            const { patients } = get()
            set({
              filteredPatients: patients,
              searchQuery: query,
              isLoading: false
            })
          } else {
            // Search using the database search function
            const searchResults = await window.electronAPI.patients.search(query)
            set({
              filteredPatients: searchResults,
              searchQuery: query,
              isLoading: false
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Search failed',
            isLoading: false
          })
        }
      },

      // Local filtering (for real-time search)
      filterPatients: () => {
        const { patients, searchQuery } = get()

        if (searchQuery.trim() === '') {
          set({ filteredPatients: patients })
          return
        }

        const query = searchQuery.toLowerCase()
        const filtered = patients.filter(patient =>
          patient.full_name.toLowerCase().includes(query) ||
          patient.phone?.toLowerCase().includes(query) ||
          patient.email?.toLowerCase().includes(query) ||
          patient.serial_number?.toLowerCase().includes(query)
        )

        set({ filteredPatients: filtered })
      },

      // Patient-related data methods
      getPatientAppointments: async (patientId: string) => {
        try {
          const appointments = await window.electronAPI?.appointments?.getByPatient?.(patientId) || []
          return appointments
        } catch (error) {
          console.error('Error fetching patient appointments:', error)
          return []
        }
      },

      getPatientPayments: async (patientId: string) => {
        try {
          const payments = await window.electronAPI?.payments?.getByPatient?.(patientId) || []
          return payments
        } catch (error) {
          console.error('Error fetching patient payments:', error)
          return []
        }
      },

      getPatientStats: async (patientId: string) => {
        try {
          const [appointments, payments] = await Promise.all([
            get().getPatientAppointments(patientId),
            get().getPatientPayments(patientId)
          ])

          const totalAppointments = appointments.length
          const completedAppointments = appointments.filter((apt: any) => apt.status === 'completed').length
          const totalPayments = payments.length
          const totalAmountPaid = payments
            .filter((payment: any) => payment.status === 'completed')
            .reduce((sum: number, payment: any) => sum + payment.amount, 0)

          const lastAppointment = appointments.length > 0
            ? appointments.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time
            : undefined

          const lastPayment = payments.length > 0
            ? payments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0].payment_date
            : undefined

          return {
            totalAppointments,
            completedAppointments,
            totalPayments,
            totalAmountPaid,
            lastAppointment,
            lastPayment
          }
        } catch (error) {
          console.error('Error calculating patient stats:', error)
          return {
            totalAppointments: 0,
            completedAppointments: 0,
            totalPayments: 0,
            totalAmountPaid: 0
          }
        }
      }
    }),
    {
      name: 'patient-store',
    }
  )
)
