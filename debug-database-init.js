// Debug database initialization
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

async function debugDatabaseInit() {
  console.log('🔍 Starting database initialization debug...')

  try {
    console.log('📂 User data path:', mockElectron.app.getPath('userData'))

    // Test DatabaseService import
    console.log('📦 Testing DatabaseService import...')
    const { DatabaseService } = require('./src/services/databaseService.js')
    console.log('✅ DatabaseService imported successfully')

    // Test DataMigrationService import
    console.log('📦 Testing DataMigrationService import...')
    const { DataMigrationService } = require('./src/services/dataMigrationService.js')
    console.log('✅ DataMigrationService imported successfully')

    // Test migration status
    console.log('🔄 Checking migration status...')
    const migrationService = new DataMigrationService()
    const migrationStatus = await migrationService.getMigrationStatus()
    console.log('Migration status:', migrationStatus)

    if (migrationStatus.migrationNeeded) {
      console.log('🔄 Migration needed, starting migration...')
      const migrationResult = await migrationService.migrateData()
      console.log('Migration result:', migrationResult)
    } else {
      console.log('✅ No migration needed')
    }

    // Test DatabaseService initialization
    console.log('🗄️ Testing DatabaseService initialization...')
    const databaseService = new DatabaseService()
    console.log('✅ DatabaseService initialized successfully')

    // Test basic operations
    console.log('🧪 Testing basic database operations...')
    const patients = await databaseService.getAllPatients()
    console.log('✅ Got patients:', patients.length)

    const appointments = await databaseService.getAllAppointments()
    console.log('✅ Got appointments:', appointments.length)

    const payments = await databaseService.getAllPayments()
    console.log('✅ Got payments:', payments.length)

    const inventory = await databaseService.getAllInventoryItems()
    console.log('✅ Got inventory items:', inventory.length)

    // Clean up
    migrationService.close()
    databaseService.close()

    console.log('🎉 All tests passed! Database initialization should work.')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    console.error('Error stack:', error.stack)

    // Try to identify the specific issue
    if (error.message.includes('better-sqlite3')) {
      console.error('💡 Issue: better-sqlite3 module problem')
      console.error('   Solution: Try rebuilding better-sqlite3')
    } else if (error.message.includes('ENOENT')) {
      console.error('💡 Issue: File not found')
      console.error('   Solution: Check file paths')
    } else if (error.message.includes('database')) {
      console.error('💡 Issue: Database connection problem')
      console.error('   Solution: Check database file permissions')
    } else {
      console.error('💡 Issue: Unknown error')
      console.error('   Solution: Check the error details above')
    }
  }
}

// Run the debug
debugDatabaseInit()
