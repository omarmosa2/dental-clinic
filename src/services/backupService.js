const { app } = require('electron')
const { join, basename } = require('path')
const { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, readFileSync, writeFileSync } = require('fs')

class BackupService {
  constructor(databaseService) {
    this.databaseService = databaseService
    this.backupDir = join(app.getPath('userData'), 'backups')
    this.backupRegistryPath = join(app.getPath('userData'), 'backup_registry.json')
    this.sqliteDbPath = join(app.getPath('userData'), 'dental_clinic.db')
    this.ensureBackupDirectory()
    this.ensureBackupRegistry()
  }

  ensureBackupDirectory() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  ensureBackupRegistry() {
    if (!existsSync(this.backupRegistryPath)) {
      writeFileSync(this.backupRegistryPath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  getBackupRegistry() {
    try {
      const content = readFileSync(this.backupRegistryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read backup registry:', error)
      return []
    }
  }

  addToBackupRegistry(backupInfo) {
    try {
      const registry = this.getBackupRegistry()

      // Check if backup with same name already exists
      const existingIndex = registry.findIndex(backup => backup.name === backupInfo.name)
      if (existingIndex !== -1) {
        // Update existing entry instead of adding duplicate
        registry[existingIndex] = backupInfo
        console.log(`📝 Updated existing backup registry entry: ${backupInfo.name}`)
      } else {
        // Add new backup to beginning of array
        registry.unshift(backupInfo)
        console.log(`➕ Added new backup to registry: ${backupInfo.name}`)
      }

      // Keep only last 50 backups in registry
      if (registry.length > 50) {
        registry.splice(50)
      }

      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update backup registry:', error)
    }
  }

  async createBackup(customPath = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup_${timestamp}`

    try {
      console.log('🚀 Starting SQLite backup creation...')
      console.log('📍 Custom path provided:', customPath)

      let backupPath
      if (customPath) {
        // Use the custom path provided by user (remove extension if provided)
        backupPath = customPath.replace(/\.(json|db|sqlite)$/, '') + '.db'

        // Double check - force .db extension
        if (!backupPath.endsWith('.db')) {
          backupPath += '.db'
        }

        console.log('📍 Using custom path (modified):', backupPath)
        console.log('📍 Original custom path was:', customPath)
      } else {
        // Use default backup directory
        backupPath = join(this.backupDir, `${backupName}.db`)
        console.log('📍 Using default path:', backupPath)
      }

      console.log('📍 SQLite DB path:', this.sqliteDbPath)
      console.log('📍 Target backup path:', backupPath)

      // Verify source database exists and has data
      if (!existsSync(this.sqliteDbPath)) {
        console.error('❌ SQLite database file not found at:', this.sqliteDbPath)
        throw new Error('SQLite database file not found')
      }

      // Check source database size and content
      const sourceStats = statSync(this.sqliteDbPath)
      console.log('📊 Source database size:', sourceStats.size, 'bytes')

      if (sourceStats.size === 0) {
        console.warn('⚠️ Source database file is empty!')
        throw new Error('Source database file is empty')
      }

      // Verify database connection is working before backup
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Database contains', result.count, 'tables')

        // Test a few key tables
        const tables = ['patients', 'appointments', 'payments', 'treatments']
        for (const table of tables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query table ${table}:`, tableError.message)
          }
        }
      } catch (dbError) {
        console.error('❌ Database connection test failed:', dbError)
        throw new Error('Database connection is not working properly')
      }

      console.log('📁 Creating SQLite database backup...')
      copyFileSync(this.sqliteDbPath, backupPath)

      // Verify backup was created successfully
      if (!existsSync(backupPath)) {
        throw new Error('Backup file was not created successfully')
      }

      const backupStats = statSync(backupPath)
      console.log('📊 Backup file size:', backupStats.size, 'bytes')

      if (backupStats.size !== sourceStats.size) {
        console.warn('⚠️ Backup file size differs from source!')
        console.warn('Source:', sourceStats.size, 'bytes, Backup:', backupStats.size, 'bytes')
      }

      console.log('✅ SQLite database backup created successfully')

      // Get file stats
      const sqliteStats = statSync(backupPath)

      // Create metadata for backup registry
      const metadata = {
        created_at: new Date().toISOString(),
        version: '3.0.0', // Updated version for SQLite-only
        platform: process.platform,
        backup_type: 'full',
        database_type: 'sqlite',
        backup_format: 'sqlite_only' // SQLite only
      }

      // Add to backup registry
      const backupInfo = {
        name: basename(backupPath, '.db'),
        path: backupPath,
        size: sqliteStats.size,
        created_at: metadata.created_at,
        version: metadata.version,
        platform: metadata.platform,
        database_type: 'sqlite',
        backup_format: 'sqlite_only'
      }
      this.addToBackupRegistry(backupInfo)

      console.log(`✅ SQLite backup created successfully:`)
      console.log(`   File: ${backupPath}`)
      console.log(`   Size: ${this.formatFileSize(sqliteStats.size)}`)

      return backupPath

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async restoreBackup(backupPath) {
    try {
      console.log('🔄 Starting backup restoration...')

      // Check if backup file exists
      let actualBackupPath = backupPath

      // If path doesn't have .db extension, add it
      if (!backupPath.endsWith('.db')) {
        actualBackupPath = `${backupPath}.db`
      }

      // Check if the backup file exists
      if (!existsSync(actualBackupPath)) {
        // Try legacy JSON format for backward compatibility
        const jsonBackupPath = backupPath.replace(/\.db$/, '.json')
        if (existsSync(jsonBackupPath)) {
          console.log('📄 Found legacy JSON backup, restoring...')
          return await this.restoreLegacyBackup(jsonBackupPath)
        }
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${actualBackupPath}`)
      }

      console.log(`📁 Found SQLite backup: ${actualBackupPath}`)

      // Create backup of current database before restoration
      const { app } = require('electron')
      const currentDbBackupPath = join(app.getPath('userData'), `current_db_backup_${Date.now()}.db`)
      if (existsSync(this.sqliteDbPath)) {
        copyFileSync(this.sqliteDbPath, currentDbBackupPath)
        console.log(`💾 Current database backed up to: ${currentDbBackupPath}`)
      }

      try {
        // Direct SQLite restoration
        console.log('🗄️ Restoring from SQLite backup...')
        await this.restoreFromSqliteBackup(actualBackupPath)

        console.log('✅ Backup restored successfully')

        // Clean up temporary backup
        if (existsSync(currentDbBackupPath)) {
          rmSync(currentDbBackupPath)
        }

        return true

      } catch (error) {
        // Restore original database if restoration failed
        console.error('❌ Restoration failed, restoring original database...')
        if (existsSync(currentDbBackupPath)) {
          copyFileSync(currentDbBackupPath, this.sqliteDbPath)
          rmSync(currentDbBackupPath)
          console.log('✅ Original database restored')
        }
        throw error
      }

    } catch (error) {
      console.error('❌ Backup restoration failed:', error)
      throw new Error(`فشل في استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async restoreFromSqliteBackup(sqliteBackupPath) {
    try {
      console.log('🔄 Starting SQLite database restoration...')

      // Verify backup file exists and has content
      if (!existsSync(sqliteBackupPath)) {
        throw new Error(`Backup file not found: ${sqliteBackupPath}`)
      }

      const backupStats = statSync(sqliteBackupPath)
      console.log('📊 Backup file size:', backupStats.size, 'bytes')

      if (backupStats.size === 0) {
        throw new Error('Backup file is empty')
      }

      // Test backup file integrity by trying to open it
      try {
        const Database = require('better-sqlite3')
        const testDb = new Database(sqliteBackupPath, { readonly: true })

        // Test basic queries
        const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const tablesResult = tablesQuery.get()
        console.log('📋 Backup contains', tablesResult.count, 'tables')

        // Test key tables
        const tables = ['patients', 'appointments', 'payments', 'treatments']
        for (const table of tables) {
          try {
            const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Backup table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query backup table ${table}:`, tableError.message)
          }
        }

        testDb.close()
        console.log('✅ Backup file integrity verified')
      } catch (integrityError) {
        console.error('❌ Backup file integrity check failed:', integrityError)
        throw new Error('Backup file is corrupted or invalid')
      }

      // Close current database connection
      console.log('📁 Closing current database connection...')
      this.databaseService.close()
      console.log('📁 Database connection closed')

      // Wait a moment to ensure file handles are released
      await new Promise(resolve => setTimeout(resolve, 100))

      // Replace current database with backup
      console.log('📋 Replacing database file with backup...')
      copyFileSync(sqliteBackupPath, this.sqliteDbPath)
      console.log('📋 Database file replaced with backup')

      // Verify the replacement was successful
      const newStats = statSync(this.sqliteDbPath)
      console.log('📊 New database file size:', newStats.size, 'bytes')

      if (newStats.size !== backupStats.size) {
        console.warn('⚠️ Database file size differs after restoration!')
        console.warn('Expected:', backupStats.size, 'bytes, Actual:', newStats.size, 'bytes')
      }

      // Reinitialize database service
      console.log('🔄 Reinitializing database service...')
      this.databaseService.reinitialize()
      console.log('✅ Database service reinitialized')

      // Verify the restored database works
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Restored database contains', result.count, 'tables')

        // Test key tables
        const tables = ['patients', 'appointments', 'payments', 'treatments']
        for (const table of tables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Restored table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query restored table ${table}:`, tableError.message)
          }
        }

        console.log('✅ SQLite database restored and verified successfully')
      } catch (verifyError) {
        console.error('❌ Database verification after restore failed:', verifyError)
        throw new Error('Database restoration completed but verification failed')
      }

    } catch (error) {
      console.error('❌ Failed to restore SQLite backup:', error)
      // Try to reinitialize anyway
      try {
        console.log('🔄 Attempting to reinitialize database after error...')
        this.databaseService.reinitialize()
        console.log('✅ Database reinitialized after error')
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize database:', reinitError)
      }
      throw error
    }
  }

  async restoreLegacyBackup(backupPath) {
    console.log('📄 Restoring legacy backup format...')

    // Read and parse legacy backup data
    const backupContent = readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)

    // Validate backup structure
    if (!backupData.metadata || !backupData.patients || !backupData.appointments) {
      throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح - بيانات مفقودة')
    }

    console.log(`Restoring backup created on: ${backupData.metadata.created_at}`)
    console.log(`Backup version: ${backupData.metadata.version}`)
    console.log(`Platform: ${backupData.metadata.platform}`)

    console.log('Backup file validated, starting data restoration...')

    // Clear existing data and restore from backup
    if (backupData.patients) {
      await this.databaseService.clearAllPatients()
      for (const patient of backupData.patients) {
        await this.databaseService.createPatient(patient)
      }
    }

    if (backupData.appointments) {
      await this.databaseService.clearAllAppointments()
      for (const appointment of backupData.appointments) {
        await this.databaseService.createAppointment(appointment)
      }
    }

    if (backupData.payments) {
      await this.databaseService.clearAllPayments()
      for (const payment of backupData.payments) {
        await this.databaseService.createPayment(payment)
      }
    }

    if (backupData.treatments) {
      await this.databaseService.clearAllTreatments()
      for (const treatment of backupData.treatments) {
        await this.databaseService.createTreatment(treatment)
      }
    }

    if (backupData.settings) {
      await this.databaseService.updateSettings(backupData.settings)
    }

    console.log('Legacy backup restored successfully')
    return true
  }

  async listBackups() {
    try {
      const registry = this.getBackupRegistry()

      // Filter out backups that no longer exist
      const validBackups = registry.filter(backup => {
        try {
          // Check if the backup file exists
          return existsSync(backup.path)
        } catch (error) {
          return false
        }
      })

      // Remove duplicates based on backup name
      const uniqueBackups = []
      const seenNames = new Set()

      for (const backup of validBackups) {
        if (!seenNames.has(backup.name)) {
          seenNames.add(backup.name)
          uniqueBackups.push(backup)
        } else {
          console.log(`🔍 Removed duplicate backup entry: ${backup.name}`)
        }
      }

      // Update registry if some backups were removed or duplicates found
      if (uniqueBackups.length !== registry.length) {
        writeFileSync(this.backupRegistryPath, JSON.stringify(uniqueBackups, null, 2), 'utf-8')
        console.log(`🧹 Cleaned up backup registry: ${registry.length} -> ${uniqueBackups.length} entries`)
      }

      // Add formatted file sizes and additional info
      return uniqueBackups.map(backup => ({
        ...backup,
        formattedSize: this.formatFileSize(backup.size),
        isSqliteOnly: backup.backup_format === 'sqlite_only',
        isLegacy: backup.backup_format === 'hybrid' || !backup.backup_format
      }))
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  async deleteOldBackups(keepCount = 10) {
    try {
      const backups = await this.listBackups()

      if (backups.length > keepCount) {
        // Sort by creation date (newest first)
        const sortedBackups = backups.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const backupsToDelete = sortedBackups.slice(keepCount)

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.name)
          console.log(`🗑️ Deleted old backup: ${backup.name}`)
        }

        console.log(`✅ Cleaned up ${backupsToDelete.length} old backups, keeping ${keepCount} most recent`)
      }
    } catch (error) {
      console.error('❌ Failed to delete old backups:', error)
    }
  }

  async deleteBackup(backupName) {
    try {
      // Find backup in registry
      const registry = this.getBackupRegistry()
      const backupIndex = registry.findIndex(backup => backup.name === backupName)

      if (backupIndex === -1) {
        throw new Error('Backup not found in registry')
      }

      const backup = registry[backupIndex]

      // Delete the backup file
      if (existsSync(backup.path)) {
        rmSync(backup.path)
        console.log(`Deleted backup: ${backup.path}`)
      }

      // Remove from registry
      registry.splice(backupIndex, 1)
      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')

      console.log(`✅ Backup deleted successfully: ${backupName}`)
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      throw error
    }
  }

  async scheduleAutomaticBackups(frequency) {
    const intervals = {
      hourly: 60 * 60 * 1000,      // 1 hour
      daily: 24 * 60 * 60 * 1000,  // 24 hours
      weekly: 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    setInterval(async () => {
      try {
        await this.createBackup()
        await this.deleteOldBackups()
      } catch (error) {
        console.error('Scheduled backup failed:', error)
      }
    }, intervals[frequency])
  }


}

module.exports = { BackupService }
