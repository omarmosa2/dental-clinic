import { create } from 'zustand'
import { DentalTreatment, DentalTreatmentImage, DentalTreatmentPrescription } from '@/types'

interface DentalTreatmentState {
  treatments: DentalTreatment[]
  images: DentalTreatmentImage[]
  prescriptions: DentalTreatmentPrescription[]
  isLoading: boolean
  error: string | null
  selectedPatientId: string | null
  selectedToothNumber: number | null

  // Actions
  loadTreatments: () => Promise<void>
  loadTreatmentsByPatient: (patientId: string) => Promise<void>
  loadTreatmentsByTooth: (patientId: string, toothNumber: number) => Promise<void>
  createTreatment: (treatment: Omit<DentalTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<DentalTreatment>
  updateTreatment: (id: string, updates: Partial<DentalTreatment>) => Promise<void>
  deleteTreatment: (id: string) => Promise<void>

  // Image actions
  loadImages: () => Promise<void>
  loadImagesByTreatment: (treatmentId: string) => Promise<void>
  createImage: (image: Omit<DentalTreatmentImage, 'id' | 'created_at' | 'updated_at'>) => Promise<DentalTreatmentImage>
  deleteImage: (id: string) => Promise<void>
  refreshAllImages: () => Promise<void>
  clearImages: () => void

  // Prescription actions
  loadTreatmentPrescriptions: () => Promise<void>
  linkPrescription: (treatmentId: string, prescriptionId: string) => Promise<void>
  unlinkPrescription: (treatmentId: string, prescriptionId: string) => Promise<void>

  // Utility actions
  setSelectedPatient: (patientId: string | null) => void
  setSelectedTooth: (toothNumber: number | null) => void
  clearError: () => void
}

export const useDentalTreatmentStore = create<DentalTreatmentState>((set, get) => ({
  treatments: [],
  images: [],
  prescriptions: [],
  isLoading: false,
  error: null,
  selectedPatientId: null,
  selectedToothNumber: null,

  loadTreatments: async () => {
    set({ isLoading: true, error: null })
    try {
      const treatments = await window.electronAPI.dentalTreatments.getAll()
      set({ treatments, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load treatments',
        isLoading: false
      })
    }
  },

  loadTreatmentsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null })
    try {
      const treatments = await window.electronAPI.dentalTreatments.getByPatient(patientId)
      set({ treatments, isLoading: false, selectedPatientId: patientId })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load patient treatments',
        isLoading: false
      })
    }
  },

  loadTreatmentsByTooth: async (patientId: string, toothNumber: number) => {
    set({ isLoading: true, error: null })
    try {
      // Load all treatments for the patient, not just for one tooth
      const treatments = await window.electronAPI.dentalTreatments.getByPatient(patientId)
      set({
        treatments,
        isLoading: false,
        selectedPatientId: patientId,
        selectedToothNumber: toothNumber
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tooth treatments',
        isLoading: false
      })
    }
  },

  createTreatment: async (treatmentData) => {
    set({ isLoading: true, error: null })
    try {
      const newTreatment = await window.electronAPI.dentalTreatments.create(treatmentData)
      const { treatments, selectedPatientId } = get()

      // Add the new treatment to the local state
      set({
        treatments: [...treatments, newTreatment],
        isLoading: false
      })

      // Reload all treatments for the patient to ensure consistency
      if (selectedPatientId) {
        const refreshedTreatments = await window.electronAPI.dentalTreatments.getByPatient(selectedPatientId)
        set({ treatments: refreshedTreatments })
      }

      return newTreatment
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create treatment',
        isLoading: false
      })
      throw error
    }
  },

  updateTreatment: async (id: string, updates: Partial<DentalTreatment>) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.dentalTreatments.update(id, updates)
      const { treatments, selectedPatientId } = get()

      // Update the treatment in the local state
      const updatedTreatments = treatments.map(treatment =>
        treatment.id === id ? { ...treatment, ...updates, updated_at: new Date().toISOString() } : treatment
      )
      set({ treatments: updatedTreatments, isLoading: false })

      // Optionally reload all treatments for the patient to ensure consistency
      if (selectedPatientId) {
        const refreshedTreatments = await window.electronAPI.dentalTreatments.getByPatient(selectedPatientId)
        set({ treatments: refreshedTreatments })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update treatment',
        isLoading: false
      })
      throw error
    }
  },

  deleteTreatment: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.dentalTreatments.delete(id)
      const { treatments } = get()
      const filteredTreatments = treatments.filter(treatment => treatment.id !== id)
      set({ treatments: filteredTreatments, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete treatment',
        isLoading: false
      })
    }
  },

  loadImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getAll()
      set({ images, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load images',
        isLoading: false
      })
    }
  },

  loadImagesByTreatment: async (treatmentId: string) => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getByTreatment(treatmentId)
      set({ images, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load treatment images',
        isLoading: false
      })
    }
  },

  createImage: async (imageData) => {
    set({ isLoading: true, error: null })
    try {
      const newImage = await window.electronAPI.dentalTreatmentImages.create(imageData)
      const { images } = get()
      set({
        images: [...images, newImage],
        isLoading: false
      })
      return newImage
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create image',
        isLoading: false
      })
      throw error
    }
  },

  deleteImage: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.dentalTreatmentImages.delete(id)
      const { images } = get()
      const filteredImages = images.filter(image => image.id !== id)
      set({ images: filteredImages, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete image',
        isLoading: false
      })
    }
  },

  refreshAllImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getAll()
      set({ images, isLoading: false })
      console.log('✅ All images refreshed after backup restore')
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh images',
        isLoading: false
      })
    }
  },

  clearImages: () => {
    set({ images: [] })
  },

  loadTreatmentPrescriptions: async () => {
    set({ isLoading: true, error: null })
    try {
      const prescriptions = await window.electronAPI.dentalTreatmentPrescriptions.getAll()
      set({ prescriptions, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load treatment prescriptions',
        isLoading: false
      })
    }
  },

  linkPrescription: async (treatmentId: string, prescriptionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const link = await window.electronAPI.dentalTreatmentPrescriptions.create({
        dental_treatment_id: treatmentId,
        prescription_id: prescriptionId
      })
      const { prescriptions } = get()
      set({
        prescriptions: [...prescriptions, link],
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to link prescription',
        isLoading: false
      })
    }
  },

  unlinkPrescription: async (treatmentId: string, prescriptionId: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.dentalTreatmentPrescriptions.deleteByIds(treatmentId, prescriptionId)
      const { prescriptions } = get()
      const filteredPrescriptions = prescriptions.filter(
        p => !(p.dental_treatment_id === treatmentId && p.prescription_id === prescriptionId)
      )
      set({ prescriptions: filteredPrescriptions, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to unlink prescription',
        isLoading: false
      })
    }
  },

  setSelectedPatient: (patientId: string | null) => {
    set({ selectedPatientId: patientId })
  },

  setSelectedTooth: (toothNumber: number | null) => {
    set({ selectedToothNumber: toothNumber })
  },

  clearError: () => {
    set({ error: null })
  },
}))
