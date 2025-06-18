/**
 * License Service for Electron Main Process
 * Node.js compatible version of the license service
 */

const crypto = require('crypto')
const { machineId } = require('node-machine-id')
const os = require('os')
const Store = require('electron-store').default || require('electron-store')

// إعدادات الترخيص المحسنة
const LICENSE_CONFIG = {
  encryptionKey: 'dental-clinic-license-key-2025-secure-enhanced',
  signatureKey: 'dental-clinic-signature-key-2025-enhanced',
  storageKey: 'dental-clinic-license-storage',
  maxDevices: 1,
  gracePeriodDays: 7,
  warningDays: 7,
  algorithm: 'aes-256-gcm',
  keyDerivationIterations: 100000
}

// License Status Enum
const LicenseStatus = {
  VALID: 'valid',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  NOT_ACTIVATED: 'not_activated',
  DEVICE_MISMATCH: 'device_mismatch',
  TAMPERED: 'tampered',
  DEACTIVATED: 'deactivated'
}

// Arabic License Messages
const ARABIC_LICENSE_MESSAGES = {
  valid: 'الترخيص صالح',
  expired: 'انتهت صلاحية الترخيص',
  invalid: 'الترخيص غير صالح',
  not_activated: 'الترخيص غير مفعل',
  device_mismatch: 'الترخيص مرتبط بجهاز آخر',
  tampered: 'تم العبث بملف الترخيص',
  deactivated: 'تم إلغاء تفعيل الترخيص نهائياً',
  INVALID_KEY: 'مفتاح الترخيص غير صالح',
  EXPIRED: 'انتهت صلاحية الترخيص',
  DEVICE_MISMATCH: 'هذا الترخيص مرتبط بجهاز آخر',
  ALREADY_ACTIVATED: 'تم تفعيل الترخيص مسبقاً',
  TAMPERED: 'تم اكتشاف عبث في ملف الترخيص',
  SIGNATURE_INVALID: 'توقيع الترخيص غير صالح'
}

/**
 * Enhanced Device Fingerprint Generator
 * Creates unique device identifiers that are difficult to duplicate
 */
class DeviceFingerprintService {
  async generateFingerprint() {
    try {
      const machineIdValue = await machineId()
      const networkInterfaces = os.networkInterfaces()

      // Get multiple MAC addresses for better uniqueness
      const macAddresses = []
      for (const [name, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces) {
          for (const iface of interfaces) {
            if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
              macAddresses.push(iface.mac)
            }
          }
        }
      }

      // Get detailed CPU info
      const cpus = os.cpus()
      const cpuInfo = cpus.length > 0 ? {
        model: cpus[0].model,
        speed: cpus[0].speed,
        cores: cpus.length,
        signature: crypto.createHash('md5').update(cpus[0].model + cpus[0].speed + cpus.length).digest('hex').substring(0, 8)
      } : { model: 'unknown', speed: 0, cores: 0, signature: 'unknown' }

      // Get memory info with more precision
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const memoryInfo = {
        total: Math.floor(totalMemory / (1024 * 1024)), // MB for precision
        totalGB: Math.floor(totalMemory / (1024 * 1024 * 1024)),
        signature: crypto.createHash('md5').update(totalMemory.toString()).digest('hex').substring(0, 8)
      }

      // Get system uptime as additional entropy
      const uptime = os.uptime()

      // Create a composite device signature
      const compositeData = [
        machineIdValue,
        os.platform(),
        os.arch(),
        os.hostname(),
        macAddresses.join(','),
        cpuInfo.signature,
        memoryInfo.signature,
        os.release(),
        os.version ? os.version() : 'unknown'
      ].join('|')

      const deviceSignature = crypto.createHash('sha256').update(compositeData).digest('hex')

      return {
        machineId: machineIdValue,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        macAddress: macAddresses[0] || 'unknown', // Primary MAC for compatibility
        macAddresses: macAddresses, // All MAC addresses
        cpuInfo: `${cpuInfo.model}-${cpuInfo.cores}`,
        cpuSignature: cpuInfo.signature,
        memoryInfo: memoryInfo.totalGB.toString(),
        memorySignature: memoryInfo.signature,
        osRelease: os.release(),
        osVersion: os.version ? os.version() : 'unknown',
        deviceSignature: deviceSignature,
        diskInfo: 'system'
      }
    } catch (error) {
      throw new Error(`Failed to generate device fingerprint: ${error}`)
    }
  }

  compareFingerprints(fp1, fp2) {
    // Critical identifiers that must match exactly
    if (fp1.machineId !== fp2.machineId) return false
    if (fp1.platform !== fp2.platform) return false
    if (fp1.arch !== fp2.arch) return false

    // Enhanced signature comparison for better security
    if (fp1.deviceSignature && fp2.deviceSignature) {
      // If both have device signatures, they must match exactly
      return fp1.deviceSignature === fp2.deviceSignature
    }

    // Fallback to legacy comparison for backward compatibility
    if (fp1.cpuSignature && fp2.cpuSignature) {
      if (fp1.cpuSignature !== fp2.cpuSignature) return false
    }

    if (fp1.memorySignature && fp2.memorySignature) {
      if (fp1.memorySignature !== fp2.memorySignature) return false
    }

    // Check MAC addresses with enhanced validation
    if (fp1.macAddresses && fp2.macAddresses) {
      // At least one MAC address must match
      const hasMatchingMac = fp1.macAddresses.some(mac1 =>
        fp2.macAddresses.some(mac2 => mac1 === mac2)
      )
      if (!hasMatchingMac) return false
    } else if (fp1.macAddress && fp2.macAddress) {
      // Legacy single MAC comparison
      if (fp1.macAddress !== fp2.macAddress) return false
    }

    // Additional validation for enhanced security
    let criticalMatches = 0
    let totalCritical = 0

    // CPU info must match
    if (fp1.cpuInfo && fp2.cpuInfo) {
      totalCritical++
      if (fp1.cpuInfo === fp2.cpuInfo) criticalMatches++
    }

    // Memory info must match
    if (fp1.memoryInfo && fp2.memoryInfo) {
      totalCritical++
      if (fp1.memoryInfo === fp2.memoryInfo) criticalMatches++
    }

    // OS release should match
    if (fp1.osRelease && fp2.osRelease) {
      totalCritical++
      if (fp1.osRelease === fp2.osRelease) criticalMatches++
    }

    // Require 100% match on critical identifiers for enhanced security
    return totalCritical === 0 || (criticalMatches / totalCritical) >= 1.0
  }
}

/**
 * خدمة التشفير المحسنة للتراخيص
 */
class LicenseEncryptionService {
  constructor() {
    this.algorithm = LICENSE_CONFIG.algorithm
    this.encryptionKey = LICENSE_CONFIG.encryptionKey
    this.signatureKey = LICENSE_CONFIG.signatureKey
  }

  /**
   * توليد مفتاح مشتق من المفتاح الأساسي
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      LICENSE_CONFIG.keyDerivationIterations,
      32,
      'sha256'
    )
  }

  /**
   * تشفير البيانات باستخدام AES-256-CBC (محسن للتوافق)
   */
  encrypt(data) {
    const salt = crypto.randomBytes(32)
    const key = this.deriveKey(salt)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: '', // لا يُستخدم في CBC
      salt: salt.toString('hex')
    }
  }

  /**
   * فك تشفير البيانات
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, salt } = encryptedData
      const key = this.deriveKey(Buffer.from(salt, 'hex'))
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'))

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return JSON.parse(decrypted)
    } catch (error) {
      throw new Error('فشل في فك تشفير بيانات الترخيص')
    }
  }

  /**
   * فك تشفير التنسيق القديم (للتوافق مع الإصدارات السابقة)
   */
  decryptLegacy(encryptedData) {
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 2) throw new Error('تنسيق بيانات مشفرة غير صالح')

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      throw new Error('فشل في فك تشفير بيانات الترخيص القديمة')
    }
  }

  /**
   * توليد التوقيع الرقمي
   */
  generateSignature(data) {
    const hmac = crypto.createHmac('sha256', this.signatureKey)
    hmac.update(typeof data === 'string' ? data : JSON.stringify(data))
    return hmac.digest('hex')
  }

  /**
   * التحقق من التوقيع الرقمي
   */
  verifySignature(data, signature) {
    try {
      const expectedSignature = this.generateSignature(data)
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      return false
    }
  }

  /**
   * فك تشفير مفتاح الترخيص الجديد المشفر
   */
  decryptLicenseKey(encryptedLicenseKey) {
    try {
      // محاولة فك تشفير التنسيق الجديد
      const licenseData = JSON.parse(Buffer.from(encryptedLicenseKey, 'base64').toString('utf8'))

      if (licenseData.version === '2.0' && licenseData.type === 'encrypted') {
        const encryptedInfo = {
          encrypted: licenseData.data,
          iv: licenseData.iv,
          authTag: licenseData.authTag,
          salt: licenseData.salt
        }

        const decryptedLicense = this.decrypt(encryptedInfo)

        // التحقق من checksum
        const calculatedChecksum = crypto.createHash('sha256').update(JSON.stringify(decryptedLicense)).digest('hex')
        if (calculatedChecksum !== licenseData.checksum) {
          throw new Error('فشل في التحقق من تكامل البيانات')
        }

        return decryptedLicense
      } else {
        // التنسيق القديم أو غير مشفر
        return JSON.parse(Buffer.from(encryptedLicenseKey, 'base64').toString('utf8'))
      }
    } catch (error) {
      throw new Error(`فشل في فك تشفير مفتاح الترخيص: ${error.message}`)
    }
  }
}

/**
 * License Key Registry Service
 * Tracks license key usage across devices to prevent reuse
 * Enhanced with strict single-use enforcement
 */
class LicenseKeyRegistryService {
  constructor() {
    this.store = new Store({
      name: 'dental-clinic-license-registry',
      encryptionKey: LICENSE_CONFIG.encryptionKey,
      projectName: 'dental-clinic-management' // Required for non-Electron environments
    })
    this.encryption = new LicenseEncryptionService()
  }

  /**
   * Register a license key with device fingerprint
   * Enhanced with strict single-use enforcement
   */
  async registerLicenseKey(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (existingRegistration) {
        // Decrypt and check existing registration
        const decryptedData = this.encryption.decrypt(existingRegistration)
        const existingData = JSON.parse(decryptedData)

        // Check if it's registered on a different device
        if (existingData.deviceFingerprint.machineId !== deviceFingerprint.machineId) {
          throw new Error('LICENSE_ALREADY_REGISTERED_ON_DIFFERENT_DEVICE')
        }

        // Same device - check if already activated
        if (existingData.status === 'ACTIVATED') {
          throw new Error('LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE')
        }

        // If status is DEACTIVATED, allow reactivation (don't throw error)
        // The main activation logic will handle validity checks
        console.log('License was deactivated, allowing reactivation attempt')

        // Update existing registration to ACTIVATED status
        existingData.status = 'ACTIVATED'
        existingData.activatedAt = new Date().toISOString()
        existingData.lastUsed = new Date().toISOString()
        existingData.activationCount = (existingData.activationCount || 0) + 1

        const encryptedData = this.encryption.encrypt(JSON.stringify(existingData))
        this.store.set(registryKey, encryptedData)
        return true
      }

      // New registration - first time activation
      const registrationData = {
        licenseId,
        deviceFingerprint,
        status: 'ACTIVATED',
        registeredAt: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        activationCount: 1,
        deactivationHistory: []
      }

      const encryptedData = this.encryption.encrypt(JSON.stringify(registrationData))
      this.store.set(registryKey, encryptedData)
      return true
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if license key is already registered on a different device
   * Enhanced to also check activation status
   */
  async isLicenseKeyRegisteredElsewhere(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (!existingRegistration) {
        return false
      }

      const decryptedData = this.encryption.decrypt(existingRegistration)
      const existingData = JSON.parse(decryptedData)

      return existingData.deviceFingerprint.machineId !== deviceFingerprint.machineId
    } catch (error) {
      console.error('Error checking license registration:', error)
      return false
    }
  }

  /**
   * Check if license key is already activated on this device
   */
  async isLicenseKeyAlreadyActivated(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (!existingRegistration) {
        return false
      }

      const decryptedData = this.encryption.decrypt(existingRegistration)
      const existingData = JSON.parse(decryptedData)

      // Check if it's the same device and already activated
      return existingData.deviceFingerprint.machineId === deviceFingerprint.machineId &&
             existingData.status === 'ACTIVATED'
    } catch (error) {
      console.error('Error checking license activation status:', error)
      return false
    }
  }

  /**
   * Check if license key is permanently deactivated
   */
  async isLicenseKeyDeactivated(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (!existingRegistration) {
        return false
      }

      const decryptedData = this.encryption.decrypt(existingRegistration)
      const existingData = JSON.parse(decryptedData)

      // Check if it's the same device and deactivated
      return existingData.deviceFingerprint.machineId === deviceFingerprint.machineId &&
             existingData.status === 'DEACTIVATED'
    } catch (error) {
      console.error('Error checking license deactivation status:', error)
      return false
    }
  }

  /**
   * Get registration info for a license key
   */
  async getLicenseRegistrationInfo(licenseId) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (!existingRegistration) {
        return null
      }

      const decryptedData = this.encryption.decrypt(existingRegistration)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('Error getting license registration info:', error)
      return null
    }
  }

  /**
   * Mark license as deactivated (instead of removing completely)
   * This prevents reactivation while maintaining audit trail
   */
  async deactivateLicenseRegistration(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (existingRegistration) {
        const decryptedData = this.encryption.decrypt(existingRegistration)
        const existingData = JSON.parse(decryptedData)

        // Update status to DEACTIVATED and add to history
        existingData.status = 'DEACTIVATED'
        existingData.deactivatedAt = new Date().toISOString()

        // Ensure deactivationHistory array exists
        if (!existingData.deactivationHistory) {
          existingData.deactivationHistory = []
        }

        existingData.deactivationHistory.push({
          deactivatedAt: new Date().toISOString(),
          deviceFingerprint: deviceFingerprint
        })

        const encryptedData = this.encryption.encrypt(JSON.stringify(existingData))
        this.store.set(registryKey, encryptedData)
      }
    } catch (error) {
      console.error('Error deactivating license registration:', error)
    }
  }

  /**
   * Reactivate a previously deactivated license registration
   * This allows reactivation of licenses that were deleted but are still within their validity period
   */
  async reactivateLicenseRegistration(licenseId, deviceFingerprint) {
    try {
      const registryKey = `license_${licenseId}`
      const existingRegistration = this.store.get(registryKey)

      if (existingRegistration) {
        const decryptedData = this.encryption.decrypt(existingRegistration)
        const existingData = JSON.parse(decryptedData)

        // Update status back to ACTIVATED and record reactivation
        existingData.status = 'ACTIVATED'
        existingData.reactivatedAt = new Date().toISOString()
        existingData.lastUsed = new Date().toISOString()
        existingData.activationCount = (existingData.activationCount || 0) + 1

        // Ensure reactivationHistory array exists
        if (!existingData.reactivationHistory) {
          existingData.reactivationHistory = []
        }

        existingData.reactivationHistory.push({
          reactivatedAt: new Date().toISOString(),
          deviceFingerprint: deviceFingerprint
        })

        const encryptedData = this.encryption.encrypt(JSON.stringify(existingData))
        this.store.set(registryKey, encryptedData)

        console.log('License registration reactivated successfully:', licenseId)
      }
    } catch (error) {
      console.error('Error reactivating license registration:', error)
    }
  }

  /**
   * Remove license registration (for complete cleanup - use with caution)
   * This method is kept for backward compatibility but should rarely be used
   */
  async removeLicenseRegistration(licenseId) {
    try {
      const registryKey = `license_${licenseId}`
      this.store.delete(registryKey)
    } catch (error) {
      console.error('Error removing license registration:', error)
    }
  }
}

/**
 * License Storage Service
 */
class LicenseStorageService {
  constructor() {
    this.store = new Store({
      name: LICENSE_CONFIG.storageKey,
      encryptionKey: LICENSE_CONFIG.encryptionKey,
      projectName: 'dental-clinic-management' // Required for non-Electron environments
    })
    this.encryption = new LicenseEncryptionService()
  }

  async storeLicense(license) {
    try {
      const licenseData = JSON.stringify(license)
      const encryptedData = this.encryption.encrypt(licenseData)
      this.store.set('activatedLicense', encryptedData)
      this.store.set('licenseHash', crypto.createHash('sha256').update(licenseData).digest('hex'))
    } catch (error) {
      throw new Error(`Failed to store license: ${error}`)
    }
  }

  async getLicense() {
    try {
      const encryptedData = this.store.get('activatedLicense')
      if (!encryptedData) return null

      const decryptedData = this.encryption.decrypt(encryptedData)
      const license = JSON.parse(decryptedData)

      // Verify integrity
      const storedHash = this.store.get('licenseHash')
      const currentHash = crypto.createHash('sha256').update(decryptedData).digest('hex')

      if (storedHash !== currentHash) {
        throw new Error('License data integrity check failed')
      }

      return license
    } catch (error) {
      console.error('Failed to retrieve license:', error)
      return null
    }
  }

  async deleteLicense() {
    this.store.delete('activatedLicense')
    this.store.delete('licenseHash')
  }

  async isLicenseStored() {
    return this.store.has('activatedLicense')
  }
}

/**
 * Main License Manager Service
 */
class LicenseManagerService {
  constructor() {
    this.storage = new LicenseStorageService()
    this.deviceService = new DeviceFingerprintService()
    this.encryption = new LicenseEncryptionService()
    this.registry = new LicenseKeyRegistryService()
  }

  async activateLicense(licenseKey) {
    try {
      // Generate device fingerprint first
      const deviceFingerprint = await this.deviceService.generateFingerprint()

      // Parse and validate license key
      const rawLicense = this.parseLicenseKey(licenseKey)
      if (!rawLicense) {
        return {
          success: false,
          error: ARABIC_LICENSE_MESSAGES.INVALID_KEY,
          errorCode: 'INVALID_KEY'
        }
      }

      // Enhanced security checks for single-use enforcement

      // Check if license key is already registered on a different device
      const isRegisteredElsewhere = await this.registry.isLicenseKeyRegisteredElsewhere(
        rawLicense.licenseId,
        deviceFingerprint
      )

      if (isRegisteredElsewhere) {
        return {
          success: false,
          error: 'هذا المفتاح مسجل بالفعل على جهاز آخر. لا يمكن استخدام نفس المفتاح على أجهزة متعددة.',
          errorCode: 'LICENSE_ALREADY_REGISTERED'
        }
      }

      // Check license registration status
      const registrationInfo = await this.registry.getLicenseRegistrationInfo(rawLicense.licenseId)

      console.log('License activation check:', {
        licenseId: rawLicense.licenseId,
        hasRegistration: !!registrationInfo,
        registrationStatus: registrationInfo?.status,
        deviceMatches: registrationInfo ? registrationInfo.deviceFingerprint.machineId === deviceFingerprint.machineId : 'N/A'
      })

      // Check if license is currently activated (not deactivated)
      if (registrationInfo && registrationInfo.status === 'ACTIVATED') {
        // Check if it's on the same device
        if (registrationInfo.deviceFingerprint.machineId === deviceFingerprint.machineId) {
          return {
            success: false,
            error: 'هذا المفتاح مفعل بالفعل على هذا الجهاز. لا يمكن إعادة تفعيل نفس المفتاح مرة أخرى.',
            errorCode: 'LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE'
          }
        }
      }

      // Check if license key is permanently deactivated vs temporarily deleted

      if (registrationInfo && registrationInfo.status === 'DEACTIVATED') {
        // Check if the license was deleted but is still within its original validity period
        const now = new Date()

        // Calculate original expiration based on license creation date, not registration date
        const licenseCreationDate = new Date(rawLicense.createdAt)
        const originalExpirationDate = new Date(licenseCreationDate.getTime() + rawLicense.maxDays * 24 * 60 * 60 * 1000)

        console.log('Checking reactivation eligibility:', {
          now: now.toISOString(),
          licenseCreatedAt: rawLicense.createdAt,
          maxDays: rawLicense.maxDays,
          originalExpirationDate: originalExpirationDate.toISOString(),
          canReactivate: now <= originalExpirationDate
        })

        if (now <= originalExpirationDate) {
          // License is still within its original validity period - allow reactivation
          console.log('License was deleted but is still valid - allowing reactivation')
          // Update registry status back to ACTIVATED
          await this.registry.reactivateLicenseRegistration(rawLicense.licenseId, deviceFingerprint)
        } else {
          // License has expired since original creation - permanently deactivated
          return {
            success: false,
            error: 'هذا المفتاح انتهت صلاحيته الأصلية ولا يمكن إعادة تفعيله.',
            errorCode: 'LICENSE_EXPIRED_PERMANENTLY'
          }
        }
      }

      // Clean up any existing different license on this device
      const existingLicense = await this.storage.getLicense()
      if (existingLicense && existingLicense.licenseId !== rawLicense.licenseId) {
        // Different license on same device - deactivate old license properly
        console.log('Different license found, deactivating it to allow new activation')
        await this.storage.deleteLicense()
        // Mark old license as deactivated in registry
        await this.registry.deactivateLicenseRegistration(existingLicense.licenseId, deviceFingerprint)
      }

      // Check if license would be expired immediately
      const now = new Date()
      const wouldExpireAt = new Date(now.getTime() + rawLicense.maxDays * 24 * 60 * 60 * 1000)

      if (wouldExpireAt <= now) {
        return {
          success: false,
          error: 'مفتاح الترخيص منتهي الصلاحية. لا يمكن تفعيل ترخيص منتهي الصلاحية.',
          errorCode: 'LICENSE_EXPIRED'
        }
      }

      // Verify license signature
      const licenseDataForSignature = JSON.stringify({
        licenseId: rawLicense.licenseId,
        licenseType: rawLicense.licenseType,
        maxDays: rawLicense.maxDays,
        createdAt: rawLicense.createdAt
      })

      if (!this.encryption.verifySignature(licenseDataForSignature, rawLicense.signature)) {
        return {
          success: false,
          error: ARABIC_LICENSE_MESSAGES.SIGNATURE_INVALID,
          errorCode: 'SIGNATURE_INVALID'
        }
      }

      // Create activated license
      const expiresAt = new Date(now.getTime() + rawLicense.maxDays * 24 * 60 * 60 * 1000)

      const activatedLicense = {
        licenseId: rawLicense.licenseId,
        licenseType: rawLicense.licenseType,
        maxDays: rawLicense.maxDays,
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        deviceFingerprint: deviceFingerprint,
        signature: '',
        originalSignature: rawLicense.signature,
        features: rawLicense.features || [],
        metadata: rawLicense.metadata || {}
      }

      // Generate new signature for activated license
      const activatedDataForSignature = JSON.stringify({
        licenseId: activatedLicense.licenseId,
        licenseType: activatedLicense.licenseType,
        maxDays: activatedLicense.maxDays,
        activatedAt: activatedLicense.activatedAt,
        deviceFingerprint: activatedLicense.deviceFingerprint
      })

      activatedLicense.signature = this.encryption.generateSignature(activatedDataForSignature)

      // Register license key in registry to prevent reuse
      await this.registry.registerLicenseKey(rawLicense.licenseId, deviceFingerprint)

      // Store activated license
      await this.storage.storeLicense(activatedLicense)

      return {
        success: true,
        license: activatedLicense
      }
    } catch (error) {
      return {
        success: false,
        error: `Activation failed: ${error}`,
        errorCode: 'STORAGE_ERROR'
      }
    }
  }

  async validateCurrentLicense() {
    try {
      const license = await this.storage.getLicense()
      if (!license) {
        return {
          isValid: false,
          status: LicenseStatus.NOT_ACTIVATED,
          error: ARABIC_LICENSE_MESSAGES.not_activated
        }
      }

      // Check signature integrity
      const licenseDataForSignature = JSON.stringify({
        licenseId: license.licenseId,
        licenseType: license.licenseType,
        maxDays: license.maxDays,
        activatedAt: license.activatedAt,
        deviceFingerprint: license.deviceFingerprint
      })

      if (!this.encryption.verifySignature(licenseDataForSignature, license.signature)) {
        return {
          isValid: false,
          status: LicenseStatus.TAMPERED,
          error: ARABIC_LICENSE_MESSAGES.TAMPERED
        }
      }

      // Check device fingerprint
      const currentFingerprint = await this.deviceService.generateFingerprint()
      if (!this.deviceService.compareFingerprints(license.deviceFingerprint, currentFingerprint)) {
        return {
          isValid: false,
          status: LicenseStatus.DEVICE_MISMATCH,
          error: ARABIC_LICENSE_MESSAGES.DEVICE_MISMATCH
        }
      }

      // Enhanced registry validation - check if license is still valid in registry
      const registryInfo = await this.registry.getLicenseRegistrationInfo(license.licenseId)
      if (registryInfo) {
        // Check if license is deactivated in registry
        if (registryInfo.status === 'DEACTIVATED') {
          return {
            isValid: false,
            status: LicenseStatus.DEACTIVATED,
            error: 'الترخيص تم إلغاء تفعيله نهائياً.',
            remainingDays: 0,
            expiresAt: license.expiresAt
          }
        }

        // Verify device fingerprint matches registry
        if (registryInfo.deviceFingerprint.machineId !== currentFingerprint.machineId) {
          return {
            isValid: false,
            status: LicenseStatus.DEVICE_MISMATCH,
            error: 'عدم تطابق بصمة الجهاز مع السجل المحفوظ.',
            remainingDays: 0,
            expiresAt: license.expiresAt
          }
        }
      } else {
        // License not found in registry - this is suspicious
        return {
          isValid: false,
          status: LicenseStatus.TAMPERED,
          error: 'الترخيص غير موجود في السجل. قد يكون تم التلاعب به.',
          remainingDays: 0,
          expiresAt: license.expiresAt
        }
      }

      // Check expiration
      const now = new Date()
      const expiresAt = new Date(license.expiresAt)
      const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (now > expiresAt) {
        return {
          isValid: false,
          status: LicenseStatus.EXPIRED,
          error: ARABIC_LICENSE_MESSAGES.EXPIRED,
          remainingDays: remainingDays,
          expiresAt: license.expiresAt
        }
      }

      return {
        isValid: true,
        status: LicenseStatus.VALID,
        license,
        remainingDays,
        expiresAt: license.expiresAt
      }
    } catch (error) {
      return {
        isValid: false,
        status: LicenseStatus.INVALID,
        error: `Validation failed: ${error}`
      }
    }
  }

  async getLicenseInfo() {
    try {
      const license = await this.storage.getLicense()
      if (!license) return null

      const validation = await this.validateCurrentLicense()
      const remainingDays = validation.remainingDays || 0
      const isExpiringSoon = remainingDays <= LICENSE_CONFIG.warningDays && remainingDays > 0

      return {
        status: validation.status,
        licenseType: license.licenseType,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        remainingDays,
        deviceId: license.deviceFingerprint.machineId,
        licenseId: license.licenseId,
        features: license.features,
        isExpiringSoon,
        errorMessage: validation.error
      }
    } catch (error) {
      return null
    }
  }

  async deactivateLicense() {
    try {
      // Get current license info before deletion
      const license = await this.storage.getLicense()

      // Delete license from storage
      await this.storage.deleteLicense()

      // Mark as deactivated in registry (instead of removing completely)
      // This prevents reactivation while maintaining audit trail
      if (license && license.licenseId) {
        const currentFingerprint = await this.deviceService.generateFingerprint()
        await this.registry.deactivateLicenseRegistration(license.licenseId, currentFingerprint)
      }
    } catch (error) {
      console.error('Error during license deactivation:', error)
      // Still try to delete from storage even if registry deactivation fails
      await this.storage.deleteLicense()
    }
  }

  parseLicenseKey(licenseKey) {
    try {
      let licenseData

      if (licenseKey.startsWith('{')) {
        // JSON مباشر
        licenseData = JSON.parse(licenseKey)
      } else {
        // محاولة فك تشفير مفتاح الترخيص المشفر
        try {
          licenseData = this.encryption.decryptLicenseKey(licenseKey)
        } catch (decryptError) {
          // إذا فشل فك التشفير، جرب التنسيق القديم
          const decoded = Buffer.from(licenseKey, 'base64').toString('utf8')
          licenseData = JSON.parse(decoded)
        }
      }

      // التحقق من الحقول المطلوبة
      if (!licenseData.licenseId || !licenseData.maxDays || !licenseData.signature) {
        console.error('مفتاح الترخيص يفتقر للحقول المطلوبة:', {
          hasLicenseId: !!licenseData.licenseId,
          hasMaxDays: !!licenseData.maxDays,
          hasSignature: !!licenseData.signature
        })
        return null
      }

      return {
        licenseId: licenseData.licenseId,
        licenseType: licenseData.licenseType || 'standard',
        maxDays: licenseData.maxDays,
        signature: licenseData.signature,
        createdAt: licenseData.createdAt,
        features: licenseData.features || [],
        metadata: licenseData.metadata || {}
      }
    } catch (error) {
      console.error('فشل في تحليل مفتاح الترخيص:', error)
      return null
    }
  }
}

// Export singleton instance
const licenseManager = new LicenseManagerService()

module.exports = {
  licenseManager,
  DeviceFingerprintService,
  LicenseStatus,
  ARABIC_LICENSE_MESSAGES
}
