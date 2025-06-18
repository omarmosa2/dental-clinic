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
          const success = await window.electronAPI.patients.delete(id)

          if (success) {
            const { patients, selectedPatient } = get()
            const updatedPatients = patients.filter(p => p.id !== id)

            set({
              patients: updatedPatients,
              selectedPatient: selectedPatient?.id === id ? null : selectedPatient,
              isLoading: false
            })

            // Update filtered patients
            get().filterPatients()
          } else {
            throw new Error('Failed to delete patient')
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete patient',
            isLoading: false
          })
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
          patient.first_name.toLowerCase().includes(query) ||
          patient.last_name.toLowerCase().includes(query) ||
          patient.phone?.toLowerCase().includes(query) ||
          patient.email?.toLowerCase().includes(query)
        )

        set({ filteredPatients: filtered })
      }
    }),
    {
      name: 'patient-store',
    }
  )
)
