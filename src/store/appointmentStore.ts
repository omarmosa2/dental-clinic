import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Appointment, CalendarEvent } from '../types'

interface AppointmentState {
  appointments: Appointment[]
  selectedAppointment: Appointment | null
  isLoading: boolean
  error: string | null
  calendarView: 'month' | 'week' | 'day' | 'agenda'
  selectedDate: Date
  calendarEvents: CalendarEvent[]
}

interface AppointmentActions {
  // Data operations
  loadAppointments: () => Promise<void>
  createAppointment: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateAppointment: (id: string, appointment: Partial<Appointment>) => Promise<void>
  deleteAppointment: (id: string) => Promise<void>

  // UI state
  setSelectedAppointment: (appointment: Appointment | null) => void
  setCalendarView: (view: 'month' | 'week' | 'day' | 'agenda') => void
  setSelectedDate: (date: Date) => void
  clearError: () => void

  // Calendar operations
  convertToCalendarEvents: () => void
  getAppointmentsForDate: (date: Date) => Appointment[]
  getAppointmentsForDateRange: (startDate: Date, endDate: Date) => Appointment[]

  // Status operations
  markAsCompleted: (id: string) => Promise<void>
  markAsCancelled: (id: string) => Promise<void>
  markAsNoShow: (id: string) => Promise<void>
}

type AppointmentStore = AppointmentState & AppointmentActions

export const useAppointmentStore = create<AppointmentStore>()(
  devtools(
    (set, get) => {
      // Listen for patient deletion events to update appointments
      if (typeof window !== 'undefined') {
        window.addEventListener('patient-deleted', (event: any) => {
          const { patientId } = event.detail
          const { appointments, selectedAppointment } = get()

          // Remove appointments for deleted patient
          const updatedAppointments = appointments.filter(a => a.patient_id !== patientId)

          set({
            appointments: updatedAppointments,
            selectedAppointment: selectedAppointment?.patient_id === patientId ? null : selectedAppointment
          })

          // Update calendar events
          get().convertToCalendarEvents()

          console.log(`🗑️ Removed ${appointments.length - updatedAppointments.length} appointments for deleted patient ${patientId}`)
        })
      }

      return {
        // Initial state
        appointments: [],
        selectedAppointment: null,
        isLoading: false,
        error: null,
        calendarView: 'month',
        selectedDate: new Date(),
        calendarEvents: [],

      // Data operations
      loadAppointments: async () => {
        set({ isLoading: true, error: null })
        try {
          const appointments = await window.electronAPI.appointments.getAll()
          set({
            appointments,
            isLoading: false
          })

          // Convert to calendar events
          get().convertToCalendarEvents()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load appointments',
            isLoading: false
          })
        }
      },

      createAppointment: async (appointmentData) => {
        set({ isLoading: true, error: null })
        try {
          const newAppointment = await window.electronAPI.appointments.create(appointmentData)
          const { appointments } = get()
          const updatedAppointments = [...appointments, newAppointment]

          set({
            appointments: updatedAppointments,
            isLoading: false
          })

          // Update calendar events
          get().convertToCalendarEvents()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create appointment',
            isLoading: false
          })
        }
      },

      updateAppointment: async (id, appointmentData) => {
        set({ isLoading: true, error: null })
        try {
          const updatedAppointment = await window.electronAPI.appointments.update(id, appointmentData)
          const { appointments, selectedAppointment } = get()

          const updatedAppointments = appointments.map(a =>
            a.id === id ? updatedAppointment : a
          )

          set({
            appointments: updatedAppointments,
            selectedAppointment: selectedAppointment?.id === id ? updatedAppointment : selectedAppointment,
            isLoading: false
          })

          // Update calendar events
          get().convertToCalendarEvents()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update appointment',
            isLoading: false
          })
        }
      },

      deleteAppointment: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI.appointments.delete(id)

          if (success) {
            const { appointments, selectedAppointment } = get()
            const updatedAppointments = appointments.filter(a => a.id !== id)

            set({
              appointments: updatedAppointments,
              selectedAppointment: selectedAppointment?.id === id ? null : selectedAppointment,
              isLoading: false
            })

            // Update calendar events
            get().convertToCalendarEvents()
          } else {
            throw new Error('Failed to delete appointment')
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete appointment',
            isLoading: false
          })
        }
      },

      // UI state management
      setSelectedAppointment: (appointment) => {
        set({ selectedAppointment: appointment })
      },

      setCalendarView: (view) => {
        set({ calendarView: view })
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date })
      },

      clearError: () => {
        set({ error: null })
      },

      // Calendar operations
      convertToCalendarEvents: () => {
        const { appointments } = get()

        const events: CalendarEvent[] = appointments.map(appointment => ({
          id: appointment.id,
          title: appointment.title,
          start: new Date(appointment.start_time),
          end: new Date(appointment.end_time),
          resource: appointment
        }))

        set({ calendarEvents: events })
      },

      getAppointmentsForDate: (date) => {
        const { appointments } = get()
        const targetDate = date.toISOString().split('T')[0]

        return appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.start_time).toISOString().split('T')[0]
          return appointmentDate === targetDate
        })
      },

      getAppointmentsForDateRange: (startDate, endDate) => {
        const { appointments } = get()

        return appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.start_time)
          return appointmentDate >= startDate && appointmentDate <= endDate
        })
      },

      // Status operations
      markAsCompleted: async (id) => {
        await get().updateAppointment(id, { status: 'completed' })
      },

      markAsCancelled: async (id) => {
        await get().updateAppointment(id, { status: 'cancelled' })
      },

      markAsNoShow: async (id) => {
        await get().updateAppointment(id, { status: 'no_show' })
      }
      }
    },
    {
      name: 'appointment-store',
    }
  )
)
