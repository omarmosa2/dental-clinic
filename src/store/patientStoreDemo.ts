import { create } from 'zustand'
import { mockDataService } from '../services/mockDataService'
import type { Patient } from '../types'

interface PatientState {
  patients: Patient[]
  isLoading: boolean
  error: string | null
  loadPatients: () => Promise<void>
  createPatient: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<Patient>
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient | null>
  deletePatient: (id: string) => Promise<boolean>
  getPatientById: (id: string) => Patient | undefined
  searchPatients: (query: string) => Patient[]
}

export const usePatientStoreDemo = create<PatientState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,

  loadPatients: async () => {
    set({ isLoading: true, error: null })
    try {
      const patients = await mockDataService.getAllPatients()
      set({ patients, isLoading: false })
    } catch (error) {
      console.error('Error loading patients:', error)
      set({ error: 'Failed to load patients', isLoading: false })
    }
  },

  createPatient: async (patientData) => {
    set({ isLoading: true, error: null })
    try {
      const newPatient = await mockDataService.createPatient(patientData)
      set(state => ({
        patients: [...state.patients, newPatient],
        isLoading: false
      }))
      return newPatient
    } catch (error) {
      console.error('Error creating patient:', error)
      set({ error: 'Failed to create patient', isLoading: false })
      throw error
    }
  },

  updatePatient: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedPatient = await mockDataService.updatePatient(id, updates)
      if (updatedPatient) {
        set(state => ({
          patients: state.patients.map(p => p.id === id ? updatedPatient : p),
          isLoading: false
        }))
      }
      return updatedPatient
    } catch (error) {
      console.error('Error updating patient:', error)
      set({ error: 'Failed to update patient', isLoading: false })
      return null
    }
  },

  deletePatient: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const success = await mockDataService.deletePatient(id)
      if (success) {
        set(state => ({
          patients: state.patients.filter(p => p.id !== id),
          isLoading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting patient:', error)
      set({ error: 'Failed to delete patient', isLoading: false })
      return false
    }
  },

  getPatientById: (id) => {
    return get().patients.find(p => p.id === id)
  },

  searchPatients: (query) => {
    const { patients } = get()
    if (!query.trim()) return patients
    
    const searchTerm = query.toLowerCase()
    return patients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchTerm) ||
      patient.serial_number.toLowerCase().includes(searchTerm) ||
      patient.phone?.toLowerCase().includes(searchTerm) ||
      patient.email?.toLowerCase().includes(searchTerm)
    )
  }
}))
