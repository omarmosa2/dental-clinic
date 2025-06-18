import { app } from 'electron'
import { join, basename } from 'path'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'fs'
import { LowDBService } from './lowdbService'

export class BackupService {
  private backupDir: string
  private backupRegistryPath: string

  constructor(private databaseService: LowDBService) {
    this.backupDir = join(app.getPath('userData'), 'backups')
    this.backupRegistryPath = join(app.getPath('userData'), 'backup_registry.json')
    this.ensureBackupDirectory()
    this.ensureBackupRegistry()
  }

  private ensureBackupDirectory() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  private ensureBackupRegistry() {
    if (!existsSync(this.backupRegistryPath)) {
      const fs = require('fs')
      fs.writeFileSync(this.backupRegistryPath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  private getBackupRegistry(): any[] {
    try {
      const fs = require('fs')
      const content = fs.readFileSync(this.backupRegistryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read backup registry:', error)
      return []
    }
  }

  private addToBackupRegistry(backupInfo: any) {
    try {
      const registry = this.getBackupRegistry()
      registry.unshift(backupInfo) // Add to beginning of array

      // Keep only last 50 backups in registry
      if (registry.length > 50) {
        registry.splice(50)
      }

      const fs = require('fs')
      fs.writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update backup registry:', error)
    }
  }

  async createBackup(customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup_${timestamp}.json`

    let backupPath: string
    if (customPath) {
      // Use the custom path provided by user
      backupPath = customPath
    } else {
      // Use default backup directory
      backupPath = join(this.backupDir, backupName)
    }

    try {
      console.log('Starting backup creation...')

      // Get all data from the database
      const backupData = {
        metadata: {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          platform: process.platform,
          backup_type: 'full'
        },
        patients: await this.databaseService.getAllPatients(),
        appointments: await this.databaseService.getAllAppointments(),
        payments: await this.databaseService.getAllPayments(),
        treatments: await this.databaseService.getAllTreatments(),
        settings: await this.databaseService.getSettings(),
        // Include license data in backup (encrypted)
        license: await this.getLicenseBackupData()
      }

      // Write backup data to file
      const fs = require('fs')
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8')

      // Add to backup registry
      const stats = fs.statSync(backupPath)
      const backupInfo = {
        name: basename(backupPath),
        path: backupPath,
        size: stats.size,
        created_at: backupData.metadata.created_at,
        version: backupData.metadata.version,
        platform: backupData.metadata.platform
      }
      this.addToBackupRegistry(backupInfo)

      console.log(`Backup created successfully: ${backupPath}`)
      return backupPath

    } catch (error) {
      console.error('Backup creation failed:', error)
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      console.log('Starting backup restoration...')

      // Read backup file
      const fs = require('fs')
      if (!existsSync(backupPath)) {
        throw new Error('ملف النسخة الاحتياطية غير موجود')
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8')
      let backupData: any

      try {
        backupData = JSON.parse(backupContent)
      } catch (parseError) {
        throw new Error('ملف النسخة الاحتياطية غير صالح - تنسيق JSON خاطئ')
      }

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

      // Restore license data if present
      if (backupData.license) {
        await this.restoreLicenseBackupData(backupData.license)
      }

      console.log('Backup restored successfully')
      return true

    } catch (error) {
      console.error('Backup restoration failed:', error)
      throw new Error(`فشل في استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async listBackups(): Promise<any[]> {
    try {
      const registry = this.getBackupRegistry()

      // Filter out backups that no longer exist
      const validBackups = registry.filter(backup => {
        try {
          return existsSync(backup.path)
        } catch (error) {
          return false
        }
      })

      // Update registry if some backups were removed
      if (validBackups.length !== registry.length) {
        const fs = require('fs')
        fs.writeFileSync(this.backupRegistryPath, JSON.stringify(validBackups, null, 2), 'utf-8')
      }

      return validBackups
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  async deleteOldBackups(keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.listBackups()

      if (backups.length > keepCount) {
        const backupsToDelete = backups.slice(keepCount)

        for (const backup of backupsToDelete) {
          require('fs').unlinkSync(backup.path)
          console.log(`Deleted old backup: ${backup.name}`)
        }
      }
    } catch (error) {
      console.error('Failed to delete old backups:', error)
    }
  }

  async deleteBackup(backupName: string): Promise<void> {
    try {
      // Find backup in registry
      const registry = this.getBackupRegistry()
      const backupIndex = registry.findIndex(backup => backup.name === backupName)

      if (backupIndex === -1) {
        throw new Error('Backup not found in registry')
      }

      const backupPath = registry[backupIndex].path

      // Delete the file if it exists
      if (existsSync(backupPath)) {
        require('fs').unlinkSync(backupPath)
      }

      // Remove from registry
      registry.splice(backupIndex, 1)
      const fs = require('fs')
      fs.writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')

      console.log(`Backup deleted successfully: ${backupPath}`)
    } catch (error) {
      console.error('Failed to delete backup:', error)
      throw error
    }
  }

  async scheduleAutomaticBackups(frequency: 'hourly' | 'daily' | 'weekly'): Promise<void> {
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

  /**
   * Get license data for backup (encrypted and safe)
   */
  private async getLicenseBackupData(): Promise<any> {
    try {
      // Import license service dynamically to avoid circular dependencies
      const { licenseManager } = await import('./licenseService')
      const licenseStorage = licenseManager.storage

      // Check if license exists
      const hasLicense = await licenseStorage.isLicenseStored()
      if (!hasLicense) {
        return null
      }

      // Get license data (already encrypted in storage)
      const license = await licenseStorage.getLicense()
      if (!license) {
        return null
      }

      // Return only essential license info for backup
      // Exclude sensitive device fingerprint details
      return {
        licenseId: license.licenseId,
        licenseType: license.licenseType,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        features: license.features,
        metadata: license.metadata,
        // Include a flag to indicate this is a license backup
        isLicenseBackup: true,
        backupVersion: '1.0.0'
      }
    } catch (error) {
      console.warn('Failed to backup license data:', error)
      return null
    }
  }

  /**
   * Restore license data from backup
   * Note: This only restores license info, not the actual license activation
   */
  private async restoreLicenseBackupData(licenseBackupData: any): Promise<void> {
    try {
      if (!licenseBackupData || !licenseBackupData.isLicenseBackup) {
        console.log('No valid license backup data found')
        return
      }

      console.log('License backup data found in backup file')
      console.log(`License ID: ${licenseBackupData.licenseId}`)
      console.log(`License Type: ${licenseBackupData.licenseType}`)
      console.log(`Activated: ${licenseBackupData.activatedAt}`)
      console.log(`Expires: ${licenseBackupData.expiresAt}`)

      // Note: We don't automatically restore the license activation
      // because licenses are device-bound. This is just for information.
      console.log('Note: License data found in backup but not restored due to device binding.')
      console.log('User will need to reactivate license on this device if needed.')

    } catch (error) {
      console.warn('Failed to process license backup data:', error)
    }
  }
}
