import { create } from 'zustand'
import { mockDataService } from '../services/mockDataService'
import type { ClinicSettings } from '../types'

interface SettingsState {
  settings: ClinicSettings | null
  isLoading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<ClinicSettings>) => Promise<ClinicSettings | null>
}

export const useSettingsStoreDemo = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const settings = await mockDataService.getSettings()
      set({ settings, isLoading: false })
    } catch (error) {
      console.error('Error loading settings:', error)
      set({ error: 'Failed to load settings', isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedSettings = await mockDataService.updateSettings(updates)
      set({ settings: updatedSettings, isLoading: false })
      return updatedSettings
    } catch (error) {
      console.error('Error updating settings:', error)
      set({ error: 'Failed to update settings', isLoading: false })
      return null
    }
  }
}))
