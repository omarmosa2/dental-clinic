/**
 * License System Types and Interfaces
 * Defines all types for the secure offline licensing system
 */

// License Status Enum
export enum LicenseStatus {
  VALID = 'valid',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  NOT_ACTIVATED = 'not_activated',
  DEVICE_MISMATCH = 'device_mismatch',
  TAMPERED = 'tampered',
  DEACTIVATED = 'deactivated'
}

// License Type Enum
export enum LicenseType {
  TRIAL = 'trial',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

// Raw License Data (from license key file)
export interface RawLicenseData {
  licenseId: string
  licenseType: LicenseType
  maxDays: number
  signature: string
  createdAt: string
  features?: string[]
  metadata?: Record<string, any>
}

// Enhanced Device Fingerprint
export interface DeviceFingerprint {
  machineId: string
  platform: string
  arch: string
  hostname: string
  macAddress?: string
  macAddresses?: string[] // Enhanced: multiple MAC addresses
  cpuInfo?: string
  cpuSignature?: string // Enhanced: CPU signature hash
  memoryInfo?: string
  memorySignature?: string // Enhanced: memory signature hash
  osRelease?: string // Enhanced: OS release info
  osVersion?: string // Enhanced: OS version info
  deviceSignature?: string // Enhanced: composite device signature
  diskInfo?: string
}

// Activated License Data (stored locally after activation)
export interface ActivatedLicenseData {
  licenseId: string
  licenseType: LicenseType
  maxDays: number
  activatedAt: string
  expiresAt: string
  deviceFingerprint: DeviceFingerprint
  signature: string
  originalSignature: string
  features: string[]
  metadata: Record<string, any>
}

// License Validation Result
export interface LicenseValidationResult {
  isValid: boolean
  status: LicenseStatus
  license?: ActivatedLicenseData
  error?: string
  remainingDays?: number
  expiresAt?: string
}

// License Information for UI Display
export interface LicenseInfo {
  status: LicenseStatus
  licenseType: LicenseType
  activatedAt?: string
  expiresAt?: string
  remainingDays?: number
  deviceId: string
  licenseId: string
  features: string[]
  isExpiringSoon: boolean
  errorMessage?: string
}

// License Activation Request
export interface LicenseActivationRequest {
  licenseKey: string
  deviceFingerprint: DeviceFingerprint
}

// License Activation Response
export interface LicenseActivationResponse {
  success: boolean
  license?: ActivatedLicenseData
  error?: string
  errorCode?: string
}

// License Generation Options (for developer tool)
export interface LicenseGenerationOptions {
  licenseType: LicenseType
  validityDays: number
  features?: string[]
  metadata?: Record<string, any>
  customId?: string
}

// Generated License Key
export interface GeneratedLicenseKey {
  licenseId: string
  licenseKey: string
  licenseFile: string
  createdAt: string
  expiresAfterActivation: number
}

// License Configuration
export interface LicenseConfig {
  encryptionKey: string
  signatureKey: string
  storageKey: string
  maxDevices: number
  gracePeriodDays: number
  warningDays: number
}

// License Error Codes
export enum LicenseErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  EXPIRED = 'EXPIRED',
  DEVICE_MISMATCH = 'DEVICE_MISMATCH',
  ALREADY_ACTIVATED = 'ALREADY_ACTIVATED',
  TAMPERED = 'TAMPERED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  DEVICE_FINGERPRINT_FAILED = 'DEVICE_FINGERPRINT_FAILED',
  LICENSE_ALREADY_REGISTERED = 'LICENSE_ALREADY_REGISTERED',
  LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE = 'LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE',
  LICENSE_PERMANENTLY_DEACTIVATED = 'LICENSE_PERMANENTLY_DEACTIVATED'
}

// License Event Types
export enum LicenseEventType {
  ACTIVATED = 'activated',
  VALIDATED = 'validated',
  EXPIRED = 'expired',
  WARNING = 'warning',
  ERROR = 'error',
  TAMPER_DETECTED = 'tamper_detected'
}

// License Event
export interface LicenseEvent {
  type: LicenseEventType
  timestamp: string
  licenseId: string
  deviceId: string
  message: string
  metadata?: Record<string, any>
}

// License Storage Interface
export interface LicenseStorage {
  storeLicense(license: ActivatedLicenseData): Promise<void>
  getLicense(): Promise<ActivatedLicenseData | null>
  deleteLicense(): Promise<void>
  isLicenseStored(): Promise<boolean>
}

// License Validator Interface
export interface LicenseValidator {
  validateLicense(license: ActivatedLicenseData): Promise<LicenseValidationResult>
  validateSignature(data: string, signature: string): boolean
  generateDeviceFingerprint(): Promise<DeviceFingerprint>
  compareDeviceFingerprints(fp1: DeviceFingerprint, fp2: DeviceFingerprint): boolean
}

// License Manager Interface
export interface LicenseManager {
  activateLicense(request: LicenseActivationRequest): Promise<LicenseActivationResponse>
  validateCurrentLicense(): Promise<LicenseValidationResult>
  getLicenseInfo(): Promise<LicenseInfo | null>
  deactivateLicense(): Promise<void>
  isLicenseRequired(): boolean
  getLicenseStatus(): Promise<LicenseStatus>
}

// Arabic License Messages
export interface LicenseMessages {
  [key: string]: string
}

export const ARABIC_LICENSE_MESSAGES: LicenseMessages = {
  // Status Messages
  valid: 'الترخيص صالح',
  expired: 'انتهت صلاحية الترخيص',
  invalid: 'الترخيص غير صالح',
  not_activated: 'الترخيص غير مفعل',
  device_mismatch: 'الترخيص مرتبط بجهاز آخر',
  tampered: 'تم العبث بملف الترخيص',
  deactivated: 'تم إلغاء تفعيل الترخيص نهائياً',

  // Error Messages
  INVALID_KEY: 'مفتاح الترخيص غير صالح',
  EXPIRED: 'انتهت صلاحية الترخيص',
  DEVICE_MISMATCH: 'هذا الترخيص مرتبط بجهاز آخر',
  ALREADY_ACTIVATED: 'تم تفعيل الترخيص مسبقاً',
  TAMPERED: 'تم اكتشاف عبث في ملف الترخيص',
  SIGNATURE_INVALID: 'توقيع الترخيص غير صالح',
  LICENSE_ALREADY_REGISTERED: 'هذا المفتاح مسجل بالفعل على جهاز آخر',
  LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE: 'هذا المفتاح مفعل بالفعل على هذا الجهاز',
  LICENSE_PERMANENTLY_DEACTIVATED: 'هذا المفتاح تم إلغاء تفعيله نهائياً',

  // UI Messages
  license_type: 'نوع الترخيص',
  activation_date: 'تاريخ التفعيل',
  expiration_date: 'تاريخ الانتهاء',
  remaining_days: 'الأيام المتبقية',
  device_id: 'معرف الجهاز',
  license_id: 'معرف الترخيص',
  activate_license: 'تفعيل الترخيص',
  license_key: 'مفتاح الترخيص',
  browse_license_file: 'تصفح ملف الترخيص',

  // License Types
  trial: 'تجريبي',
  standard: 'قياسي',
  premium: 'مميز',
  enterprise: 'مؤسسي',

  // Warnings
  expires_soon: 'ينتهي الترخيص قريباً',
  expires_in_days: 'ينتهي خلال {days} أيام',
  expired_days_ago: 'انتهى منذ {days} أيام',

  // Actions
  renew_license: 'تجديد الترخيص',
  contact_support: 'اتصل بالدعم الفني',
  enter_new_license: 'إدخال ترخيص جديد'
}
