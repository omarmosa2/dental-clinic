const { join } = require('path')
const { app } = require('electron')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { LowDBService } = require('./lowdbService')
const { DatabaseService } = require('./databaseService')

class DataMigrationService {
  constructor() {
    this.lowdbService = new LowDBService()
    this.sqliteService = new DatabaseService()
    this.backupPath = join(app.getPath('userData'), 'migration_backup.json')
  }

  /**
   * Main migration method - transfers all data from LowDB to SQLite
   */
  async migrateData() {
    try {
      console.log('🚀 Starting data migration from LowDB to SQLite...')

      // Step 1: Create backup of current data
      await this.createBackup()
      console.log('✅ Backup created successfully')

      // Step 2: Validate LowDB data
      const lowdbData = await this.validateLowDBData()
      console.log('✅ LowDB data validated')

      // Step 3: Clear SQLite database (fresh start)
      await this.clearSQLiteDatabase()
      console.log('✅ SQLite database cleared')

      // Step 4: Migrate data in correct order (respecting foreign keys)
      const stats = await this.performMigration(lowdbData)
      console.log('✅ Data migration completed')

      // Step 5: Validate migrated data
      await this.validateMigration(stats)
      console.log('✅ Migration validation successful')

      return {
        success: true,
        message: 'Data migration completed successfully',
        stats
      }
    } catch (error) {
      console.error('❌ Migration failed:', error)

      // Attempt to restore from backup
      try {
        await this.restoreFromBackup()
        console.log('✅ Restored from backup after migration failure')
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError)
      }

      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats: null
      }
    }
  }

  /**
   * Create backup of current LowDB data
   */
  async createBackup() {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')

    if (!existsSync(lowdbPath)) {
      throw new Error('LowDB file not found. Nothing to migrate.')
    }

    const data = readFileSync(lowdbPath, 'utf-8')
    writeFileSync(this.backupPath, data)
  }

  /**
   * Validate LowDB data structure and integrity
   */
  async validateLowDBData() {
    const patients = await this.lowdbService.getAllPatients()
    const appointments = await this.lowdbService.getAllAppointments()
    const payments = await this.lowdbService.getAllPayments()
    const treatments = await this.lowdbService.getAllTreatments()
    const inventory = await this.lowdbService.getAllInventoryItems()
    const settings = await this.lowdbService.getSettings()
    const inventoryUsage = await this.lowdbService.getAllInventoryUsage()
    const patientImages = await this.lowdbService.getAllPatientImages()
    const installmentPayments = await this.lowdbService.getAllInstallmentPayments()

    // Validate data integrity
    this.validateDataIntegrity({
      patients,
      appointments,
      payments,
      treatments,
      inventory,
      settings: settings ? [settings] : [],
      inventoryUsage,
      patientImages,
      installmentPayments
    })

    return {
      patients,
      appointments,
      payments,
      treatments,
      inventory,
      settings: settings ? [settings] : [],
      inventoryUsage,
      patientImages,
      installmentPayments
    }
  }

  /**
   * Validate data integrity and relationships
   */
  validateDataIntegrity(data) {
    // Check for required fields in patients
    data.patients.forEach((patient, index) => {
      if (!patient.id || !patient.first_name || !patient.last_name) {
        throw new Error(`Invalid patient data at index ${index}: missing required fields`)
      }
    })

    // Check for valid patient references in appointments and clean up orphaned records
    const patientIds = new Set(data.patients.map(p => p.id))

    // Filter out appointments with invalid patient references
    const validAppointments = data.appointments.filter((appointment, index) => {
      if (appointment.patient_id && !patientIds.has(appointment.patient_id)) {
        console.warn(`Removing appointment at index ${index} - references non-existent patient: ${appointment.patient_id}`)
        return false
      }
      return true
    })
    data.appointments = validAppointments

    // Filter out payments with invalid patient references
    const validPayments = data.payments.filter((payment, index) => {
      if (payment.patient_id && !patientIds.has(payment.patient_id)) {
        console.warn(`Removing payment at index ${index} - references non-existent patient: ${payment.patient_id}`)
        return false
      }
      return true
    })
    data.payments = validPayments

    console.log(`✅ Data integrity validated and cleaned: ${data.patients.length} patients, ${data.appointments.length} appointments, ${data.payments.length} payments`)
  }

  /**
   * Clear SQLite database for fresh migration
   */
  async clearSQLiteDatabase() {
    await this.sqliteService.clearAllPatients()
    await this.sqliteService.clearAllAppointments()
    await this.sqliteService.clearAllPayments()
    await this.sqliteService.clearAllTreatments()
    await this.sqliteService.clearAllInventory()
  }

  /**
   * Perform the actual data migration in correct order
   */
  async performMigration(data) {
    const stats = {
      patients: 0,
      treatments: 0,
      appointments: 0,
      payments: 0,
      inventory: 0,
      inventoryUsage: 0,
      patientImages: 0,
      installmentPayments: 0,
      settings: 0
    }

    // Migrate in dependency order
    console.log('📊 Migrating treatments...')
    for (const treatment of data.treatments) {
      await this.sqliteService.createTreatment(treatment)
      stats.treatments++
    }

    console.log('👥 Migrating patients...')
    for (const patient of data.patients) {
      await this.sqliteService.createPatient(patient)
      stats.patients++
    }

    console.log('📅 Migrating appointments...')
    for (const appointment of data.appointments) {
      await this.sqliteService.createAppointment(appointment)
      stats.appointments++
    }

    console.log('💰 Migrating payments...')
    for (const payment of data.payments) {
      await this.sqliteService.createPayment(payment)
      stats.payments++
    }

    console.log('📦 Migrating inventory...')
    for (const item of data.inventory) {
      await this.sqliteService.createInventoryItem(item)
      stats.inventory++
    }

    console.log('⚙️ Migrating settings...')
    if (data.settings && data.settings.length > 0) {
      await this.sqliteService.updateSettings(data.settings[0])
      stats.settings++
    }

    return stats
  }

  /**
   * Validate migration results
   */
  async validateMigration(stats) {
    const sqlitePatients = await this.sqliteService.getAllPatients()
    const sqliteAppointments = await this.sqliteService.getAllAppointments()
    const sqlitePayments = await this.sqliteService.getAllPayments()
    const sqliteTreatments = await this.sqliteService.getAllTreatments()
    const sqliteInventory = await this.sqliteService.getAllInventoryItems()

    if (sqlitePatients.length !== stats.patients) {
      throw new Error(`Patient migration mismatch: expected ${stats.patients}, got ${sqlitePatients.length}`)
    }

    if (sqliteAppointments.length !== stats.appointments) {
      throw new Error(`Appointment migration mismatch: expected ${stats.appointments}, got ${sqliteAppointments.length}`)
    }

    if (sqlitePayments.length !== stats.payments) {
      throw new Error(`Payment migration mismatch: expected ${stats.payments}, got ${sqlitePayments.length}`)
    }

    if (sqliteTreatments.length !== stats.treatments) {
      throw new Error(`Treatment migration mismatch: expected ${stats.treatments}, got ${sqliteTreatments.length}`)
    }

    if (sqliteInventory.length !== stats.inventory) {
      throw new Error(`Inventory migration mismatch: expected ${stats.inventory}, got ${sqliteInventory.length}`)
    }

    console.log('✅ Migration validation passed - all data counts match')
  }

  /**
   * Restore from backup in case of migration failure
   */
  async restoreFromBackup() {
    if (!existsSync(this.backupPath)) {
      throw new Error('Backup file not found for restoration')
    }

    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const backupData = readFileSync(this.backupPath, 'utf-8')
    writeFileSync(lowdbPath, backupData)
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded() {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const sqlitePath = join(app.getPath('userData'), 'dental_clinic.db')

    // If LowDB exists but SQLite is empty or doesn't exist, migration is needed
    if (existsSync(lowdbPath)) {
      if (!existsSync(sqlitePath)) {
        return true
      }

      // Check if SQLite has data
      const patients = await this.sqliteService.getAllPatients()
      return patients.length === 0
    }

    return false
  }

  /**
   * Get migration status and statistics
   */
  async getMigrationStatus() {
    const lowdbPath = join(app.getPath('userData'), 'dental_clinic.json')
    const sqlitePath = join(app.getPath('userData'), 'dental_clinic.db')

    const lowdbExists = existsSync(lowdbPath)
    const sqliteExists = existsSync(sqlitePath)

    let lowdbRecordCount = 0
    let sqliteRecordCount = 0

    if (lowdbExists) {
      const patients = await this.lowdbService.getAllPatients()
      lowdbRecordCount = patients.length
    }

    if (sqliteExists) {
      const patients = await this.sqliteService.getAllPatients()
      sqliteRecordCount = patients.length
    }

    const migrationNeeded = await this.isMigrationNeeded()

    return {
      lowdbExists,
      sqliteExists,
      lowdbRecordCount,
      sqliteRecordCount,
      migrationNeeded
    }
  }

  /**
   * Clean up resources
   */
  close() {
    if (this.sqliteService) {
      this.sqliteService.close()
    }
  }
}

module.exports = { DataMigrationService }
