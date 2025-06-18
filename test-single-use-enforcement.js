/**
 * Single-Use License Enforcement Test
 * Tests the specific security fixes for preventing multiple activations
 */

const { licenseManager } = require('./electron/licenseService.js')
const crypto = require('crypto')

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
 * Test 1: Single-Use Enforcement on Same Device
 */
async function testSingleUseEnforcementSameDevice() {
  console.log('\n🔒 Testing Single-Use Enforcement on Same Device...')

  try {
    // Generate a unique license for this test
    const testLicenseId = `single-use-test-${Date.now()}`
    const validLicenseKey = generateTestLicenseKey(30, testLicenseId)

    // First activation should succeed
    const firstActivation = await licenseManager.activateLicense(validLicenseKey)

    if (!firstActivation.success) {
      console.log('❌ FAIL: First activation failed unexpectedly')
      console.log('Error:', firstActivation.error)
      return false
    }

    console.log('✅ First activation succeeded')

    // Deactivate the license
    await licenseManager.deactivateLicense()
    console.log('✅ License deactivated')

    // Try to reactivate the same license key - this should fail
    const reactivationAttempt = await licenseManager.activateLicense(validLicenseKey)

    if (reactivationAttempt.success) {
      console.log('❌ FAIL: Same license key allowed reactivation after deactivation')
      return false
    } else if (reactivationAttempt.errorCode === 'LICENSE_PERMANENTLY_DEACTIVATED') {
      console.log('✅ PASS: License reactivation properly prevented after deactivation')
      return true
    } else {
      console.log('❌ FAIL: Unexpected error preventing reactivation')
      console.log('Error:', reactivationAttempt.error)
      console.log('Error Code:', reactivationAttempt.errorCode)
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in single-use enforcement test:', error.message)
    return false
  }
}

/**
 * Test 2: Multiple Activation Attempts on Same Device
 */
async function testMultipleActivationAttempts() {
  console.log('\n🔒 Testing Multiple Activation Attempts on Same Device...')

  try {
    // Generate a unique license for this test
    const testLicenseId = `multiple-activation-test-${Date.now()}`
    const validLicenseKey = generateTestLicenseKey(30, testLicenseId)

    // First activation should succeed
    const firstActivation = await licenseManager.activateLicense(validLicenseKey)

    if (!firstActivation.success) {
      console.log('❌ FAIL: First activation failed unexpectedly')
      console.log('Error:', firstActivation.error)
      return false
    }

    console.log('✅ First activation succeeded')

    // Try to activate the same license key again without deactivating - this should fail
    const secondActivation = await licenseManager.activateLicense(validLicenseKey)

    if (secondActivation.success) {
      console.log('❌ FAIL: Same license key allowed multiple activations')
      return false
    } else if (secondActivation.errorCode === 'LICENSE_ALREADY_ACTIVATED_ON_THIS_DEVICE') {
      console.log('✅ PASS: Multiple activation attempts properly prevented')
      
      // Clean up - deactivate the license
      await licenseManager.deactivateLicense()
      return true
    } else {
      console.log('❌ FAIL: Unexpected error preventing multiple activation')
      console.log('Error:', secondActivation.error)
      console.log('Error Code:', secondActivation.errorCode)
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in multiple activation test:', error.message)
    return false
  }
}

/**
 * Test 3: License Validation After Deactivation
 */
async function testLicenseValidationAfterDeactivation() {
  console.log('\n🔒 Testing License Validation After Deactivation...')

  try {
    // Generate a unique license for this test
    const testLicenseId = `validation-test-${Date.now()}`
    const validLicenseKey = generateTestLicenseKey(30, testLicenseId)

    // Activate license
    const activation = await licenseManager.activateLicense(validLicenseKey)

    if (!activation.success) {
      console.log('❌ FAIL: License activation failed unexpectedly')
      console.log('Error:', activation.error)
      return false
    }

    console.log('✅ License activated successfully')

    // Validate license - should be valid
    const validationBeforeDeactivation = await licenseManager.validateCurrentLicense()
    
    if (!validationBeforeDeactivation.isValid) {
      console.log('❌ FAIL: License validation failed before deactivation')
      console.log('Error:', validationBeforeDeactivation.error)
      return false
    }

    console.log('✅ License validation successful before deactivation')

    // Deactivate license
    await licenseManager.deactivateLicense()
    console.log('✅ License deactivated')

    // Validate license - should be invalid (not activated)
    const validationAfterDeactivation = await licenseManager.validateCurrentLicense()
    
    if (validationAfterDeactivation.isValid) {
      console.log('❌ FAIL: License still valid after deactivation')
      return false
    } else if (validationAfterDeactivation.status === 'not_activated') {
      console.log('✅ PASS: License properly invalidated after deactivation')
      return true
    } else {
      console.log('❌ FAIL: Unexpected validation status after deactivation')
      console.log('Status:', validationAfterDeactivation.status)
      console.log('Error:', validationAfterDeactivation.error)
      return false
    }
  } catch (error) {
    console.log('❌ ERROR in validation after deactivation test:', error.message)
    return false
  }
}

/**
 * Run all single-use enforcement tests
 */
async function runSingleUseTests() {
  console.log('🚀 Starting Single-Use License Enforcement Tests...')
  console.log('=' .repeat(60))

  const tests = [
    { name: 'Single-Use Enforcement on Same Device', fn: testSingleUseEnforcementSameDevice },
    { name: 'Multiple Activation Attempts', fn: testMultipleActivationAttempts },
    { name: 'License Validation After Deactivation', fn: testLicenseValidationAfterDeactivation }
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

  console.log('\n' + '=' .repeat(60))
  console.log(`📊 Single-Use Test Results: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('🎉 All single-use enforcement tests passed!')
  } else {
    console.log('⚠️  Some single-use tests failed. Please review the implementation.')
  }

  return failed === 0
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSingleUseTests().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

module.exports = {
  runSingleUseTests,
  testSingleUseEnforcementSameDevice,
  testMultipleActivationAttempts,
  testLicenseValidationAfterDeactivation
}
