const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { join } = require('path')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let databaseService = null
let backupService = null
let reportsService = null

function createWindow() {
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
    titleBarStyle: 'default',
    show: false,
  })

  // Set CSP headers for security
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:5173 ws://localhost:5173 https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173 https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:5173; font-src 'self' data: http://localhost:5173 https://fonts.gstatic.com;"
            : "default-src 'self' 'unsafe-inline' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com;"
        ]
      }
    })
  })

  // Load the app
  if (isDev) {
    // Wait a bit for Vite server to start
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    }, 2000)
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
  console.log('🚀 Electron app is ready, initializing services...')

  // Initialize database service with migration support
  try {
    const { DatabaseService } = require('../src/services/databaseService.js')
    const { DataMigrationService } = require('../src/services/dataMigrationService.js')

    // Check if migration is needed
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

    // Initialize SQLite database service
    const dbPath = require('path').join(app.getPath('userData'), 'dental_clinic.db')
    databaseService = new DatabaseService(dbPath)
    console.log('✅ SQLite database service initialized successfully')

    // Initialize backup service
    try {
      const { BackupService } = require('../src/services/backupService.js')
      backupService = new BackupService(databaseService)
      console.log('✅ Backup service initialized successfully')
    } catch (backupError) {
      console.error('❌ Failed to initialize backup service:', backupError)
      console.error('Backup error details:', backupError.stack)
      backupService = null
    }

    // Initialize reports service
    try {
      const { ReportsService } = require('../src/services/reportsService.js')
      reportsService = new ReportsService()
      console.log('✅ Reports service initialized successfully')
    } catch (reportsError) {
      console.error('❌ Failed to initialize reports service:', reportsError)
      reportsService = null
    }

    // Clean up migration service
    migrationService.close()

  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    console.error('Error details:', error.stack)

    // Try to initialize just the SQLite database service without migration
    try {
      console.log('🔄 Attempting direct SQLite initialization...')
      const { DatabaseService } = require('../src/services/databaseService.js')
      const dbPath = require('path').join(app.getPath('userData'), 'dental_clinic.db')
      databaseService = new DatabaseService(dbPath)
      console.log('✅ SQLite database service initialized successfully (direct)')

      // Try to initialize backup service
      try {
        const { BackupService } = require('../src/services/backupService.js')
        backupService = new BackupService(databaseService)
        console.log('✅ Backup service initialized successfully')
      } catch (backupError) {
        console.error('❌ Failed to initialize backup service:', backupError)
        backupService = null
      }

    } catch (directError) {
      console.error('❌ Direct SQLite initialization also failed:', directError)
      console.error('Falling back to mock mode')
      // Fallback to mock mode
      databaseService = null
      backupService = null
    }
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Patient IPC Handlers
ipcMain.handle('db:patients:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllPatients()
    } else {
      // Fallback mock data
      return [
        {
          id: '1',
          first_name: 'أحمد',
          last_name: 'محمد',
          phone: '0501234567',
          email: 'ahmed@example.com',
          date_of_birth: '1990-05-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          first_name: 'فاطمة',
          last_name: 'علي',
          phone: '0507654321',
          email: 'fatima@example.com',
          date_of_birth: '1985-08-22',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  } catch (error) {
    console.error('Error getting patients:', error)
    throw error
  }
})

ipcMain.handle('db:patients:create', async (_, patient) => {
  try {
    if (databaseService) {
      console.log('📝 Creating patient with SQLite:', patient.first_name, patient.last_name)
      const newPatient = await databaseService.createPatient(patient)
      console.log('✅ Patient created successfully:', newPatient.id)
      return newPatient
    } else {
      // Fallback mock
      console.log('⚠️ WARNING: Database service not available, using mock mode')
      console.log('📝 Creating patient (mock):', patient.first_name, patient.last_name)
      const newPatient = {
        ...patient,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('✅ Patient created (mock):', newPatient.id)
      return newPatient
    }
  } catch (error) {
    console.error('❌ Error creating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:update', async (_, id, patient) => {
  try {
    if (databaseService) {
      const updatedPatient = await databaseService.updatePatient(id, patient)
      console.log('Updating patient:', updatedPatient)
      return updatedPatient
    } else {
      // Fallback mock
      const updatedPatient = {
        ...patient,
        id,
        updated_at: new Date().toISOString()
      }
      console.log('Updating patient (mock):', updatedPatient)
      return updatedPatient
    }
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deletePatient(id)
      console.log('Deleting patient:', id, 'Success:', success)
      return success
    } else {
      // Fallback mock
      console.log('Deleting patient (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchPatients(query)
      console.log('Searching patients:', query, 'Results:', results.length)
      return results
    } else {
      // Fallback mock
      console.log('Searching patients (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching patients:', error)
    throw error
  }
})

// Appointment IPC Handlers
ipcMain.handle('db:appointments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllAppointments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting appointments:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:create', async (_, appointment) => {
  try {
    if (databaseService) {
      const newAppointment = await databaseService.createAppointment(appointment)
      console.log('Creating appointment:', newAppointment)
      return newAppointment
    } else {
      const newAppointment = { ...appointment, id: Date.now().toString() }
      console.log('Creating appointment (mock):', newAppointment)
      return newAppointment
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:update', async (_, id, appointment) => {
  try {
    if (databaseService) {
      const updatedAppointment = await databaseService.updateAppointment(id, appointment)
      console.log('Updating appointment:', updatedAppointment)
      return updatedAppointment
    } else {
      const updatedAppointment = { ...appointment, id }
      console.log('Updating appointment (mock):', updatedAppointment)
      return updatedAppointment
    }
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deleteAppointment(id)
      console.log('Deleting appointment:', id, 'Success:', success)
      return success
    } else {
      console.log('Deleting appointment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
})

// Payment IPC Handlers
ipcMain.handle('db:payments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllPayments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting payments:', error)
    throw error
  }
})

ipcMain.handle('db:payments:create', async (_, payment) => {
  try {
    if (databaseService) {
      const newPayment = await databaseService.createPayment(payment)
      console.log('Creating payment:', newPayment)
      return newPayment
    } else {
      const newPayment = { ...payment, id: Date.now().toString() }
      console.log('Creating payment (mock):', newPayment)
      return newPayment
    }
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:update', async (_, id, payment) => {
  try {
    if (databaseService) {
      const updatedPayment = await databaseService.updatePayment(id, payment)
      console.log('Updating payment:', updatedPayment)
      return updatedPayment
    } else {
      const updatedPayment = { ...payment, id }
      console.log('Updating payment (mock):', updatedPayment)
      return updatedPayment
    }
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:delete', async (_, id) => {
  try {
    if (databaseService) {
      const success = await databaseService.deletePayment(id)
      console.log('Deleting payment:', id, 'Success:', success)
      return success
    } else {
      console.log('Deleting payment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:search', async (_, query) => {
  try {
    if (databaseService) {
      const results = await databaseService.searchPayments(query)
      console.log('Searching payments:', query, 'Results:', results.length)
      return results
    } else {
      console.log('Searching payments (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching payments:', error)
    throw error
  }
})

// Treatment IPC Handlers
ipcMain.handle('db:treatments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllTreatments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting treatments:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:create', async (_, treatment) => {
  try {
    if (databaseService) {
      return await databaseService.createTreatment(treatment)
    } else {
      const newTreatment = { ...treatment, id: Date.now().toString() }
      console.log('Creating treatment (mock):', newTreatment)
      return newTreatment
    }
  } catch (error) {
    console.error('Error creating treatment:', error)
    throw error
  }
})

// Inventory IPC Handlers
ipcMain.handle('db:inventory:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllInventoryItems()
    } else {
      // Fallback mock data with test cases for alerts
      const today = new Date()
      const expiredDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const expiringSoonDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days from now

      return [
        {
          id: '1',
          name: 'قفازات طبية',
          description: 'قفازات طبية مطاطية',
          category: 'مواد استهلاكية',
          quantity: 100,
          unit: 'قطعة',
          cost_per_unit: 0.5,
          supplier: 'شركة المعدات الطبية',
          minimum_stock: 20,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'أقنعة طبية',
          description: 'أقنعة طبية للوقاية',
          category: 'مواد استهلاكية',
          quantity: 15, // Low stock (below minimum_stock of 30)
          unit: 'قطعة',
          cost_per_unit: 0.3,
          supplier: 'شركة المعدات الطبية',
          minimum_stock: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'مخدر موضعي',
          description: 'مخدر موضعي للأسنان',
          category: 'أدوية',
          quantity: 5,
          unit: 'أنبوب',
          cost_per_unit: 25.0,
          supplier: 'شركة الأدوية المتقدمة',
          minimum_stock: 10, // Low stock
          expiry_date: expiredDate.toISOString().split('T')[0], // Expired
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'مطهر فموي',
          description: 'مطهر للفم والأسنان',
          category: 'مواد تطهير',
          quantity: 8,
          unit: 'زجاجة',
          cost_per_unit: 15.0,
          supplier: 'شركة المنتجات الطبية',
          minimum_stock: 5,
          expiry_date: expiringSoonDate.toISOString().split('T')[0], // Expiring soon
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'خيوط جراحية',
          description: 'خيوط جراحية للأسنان',
          category: 'أدوات جراحية',
          quantity: 0, // Out of stock
          unit: 'علبة',
          cost_per_unit: 45.0,
          supplier: 'شركة الأدوات الجراحية',
          minimum_stock: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  } catch (error) {
    console.error('Error getting inventory items:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:create', async (_, itemData) => {
  try {
    if (databaseService) {
      return await databaseService.createInventoryItem(itemData)
    } else {
      // Fallback mock
      const newItem = {
        ...itemData,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      console.log('Creating inventory item (mock):', newItem)
      return newItem
    }
  } catch (error) {
    console.error('Error creating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:update', async (_, id, updates) => {
  try {
    if (databaseService) {
      return await databaseService.updateInventoryItem(id, updates)
    } else {
      // Fallback mock
      const updatedItem = {
        ...updates,
        id,
        updated_at: new Date().toISOString()
      }
      console.log('Updating inventory item (mock):', updatedItem)
      return updatedItem
    }
  } catch (error) {
    console.error('Error updating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:delete', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.deleteInventoryItem(id)
    } else {
      // Fallback mock
      console.log('Deleting inventory item (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:search', async (_, query) => {
  try {
    if (databaseService) {
      return await databaseService.searchInventoryItems(query)
    } else {
      // Fallback mock
      console.log('Searching inventory items (mock):', query)
      return []
    }
  } catch (error) {
    console.error('Error searching inventory items:', error)
    throw error
  }
})

// Inventory Usage IPC Handlers
ipcMain.handle('db:inventoryUsage:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllInventoryUsage()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:create', async (_, usageData) => {
  try {
    if (databaseService) {
      return await databaseService.createInventoryUsage(usageData)
    } else {
      // Fallback mock
      const newUsage = {
        ...usageData,
        id: Date.now().toString(),
        usage_date: usageData.usage_date || new Date().toISOString()
      }
      console.log('Creating inventory usage (mock):', newUsage)
      return newUsage
    }
  } catch (error) {
    console.error('Error creating inventory usage:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:getByItem', async (_, itemId) => {
  try {
    if (databaseService) {
      return await databaseService.getInventoryUsageByItem(itemId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage by item:', error)
    throw error
  }
})

ipcMain.handle('db:inventoryUsage:getByAppointment', async (_, appointmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getInventoryUsageByAppointment(appointmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting inventory usage by appointment:', error)
    throw error
  }
})

// Database maintenance IPC Handlers
ipcMain.handle('db:forceCheckpoint', async () => {
  try {
    if (databaseService) {
      console.log('🔧 Manual WAL checkpoint requested')
      const result = databaseService.forceCheckpoint()
      console.log('✅ Manual checkpoint completed:', result)
      return result
    } else {
      console.log('❌ Database service not available for checkpoint')
      return null
    }
  } catch (error) {
    console.error('❌ Error forcing checkpoint:', error)
    throw error
  }
})

ipcMain.handle('backup:create', async () => {
  try {
    if (backupService) {
      // Ask user where to save the backup
      const timestamp = new Date().toISOString().split('T')[0]
      const defaultName = `نسخة-احتياطية-عيادة-الاسنان-${timestamp}.db`

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'اختر مكان حفظ النسخة الاحتياطية',
        defaultPath: defaultName,
        filters: [
          { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
          { name: 'ملفات النسخ الاحتياطية القديمة', extensions: ['json'] },
          { name: 'جميع الملفات', extensions: ['*'] }
        ],
        properties: ['createDirectory']
      })

      if (result.canceled) {
        throw new Error('تم إلغاء العملية')
      }

      console.log('📍 User selected file path:', result.filePath)
      const backupPath = await backupService.createBackup(result.filePath)
      console.log('✅ Backup created successfully:', backupPath)
      return backupPath
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error creating backup:', error)
    throw error
  }
})

ipcMain.handle('backup:restore', async (_, backupPath) => {
  try {
    if (backupService) {
      const success = await backupService.restoreBackup(backupPath)
      console.log('Backup restored successfully:', success)
      return success
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error restoring backup:', error)
    throw error
  }
})

ipcMain.handle('backup:list', async () => {
  try {
    if (backupService) {
      const backups = await backupService.listBackups()
      console.log('Listed backups:', backups.length)
      return backups
    } else {
      return []
    }
  } catch (error) {
    console.error('Error listing backups:', error)
    return []
  }
})

ipcMain.handle('backup:delete', async (_, backupName) => {
  try {
    if (backupService) {
      await backupService.deleteBackup(backupName)
      console.log('Backup deleted successfully:', backupName)
      return true
    } else {
      throw new Error('Backup service not initialized')
    }
  } catch (error) {
    console.error('Error deleting backup:', error)
    throw error
  }
})

ipcMain.handle('backup:test', async () => {
  try {
    console.log('🧪 Starting backup system test...')

    // Import and run the backup test script
    const { BackupTestScript } = require('../src/utils/backupTestScript.js')
    const testScript = new BackupTestScript()

    const success = await testScript.runFullTest()

    console.log('🧪 Backup test completed:', success ? 'PASSED' : 'FAILED')
    return {
      success,
      results: testScript.testResults || []
    }
  } catch (error) {
    console.error('❌ Backup test failed:', error)
    return {
      success: false,
      error: error.message,
      results: []
    }
  }
})

ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

// Settings IPC Handlers
ipcMain.handle('settings:get', async () => {
  try {
    if (databaseService) {
      return await databaseService.getSettings()
    } else {
      return {
        id: '1',
        clinic_name: 'عيادة الأسنان',
        currency: 'ريال',
        language: 'ar'
      }
    }
  } catch (error) {
    console.error('Error getting settings:', error)
    throw error
  }
})

ipcMain.handle('settings:update', async (_, settings) => {
  try {
    if (databaseService) {
      return await databaseService.updateSettings(settings)
    } else {
      console.log('Updating settings (mock):', settings)
      return settings
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    throw error
  }
})

// Dashboard IPC Handlers
ipcMain.handle('db:dashboard:getStats', async () => {
  try {
    if (databaseService) {
      return await databaseService.getDashboardStats()
    } else {
      return {
        total_patients: 0,
        total_appointments: 0,
        total_revenue: 0,
        pending_payments: 0,
        today_appointments: 0,
        this_month_revenue: 0,
        low_stock_items: 0
      }
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    throw error
  }
})

// Treatment update and delete handlers
ipcMain.handle('db:treatments:update', async (_, id, treatment) => {
  try {
    if (databaseService) {
      return await databaseService.updateTreatment(id, treatment)
    } else {
      const updatedTreatment = { ...treatment, id }
      console.log('Updating treatment (mock):', updatedTreatment)
      return updatedTreatment
    }
  } catch (error) {
    console.error('Error updating treatment:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:delete', async (_, id) => {
  try {
    if (databaseService) {
      return await databaseService.deleteTreatment(id)
    } else {
      console.log('Deleting treatment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting treatment:', error)
    throw error
  }
})

// Reports IPC Handlers
ipcMain.handle('reports:generatePatientReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const patients = await databaseService.getAllPatients()
      const appointments = await databaseService.getAllAppointments()
      return await reportsService.generatePatientReport(patients, appointments, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating patient report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAppointmentReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const appointments = await databaseService.getAllAppointments()
      const treatments = await databaseService.getAllTreatments()
      return await reportsService.generateAppointmentReport(appointments, treatments, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating appointment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateFinancialReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const payments = await databaseService.getAllPayments()
      const treatments = await databaseService.getAllTreatments()
      return await reportsService.generateFinancialReport(payments, treatments, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
  } catch (error) {
    console.error('Error generating financial report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateInventoryReport', async (_, filter) => {
  try {
    if (databaseService && reportsService) {
      const inventory = await databaseService.getAllInventoryItems()
      const inventoryUsage = [] // TODO: Implement inventory usage tracking
      return await reportsService.generateInventoryReport(inventory, inventoryUsage, filter)
    } else {
      throw new Error('Database or Reports service not initialized')
    }
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
    if (databaseService && reportsService) {
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
    } else {
      throw new Error('Database or Reports service not initialized')
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
        if (databaseService && reportsService) {
          const patients = await databaseService.getAllPatients()
          const appointments = await databaseService.getAllAppointments()
          reportData = await reportsService.generatePatientReport(patients, appointments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'appointments':
        if (databaseService && reportsService) {
          const appointments = await databaseService.getAllAppointments()
          const treatments = await databaseService.getAllTreatments()
          reportData = await reportsService.generateAppointmentReport(appointments, treatments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'financial':
        if (databaseService && reportsService) {
          const payments = await databaseService.getAllPayments()
          const treatments = await databaseService.getAllTreatments()
          reportData = await reportsService.generateFinancialReport(payments, treatments, filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'inventory':
        if (databaseService && reportsService) {
          const inventory = await databaseService.getAllInventoryItems()
          reportData = await reportsService.generateInventoryReport(inventory, [], filter)
        } else {
          throw new Error('Database or Reports service not initialized')
        }
        break
      case 'overview':
        if (databaseService && reportsService) {
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
        } else {
          throw new Error('Database or Reports service not initialized')
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

    const extension = fileExtensions[options.format]

    // Generate descriptive Arabic filename
    const generateFileName = (reportType, format) => {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS

      // Arabic report names mapping
      const reportNames = {
        'patients': 'تقرير_المرضى',
        'appointments': 'تقرير_المواعيد',
        'financial': 'التقرير_المالي',
        'inventory': 'تقرير_المخزون',
        'analytics': 'تقرير_التحليلات',
        'overview': 'التقرير_الشامل'
      }

      const reportName = reportNames[reportType] || `تقرير_${reportType}`
      return `${reportName}_${dateStr}_${timeStr}.${format}`
    }

    const defaultFileName = generateFileName(type, extension)

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Report',
      defaultPath: defaultFileName,
      filters: [
        { name: `${options.format.toUpperCase()} Files`, extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'تم إلغاء العملية' }
    }

    // Ensure correct file extension
    let filePath = result.filePath
    if (!filePath.endsWith(`.${extension}`)) {
      filePath += `.${extension}`
    }

    // Create export based on format
    const fs = require('fs')
    const path = require('path')

    let content = ''
    let isBuffer = false

    if (options.format === 'csv') {
      // Enhanced CSV export
      content = '\uFEFF' // BOM for UTF-8 support
      content += `Report ${type} - Modern Dental Clinic\n`
      content += `Report Date: ${new Date().toLocaleDateString()}\n\n`

      if (reportData) {
        if (type === 'overview') {
          content += 'Report Type,Value\n'
          content += `"Total Patients","${reportData.patients?.totalPatients || 0}"\n`
          content += `"New Patients","${reportData.patients?.newPatientsThisMonth || 0}"\n`
          content += `"Total Appointments","${reportData.appointments?.totalAppointments || 0}"\n`
          content += `"Completed Appointments","${reportData.appointments?.completedAppointments || 0}"\n`
          content += `"Total Revenue","${reportData.financial?.totalRevenue || 0} SAR"\n`
          content += `"Pending Payments","${reportData.financial?.pendingPayments || 0} SAR"\n`
          content += `"Inventory Items","${reportData.inventory?.totalItems || 0}"\n`
          content += `"Low Stock Items","${reportData.inventory?.lowStockItems || 0}"\n`
        } else if (type === 'patients') {
          content += 'Indicator,Value\n'
          content += `"Total Patients","${reportData.totalPatients || 0}"\n`
          content += `"New Patients This Month","${reportData.newPatientsThisMonth || 0}"\n`
          content += `"Active Patients","${reportData.activePatients || 0}"\n`
          content += `"Average Age","${reportData.averageAge || 0} years"\n`
        } else if (type === 'appointments') {
          content += 'Indicator,Value\n'
          content += `"Total Appointments","${reportData.totalAppointments || 0}"\n`
          content += `"Completed Appointments","${reportData.completedAppointments || 0}"\n`
          content += `"Cancelled Appointments","${reportData.cancelledAppointments || 0}"\n`
          content += `"Attendance Rate","${reportData.attendanceRate || 0}%"\n`
        } else if (type === 'financial') {
          content += 'Indicator,Value\n'
          content += `"Total Revenue","${reportData.totalRevenue || 0} SAR"\n`
          content += `"Completed Payments","${reportData.completedPayments || 0} SAR"\n`
          content += `"Pending Payments","${reportData.pendingPayments || 0} SAR"\n`
          content += `"Overdue Payments","${reportData.overduePayments || 0} SAR"\n`
        } else if (type === 'inventory') {
          content += 'Indicator,Value\n'
          content += `"Total Items","${reportData.totalItems || 0}"\n`
          content += `"Total Value","${reportData.totalValue || 0} SAR"\n`
          content += `"Low Stock Items","${reportData.lowStockItems || 0}"\n`
          content += `"Expired Items","${reportData.expiredItems || 0}"\n`
        }
      }
    } else if (options.format === 'excel') {
      // Enhanced Excel-like format (actually TSV for simplicity)
      content = '\uFEFF' // BOM for Arabic support
      content += `تقرير ${type} - عيادة الأسنان الحديثة\n`
      content += `تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}\n\n`

      if (reportData) {
        content += 'المؤشر\tالقيمة\tالوصف\n'
        if (type === 'overview') {
          content += `إجمالي المرضى\t${reportData.patients?.totalPatients || 0}\tالعدد الكلي للمرضى المسجلين\n`
          content += `المرضى الجدد\t${reportData.patients?.newPatientsThisMonth || 0}\tالمرضى الجدد هذا الشهر\n`
          content += `إجمالي المواعيد\t${reportData.appointments?.totalAppointments || 0}\tجميع المواعيد المجدولة\n`
          content += `المواعيد المكتملة\t${reportData.appointments?.completedAppointments || 0}\tالمواعيد التي تم إنجازها\n`
          content += `إجمالي الإيرادات\t${reportData.financial?.totalRevenue || 0}\tالإيرادات المحققة بالريال\n`
          content += `المدفوعات المعلقة\t${reportData.financial?.pendingPayments || 0}\tالمدفوعات غير المكتملة\n`
          content += `عناصر المخزون\t${reportData.inventory?.totalItems || 0}\tإجمالي عناصر المخزون\n`
          content += `تنبيهات المخزون\t${reportData.inventory?.lowStockItems || 0}\tعناصر تحتاج إعادة تموين\n`
        }
      }
    } else if (options.format === 'pdf') {
      // Simplified PDF export with better Arabic support
      try {
        const PDFDocument = require('pdfkit')
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        })

        // Create buffer to store PDF
        const chunks = []
        doc.on('data', chunk => chunks.push(chunk))

        // Header
        doc.fontSize(20)
        doc.text('Modern Dental Clinic', { align: 'center' })
        doc.moveDown()

        const reportTitles = {
          overview: 'Comprehensive Report',
          patients: 'Patients Report',
          appointments: 'Appointments Report',
          financial: 'Financial Report',
          inventory: 'Inventory Report'
        }

        doc.fontSize(16)
        doc.text(reportTitles[type] || 'Report', { align: 'center' })
        doc.moveDown()

        doc.fontSize(12)
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, { align: 'center' })
        doc.moveDown(2)

        // Statistics Summary
        doc.fontSize(14)
        doc.text('Statistics Summary:', { underline: true })
        doc.moveDown()

        doc.fontSize(12)

        if (reportData) {
          if (type === 'overview') {
            const stats = [
              `Total Patients: ${reportData.patients?.totalPatients || 0}`,
              `New Patients This Month: ${reportData.patients?.newPatientsThisMonth || 0}`,
              `Total Appointments: ${reportData.appointments?.totalAppointments || 0}`,
              `Completed Appointments: ${reportData.appointments?.completedAppointments || 0}`,
              `Total Revenue: ${reportData.financial?.totalRevenue || 0} SAR`,
              `Pending Payments: ${reportData.financial?.pendingPayments || 0} SAR`,
              `Inventory Items: ${reportData.inventory?.totalItems || 0}`,
              `Low Stock Alerts: ${reportData.inventory?.lowStockItems || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'patients') {
            const stats = [
              `Total Patients: ${reportData.totalPatients || 0}`,
              `New Patients This Month: ${reportData.newPatientsThisMonth || 0}`,
              `Active Patients: ${reportData.activePatients || 0}`,
              `Average Age: ${reportData.averageAge || 0} years`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'appointments') {
            const stats = [
              `Total Appointments: ${reportData.totalAppointments || 0}`,
              `Completed Appointments: ${reportData.completedAppointments || 0}`,
              `Cancelled Appointments: ${reportData.cancelledAppointments || 0}`,
              `Attendance Rate: ${reportData.attendanceRate || 0}%`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'financial') {
            const stats = [
              `Total Revenue: ${reportData.totalRevenue || 0} SAR`,
              `Completed Payments: ${reportData.completedPayments || 0} SAR`,
              `Pending Payments: ${reportData.pendingPayments || 0} SAR`,
              `Overdue Payments: ${reportData.overduePayments || 0} SAR`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          } else if (type === 'inventory') {
            const stats = [
              `Total Items: ${reportData.totalItems || 0}`,
              `Total Value: ${reportData.totalValue || 0} SAR`,
              `Low Stock Items: ${reportData.lowStockItems || 0}`,
              `Expired Items: ${reportData.expiredItems || 0}`
            ]

            stats.forEach(stat => {
              doc.text(`• ${stat}`)
              doc.moveDown(0.5)
            })
          }
        }

        // Footer
        doc.moveDown(3)
        doc.fontSize(10)
        doc.text('Generated by Dental Clinic Management System', { align: 'center' })

        doc.end()

        // Wait for PDF to be generated
        await new Promise(resolve => {
          doc.on('end', () => {
            content = Buffer.concat(chunks)
            isBuffer = true
            resolve()
          })
        })

      } catch (error) {
        console.error('PDF generation error:', error)
        // Fallback to simple text format
        content = `Report: ${type} - Modern Dental Clinic\n`
        content += `Report Date: ${new Date().toLocaleDateString()}\n`
        content += `${'='.repeat(50)}\n\n`

        if (reportData && type === 'overview') {
          content += 'Comprehensive Report Summary:\n\n'
          content += `• Total Patients: ${reportData.patients?.totalPatients || 0}\n`
          content += `• New Patients This Month: ${reportData.patients?.newPatientsThisMonth || 0}\n`
          content += `• Total Appointments: ${reportData.appointments?.totalAppointments || 0}\n`
          content += `• Completed Appointments: ${reportData.appointments?.completedAppointments || 0}\n`
          content += `• Total Revenue: ${reportData.financial?.totalRevenue || 0} SAR\n`
          content += `• Pending Payments: ${reportData.financial?.pendingPayments || 0} SAR\n`
          content += `• Inventory Items: ${reportData.inventory?.totalItems || 0}\n`
          content += `• Low Stock Alerts: ${reportData.inventory?.lowStockItems || 0}\n`
        }
      }
    } else if (options.format === 'excel') {
      // Real Excel export using ExcelJS
      try {
        const ExcelJS = require('exceljs')
        const workbook = new ExcelJS.Workbook()

        // Set workbook properties
        workbook.creator = 'Dental Clinic Management System'
        workbook.created = new Date()
        workbook.modified = new Date()

        const worksheet = workbook.addWorksheet(`Report_${type}`)

        // Header
        worksheet.mergeCells('A1:C1')
        const headerCell = worksheet.getCell('A1')
        headerCell.value = `Report ${type} - Modern Dental Clinic`
        headerCell.font = { size: 16, bold: true }
        headerCell.alignment = { horizontal: 'center' }

        // Date
        worksheet.getCell('A3').value = `Report Date: ${new Date().toLocaleDateString()}`
        worksheet.getCell('A3').font = { size: 12 }

        // Headers
        let row = 5
        worksheet.getCell(`A${row}`).value = 'Indicator'
        worksheet.getCell(`B${row}`).value = 'Value'
        worksheet.getCell(`C${row}`).value = 'Description'

        // Style headers
        worksheet.getRow(row).font = { bold: true }
        worksheet.getRow(row).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        }

        row++

        if (reportData) {
          if (type === 'overview') {
            const data = [
              ['Total Patients', reportData.patients?.totalPatients || 0, 'Total number of registered patients'],
              ['New Patients', reportData.patients?.newPatientsThisMonth || 0, 'New patients this month'],
              ['Total Appointments', reportData.appointments?.totalAppointments || 0, 'All scheduled appointments'],
              ['Completed Appointments', reportData.appointments?.completedAppointments || 0, 'Successfully completed appointments'],
              ['Total Revenue', `${reportData.financial?.totalRevenue || 0} SAR`, 'Total revenue generated'],
              ['Pending Payments', `${reportData.financial?.pendingPayments || 0} SAR`, 'Outstanding payments'],
              ['Inventory Items', reportData.inventory?.totalItems || 0, 'Total inventory items'],
              ['Stock Alerts', reportData.inventory?.lowStockItems || 0, 'Items requiring restocking']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'patients') {
            const data = [
              ['Total Patients', reportData.totalPatients || 0, 'Total number of patients'],
              ['New Patients This Month', reportData.newPatientsThisMonth || 0, 'New registrations this month'],
              ['Active Patients', reportData.activePatients || 0, 'Currently active patients'],
              ['Average Age', `${reportData.averageAge || 0} years`, 'Average patient age']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'appointments') {
            const data = [
              ['Total Appointments', reportData.totalAppointments || 0, 'All appointments scheduled'],
              ['Completed Appointments', reportData.completedAppointments || 0, 'Successfully completed'],
              ['Cancelled Appointments', reportData.cancelledAppointments || 0, 'Cancelled appointments'],
              ['Attendance Rate', `${reportData.attendanceRate || 0}%`, 'Patient attendance percentage']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'financial') {
            const data = [
              ['Total Revenue', `${reportData.totalRevenue || 0} SAR`, 'Total revenue generated'],
              ['Completed Payments', `${reportData.completedPayments || 0} SAR`, 'Successfully collected payments'],
              ['Pending Payments', `${reportData.pendingPayments || 0} SAR`, 'Outstanding payments'],
              ['Overdue Payments', `${reportData.overduePayments || 0} SAR`, 'Overdue payment amounts']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          } else if (type === 'inventory') {
            const data = [
              ['Total Items', reportData.totalItems || 0, 'Total inventory items'],
              ['Total Value', `${reportData.totalValue || 0} SAR`, 'Total inventory value'],
              ['Low Stock Items', reportData.lowStockItems || 0, 'Items with low stock'],
              ['Expired Items', reportData.expiredItems || 0, 'Expired inventory items']
            ]

            data.forEach(([indicator, value, description]) => {
              worksheet.getCell(`A${row}`).value = indicator
              worksheet.getCell(`B${row}`).value = value
              worksheet.getCell(`C${row}`).value = description
              row++
            })
          }
        }

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          column.width = 25
        })

        content = await workbook.xlsx.writeBuffer()
        isBuffer = true
      } catch (error) {
        console.error('Excel generation error:', error)
        // Fallback to TSV format
        content = '\uFEFF' // BOM for UTF-8 support
        content += `Report ${type} - Modern Dental Clinic\n`
        content += `Report Date: ${new Date().toLocaleDateString()}\n\n`

        if (reportData) {
          content += 'Indicator\tValue\tDescription\n'
          if (type === 'overview') {
            content += `Total Patients\t${reportData.patients?.totalPatients || 0}\tTotal number of registered patients\n`
            content += `New Patients\t${reportData.patients?.newPatientsThisMonth || 0}\tNew patients this month\n`
            content += `Total Appointments\t${reportData.appointments?.totalAppointments || 0}\tAll scheduled appointments\n`
            content += `Completed Appointments\t${reportData.appointments?.completedAppointments || 0}\tSuccessfully completed appointments\n`
            content += `Total Revenue\t${reportData.financial?.totalRevenue || 0} SAR\tTotal revenue generated\n`
            content += `Pending Payments\t${reportData.financial?.pendingPayments || 0} SAR\tOutstanding payments\n`
            content += `Inventory Items\t${reportData.inventory?.totalItems || 0}\tTotal inventory items\n`
            content += `Stock Alerts\t${reportData.inventory?.lowStockItems || 0}\tItems requiring restocking\n`
          }
        }
      }
    }

    // Validate content
    if (!content || (typeof content === 'string' && content.trim().length === 0) || (isBuffer && content.byteLength === 0)) {
      throw new Error('لا توجد بيانات للتصدير')
    }

    // Write file
    if (isBuffer) {
      await fs.promises.writeFile(filePath, Buffer.from(content))
    } else {
      await fs.promises.writeFile(filePath, content, 'utf8')
    }

    // Verify file was created
    const stats = await fs.promises.stat(filePath)
    if (stats.size === 0) {
      throw new Error('فشل في كتابة الملف')
    }

    // Optionally open the file after export
    try {
      const { shell } = require('electron')
      await shell.openPath(filePath)
    } catch (error) {
      console.log('Could not open file automatically:', error.message)
    }

    return {
      success: true,
      message: `تم تصدير التقرير بنجاح (${Math.round(stats.size / 1024)} KB)`,
      filePath: filePath,
      fileSize: stats.size
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل في تصدير التقرير'
    }
  }
})

// License IPC Handlers
let licenseService = null
try {
  const { licenseManager } = require('./licenseService.js')
  licenseService = licenseManager
  console.log('License service initialized successfully')
} catch (error) {
  console.error('Failed to initialize license service:', error)
}

ipcMain.handle('license:activate', async (_, licenseKey) => {
  try {
    if (licenseService) {
      return await licenseService.activateLicense(licenseKey)
    } else {
      return {
        success: false,
        error: 'License service not available',
        errorCode: 'SERVICE_ERROR'
      }
    }
  } catch (error) {
    console.error('Error activating license:', error)
    return {
      success: false,
      error: `Activation error: ${error}`,
      errorCode: 'ACTIVATION_ERROR'
    }
  }
})

ipcMain.handle('license:validate', async () => {
  try {
    if (licenseService) {
      return await licenseService.validateCurrentLicense()
    } else {
      return {
        isValid: false,
        status: 'invalid',
        error: 'License service not available'
      }
    }
  } catch (error) {
    console.error('Error validating license:', error)
    return {
      isValid: false,
      status: 'invalid',
      error: `Validation error: ${error}`
    }
  }
})

ipcMain.handle('license:getInfo', async () => {
  try {
    if (licenseService) {
      return await licenseService.getLicenseInfo()
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting license info:', error)
    return null
  }
})

ipcMain.handle('license:deactivate', async () => {
  try {
    if (licenseService) {
      await licenseService.deactivateLicense()
      return { success: true }
    } else {
      return {
        success: false,
        error: 'License service not available'
      }
    }
  } catch (error) {
    console.error('Error deactivating license:', error)
    return {
      success: false,
      error: `Deactivation error: ${error}`
    }
  }
})

// Add additional license IPC handlers for device info
ipcMain.handle('license:getDeviceInfo', async () => {
  try {
    if (licenseService) {
      const deviceService = new (require('./licenseService.js')).DeviceFingerprintService()
      return await deviceService.generateFingerprint()
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting device info:', error)
    return null
  }
})
