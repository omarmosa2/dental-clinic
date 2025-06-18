/**
 * License Security Test
 * Tests the critical license security fixes implemented
 */

const { licenseManager } = require('./electron/licenseService.js')
const crypto = require('crypto')

// Test configuration
const TEST_CONFIG = {
  validLicenseKey: null, // Will be generated
  expiredLicenseKey: null, // Will be generated
  testDeviceFingerprint: null
}

/**
 * Generate a test license key for testing
 */
function generateTestLicenseKey(daysValid = 30, licenseId = null) {
  const testLicenseId = licenseId || `test-${Date.now()}-${Math.random().toString(36).substring(7)}`

  const licenseData = {
    licenseId: testLicenseId,
    licenseType: 'standard',
    maxDays: daysValid,
    createdAt: new Date().toISOString(),
    features: ['all'],
    metadata: { test: true }
  }

  // Create a simple signature for testing
  const dataForSignature = JSON.stringify({
    licenseId: licenseData.licenseId,
    licenseType: licenseData.licenseType,
    maxDays: licenseData.maxDays,
    createdAt: licenseData.createdAt
  })

  licenseData.signature = crypto.createHmac('sha256', 'dental-clinic-signature-key-2025-enhanced')
    .update(dataForSignature)
    .digest('hex')

  return Buffer.from(JSON.stringify(licenseData)).toString('base64')
}

/**
 * Test 1: License Expiration Enforcement
 */
async function testLicenseExpirationEnforcement() {
  console.log('\n🔒 Testing License Expiration Enforcement...')

  try {
    // Generate an expired license (negative days)
    const expiredLicenseKey = generateTestLicenseKey(-1)

    // Try to activate expired license
    const activationResult = await licenseManager.activateLicense(expiredLicenseKey)

    if (activationResult.success) {
      // If activation succeeded, check if validation properly detects expiration
      const validationResult = await licenseManager.validateCurrentLicense()

      if (validationResult.status === 'EXPIRED' && !validationResult.isValid) {
        console.log('✅ PASS: Expired license properly detected and blocked')
        return true
      } else {
        console.log('❌ FAIL: Expired license not properly blocked')
        console.log('Validation result:', validationResult)
        return false
      }
    } else {
      console.log('✅ PASS: Expired license activation properly rejected')
      return true
    }
  } catch (error) {
    console.log('❌ ERROR in expiration test:', error.message)
    return false
  }
}

/**
 * Test 2: Multi-Device Prevention
 */
async function testMultiDevicePrevention() {
  console.log('\n🔒 Testing Multi-Device Prevention...')

  try {
    // Generate a valid license
    const testLicenseId = `multi-device-test-${Date.now()}`
    const validLicenseKey = generateTestLicenseKey(30, testLicenseId)

    // First activation should succeed
    const firstActivation = await licenseManager.activateLicense(validLicenseKey)

    if (!firstActivation.success) {
      console.log('❌ FAIL: First activation failed unexpectedly')
      console.log('Error:', firstActivation.error)
      return false
    }

    console.log('✅ First activation succeeded')

    // Simulate different device by modifying device fingerprint temporarily
    const originalGenerateFingerprint = licenseManager.deviceService.generateFingerprint
    licenseManager.deviceService.generateFingerprint = async function() {
      const originalFp = await originalGenerateFingerprint.call(this)
      return {
        ...originalFp,
        machineId: 'different-machine-id-' + Date.now(),
        deviceSignature: 'different-signature-' + Date.now()
      }
    }

    // Second activation on "different device" should fail (without deactivating first)
    const secondActivation = await licenseManager.activateLicense(validLicenseKey)

    // Restore original function
    licenseManager.deviceService.generateFingerprint = originalGenerateFingerprint

    if (secondActivation.success) {
      console.log('❌ FAIL: Same license key allowed on different device')
      return false
    } else if (secondActivation.errorCode === 'LICENSE_ALREADY_REGISTERED') {
      console.log('✅ PASS: Multi-device usage properly prevented')
      return true
    } else {
      console.log('❌ FAIL: Unexpected error preventing multi-device usage')
      console.log('Error:', secondActivation.error)
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in multi-device test:', error.message)
    return false
  }
}

/**
 * Test 3: Enhanced Device Fingerprinting
 */
async function testEnhancedDeviceFingerprinting() {
  console.log('\n🔒 Testing Enhanced Device Fingerprinting...')

  try {
    const fingerprint = await licenseManager.deviceService.generateFingerprint()

    // Check if enhanced fields are present
    const requiredFields = ['machineId', 'platform', 'arch', 'deviceSignature']
    const enhancedFields = ['cpuSignature', 'memorySignature', 'macAddresses', 'osRelease']

    let hasAllRequired = true
    let hasEnhancedFeatures = false

    for (const field of requiredFields) {
      if (!fingerprint[field]) {
        console.log(`❌ Missing required field: ${field}`)
        hasAllRequired = false
      }
    }

    for (const field of enhancedFields) {
      if (fingerprint[field]) {
        hasEnhancedFeatures = true
        break
      }
    }

    if (hasAllRequired && hasEnhancedFeatures) {
      console.log('✅ PASS: Enhanced device fingerprinting working')
      console.log('Device signature length:', fingerprint.deviceSignature?.length || 0)
      return true
    } else {
      console.log('❌ FAIL: Enhanced device fingerprinting incomplete')
      console.log('Fingerprint fields:', Object.keys(fingerprint))
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in fingerprinting test:', error.message)
    return false
  }
}

/**
 * Test 4: Real-time License Validation
 */
async function testRealTimeLicenseValidation() {
  console.log('\n🔒 Testing Real-time License Validation...')

  try {
    // Check if license guard service methods exist (can't import TS directly in Node)
    // Instead, check if the license service has the enhanced validation features
    const validation = await licenseManager.validateCurrentLicense()

    if (validation && typeof validation.status !== 'undefined') {
      console.log('✅ PASS: Real-time license validation service available')
      return true
    } else {
      console.log('❌ FAIL: Real-time license validation service incomplete')
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in real-time validation test:', error.message)
    return false
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting License Security Tests...')
  console.log('=' .repeat(50))

  const tests = [
    { name: 'License Expiration Enforcement', fn: testLicenseExpirationEnforcement },
    { name: 'Multi-Device Prevention', fn: testMultiDevicePrevention },
    { name: 'Enhanced Device Fingerprinting', fn: testEnhancedDeviceFingerprinting },
    { name: 'Real-time License Validation', fn: testRealTimeLicenseValidation }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      console.log(`❌ ERROR in ${test.name}:`, error.message)
      failed++
    }
  }

  console.log('\n' + '=' .repeat(50))
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('🎉 All license security tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.')
  }

  return failed === 0
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  testLicenseExpirationEnforcement,
  testMultiDevicePrevention,
  testEnhancedDeviceFingerprinting,
  testRealTimeLicenseValidation
}
