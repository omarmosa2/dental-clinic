import { create } from 'zustand'
import { mockDataService } from '../services/mockDataService'
import type { Appointment } from '../types'

interface AppointmentState {
  appointments: Appointment[]
  isLoading: boolean
  error: string | null
  loadAppointments: () => Promise<void>
  createAppointment: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<Appointment>
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment | null>
  deleteAppointment: (id: string) => Promise<boolean>
  getAppointmentById: (id: string) => Appointment | undefined
  getAppointmentsByDate: (date: string) => Appointment[]
  getAppointmentsByPatient: (patientId: string) => Appointment[]
}

export const useAppointmentStoreDemo = create<AppointmentState>((set, get) => ({
  appointments: [],
  isLoading: false,
  error: null,

  loadAppointments: async () => {
    set({ isLoading: true, error: null })
    try {
      const appointments = await mockDataService.getAllAppointments()
      set({ appointments, isLoading: false })
    } catch (error) {
      console.error('Error loading appointments:', error)
      set({ error: 'Failed to load appointments', isLoading: false })
    }
  },

  createAppointment: async (appointmentData) => {
    set({ isLoading: true, error: null })
    try {
      const newAppointment = await mockDataService.createAppointment(appointmentData)
      set(state => ({
        appointments: [...state.appointments, newAppointment],
        isLoading: false
      }))
      return newAppointment
    } catch (error) {
      console.error('Error creating appointment:', error)
      set({ error: 'Failed to create appointment', isLoading: false })
      throw error
    }
  },

  updateAppointment: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedAppointment = await mockDataService.updateAppointment(id, updates)
      if (updatedAppointment) {
        set(state => ({
          appointments: state.appointments.map(a => a.id === id ? updatedAppointment : a),
          isLoading: false
        }))
      }
      return updatedAppointment
    } catch (error) {
      console.error('Error updating appointment:', error)
      set({ error: 'Failed to update appointment', isLoading: false })
      return null
    }
  },

  deleteAppointment: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const success = await mockDataService.deleteAppointment(id)
      if (success) {
        set(state => ({
          appointments: state.appointments.filter(a => a.id !== id),
          isLoading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting appointment:', error)
      set({ error: 'Failed to delete appointment', isLoading: false })
      return false
    }
  },

  getAppointmentById: (id) => {
    return get().appointments.find(a => a.id === id)
  },

  getAppointmentsByDate: (date) => {
    return get().appointments.filter(a => a.appointment_date === date)
  },

  getAppointmentsByPatient: (patientId) => {
    return get().appointments.filter(a => a.patient_id === patientId)
  }
}))
