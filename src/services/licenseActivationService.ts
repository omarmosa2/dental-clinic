/**
 * License Activation Service
 * Handles first-run license activation with device fingerprinting
 */

import {
  LicenseActivationRequest,
  LicenseActivationResponse,
  DeviceFingerprint,
  LicenseStatus,
  LicenseErrorCode,
  ARABIC_LICENSE_MESSAGES
} from '../types/license'
import {
  licenseManagerRenderer,
  DeviceFingerprintServiceRenderer
} from './licenseServiceRenderer'

export class LicenseActivationService {
  private deviceService: DeviceFingerprintServiceRenderer

  constructor() {
    this.deviceService = new DeviceFingerprintServiceRenderer()
  }

  /**
   * Activate license with automatic device fingerprinting
   */
  async activateLicenseFromKey(licenseKey: string): Promise<LicenseActivationResponse> {
    try {
      // Activate license using renderer service (device fingerprinting handled in main process)
      return await licenseManagerRenderer.activateLicense(licenseKey)
    } catch (error) {
      return {
        success: false,
        error: `فشل في تفعيل الترخيص: ${error}`,
        errorCode: LicenseErrorCode.DEVICE_FINGERPRINT_FAILED
      }
    }
  }

  /**
   * Activate license from file
   */
  async activateLicenseFromFile(filePath: string): Promise<LicenseActivationResponse> {
    try {
      // Read license file
      const fs = require('fs')
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'ملف الترخيص غير موجود',
          errorCode: LicenseErrorCode.INVALID_KEY
        }
      }

      const licenseContent = fs.readFileSync(filePath, 'utf8')
      return await this.activateLicenseFromKey(licenseContent)
    } catch (error) {
      return {
        success: false,
        error: `فشل في قراءة ملف الترخيص: ${error}`,
        errorCode: LicenseErrorCode.INVALID_KEY
      }
    }
  }

  /**
   * Check if license activation is required
   */
  async isActivationRequired(): Promise<boolean> {
    try {
      const validation = await licenseManager.validateCurrentLicense()
      return validation.status === LicenseStatus.NOT_ACTIVATED
    } catch (error) {
      return true
    }
  }

  /**
   * Get current device fingerprint for display
   */
  async getCurrentDeviceInfo(): Promise<{
    deviceId: string
    platform: string
    hostname: string
  }> {
    try {
      const fingerprint = await this.deviceService.generateFingerprint()
      return {
        deviceId: fingerprint.machineId,
        platform: fingerprint.platform,
        hostname: fingerprint.hostname
      }
    } catch (error) {
      return {
        deviceId: 'unknown',
        platform: 'unknown',
        hostname: 'unknown'
      }
    }
  }

  /**
   * التحقق من تنسيق مفتاح الترخيص بدون تفعيل
   */
  validateLicenseKeyFormat(licenseKey: string): {
    isValid: boolean
    error?: string
  } {
    try {
      if (!licenseKey || licenseKey.trim().length === 0) {
        return {
          isValid: false,
          error: 'مفتاح الترخيص فارغ'
        }
      }

      // محاولة تحليل مفتاح الترخيص
      let licenseData: any

      if (licenseKey.startsWith('{')) {
        // تنسيق JSON مباشر
        licenseData = JSON.parse(licenseKey)
      } else {
        // تنسيق Base64
        const decoded = atob(licenseKey)
        const parsedDecoded = JSON.parse(decoded)

        // التحقق من التنسيق الجديد المشفر
        if (parsedDecoded.version === '2.0' && parsedDecoded.type === 'encrypted') {
          // مفتاح مشفر - لا يمكن التحقق من المحتوى بدون فك التشفير
          // لكن يمكن التحقق من البنية الأساسية
          if (!parsedDecoded.data || !parsedDecoded.salt || !parsedDecoded.checksum) {
            return {
              isValid: false,
              error: 'مفتاح الترخيص المشفر تالف'
            }
          }

          return {
            isValid: true,
            encrypted: true
          }
        } else {
          // تنسيق قديم أو غير مشفر
          licenseData = parsedDecoded
        }
      }

      // التحقق من الحقول المطلوبة (للتراخيص غير المشفرة)
      if (!licenseData.licenseId) {
        return {
          isValid: false,
          error: 'معرف الترخيص مفقود'
        }
      }

      if (!licenseData.maxDays || licenseData.maxDays <= 0) {
        return {
          isValid: false,
          error: 'مدة صلاحية الترخيص غير صالحة'
        }
      }

      if (!licenseData.signature) {
        return {
          isValid: false,
          error: 'توقيع الترخيص مفقود'
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: 'تنسيق مفتاح الترخيص غير صالح'
      }
    }
  }

  /**
   * الحصول على معلومات الترخيص من المفتاح بدون تفعيل
   */
  getLicenseInfoFromKey(licenseKey: string): {
    licenseId?: string
    licenseType?: string
    validityDays?: number
    createdAt?: string
    features?: string[]
    encrypted?: boolean
  } | null {
    try {
      let licenseData: any

      if (licenseKey.startsWith('{')) {
        // تنسيق JSON مباشر
        licenseData = JSON.parse(licenseKey)
      } else {
        // تنسيق Base64
        const decoded = atob(licenseKey)
        const parsedDecoded = JSON.parse(decoded)

        // التحقق من التنسيق الجديد المشفر
        if (parsedDecoded.version === '2.0' && parsedDecoded.type === 'encrypted') {
          // مفتاح مشفر - لا يمكن عرض المعلومات بدون فك التشفير
          return {
            licenseId: 'مشفر',
            licenseType: 'مشفر',
            validityDays: 0,
            createdAt: 'مشفر',
            features: ['مشفر'],
            encrypted: true
          }
        } else {
          // تنسيق قديم أو غير مشفر
          licenseData = parsedDecoded
        }
      }

      return {
        licenseId: licenseData.licenseId,
        licenseType: licenseData.licenseType || 'standard',
        validityDays: licenseData.maxDays,
        createdAt: licenseData.createdAt,
        features: licenseData.features || [],
        encrypted: false
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Reset license activation (for testing or license replacement)
   */
  async resetActivation(): Promise<void> {
    await licenseManagerRenderer.deactivateLicense()
  }

  /**
   * Get activation status with detailed information
   */
  async getActivationStatus(): Promise<{
    isActivated: boolean
    status: LicenseStatus
    licenseInfo?: any
    deviceInfo?: any
    error?: string
  }> {
    try {
      const validation = await licenseManagerRenderer.validateCurrentLicense()
      const licenseInfo = await licenseManagerRenderer.getLicenseInfo()
      const deviceInfo = await this.getCurrentDeviceInfo()

      return {
        isActivated: validation.status !== LicenseStatus.NOT_ACTIVATED,
        status: validation.status,
        licenseInfo,
        deviceInfo,
        error: validation.error
      }
    } catch (error) {
      return {
        isActivated: false,
        status: LicenseStatus.INVALID,
        error: `فشل في التحقق من حالة التفعيل: ${error}`
      }
    }
  }
}

// Export singleton instance
export const licenseActivationService = new LicenseActivationService()
