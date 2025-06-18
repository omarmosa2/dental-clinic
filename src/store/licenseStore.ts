/**
 * License Store with Zustand
 * State management for license operations and status
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  LicenseStatus,
  LicenseInfo,
  LicenseActivationResponse,
  LicenseValidationResult
} from '../types/license'
import { licenseGuard } from '../services/licenseGuard'
import { licenseActivationService } from '../services/licenseActivationService'

interface LicenseState {
  // License data
  licenseInfo: LicenseInfo | null
  deviceInfo: any
  isActivated: boolean

  // UI state
  isLoading: boolean
  isActivating: boolean
  isValidating: boolean
  error: string | null

  // License status
  status: LicenseStatus
  canUseApp: boolean
  isExpiringSoon: boolean
  remainingDays: number | null

  // Dialogs
  showActivationDialog: boolean
  showLockScreen: boolean
}

interface LicenseActions {
  // Data operations
  loadLicenseInfo: () => Promise<void>
  activateLicense: (licenseKey: string) => Promise<LicenseActivationResponse>
  validateLicense: () => Promise<LicenseValidationResult>
  deactivateLicense: () => Promise<void>
  refreshLicense: () => Promise<void>

  // UI actions
  setShowActivationDialog: (show: boolean) => void
  setShowLockScreen: (show: boolean) => void
  clearError: () => void

  // Status checks
  checkLicenseStatus: () => Promise<void>
  shouldLockApplication: () => Promise<boolean>
  getLicenseWarning: () => Promise<string | null>
}

type LicenseStore = LicenseState & LicenseActions

export const useLicenseStore = create<LicenseStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      licenseInfo: null,
      deviceInfo: null,
      isActivated: false,
      isLoading: false,
      isActivating: false,
      isValidating: false,
      error: null,
      status: LicenseStatus.NOT_ACTIVATED,
      canUseApp: false,
      isExpiringSoon: false,
      remainingDays: null,
      showActivationDialog: false,
      showLockScreen: false,

      // Data operations
      loadLicenseInfo: async () => {
        set({ isLoading: true, error: null })
        try {
          const detailedInfo = await licenseGuard.getDetailedLicenseInfo()
          const statusInfo = await licenseGuard.getLicenseStatusForUI()

          set({
            licenseInfo: detailedInfo.licenseInfo,
            deviceInfo: detailedInfo.deviceInfo,
            isActivated: detailedInfo.isActivated,
            status: detailedInfo.validationResult.status,
            canUseApp: statusInfo.canUseApp,
            isExpiringSoon: detailedInfo.licenseInfo?.isExpiringSoon || false,
            remainingDays: detailedInfo.licenseInfo?.remainingDays || null,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to load license info:', error)
          set({
            error: `فشل في تحميل معلومات الترخيص: ${error}`,
            isLoading: false
          })
        }
      },

      activateLicense: async (licenseKey: string) => {
        set({ isActivating: true, error: null })
        try {
          const response = await licenseActivationService.activateLicenseFromKey(licenseKey)

          if (response.success) {
            // Reload license info after successful activation
            await get().loadLicenseInfo()
            set({
              isActivating: false,
              showActivationDialog: false
            })
          } else {
            set({
              error: response.error || 'فشل في تفعيل الترخيص',
              isActivating: false
            })
          }

          return response
        } catch (error) {
          const errorMessage = `خطأ في التفعيل: ${error}`
          set({
            error: errorMessage,
            isActivating: false
          })
          return {
            success: false,
            error: errorMessage,
            errorCode: 'ACTIVATION_ERROR'
          }
        }
      },

      validateLicense: async () => {
        set({ isValidating: true, error: null })
        try {
          const result = await licenseGuard.verifyLicense()

          set({
            status: result.status,
            canUseApp: result.canProceed,
            isExpiringSoon: result.isExpiringSoon,
            remainingDays: result.remainingDays || null,
            isValidating: false
          })

          return {
            isValid: result.canProceed,
            status: result.status,
            license: result.licenseInfo ? {
              licenseId: result.licenseInfo.licenseId,
              licenseType: result.licenseInfo.licenseType,
              maxDays: 0, // Not available in this context
              activatedAt: result.licenseInfo.activatedAt || '',
              expiresAt: result.licenseInfo.expiresAt || '',
              deviceFingerprint: {} as any, // Not exposed to UI
              signature: '',
              originalSignature: '',
              features: result.licenseInfo.features,
              metadata: {}
            } : undefined,
            error: result.error,
            remainingDays: result.remainingDays,
            expiresAt: result.licenseInfo?.expiresAt
          }
        } catch (error) {
          const errorMessage = `فشل في التحقق من الترخيص: ${error}`
          set({
            error: errorMessage,
            isValidating: false
          })
          return {
            isValid: false,
            status: LicenseStatus.INVALID,
            error: errorMessage
          }
        }
      },

      deactivateLicense: async () => {
        set({ isLoading: true, error: null })
        try {
          await licenseActivationService.resetActivation()

          // Reset state and immediately trigger system lockdown
          set({
            licenseInfo: null,
            isActivated: false,
            status: LicenseStatus.NOT_ACTIVATED,
            canUseApp: false,
            isExpiringSoon: false,
            remainingDays: null,
            showLockScreen: true, // Immediately show lock screen
            isLoading: false
          })

          // Force immediate license status check to ensure UI updates
          setTimeout(async () => {
            await get().checkLicenseStatus()
          }, 100)

          // Force page reload after a short delay to ensure complete lockdown
          setTimeout(() => {
            window.location.reload()
          }, 500)

        } catch (error) {
          set({
            error: `فشل في إلغاء تفعيل الترخيص: ${error}`,
            isLoading: false,
            showLockScreen: true, // Show lock screen even on error
            canUseApp: false,
            licenseInfo: null,
            isActivated: false,
            status: LicenseStatus.NOT_ACTIVATED
          })

          // Force page reload even on error to ensure lockdown
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      },

      refreshLicense: async () => {
        await get().loadLicenseInfo()
      },

      // UI actions
      setShowActivationDialog: (show: boolean) => {
        set({ showActivationDialog: show })
      },

      setShowLockScreen: (show: boolean) => {
        set({ showLockScreen: show })
      },

      clearError: () => {
        set({ error: null })
      },

      // Status checks
      checkLicenseStatus: async () => {
        const result = await licenseGuard.verifyLicense()

        set({
          status: result.status,
          canUseApp: result.canProceed,
          isExpiringSoon: result.isExpiringSoon,
          remainingDays: result.remainingDays || null,
          showLockScreen: !result.canProceed
        })
      },

      shouldLockApplication: async () => {
        const shouldLock = await licenseGuard.shouldLockApplication()
        set({ showLockScreen: shouldLock })
        return shouldLock
      },

      getLicenseWarning: async () => {
        return await licenseGuard.getLicenseWarning()
      }
    }),
    {
      name: 'license-store'
    }
  )
)

// Helper hooks for common license operations
export const useLicenseStatus = () => {
  const { status, canUseApp, isExpiringSoon, remainingDays } = useLicenseStore()
  return { status, canUseApp, isExpiringSoon, remainingDays }
}

export const useLicenseActions = () => {
  const {
    loadLicenseInfo,
    activateLicense,
    validateLicense,
    deactivateLicense,
    refreshLicense,
    checkLicenseStatus
  } = useLicenseStore()

  return {
    loadLicenseInfo,
    activateLicense,
    validateLicense,
    deactivateLicense,
    refreshLicense,
    checkLicenseStatus
  }
}

export const useLicenseUI = () => {
  const {
    showActivationDialog,
    showLockScreen,
    setShowActivationDialog,
    setShowLockScreen,
    error,
    clearError,
    isLoading,
    isActivating,
    isValidating
  } = useLicenseStore()

  return {
    showActivationDialog,
    showLockScreen,
    setShowActivationDialog,
    setShowLockScreen,
    error,
    clearError,
    isLoading,
    isActivating,
    isValidating
  }
}
