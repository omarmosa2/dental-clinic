import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from '../src/services/databaseService'
import { DataMigrationService } from '../src/services/dataMigrationService'
import { BackupService } from '../src/services/backupService'
import { AutoSaveService } from '../src/services/autoSaveService'
import { ReportsService } from '../src/services/reportsService'

const isDev = process.env.IS_DEV === 'true'

let mainWindow: BrowserWindow | null = null
let databaseService: DatabaseService
let backupService: BackupService
let autoSaveService: AutoSaveService
let reportsService: ReportsService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    // Check if migration is needed and perform it
    const migrationService = new DataMigrationService()
    const migrationStatus = await migrationService.getMigrationStatus()

    console.log('Migration status:', migrationStatus)

    if (migrationStatus.migrationNeeded) {
      console.log('🔄 Starting data migration from LowDB to SQLite...')
      const migrationResult = await migrationService.migrateData()

      if (migrationResult.success) {
        console.log('✅ Migration completed successfully:', migrationResult.stats)
      } else {
        console.error('❌ Migration failed:', migrationResult.message)
        throw new Error(`Migration failed: ${migrationResult.message}`)
      }
    } else {
      console.log('✅ No migration needed, using existing SQLite database')
    }

    // Initialize services with SQLite
    databaseService = new DatabaseService()
    backupService = new BackupService(databaseService)
    autoSaveService = new AutoSaveService(databaseService)
    reportsService = new ReportsService()

    // Clean up migration service
    migrationService.close()

    console.log('✅ All services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    throw error
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Start auto-save service
  autoSaveService.start()

  // Start automatic backup scheduling
  const initializeAutoBackup = async () => {
    try {
      const settings = await databaseService.getSettings()
      if (settings?.backup_frequency) {
        await backupService.scheduleAutomaticBackups(settings.backup_frequency as 'hourly' | 'daily' | 'weekly')
        console.log(`Automatic backup scheduled: ${settings.backup_frequency}`)
      }
    } catch (error) {
      console.error('Failed to initialize automatic backup:', error)
    }
  }

  initializeAutoBackup()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    autoSaveService?.stop()
    app.quit()
  }
})

// IPC Handlers for Database Operations
ipcMain.handle('db:patients:getAll', async () => {
  try {
    return await databaseService.getAllPatients()
  } catch (error) {
    console.error('Error getting all patients:', error)
    throw error
  }
})

ipcMain.handle('db:patients:create', async (_, patient) => {
  try {
    console.log('Creating patient:', patient)
    const result = await databaseService.createPatient(patient)
    console.log('Patient created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:update', async (_, id, patient) => {
  try {
    console.log('Updating patient:', id, patient)
    const result = await databaseService.updatePatient(id, patient)
    console.log('Patient updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:delete', async (_, id) => {
  try {
    console.log('Deleting patient:', id)
    const result = await databaseService.deletePatient(id)
    console.log('Patient deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:search', async (_, query) => {
  try {
    return await databaseService.searchPatients(query)
  } catch (error) {
    console.error('Error searching patients:', error)
    throw error
  }
})

// Appointment IPC Handlers
ipcMain.handle('db:appointments:getAll', async () => {
  try {
    return await databaseService.getAllAppointments()
  } catch (error) {
    console.error('Error getting all appointments:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:create', async (_, appointment) => {
  try {
    console.log('Creating appointment:', appointment)
    const result = await databaseService.createAppointment(appointment)
    console.log('Appointment created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:update', async (_, id, appointment) => {
  try {
    console.log('Updating appointment:', id, appointment)
    const result = await databaseService.updateAppointment(id, appointment)
    console.log('Appointment updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:delete', async (_, id) => {
  try {
    console.log('Deleting appointment:', id)
    const result = await databaseService.deleteAppointment(id)
    console.log('Appointment deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:checkConflict', async (_, startTime, endTime, excludeId) => {
  try {
    console.log('Checking appointment conflict:', { startTime, endTime, excludeId })
    const result = await databaseService.checkAppointmentConflict(startTime, endTime, excludeId)
    console.log('Conflict check result:', result)
    return result
  } catch (error) {
    console.error('Error checking appointment conflict:', error)
    throw error
  }
})

// Payment IPC Handlers
ipcMain.handle('db:payments:getAll', async () => {
  try {
    return await databaseService.getAllPayments()
  } catch (error) {
    console.error('Error getting all payments:', error)
    throw error
  }
})

ipcMain.handle('db:payments:create', async (_, payment) => {
  try {
    console.log('Creating payment:', payment)
    const result = await databaseService.createPayment(payment)
    console.log('Payment created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:update', async (_, id, payment) => {
  try {
    console.log('Updating payment:', id, payment)
    const result = await databaseService.updatePayment(id, payment)
    console.log('Payment updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:delete', async (_, id) => {
  try {
    console.log('Deleting payment:', id)
    const result = await databaseService.deletePayment(id)
    console.log('Payment deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:search', async (_, query) => {
  try {
    return await databaseService.searchPayments(query)
  } catch (error) {
    console.error('Error searching payments:', error)
    throw error
  }
})

// Treatment IPC Handlers
ipcMain.handle('db:treatments:getAll', async () => {
  return await databaseService.getAllTreatments()
})

ipcMain.handle('db:treatments:create', async (_, treatment) => {
  return await databaseService.createTreatment(treatment)
})

// Inventory IPC Handlers
ipcMain.handle('db:inventory:getAll', async () => {
  try {
    return await databaseService.getAllInventoryItems()
  } catch (error) {
    console.error('Error getting all inventory items:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:create', async (_, item) => {
  try {
    console.log('Creating inventory item:', item)
    const result = await databaseService.createInventoryItem(item)
    console.log('Inventory item created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:update', async (_, id, item) => {
  try {
    console.log('Updating inventory item:', id, item)
    const result = await databaseService.updateInventoryItem(id, item)
    console.log('Inventory item updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:delete', async (_, id) => {
  try {
    console.log('Deleting inventory item:', id)
    const result = await databaseService.deleteInventoryItem(id)
    console.log('Inventory item deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    throw error
  }
})

// Backup IPC Handlers
ipcMain.handle('backup:create', async () => {
  return await backupService.createBackup()
})

ipcMain.handle('backup:restore', async (_, backupPath) => {
  return await backupService.restoreBackup(backupPath)
})

ipcMain.handle('backup:list', async () => {
  return await backupService.listBackups()
})

ipcMain.handle('backup:delete', async (_, backupName) => {
  return await backupService.deleteBackup(backupName)
})

// File Dialog Handlers
ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result
})

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})

// Lab IPC Handlers
ipcMain.handle('db:labs:getAll', async () => {
  try {
    return await databaseService.getAllLabs()
  } catch (error) {
    console.error('Error getting all labs:', error)
    throw error
  }
})

ipcMain.handle('db:labs:create', async (_, lab) => {
  try {
    console.log('Creating lab:', lab)
    const result = await databaseService.createLab(lab)
    console.log('Lab created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:update', async (_, id, lab) => {
  try {
    console.log('Updating lab:', id, lab)
    const result = await databaseService.updateLab(id, lab)
    console.log('Lab updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:delete', async (_, id) => {
  try {
    console.log('Deleting lab:', id)
    const result = await databaseService.deleteLab(id)
    console.log('Lab deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:search', async (_, query) => {
  try {
    return await databaseService.searchLabs(query)
  } catch (error) {
    console.error('Error searching labs:', error)
    throw error
  }
})

// Lab Order IPC Handlers
ipcMain.handle('db:labOrders:getAll', async () => {
  try {
    return await databaseService.getAllLabOrders()
  } catch (error) {
    console.error('Error getting all lab orders:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:create', async (_, labOrder) => {
  try {
    console.log('Creating lab order:', labOrder)
    const result = await databaseService.createLabOrder(labOrder)
    console.log('Lab order created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:update', async (_, id, labOrder) => {
  try {
    console.log('Updating lab order:', id, labOrder)
    const result = await databaseService.updateLabOrder(id, labOrder)
    console.log('Lab order updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:delete', async (_, id) => {
  try {
    console.log('Deleting lab order:', id)
    const result = await databaseService.deleteLabOrder(id)
    console.log('Lab order deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:search', async (_, query) => {
  try {
    return await databaseService.searchLabOrders(query)
  } catch (error) {
    console.error('Error searching lab orders:', error)
    throw error
  }
})

// Medication IPC Handlers
ipcMain.handle('db:medications:getAll', async () => {
  try {
    return await databaseService.getAllMedications()
  } catch (error) {
    console.error('Error getting all medications:', error)
    throw error
  }
})

ipcMain.handle('db:medications:create', async (_, medication) => {
  try {
    console.log('Creating medication:', medication)
    const result = await databaseService.createMedication(medication)
    console.log('Medication created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:update', async (_, id, medication) => {
  try {
    console.log('Updating medication:', id, medication)
    const result = await databaseService.updateMedication(id, medication)
    console.log('Medication updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:delete', async (_, id) => {
  try {
    console.log('Deleting medication:', id)
    const result = await databaseService.deleteMedication(id)
    console.log('Medication deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:search', async (_, query) => {
  try {
    return await databaseService.searchMedications(query)
  } catch (error) {
    console.error('Error searching medications:', error)
    throw error
  }
})

// Prescription IPC Handlers
ipcMain.handle('db:prescriptions:getAll', async () => {
  try {
    return await databaseService.getAllPrescriptions()
  } catch (error) {
    console.error('Error getting all prescriptions:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:create', async (_, prescription) => {
  try {
    console.log('Creating prescription:', prescription)
    const result = await databaseService.createPrescription(prescription)
    console.log('Prescription created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:update', async (_, id, prescription) => {
  try {
    console.log('Updating prescription:', id, prescription)
    const result = await databaseService.updatePrescription(id, prescription)
    console.log('Prescription updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:delete', async (_, id) => {
  try {
    console.log('Deleting prescription:', id)
    const result = await databaseService.deletePrescription(id)
    console.log('Prescription deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:search', async (_, query) => {
  try {
    return await databaseService.searchPrescriptions(query)
  } catch (error) {
    console.error('Error searching prescriptions:', error)
    throw error
  }
})

// Settings IPC Handlers
ipcMain.handle('settings:get', async () => {
  return await databaseService.getSettings()
})

ipcMain.handle('settings:update', async (_, settings) => {
  return await databaseService.updateSettings(settings)
})

// Reports IPC Handlers
ipcMain.handle('reports:generatePatientReport', async (_, filter) => {
  try {
    const patients = await databaseService.getAllPatients()
    const appointments = await databaseService.getAllAppointments()

    return await reportsService.generatePatientReport(patients, appointments, filter)
  } catch (error) {
    console.error('Error generating patient report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAppointmentReport', async (_, filter) => {
  try {
    const appointments = await databaseService.getAllAppointments()
    const treatments = await databaseService.getAllTreatments()

    return await reportsService.generateAppointmentReport(appointments, treatments, filter)
  } catch (error) {
    console.error('Error generating appointment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateFinancialReport', async (_, filter) => {
  try {
    const payments = await databaseService.getAllPayments()
    const treatments = await databaseService.getAllTreatments()

    return await reportsService.generateFinancialReport(payments, treatments, filter)
  } catch (error) {
    console.error('Error generating financial report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateInventoryReport', async (_, filter) => {
  try {
    const inventory = await databaseService.getAllInventoryItems()
    const inventoryUsage = [] // TODO: Implement inventory usage tracking

    return await reportsService.generateInventoryReport(inventory, inventoryUsage, filter)
  } catch (error) {
    console.error('Error generating inventory report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAnalyticsReport', async (_, filter) => {
  try {
    // TODO: Implement analytics report generation
    return {
      kpis: {
        patientGrowthRate: 15.5,
        revenueGrowthRate: 22.3,
        appointmentUtilization: 85.2,
        averageRevenuePerPatient: 450,
        patientRetentionRate: 78.9,
        appointmentNoShowRate: 12.1
      },
      trends: {
        patientTrend: [],
        revenueTrend: [],
        appointmentTrend: []
      },
      comparisons: {
        currentPeriod: {},
        previousPeriod: {},
        changePercentage: 0
      },
      predictions: {
        nextMonthRevenue: 25000,
        nextMonthAppointments: 120,
        confidence: 85
      }
    }
  } catch (error) {
    console.error('Error generating analytics report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateOverviewReport', async (_, filter) => {
  try {
    const patients = await databaseService.getAllPatients()
    const appointments = await databaseService.getAllAppointments()
    const payments = await databaseService.getAllPayments()
    const treatments = await databaseService.getAllTreatments()
    const inventory = await databaseService.getAllInventoryItems()

    const [patientReport, appointmentReport, financialReport, inventoryReport] = await Promise.all([
      reportsService.generatePatientReport(patients, appointments, filter),
      reportsService.generateAppointmentReport(appointments, treatments, filter),
      reportsService.generateFinancialReport(payments, treatments, filter),
      reportsService.generateInventoryReport(inventory, [], filter)
    ])

    return {
      patients: patientReport,
      appointments: appointmentReport,
      financial: financialReport,
      inventory: inventoryReport,
      generatedAt: new Date().toISOString(),
      filter
    }
  } catch (error) {
    console.error('Error generating overview report:', error)
    throw error
  }
})

ipcMain.handle('reports:exportReport', async (_, type, filter, options) => {
  try {
    const { dialog } = require('electron')

    // Get report data based on type
    let reportData
    switch (type) {
      case 'patients':
        reportData = await reportsService.generatePatientReport(
          await databaseService.getAllPatients(),
          await databaseService.getAllAppointments(),
          filter
        )
        break
      case 'appointments':
        reportData = await reportsService.generateAppointmentReport(
          await databaseService.getAllAppointments(),
          await databaseService.getAllTreatments(),
          filter
        )
        break
      case 'financial':
        reportData = await reportsService.generateFinancialReport(
          await databaseService.getAllPayments(),
          await databaseService.getAllTreatments(),
          filter
        )
        break
      case 'inventory':
        reportData = await reportsService.generateInventoryReport(
          await databaseService.getAllInventoryItems(),
          [],
          filter
        )
        break
      case 'overview':
        const [patients, appointments, payments, treatments, inventory] = await Promise.all([
          databaseService.getAllPatients(),
          databaseService.getAllAppointments(),
          databaseService.getAllPayments(),
          databaseService.getAllTreatments(),
          databaseService.getAllInventoryItems()
        ])

        reportData = {
          patients: await reportsService.generatePatientReport(patients, appointments, filter),
          appointments: await reportsService.generateAppointmentReport(appointments, treatments, filter),
          financial: await reportsService.generateFinancialReport(payments, treatments, filter),
          inventory: await reportsService.generateInventoryReport(inventory, [], filter)
        }
        break
      default:
        throw new Error(`Unsupported report type: ${type}`)
    }

    // Show save dialog
    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv'
    }

    const extension = fileExtensions[options.format as keyof typeof fileExtensions]
    const defaultFileName = `${type}_report_${new Date().toISOString().split('T')[0]}.${extension}`

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ التقرير',
      defaultPath: defaultFileName,
      filters: [
        { name: `${options.format.toUpperCase()} Files`, extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'تم إلغاء العملية' }
    }

    // Export the report
    const ExportService = require('../src/services/exportService').ExportService
    const fileName = await ExportService.exportReport(type, reportData, {
      ...options,
      filePath: result.filePath
    })

    return {
      success: true,
      message: 'تم تصدير التقرير بنجاح',
      filePath: result.filePath
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل في تصدير التقرير'
    }
  }
})

// Dental Treatment IPC Handlers
ipcMain.handle('db:dentalTreatments:getAll', async () => {
  try {
    return await databaseService.getAllDentalTreatments()
  } catch (error) {
    console.error('Error getting all dental treatments:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatments:getByPatient', async (_, patientId) => {
  try {
    return await databaseService.getDentalTreatmentsByPatient(patientId)
  } catch (error) {
    console.error('Error getting dental treatments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatments:create', async (_, treatment) => {
  try {
    console.log('Creating dental treatment:', treatment)
    const result = await databaseService.createDentalTreatment(treatment)
    console.log('Dental treatment created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating dental treatment:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatments:update', async (_, id, treatment) => {
  try {
    console.log('Updating dental treatment:', id, treatment)
    const result = await databaseService.updateDentalTreatment(id, treatment)
    console.log('Dental treatment updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating dental treatment:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatments:delete', async (_, id) => {
  try {
    console.log('Deleting dental treatment:', id)
    const result = await databaseService.deleteDentalTreatment(id)
    console.log('Dental treatment deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting dental treatment:', error)
    throw error
  }
})

// Dental Treatment Images IPC Handlers
ipcMain.handle('db:dentalTreatmentImages:getAll', async () => {
  try {
    return await databaseService.getAllDentalTreatmentImages()
  } catch (error) {
    console.error('Error getting all dental treatment images:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:getByTreatment', async (_, treatmentId) => {
  try {
    return await databaseService.getDentalTreatmentImagesByTreatment(treatmentId)
  } catch (error) {
    console.error('Error getting dental treatment images by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:create', async (_, imageData) => {
  try {
    console.log('Creating dental treatment image:', imageData)
    const result = await databaseService.createDentalTreatmentImage(imageData)
    console.log('Dental treatment image created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating dental treatment image:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:delete', async (_, id) => {
  try {
    console.log('Deleting dental treatment image:', id)

    // First get the image record to find the file path
    const imageRecord = databaseService.db.prepare('SELECT * FROM dental_treatment_images WHERE id = ?').get(id)
    console.log('Image record to delete:', imageRecord)

    if (imageRecord && imageRecord.image_path) {
      // Try to delete the physical file
      try {
        const fs = require('fs')
        const path = require('path')

        console.log('Attempting to delete image file:', imageRecord.image_path)

        let fileDeleted = false

        // Check if image_path is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
        if (imageRecord.image_path.endsWith('/')) {
          console.log('Directory path detected, searching for images to delete in:', imageRecord.image_path)

          // Search for images in the directory and delete them
          const searchPaths = [
            path.join(app.getPath('userData'), imageRecord.image_path),
            path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
          ]

          for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
              try {
                const files = fs.readdirSync(searchPath)
                const imageFiles = files.filter(file => {
                  const ext = path.extname(file).toLowerCase()
                  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
                })

                for (const imageFile of imageFiles) {
                  const fullImagePath = path.join(searchPath, imageFile)
                  fs.unlinkSync(fullImagePath)
                  console.log('✅ Physical image file deleted:', fullImagePath)
                  fileDeleted = true
                }
              } catch (dirError) {
                console.warn('Error deleting images from directory:', searchPath, dirError.message)
              }
            }
          }
        } else {
          // Legacy handling for full file paths
          const possiblePaths = [
            path.join(app.getPath('userData'), imageRecord.image_path),
            path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path),
            path.isAbsolute(imageRecord.image_path) ? imageRecord.image_path : null
          ].filter(Boolean)

          for (const fullPath of possiblePaths) {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath)
              console.log('✅ Physical image file deleted:', fullPath)
              fileDeleted = true
              break
            }
          }
        }

        if (!fileDeleted) {
          console.warn('⚠️ Physical image file not found at any location:', imageRecord.image_path)
        }
      } catch (fileError) {
        console.error('❌ Error deleting physical image file:', fileError.message)
        console.error('File path was:', imageRecord.image_path)
        // Continue with database deletion even if file deletion fails
      }
    } else {
      console.warn('⚠️ No image record found or no image_path for ID:', id)
    }

    // Delete from database
    const result = await databaseService.deleteDentalTreatmentImage(id)
    console.log('Dental treatment image deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting dental treatment image:', error)
    throw error
  }
})

// File Upload Handler for Dental Images
ipcMain.handle('files:uploadDentalImage', async (_, fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Uploading dental image:', { fileName, patientId, toothNumber, imageType, patientName, toothName, bufferSize: fileBuffer.byteLength })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (1-32)
    if (toothNumber < 1 || toothNumber > 32) {
      throw new Error('Invalid tooth number. Must be between 1 and 32')
    }

    // Validate image type
    const validImageTypes = ['before', 'after', 'xray', 'clinical', 'other']
    if (!validImageTypes.includes(imageType)) {
      throw new Error(`Invalid image type. Must be one of: ${validImageTypes.join(', ')}`)
    }

    // Create upload directory organized by patient_id/tooth_number/image_type
    const uploadDir = path.join(app.getPath('userData'), 'dental_images', patientId, toothNumber.toString(), imageType)
    console.log('Upload directory:', uploadDir)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log('Created upload directory:', uploadDir)
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to:', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Convert ArrayBuffer to Buffer and write file to disk
    const buffer = Buffer.from(fileBuffer)
    fs.writeFileSync(filePath, buffer)

    // Return relative path for database storage (without filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/`
    console.log('Dental image uploaded successfully:', relativePath)
    console.log('Full file path:', `${relativePath}${meaningfulFileName}`)

    return relativePath
  } catch (error) {
    console.error('Error uploading dental image:', error)
    throw error
  }
})

// Alternative simpler upload handler (fallback for base64 data)
ipcMain.handle('files:saveDentalImage', async (_, base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Saving dental image (base64):', { fileName, patientId, toothNumber, imageType, patientName, toothName })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (1-32)
    if (toothNumber < 1 || toothNumber > 32) {
      throw new Error('Invalid tooth number. Must be between 1 and 32')
    }

    // Validate image type
    const validImageTypes = ['before', 'after', 'xray', 'clinical', 'other']
    if (!validImageTypes.includes(imageType)) {
      throw new Error(`Invalid image type. Must be one of: ${validImageTypes.join(', ')}`)
    }

    // Create upload directory organized by patient_id/tooth_number/image_type in public/upload (fallback)
    const uploadDir = path.join(__dirname, '..', 'public', 'upload', 'dental_images', patientId, toothNumber.toString(), imageType)
    console.log('Upload directory (fallback):', uploadDir)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log('Created upload directory:', uploadDir)
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to (fallback):', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')

    // Write file to disk
    fs.writeFileSync(filePath, base64, 'base64')

    // Return relative path for database storage (without filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/`
    console.log('Dental image saved successfully:', relativePath)
    console.log('Full file path:', `${relativePath}${meaningfulFileName}`)

    return relativePath
  } catch (error) {
    console.error('Error saving dental image:', error)
    throw error
  }
})

// File serving IPC Handlers
ipcMain.handle('files:getDentalImage', async (_, imagePath) => {
  try {
    console.log('Getting dental image:', imagePath)
    const fs = require('fs')
    const path = require('path')

    // Helper function to load and return image
    const loadImage = (fullPath: string) => {
      const imageBuffer = fs.readFileSync(fullPath)
      const mimeType = getMimeType(path.extname(fullPath))
      const base64 = imageBuffer.toString('base64')
      return `data:${mimeType};base64,${base64}`
    }

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      console.log('Directory path detected, searching for images in:', imagePath)

      // Search for images in the directory
      const searchPaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath)
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          console.log('Searching in directory:', searchPath)

          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              // Return the first image found (or you could return the most recent)
              const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
              const fullImagePath = path.join(searchPath, imageFile)
              console.log('Found image in directory:', fullImagePath)
              return loadImage(fullImagePath)
            }
          } catch (dirError) {
            console.warn('Error reading directory:', searchPath, dirError.message)
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      const possiblePaths = [
        // 1. New structure: userData/dental_images/patient_id/tooth_number/image_type/filename
        path.join(app.getPath('userData'), imagePath),

        // 2. Fallback structure: public/upload/dental_images/patient_id/tooth_number/image_type/filename
        path.join(__dirname, '..', 'public', 'upload', imagePath),

        // 3. Direct absolute path
        path.isAbsolute(imagePath) ? imagePath : null
      ].filter(Boolean) // Remove null values

      // Try each path until we find the image
      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          console.log('Found image at path:', fullPath)
          return loadImage(fullPath)
        }
      }
    }

    // If not found in standard locations, try to search for any image by directory or filename
    const searchPaths = [
      path.join(app.getPath('userData'), 'dental_images'),
      path.join(__dirname, '..', 'public', 'upload', 'dental_images')
    ]

    // Extract directory path if it's a directory format
    let searchDir = imagePath
    if (imagePath.endsWith('/')) {
      searchDir = imagePath.slice(0, -1) // Remove trailing slash
    } else {
      searchDir = path.dirname(imagePath)
    }

    for (const basePath of searchPaths) {
      const fullSearchPath = path.join(basePath, searchDir)
      if (fs.existsSync(fullSearchPath)) {
        try {
          const files = fs.readdirSync(fullSearchPath)
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase()
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
          })

          if (imageFiles.length > 0) {
            const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
            const fullImagePath = path.join(fullSearchPath, imageFile)
            console.log('Found image by directory search:', fullImagePath)
            return loadImage(fullImagePath)
          }
        } catch (dirError) {
          console.warn('Error searching directory:', fullSearchPath, dirError.message)
        }
      }
    }

    console.warn('Image not found at any path:', imagePath)
    throw new Error(`Image not found: ${imagePath}`)
  } catch (error) {
    console.error('Error getting dental image:', error)
    throw error
  }
})

// Helper function to recursively search for a file
function findFileRecursively(dir: string, fileName: string): string[] {
  const fs = require('fs')
  const path = require('path')
  const results: string[] = []

  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        results.push(...findFileRecursively(fullPath, fileName))
      } else if (item === fileName) {
        results.push(fullPath)
      }
    }
  } catch (error) {
    // Ignore errors (e.g., permission denied)
  }

  return results
}

// Helper function to get MIME type
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp'
  }
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg'
}

// Check if image exists
ipcMain.handle('files:checkImageExists', async (_, imagePath) => {
  try {
    const fs = require('fs')
    const path = require('path')

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      // Search for any images in the directory
      const searchPaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath)
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              return true
            }
          } catch (dirError) {
            // Continue to next path
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      const possiblePaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath),
        path.isAbsolute(imagePath) ? imagePath : null
      ].filter(Boolean)

      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          return true
        }
      }
    }

    // If not found in standard locations, try to search for any image by directory
    const searchPaths = [
      path.join(app.getPath('userData'), 'dental_images'),
      path.join(__dirname, '..', 'public', 'upload', 'dental_images')
    ]

    let searchDir = imagePath
    if (imagePath.endsWith('/')) {
      searchDir = imagePath.slice(0, -1)
    } else {
      searchDir = path.dirname(imagePath)
    }

    for (const basePath of searchPaths) {
      const fullSearchPath = path.join(basePath, searchDir)
      if (fs.existsSync(fullSearchPath)) {
        try {
          const files = fs.readdirSync(fullSearchPath)
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase()
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
          })

          if (imageFiles.length > 0) {
            return true
          }
        } catch (dirError) {
          // Continue to next path
        }
      }
    }

    return false
  } catch (error) {
    console.error('Error checking image exists:', error)
    return false
  }
})
