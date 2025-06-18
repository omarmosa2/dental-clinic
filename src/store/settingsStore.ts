import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ClinicSettings } from '../types'

interface SettingsState {
  settings: ClinicSettings | null
  isLoading: boolean
  error: string | null
  isDarkMode: boolean
  language: string
  currency: string
}

interface SettingsActions {
  // Data operations
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<ClinicSettings>) => Promise<void>

  // UI preferences
  toggleDarkMode: () => void
  initializeDarkMode: () => void
  setLanguage: (language: string) => void
  setCurrency: (currency: string) => void

  // Error handling
  clearError: () => void

  // Getters
  getWorkingDays: () => string[]
  isWorkingDay: (date: Date) => boolean
  getWorkingHours: () => { start: string; end: string }
  isWithinWorkingHours: (time: string) => boolean
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: null,
        isLoading: false,
        error: null,
        isDarkMode: false,
        language: 'en',
        currency: 'SAR',

        // Data operations
        loadSettings: async () => {
          set({ isLoading: true, error: null })
          try {
            const settings = await window.electronAPI.settings.get()
            set({
              settings,
              language: settings?.language || 'ar',
              currency: settings?.currency || 'SAR',
              isLoading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load settings',
              isLoading: false
            })
          }
        },

        updateSettings: async (settingsData) => {
          set({ isLoading: true, error: null })
          try {
            const updatedSettings = await window.electronAPI.settings.update(settingsData)
            set({
              settings: updatedSettings,
              language: updatedSettings.language,
              currency: updatedSettings.currency,
              isLoading: false
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update settings',
              isLoading: false
            })
          }
        },

        // UI preferences
        toggleDarkMode: () => {
          const { isDarkMode } = get()
          const newDarkMode = !isDarkMode
          set({ isDarkMode: newDarkMode })

          // Apply dark mode to document
          if (newDarkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('dental-clinic-theme', 'dark')
          } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('dental-clinic-theme', 'light')
          }

          // Update settings in database if available
          try {
            get().updateSettings({ theme: newDarkMode ? 'dark' : 'light' })
          } catch (error) {
            console.warn('Failed to save theme preference to database:', error)
          }
        },

        // Initialize dark mode from stored preference
        initializeDarkMode: () => {
          const storedTheme = localStorage.getItem('dental-clinic-theme')
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const currentState = get()

          let shouldBeDark = false

          if (storedTheme) {
            shouldBeDark = storedTheme === 'dark'
          } else {
            shouldBeDark = systemPrefersDark
            // Save the system preference to localStorage
            localStorage.setItem('dental-clinic-theme', shouldBeDark ? 'dark' : 'light')
          }

          // Only update if different from current state
          if (shouldBeDark !== currentState.isDarkMode) {
            set({ isDarkMode: shouldBeDark })

            // Apply to document
            if (shouldBeDark) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }
        },

        setLanguage: (language) => {
          set({ language })
          // Update settings in database
          get().updateSettings({ language })
        },

        setCurrency: (currency) => {
          set({ currency })
          // Update settings in database
          get().updateSettings({ currency })
        },

        // Error handling
        clearError: () => {
          set({ error: null })
        },

        // Getters
        getWorkingDays: () => {
          const { settings } = get()
          if (!settings?.working_days) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          return settings.working_days.split(',').map(day => day.trim())
        },

        isWorkingDay: (date) => {
          const workingDays = get().getWorkingDays()
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const dayName = dayNames[date.getDay()]
          return workingDays.includes(dayName)
        },

        getWorkingHours: () => {
          const { settings } = get()
          return {
            start: settings?.working_hours_start || '09:00',
            end: settings?.working_hours_end || '17:00'
          }
        },

        isWithinWorkingHours: (time) => {
          const { start, end } = get().getWorkingHours()
          return time >= start && time <= end
        }
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          language: state.language,
          currency: state.currency
        })
      }
    ),
    {
      name: 'settings-store',
    }
  )
)
