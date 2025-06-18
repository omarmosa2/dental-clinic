/**
 * License Verification Guard
 * Handles application startup license verification and enforcement
 */

import {
  LicenseStatus,
  LicenseValidationResult,
  LicenseInfo,
  ARABIC_LICENSE_MESSAGES
} from '../types/license'
import { licenseManagerRenderer } from './licenseServiceRenderer'
import { licenseActivationServiceRenderer } from './licenseServiceRenderer'

export interface LicenseGuardResult {
  canProceed: boolean
  status: LicenseStatus
  licenseInfo?: LicenseInfo
  error?: string
  requiresActivation: boolean
  isExpiringSoon: boolean
  remainingDays?: number
}

export class LicenseGuardService {
  private static instance: LicenseGuardService
  private lastValidation: LicenseValidationResult | null = null
  private validationCache: { timestamp: number; result: LicenseGuardResult } | null = null
  private readonly CACHE_DURATION = 5000 // 5 seconds for real-time validation
  private readonly VALIDATION_INTERVAL = 60000 // 1 minute validation interval
  private validationTimer: NodeJS.Timeout | null = null
  private isValidating = false
  private onLicenseExpiredCallback: (() => void) | null = null
  private onLicenseInvalidCallback: (() => void) | null = null

  constructor() {
    if (LicenseGuardService.instance) {
      return LicenseGuardService.instance
    }
    LicenseGuardService.instance = this
    this.startRealTimeValidation()
  }

  /**
   * Start real-time license validation
   */
  private startRealTimeValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
    }

    this.validationTimer = setInterval(async () => {
      if (!this.isValidating) {
        await this.performRealTimeValidation()
      }
    }, this.VALIDATION_INTERVAL)
  }

  /**
   * Stop real-time license validation
   */
  public stopRealTimeValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
      this.validationTimer = null
    }
  }

  /**
   * Set callback for license expiration
   */
  public setOnLicenseExpiredCallback(callback: () => void): void {
    this.onLicenseExpiredCallback = callback
  }

  /**
   * Set callback for license invalidation
   */
  public setOnLicenseInvalidCallback(callback: () => void): void {
    this.onLicenseInvalidCallback = callback
  }

  /**
   * Perform real-time validation check
   */
  private async performRealTimeValidation(): Promise<void> {
    this.isValidating = true
    try {
      const validation = await licenseManagerRenderer.validateCurrentLicense()
      const licenseInfo = await licenseManagerRenderer.getLicenseInfo()

      const result = this.processValidationResult(validation, licenseInfo)

      // Check if license became invalid or expired
      if (!result.canProceed) {
        if (result.status === LicenseStatus.EXPIRED && this.onLicenseExpiredCallback) {
          this.onLicenseExpiredCallback()
        } else if (this.onLicenseInvalidCallback) {
          this.onLicenseInvalidCallback()
        }
      }

      // Update cache
      this.validationCache = {
        timestamp: Date.now(),
        result
      }
    } catch (error) {
      console.error('Real-time license validation failed:', error)
    } finally {
      this.isValidating = false
    }
  }

  /**
   * Main license verification method called on app startup
   */
  async verifyLicense(): Promise<LicenseGuardResult> {
    try {
      // Check cache first
      if (this.validationCache &&
          Date.now() - this.validationCache.timestamp < this.CACHE_DURATION) {
        return this.validationCache.result
      }

      // Perform license validation
      const validation = await licenseManagerRenderer.validateCurrentLicense()
      const licenseInfo = await licenseManagerRenderer.getLicenseInfo()

      this.lastValidation = validation

      // Special handling for deleted/missing licenses - immediate blocking
      if (!licenseInfo && validation.status === LicenseStatus.NOT_ACTIVATED) {
        const result = {
          status: LicenseStatus.NOT_ACTIVATED,
          canProceed: false,
          requiresActivation: true,
          isExpiringSoon: false,
          error: ARABIC_LICENSE_MESSAGES.not_activated,
          licenseInfo: null,
          remainingDays: null
        }

        // Cache the result for immediate blocking
        this.validationCache = {
          timestamp: Date.now(),
          result
        }

        return result
      }

      const result = this.processValidationResult(validation, licenseInfo)

      // Cache the result
      this.validationCache = {
        timestamp: Date.now(),
        result
      }

      return result
    } catch (error) {
      console.error('License verification failed:', error)
      return {
        canProceed: false,
        status: LicenseStatus.INVALID,
        error: `فشل في التحقق من الترخيص: ${error}`,
        requiresActivation: true,
        isExpiringSoon: false
      }
    }
  }

  /**
   * Process validation result and determine application access
   */
  private processValidationResult(
    validation: LicenseValidationResult,
    licenseInfo: LicenseInfo | null
  ): LicenseGuardResult {
    const baseResult = {
      status: validation.status,
      licenseInfo: licenseInfo || undefined,
      error: validation.error,
      remainingDays: validation.remainingDays
    }

    switch (validation.status) {
      case LicenseStatus.VALID:
        return {
          ...baseResult,
          canProceed: true,
          requiresActivation: false,
          isExpiringSoon: licenseInfo?.isExpiringSoon || false
        }

      case LicenseStatus.NOT_ACTIVATED:
        return {
          ...baseResult,
          canProceed: false,
          requiresActivation: true,
          isExpiringSoon: false,
          error: ARABIC_LICENSE_MESSAGES.not_activated
        }

      case LicenseStatus.EXPIRED:
        // NO GRACE PERIOD - Immediately block access when expired
        return {
          ...baseResult,
          canProceed: false,
          requiresActivation: false,
          isExpiringSoon: false,
          error: ARABIC_LICENSE_MESSAGES.expired
        }

      case LicenseStatus.DEVICE_MISMATCH:
        return {
          ...baseResult,
          canProceed: false,
          requiresActivation: false,
          isExpiringSoon: false,
          error: ARABIC_LICENSE_MESSAGES.device_mismatch
        }

      case LicenseStatus.TAMPERED:
        return {
          ...baseResult,
          canProceed: false,
          requiresActivation: false,
          isExpiringSoon: false,
          error: ARABIC_LICENSE_MESSAGES.tampered
        }

      case LicenseStatus.INVALID:
      default:
        return {
          ...baseResult,
          canProceed: false,
          requiresActivation: true,
          isExpiringSoon: false,
          error: validation.error || ARABIC_LICENSE_MESSAGES.invalid
        }
    }
  }

  /**
   * Check if application should be locked
   */
  async shouldLockApplication(): Promise<boolean> {
    const result = await this.verifyLicense()
    return !result.canProceed
  }

  /**
   * Get license warning message for UI
   */
  async getLicenseWarning(): Promise<string | null> {
    const result = await this.verifyLicense()

    if (!result.canProceed) {
      return result.error || 'مشكلة في الترخيص'
    }

    if (result.isExpiringSoon && result.remainingDays !== undefined) {
      if (result.remainingDays <= 1) {
        return 'ينتهي الترخيص اليوم!'
      } else if (result.remainingDays <= 3) {
        return `ينتهي الترخيص خلال ${result.remainingDays} أيام`
      } else if (result.remainingDays <= 7) {
        return `ينتهي الترخيص خلال ${result.remainingDays} أيام`
      }
    }

    return null
  }

  /**
   * Get license status for UI display
   */
  async getLicenseStatusForUI(): Promise<{
    status: string
    message: string
    color: 'green' | 'yellow' | 'red' | 'gray'
    canUseApp: boolean
  }> {
    const result = await this.verifyLicense()

    switch (result.status) {
      case LicenseStatus.VALID:
        if (result.isExpiringSoon) {
          return {
            status: 'تحذير',
            message: `ينتهي خلال ${result.remainingDays} أيام`,
            color: 'yellow',
            canUseApp: true
          }
        }
        return {
          status: 'صالح',
          message: `متبقي ${result.remainingDays} يوم`,
          color: 'green',
          canUseApp: true
        }

      case LicenseStatus.EXPIRED:
        return {
          status: 'منتهي الصلاحية',
          message: 'انتهت صلاحية الترخيص',
          color: 'red',
          canUseApp: false
        }

      case LicenseStatus.NOT_ACTIVATED:
        return {
          status: 'غير مفعل',
          message: 'يتطلب تفعيل الترخيص',
          color: 'gray',
          canUseApp: false
        }

      case LicenseStatus.DEVICE_MISMATCH:
        return {
          status: 'جهاز غير مطابق',
          message: 'الترخيص مرتبط بجهاز آخر',
          color: 'red',
          canUseApp: false
        }

      case LicenseStatus.TAMPERED:
        return {
          status: 'تم العبث',
          message: 'تم اكتشاف عبث في الترخيص',
          color: 'red',
          canUseApp: false
        }

      default:
        return {
          status: 'غير صالح',
          message: 'الترخيص غير صالح',
          color: 'red',
          canUseApp: false
        }
    }
  }

  /**
   * Force refresh license validation (clear cache)
   */
  async refreshValidation(): Promise<LicenseGuardResult> {
    this.validationCache = null
    return await this.verifyLicense()
  }

  /**
   * Get detailed license information for settings page
   */
  async getDetailedLicenseInfo(): Promise<{
    isActivated: boolean
    licenseInfo: LicenseInfo | null
    deviceInfo: any
    validationResult: LicenseGuardResult
  }> {
    const validationResult = await this.verifyLicense()
    const licenseInfo = await licenseManagerRenderer.getLicenseInfo()
    const deviceInfo = await licenseActivationServiceRenderer.getCurrentDeviceInfo()

    return {
      isActivated: validationResult.status !== LicenseStatus.NOT_ACTIVATED,
      licenseInfo,
      deviceInfo,
      validationResult
    }
  }

  /**
   * Check if license allows specific feature
   */
  async hasFeature(featureName: string): Promise<boolean> {
    const result = await this.verifyLicense()

    if (!result.canProceed || !result.licenseInfo) {
      return false
    }

    return result.licenseInfo.features.includes(featureName)
  }

  /**
   * Force immediate license validation (bypass cache)
   */
  async forceValidation(): Promise<LicenseGuardResult> {
    this.validationCache = null
    return await this.verifyLicense()
  }

  /**
   * Check if license is currently valid and not expired
   */
  async isLicenseCurrentlyValid(): Promise<boolean> {
    const result = await this.verifyLicense()
    return result.canProceed && result.status === LicenseStatus.VALID
  }
}

// Export singleton instance
export const licenseGuard = new LicenseGuardService()
