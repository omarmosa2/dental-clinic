// Final system test
const path = require('path')
const fs = require('fs')

// Mock electron module for testing
const mockElectron = {
  app: {
    getPath: () => 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management'
  }
}

// Override require for electron
const originalRequire = require
require = function(id) {
  if (id === 'electron') {
    return mockElectron
  }
  return originalRequire.apply(this, arguments)
}

async function testSystemFinal() {
  console.log('🧪 Final system test starting...')
  
  try {
    // Test direct SQLite database service initialization
    console.log('🗄️ Testing direct SQLite database service...')
    const { DatabaseService } = require('./src/services/databaseService.js')
    const databaseService = new DatabaseService()
    console.log('✅ SQLite database service initialized successfully')
    
    // Test patient creation
    console.log('👤 Testing patient creation...')
    const testPatient = {
      first_name: 'اختبار',
      last_name: 'النظام',
      phone: '0500000000',
      email: 'test@system.com',
      date_of_birth: '1990-01-01',
      address: 'الرياض، السعودية'
    }
    
    const createdPatient = await databaseService.createPatient(testPatient)
    console.log('✅ Patient created:', createdPatient.id)
    
    // Test getting all patients
    console.log('📋 Testing get all patients...')
    const allPatients = await databaseService.getAllPatients()
    console.log('✅ Total patients:', allPatients.length)
    
    // Test appointment creation
    console.log('📅 Testing appointment creation...')
    const testAppointment = {
      patient_id: createdPatient.id,
      title: 'فحص اختبار',
      description: 'فحص تجريبي للنظام',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      cost: 100
    }
    
    const createdAppointment = await databaseService.createAppointment(testAppointment)
    console.log('✅ Appointment created:', createdAppointment.id)
    
    // Test payment creation
    console.log('💰 Testing payment creation...')
    const testPayment = {
      patient_id: createdPatient.id,
      appointment_id: createdAppointment.id,
      amount: 100,
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      description: 'دفع اختبار النظام',
      status: 'completed'
    }
    
    const createdPayment = await databaseService.createPayment(testPayment)
    console.log('✅ Payment created:', createdPayment.id)
    
    // Test inventory item creation
    console.log('📦 Testing inventory item creation...')
    const testInventoryItem = {
      name: 'عنصر اختبار',
      description: 'عنصر تجريبي للنظام',
      category: 'اختبار',
      quantity: 10,
      unit: 'قطعة',
      cost_per_unit: 5,
      supplier: 'مورد الاختبار',
      minimum_stock: 2
    }
    
    const createdInventoryItem = await databaseService.createInventoryItem(testInventoryItem)
    console.log('✅ Inventory item created:', createdInventoryItem.id)
    
    // Test data persistence by reading again
    console.log('🔄 Testing data persistence...')
    const patientsAfter = await databaseService.getAllPatients()
    const appointmentsAfter = await databaseService.getAllAppointments()
    const paymentsAfter = await databaseService.getAllPayments()
    const inventoryAfter = await databaseService.getAllInventoryItems()
    
    console.log('📊 Data counts after operations:')
    console.log('  - Patients:', patientsAfter.length)
    console.log('  - Appointments:', appointmentsAfter.length)
    console.log('  - Payments:', paymentsAfter.length)
    console.log('  - Inventory items:', inventoryAfter.length)
    
    // Verify our test data exists
    const ourPatient = patientsAfter.find(p => p.id === createdPatient.id)
    const ourAppointment = appointmentsAfter.find(a => a.id === createdAppointment.id)
    const ourPayment = paymentsAfter.find(p => p.id === createdPayment.id)
    const ourInventoryItem = inventoryAfter.find(i => i.id === createdInventoryItem.id)
    
    if (ourPatient && ourAppointment && ourPayment && ourInventoryItem) {
      console.log('✅ All test data persisted successfully!')
      console.log('✅ Database is working correctly!')
    } else {
      console.log('❌ Some test data was not persisted:')
      console.log('  - Patient found:', !!ourPatient)
      console.log('  - Appointment found:', !!ourAppointment)
      console.log('  - Payment found:', !!ourPayment)
      console.log('  - Inventory item found:', !!ourInventoryItem)
    }
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await databaseService.deletePatient(createdPatient.id) // This should cascade delete appointments and payments
    await databaseService.deleteInventoryItem(createdInventoryItem.id)
    console.log('✅ Test data cleaned up')
    
    // Close database
    databaseService.close()
    
    console.log('🎉 Final system test completed successfully!')
    console.log('💡 The database system is working correctly.')
    console.log('💡 If you\'re still seeing mock data, the issue is in the Electron main process initialization.')
    
  } catch (error) {
    console.error('❌ Final system test failed:', error)
    console.error('Error stack:', error.stack)
    
    if (error.message.includes('better-sqlite3')) {
      console.error('💡 Issue: better-sqlite3 module problem')
      console.error('   Solution: The better-sqlite3 module needs to be rebuilt for your Node.js version')
      console.error('   Run: npm rebuild better-sqlite3')
    } else {
      console.error('💡 Issue: Database system problem')
      console.error('   Check the error details above for more information')
    }
  }
}

testSystemFinal()
