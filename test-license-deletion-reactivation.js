/**
 * Test License Deletion and Reactivation Functionality
 * Tests the strict license enforcement features implemented
 */

const { licenseManager } = require('./electron/licenseService.js')
const fs = require('fs')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  testLicenseValidityMinutes: 30, // 30 minutes for testing
  testOutputDir: 'test-licenses'
}

// Utility functions
function generateTestLicense(validityMinutes = 30) {
  const licenseId = `test-deletion-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const now = new Date()
  const createdAt = now.toISOString()
  
  // Convert minutes to days (fractional)
  const maxDays = validityMinutes / (24 * 60)
  
  const licenseData = {
    licenseId,
    licenseType: 'standard',
    maxDays,
    createdAt,
    features: ['basic_features'],
    metadata: { testLicense: true }
  }
  
  // Simple signature for testing (in real implementation this would be cryptographically signed)
  const dataForSignature = JSON.stringify({
    licenseId: licenseData.licenseId,
    licenseType: licenseData.licenseType,
    maxDays: licenseData.maxDays,
    createdAt: licenseData.createdAt
  })
  
  licenseData.signature = Buffer.from(dataForSignature).toString('base64')
  
  return JSON.stringify(licenseData)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test functions
async function testLicenseDeletionBlocking() {
  console.log('🔒 Testing License Deletion System Blocking...')
  
  try {
    // Generate a test license
    const testLicenseKey = generateTestLicense(30) // 30 minutes
    console.log('✅ Test license generated')
    
    // Activate the license
    const activationResult = await licenseManager.activateLicense(testLicenseKey)
    if (!activationResult.success) {
      console.log('❌ FAIL: License activation failed:', activationResult.error)
      return false
    }
    console.log('✅ License activated successfully')
    
    // Verify license is valid
    const validationBefore = await licenseManager.validateCurrentLicense()
    if (!validationBefore.isValid) {
      console.log('❌ FAIL: License should be valid after activation')
      return false
    }
    console.log('✅ License validation successful before deletion')
    
    // Delete the license
    await licenseManager.deactivateLicense()
    console.log('✅ License deleted/deactivated')
    
    // Verify license is now invalid (system should be blocked)
    const validationAfter = await licenseManager.validateCurrentLicense()
    if (validationAfter.isValid) {
      console.log('❌ FAIL: License should be invalid after deletion')
      return false
    }
    
    if (validationAfter.status !== 'not_activated') {
      console.log('❌ FAIL: License status should be NOT_ACTIVATED after deletion, got:', validationAfter.status)
      return false
    }
    
    console.log('✅ PASS: License deletion properly blocks system access')
    return true
    
  } catch (error) {
    console.log('❌ ERROR in license deletion test:', error.message)
    return false
  }
}

async function testLicenseReactivation() {
  console.log('🔒 Testing License Reactivation Capability...')
  
  try {
    // Generate a test license with longer validity
    const testLicenseKey = generateTestLicense(60) // 60 minutes
    console.log('✅ Test license generated for reactivation test')
    
    // First activation
    const firstActivation = await licenseManager.activateLicense(testLicenseKey)
    if (!firstActivation.success) {
      console.log('❌ FAIL: First license activation failed:', firstActivation.error)
      return false
    }
    console.log('✅ First license activation successful')
    
    // Verify license is valid
    const validationFirst = await licenseManager.validateCurrentLicense()
    if (!validationFirst.isValid) {
      console.log('❌ FAIL: License should be valid after first activation')
      return false
    }
    console.log('✅ License validation successful after first activation')
    
    // Delete the license (simulate user deletion)
    await licenseManager.deactivateLicense()
    console.log('✅ License deleted (simulating user deletion)')
    
    // Wait a moment to ensure deletion is processed
    await sleep(1000)
    
    // Verify license is now invalid
    const validationAfterDeletion = await licenseManager.validateCurrentLicense()
    if (validationAfterDeletion.isValid) {
      console.log('❌ FAIL: License should be invalid after deletion')
      return false
    }
    console.log('✅ License properly invalidated after deletion')
    
    // Attempt reactivation with the same license key
    const reactivationResult = await licenseManager.activateLicense(testLicenseKey)
    if (!reactivationResult.success) {
      console.log('❌ FAIL: License reactivation failed:', reactivationResult.error)
      return false
    }
    console.log('✅ License reactivation successful')
    
    // Verify license is valid again
    const validationAfterReactivation = await licenseManager.validateCurrentLicense()
    if (!validationAfterReactivation.isValid) {
      console.log('❌ FAIL: License should be valid after reactivation')
      return false
    }
    
    console.log('✅ PASS: License reactivation works correctly for valid licenses')
    return true
    
  } catch (error) {
    console.log('❌ ERROR in license reactivation test:', error.message)
    return false
  }
}

async function testExpiredLicenseReactivationPrevention() {
  console.log('🔒 Testing Expired License Reactivation Prevention...')
  
  try {
    // Generate a test license with very short validity (1 minute)
    const testLicenseKey = generateTestLicense(1) // 1 minute
    console.log('✅ Short-validity test license generated')
    
    // Activate the license
    const activationResult = await licenseManager.activateLicense(testLicenseKey)
    if (!activationResult.success) {
      console.log('❌ FAIL: License activation failed:', activationResult.error)
      return false
    }
    console.log('✅ License activated successfully')
    
    // Delete the license immediately
    await licenseManager.deactivateLicense()
    console.log('✅ License deleted')
    
    // Wait for the license to expire (simulate time passing)
    console.log('⏳ Waiting for license to expire...')
    await sleep(65000) // Wait 65 seconds (longer than 1 minute validity)
    
    // Attempt reactivation of expired license
    const reactivationResult = await licenseManager.activateLicense(testLicenseKey)
    if (reactivationResult.success) {
      console.log('❌ FAIL: Expired license should not be reactivatable')
      return false
    }
    
    if (!reactivationResult.error.includes('انتهت صلاحيته الأصلية')) {
      console.log('❌ FAIL: Wrong error message for expired license reactivation:', reactivationResult.error)
      return false
    }
    
    console.log('✅ PASS: Expired license reactivation properly prevented')
    return true
    
  } catch (error) {
    console.log('❌ ERROR in expired license reactivation test:', error.message)
    return false
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting License Deletion and Reactivation Tests...')
  console.log('='.repeat(60))
  
  const tests = [
    { name: 'License Deletion System Blocking', fn: testLicenseDeletionBlocking },
    { name: 'License Reactivation Capability', fn: testLicenseReactivation },
    { name: 'Expired License Reactivation Prevention', fn: testExpiredLicenseReactivationPrevention }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    console.log(`\n🧪 ${test.name}...`)
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
  
  console.log('\n' + '='.repeat(60))
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All license deletion and reactivation tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.')
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  runAllTests,
  testLicenseDeletionBlocking,
  testLicenseReactivation,
  testExpiredLicenseReactivationPrevention
}
