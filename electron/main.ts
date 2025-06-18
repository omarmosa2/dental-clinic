import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { LowDBService } from '../src/services/lowdbService'
import { BackupService } from '../src/services/backupService'
import { AutoSaveService } from '../src/services/autoSaveService'
import { ReportsService } from '../src/services/reportsService'

const isDev = process.env.IS_DEV === 'true'

let mainWindow: BrowserWindow | null = null
let databaseService: LowDBService
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

app.whenReady().then(() => {
  // Initialize services
  databaseService = new LowDBService()
  backupService = new BackupService(databaseService)
  autoSaveService = new AutoSaveService(databaseService)
  reportsService = new ReportsService()

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
  return await databaseService.getAllPatients()
})

ipcMain.handle('db:patients:create', async (_, patient) => {
  return await databaseService.createPatient(patient)
})

ipcMain.handle('db:patients:update', async (_, id, patient) => {
  return await databaseService.updatePatient(id, patient)
})

ipcMain.handle('db:patients:delete', async (_, id) => {
  return await databaseService.deletePatient(id)
})

ipcMain.handle('db:patients:search', async (_, query) => {
  return await databaseService.searchPatients(query)
})

// Appointment IPC Handlers
ipcMain.handle('db:appointments:getAll', async () => {
  return await databaseService.getAllAppointments()
})

ipcMain.handle('db:appointments:create', async (_, appointment) => {
  return await databaseService.createAppointment(appointment)
})

ipcMain.handle('db:appointments:update', async (_, id, appointment) => {
  return await databaseService.updateAppointment(id, appointment)
})

ipcMain.handle('db:appointments:delete', async (_, id) => {
  return await databaseService.deleteAppointment(id)
})

// Payment IPC Handlers
ipcMain.handle('db:payments:getAll', async () => {
  return await databaseService.getAllPayments()
})

ipcMain.handle('db:payments:create', async (_, payment) => {
  return await databaseService.createPayment(payment)
})

ipcMain.handle('db:payments:update', async (_, id, payment) => {
  return await databaseService.updatePayment(id, payment)
})

ipcMain.handle('db:payments:delete', async (_, id) => {
  return await databaseService.deletePayment(id)
})

ipcMain.handle('db:payments:search', async (_, query) => {
  return await databaseService.searchPayments(query)
})

// Treatment IPC Handlers
ipcMain.handle('db:treatments:getAll', async () => {
  return await databaseService.getAllTreatments()
})

ipcMain.handle('db:treatments:create', async (_, treatment) => {
  return await databaseService.createTreatment(treatment)
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
