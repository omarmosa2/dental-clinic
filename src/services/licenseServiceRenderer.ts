/**
 * Renderer-side License Service
 * Uses IPC to communicate with main process for license operations
 * This replaces the direct Node.js imports that were causing browser compatibility issues
 */

import {
  LicenseStatus,
  LicenseValidationResult,
  LicenseInfo,
  LicenseActivationResponse,
  DeviceFingerprint,
  ARABIC_LICENSE_MESSAGES
} from '../types/license'

// Declare global electronAPI interface
declare global {
  interface Window {
    electronAPI: {
      license: {
        activate: (licenseKey: string) => Promise<LicenseActivationResponse>
        validate: () => Promise<LicenseValidationResult>
        getInfo: () => Promise<LicenseInfo | null>
        deactivate: () => Promise<{ success: boolean; error?: string }>
        getDeviceInfo: () => Promise<DeviceFingerprint | null>
      }
    }
  }
}

/**
 * Renderer-side Device Fingerprint Service
 * Uses IPC to get device information from main process
 */
export class DeviceFingerprintServiceRenderer {
  async generateFingerprint(): Promise<DeviceFingerprint> {
    try {
      const deviceInfo = await window.electronAPI.license.getDeviceInfo()
      if (!deviceInfo) {
        throw new Error('Failed to get device information from main process')
      }
      return deviceInfo
    } catch (error) {
      throw new Error(`Failed to generate device fingerprint: ${error}`)
    }
  }

  compareFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean {
    // Primary identifiers must match
    if (fp1.machineId !== fp2.machineId) return false
    if (fp1.platform !== fp2.platform) return false
    if (fp1.arch !== fp2.arch) return false

    // Allow some flexibility for hostname and MAC address changes
    let matches = 0
    let total = 0

    if (fp1.hostname && fp2.hostname) {
      total++
      if (fp1.hostname === fp2.hostname) matches++
    }

    if (fp1.macAddress && fp2.macAddress) {
      total++
      if (fp1.macAddress === fp2.macAddress) matches++
    }

    if (fp1.cpuInfo && fp2.cpuInfo) {
      total++
      if (fp1.cpuInfo === fp2.cpuInfo) matches++
    }

    // Require at least 70% match on secondary identifiers
    return total === 0 || (matches / total) >= 0.7
  }
}

/**
 * Renderer-side License Manager Service
 * Uses IPC to communicate with main process for all license operations
 */
export class LicenseManagerServiceRenderer {
  private deviceService: DeviceFingerprintServiceRenderer

  constructor() {
    this.deviceService = new DeviceFingerprintServiceRenderer()
  }

  async activateLicense(licenseKey: string): Promise<LicenseActivationResponse> {
    try {
      return await window.electronAPI.license.activate(licenseKey)
    } catch (error) {
      return {
        success: false,
        error: `Activation failed: ${error}`,
        errorCode: 'IPC_ERROR'
      }
    }
  }

  async validateCurrentLicense(): Promise<LicenseValidationResult> {
    try {
      return await window.electronAPI.license.validate()
    } catch (error) {
      return {
        isValid: false,
        status: LicenseStatus.INVALID,
        error: `Validation failed: ${error}`
      }
    }
  }

  async getLicenseInfo(): Promise<LicenseInfo | null> {
    try {
      return await window.electronAPI.license.getInfo()
    } catch (error) {
      console.error('Failed to get license info:', error)
      return null
    }
  }

  async deactivateLicense(): Promise<void> {
    try {
      const result = await window.electronAPI.license.deactivate()
      if (!result.success) {
        throw new Error(result.error || 'Deactivation failed')
      }
    } catch (error) {
      throw new Error(`Failed to deactivate license: ${error}`)
    }
  }

  isLicenseRequired(): boolean {
    // Always require license for this application
    return true
  }

  async getLicenseStatus(): Promise<LicenseStatus> {
    const validation = await this.validateCurrentLicense()
    return validation.status
  }

  async getCurrentDeviceInfo(): Promise<DeviceFingerprint | null> {
    try {
      return await this.deviceService.generateFingerprint()
    } catch (error) {
      console.error('Failed to get device info:', error)
      return null
    }
  }
}

/**
 * License Activation Service for Renderer Process
 * Handles license activation with device fingerprinting via IPC
 */
export class LicenseActivationServiceRenderer {
  private licenseManager: LicenseManagerServiceRenderer
  private deviceService: DeviceFingerprintServiceRenderer

  constructor() {
    this.licenseManager = new LicenseManagerServiceRenderer()
    this.deviceService = new DeviceFingerprintServiceRenderer()
  }

  /**
   * Activate license with automatic device fingerprinting
   */
  async activateLicenseFromKey(licenseKey: string): Promise<LicenseActivationResponse> {
    try {
      return await this.licenseManager.activateLicense(licenseKey)
    } catch (error) {
      return {
        success: false,
        error: `فشل في تفعيل الترخيص: ${error}`,
        errorCode: 'DEVICE_FINGERPRINT_FAILED'
      }
    }
  }

  /**
   * Get current device information for display
   */
  async getCurrentDeviceInfo(): Promise<any> {
    try {
      const deviceInfo = await this.deviceService.generateFingerprint()
      if (!deviceInfo) return null

      return {
        deviceId: deviceInfo.machineId,
        platform: deviceInfo.platform,
        architecture: deviceInfo.arch,
        hostname: deviceInfo.hostname,
        cpuInfo: deviceInfo.cpuInfo,
        memoryInfo: deviceInfo.memoryInfo,
        macAddress: deviceInfo.macAddress ? deviceInfo.macAddress.substring(0, 8) + '...' : 'غير متوفر'
      }
    } catch (error) {
      console.error('Failed to get device info:', error)
      return null
    }
  }

  /**
   * Validate license file content
   */
  validateLicenseFileContent(content: string): boolean {
    try {
      let licenseData: any

      if (content.startsWith('{')) {
        licenseData = JSON.parse(content)
      } else {
        // Try to decode base64 encoded license
        const decoded = atob(content)
        licenseData = JSON.parse(decoded)
      }

      // Validate required fields
      return !!(licenseData.licenseId && licenseData.maxDays && licenseData.signature)
    } catch (error) {
      return false
    }
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
      const validation = await this.licenseManager.validateCurrentLicense()
      const licenseInfo = await this.licenseManager.getLicenseInfo()
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

// Export singleton instances
export const licenseManagerRenderer = new LicenseManagerServiceRenderer()
export const licenseActivationServiceRenderer = new LicenseActivationServiceRenderer()
