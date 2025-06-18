const Database = require('better-sqlite3')
const { join } = require('path')
const { readFileSync } = require('fs')
const { v4: uuidv4 } = require('uuid')

class DatabaseService {
  constructor(dbPath = null) {
    // If no path provided, try to get it from electron app
    if (!dbPath) {
      try {
        const { app } = require('electron')
        dbPath = join(app.getPath('userData'), 'dental_clinic.db')
      } catch (error) {
        // Fallback for testing or non-electron environments
        dbPath = join(process.cwd(), 'dental_clinic.db')
      }
    }

    console.log('🗄️ Initializing SQLite database at:', dbPath)
    this.db = new Database(dbPath)
    this.initializeDatabase()
    this.runMigrations()
  }

  // Ensure database connection is open
  ensureConnection() {
    if (!this.isOpen()) {
      console.warn('Database connection is closed, reinitializing...')
      this.reinitialize()
    }
  }

  initializeDatabase() {
    // Read and execute schema
    const schemaPath = join(__dirname, '../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    this.db.exec(schema)

    // Enable foreign keys and other optimizations
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 1000')
    this.db.pragma('temp_store = MEMORY')

    // Create performance indexes
    this.createIndexes()
  }

  createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name)',
      'CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)',
      'CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category)'
    ]

    indexes.forEach(indexSql => {
      try {
        this.db.exec(indexSql)
      } catch (error) {
        console.warn('Index creation warning:', error.message)
      }
    })
  }

  runMigrations() {
    // Get current schema version
    let version = 0
    try {
      const result = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get()
      version = result ? result.version : 0
    } catch (error) {
      // schema_version table doesn't exist, create it
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    }

    // Apply migrations
    const migrations = [
      {
        version: 1,
        sql: `
          -- Add profile_image column to patients if it doesn't exist
          ALTER TABLE patients ADD COLUMN profile_image TEXT;
        `
      },
      {
        version: 2,
        sql: `
          -- Add installment_payments table
          CREATE TABLE IF NOT EXISTS installment_payments (
            id TEXT PRIMARY KEY,
            payment_id TEXT NOT NULL,
            installment_number INTEGER NOT NULL,
            amount REAL NOT NULL,
            due_date TEXT NOT NULL,
            paid_date TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
          );
        `
      },
      {
        version: 3,
        sql: `
          -- Add patient_images table
          CREATE TABLE IF NOT EXISTS patient_images (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            image_type TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
          );
        `
      }
    ]

    migrations.forEach(migration => {
      if (version < migration.version) {
        try {
          this.db.exec(migration.sql)
          this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
          console.log(`Applied migration version ${migration.version}`)
        } catch (error) {
          console.warn(`Migration ${migration.version} warning:`, error.message)
        }
      }
    })
  }

  // Patient operations
  async getAllPatients() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY last_name, first_name
    `)
    return stmt.all()
  }

  async createPatient(patient) {
    const id = uuidv4()
    const now = new Date().toISOString()

    console.log('📝 Creating patient in SQLite:', patient.first_name, patient.last_name)

    const stmt = this.db.prepare(`
      INSERT INTO patients (
        id, first_name, last_name, date_of_birth, phone, email, address,
        emergency_contact_name, emergency_contact_phone, medical_history,
        allergies, insurance_info, notes, profile_image, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      id, patient.first_name, patient.last_name, patient.date_of_birth,
      patient.phone, patient.email, patient.address,
      patient.emergency_contact_name, patient.emergency_contact_phone,
      patient.medical_history, patient.allergies, patient.insurance_info,
      patient.notes, patient.profile_image, now, now
    )

    console.log('✅ Patient inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Patient created successfully:', id)
    return { ...patient, id, created_at: now, updated_at: now }
  }

  async updatePatient(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE patients
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deletePatient(id) {
    const stmt = this.db.prepare('DELETE FROM patients WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchPatients(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER BY last_name, first_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  // Appointment operations
  async getAllAppointments() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT a.*, p.first_name, p.last_name, t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ORDER BY a.start_time DESC
    `)
    return stmt.all()
  }

  async createAppointment(appointment) {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      // Validate patient_id exists (required)
      if (!appointment.patient_id) {
        throw new Error('Patient ID is required')
      }

      const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
      const patientExists = patientCheck.get(appointment.patient_id)
      if (!patientExists) {
        // Log available patients for debugging
        const allPatients = this.db.prepare('SELECT id, first_name, last_name FROM patients').all()
        console.log('Available patients:', allPatients)
        throw new Error(`Patient with ID '${appointment.patient_id}' does not exist. Available patients: ${allPatients.length}`)
      }

      // Validate treatment_id exists (if provided)
      // Convert empty string to null for optional foreign key
      const treatmentId = appointment.treatment_id && appointment.treatment_id.trim() !== '' ? appointment.treatment_id : null

      if (treatmentId) {
        const treatmentCheck = this.db.prepare('SELECT id FROM treatments WHERE id = ?')
        const treatmentExists = treatmentCheck.get(treatmentId)
        if (!treatmentExists) {
          // Log available treatments for debugging
          const allTreatments = this.db.prepare('SELECT id, name FROM treatments').all()
          console.log('Available treatments:', allTreatments)
          throw new Error(`Treatment with ID '${treatmentId}' does not exist. Available treatments: ${allTreatments.length}`)
        }
      }

      console.log('Creating appointment with data:', {
        patient_id: appointment.patient_id,
        treatment_id: treatmentId,
        title: appointment.title,
        start_time: appointment.start_time,
        end_time: appointment.end_time
      })

      const stmt = this.db.prepare(`
        INSERT INTO appointments (
          id, patient_id, treatment_id, title, description, start_time, end_time,
          status, cost, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, appointment.patient_id, treatmentId, appointment.title,
        appointment.description, appointment.start_time, appointment.end_time,
        appointment.status || 'scheduled', appointment.cost, appointment.notes,
        now, now
      )

      console.log('✅ Appointment inserted, changes:', result.changes)

      // Force WAL checkpoint to write data to main database file
      console.log('💾 Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)

      console.log('✅ Appointment created successfully:', id)
      return { ...appointment, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create appointment:', error)
      console.error('Appointment data:', appointment)
      throw error
    }
  }

  async updateAppointment(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE appointments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteAppointment(id) {
    const stmt = this.db.prepare('DELETE FROM appointments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Payment operations
  async getAllPayments() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT p.*, pt.first_name, pt.last_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      ORDER BY p.payment_date DESC
    `)
    return stmt.all()
  }

  async createPayment(payment) {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO payments (
        id, patient_id, appointment_id, amount, payment_method, payment_date,
        status, description, receipt_number, notes, discount_amount, tax_amount,
        total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      id, payment.patient_id, payment.appointment_id, payment.amount,
      payment.payment_method, payment.payment_date, payment.status || 'completed',
      payment.description, payment.receipt_number, payment.notes,
      payment.discount_amount || 0, payment.tax_amount || 0,
      payment.total_amount || payment.amount, now, now
    )

    console.log('✅ Payment inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Payment created successfully:', id)
    return { ...payment, id, created_at: now, updated_at: now }
  }

  async updatePayment(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE payments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deletePayment(id) {
    const stmt = this.db.prepare('DELETE FROM payments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchPayments(query) {
    const stmt = this.db.prepare(`
      SELECT p.*, pt.first_name, pt.last_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      WHERE pt.first_name LIKE ? OR pt.last_name LIKE ? OR p.receipt_number LIKE ?
      ORDER BY p.payment_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Treatment operations
  async getAllTreatments() {
    this.ensureConnection()

    const stmt = this.db.prepare('SELECT * FROM treatments ORDER BY name')
    return stmt.all()
  }

  async createTreatment(treatment) {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO treatments (
        id, name, description, default_cost, duration_minutes, category, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, treatment.name, treatment.description, treatment.default_cost,
      treatment.duration_minutes, treatment.category, now, now
    )

    return { ...treatment, id, created_at: now, updated_at: now }
  }

  async updateTreatment(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteTreatment(id) {
    const stmt = this.db.prepare('DELETE FROM treatments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Inventory operations
  async getAllInventoryItems() {
    this.ensureConnection()

    const stmt = this.db.prepare('SELECT * FROM inventory ORDER BY name')
    return stmt.all()
  }

  async createInventoryItem(item) {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO inventory (
        id, name, description, category, quantity, unit, cost_per_unit,
        supplier, minimum_stock, expiry_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      id, item.name, item.description, item.category, item.quantity,
      item.unit, item.cost_per_unit, item.supplier, item.minimum_stock,
      item.expiry_date, now, now
    )

    console.log('✅ Inventory item inserted, changes:', result.changes)

    // Force WAL checkpoint to write data to main database file
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    console.log('✅ Inventory item created successfully:', id)
    return { ...item, id, created_at: now, updated_at: now }
  }

  async updateInventoryItem(id, updates) {
    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE inventory
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteInventoryItem(id) {
    const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchInventoryItems(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM inventory
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Settings operations
  async getSettings() {
    this.ensureConnection()

    const stmt = this.db.prepare('SELECT * FROM settings LIMIT 1')
    const result = stmt.get()

    if (!result) {
      // Create default settings
      const defaultSettings = {
        id: uuidv4(),
        clinic_name: 'عيادة الأسنان',
        clinic_address: '',
        clinic_phone: '',
        clinic_email: '',
        clinic_logo: '',
        currency: 'SAR',
        language: 'ar',
        timezone: 'Asia/Riyadh',
        backup_frequency: 'daily',
        auto_save_interval: 300,
        appointment_duration: 30,
        working_hours_start: '08:00',
        working_hours_end: '18:00',
        working_days: 'السبت,الأحد,الاثنين,الثلاثاء,الأربعاء',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await this.updateSettings(defaultSettings)
      return defaultSettings
    }

    return result
  }

  async updateSettings(settings) {
    const now = new Date().toISOString()

    // Check if settings exist
    const existing = this.db.prepare('SELECT id FROM settings LIMIT 1').get()

    if (existing) {
      // Update existing settings
      const fields = Object.keys(settings).filter(key => key !== 'id')
      const setClause = fields.map(field => `${field} = ?`).join(', ')
      const values = fields.map(field => settings[field])

      const stmt = this.db.prepare(`
        UPDATE settings
        SET ${setClause}, updated_at = ?
        WHERE id = ?
      `)

      stmt.run(...values, now, existing.id)
      return { ...settings, id: existing.id, updated_at: now }
    } else {
      // Insert new settings
      const id = settings.id || uuidv4()
      const stmt = this.db.prepare(`
        INSERT INTO settings (
          id, clinic_name, clinic_address, clinic_phone, clinic_email, clinic_logo,
          currency, language, timezone, backup_frequency, auto_save_interval,
          appointment_duration, working_hours_start, working_hours_end, working_days,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id, settings.clinic_name, settings.clinic_address, settings.clinic_phone,
        settings.clinic_email, settings.clinic_logo, settings.currency,
        settings.language, settings.timezone, settings.backup_frequency,
        settings.auto_save_interval, settings.appointment_duration,
        settings.working_hours_start, settings.working_hours_end,
        settings.working_days, settings.created_at || now, now
      )

      return { ...settings, id, created_at: settings.created_at || now, updated_at: now }
    }
  }

  // Dashboard operations
  async getDashboardStats() {
    this.ensureConnection()

    const totalPatients = this.db.prepare('SELECT COUNT(*) as count FROM patients').get().count
    const totalAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments').get().count
    const totalRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = "completed"').get().total || 0
    const pendingPayments = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = "pending"').get().total || 0

    // Today's appointments
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE DATE(start_time) = ?').get(today).count

    // This month's revenue
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const thisMonthRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = "completed" AND payment_date LIKE ?').get(`${thisMonth}%`).total || 0

    // Low stock items
    const lowStockItems = this.db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= minimum_stock').get().count

    return {
      total_patients: totalPatients,
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      pending_payments: pendingPayments,
      today_appointments: todayAppointments,
      this_month_revenue: thisMonthRevenue,
      low_stock_items: lowStockItems
    }
  }

  // Additional operations for backup/restore
  async getAllInventoryUsage() {
    const stmt = this.db.prepare('SELECT * FROM inventory_usage ORDER BY used_at DESC')
    return stmt.all()
  }

  async getAllPatientImages() {
    const stmt = this.db.prepare('SELECT * FROM patient_images ORDER BY created_at DESC')
    return stmt.all()
  }

  async getAllInstallmentPayments() {
    const stmt = this.db.prepare('SELECT * FROM installment_payments ORDER BY due_date')
    return stmt.all()
  }

  // Clear operations for migration/restore
  async clearAllPatients() {
    const transaction = this.db.transaction(() => {
      // Delete related data first due to foreign key constraints
      this.db.prepare('DELETE FROM patient_images').run()
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
      this.db.prepare('DELETE FROM appointments').run()
      this.db.prepare('DELETE FROM patients').run()
    })
    transaction()
  }

  async clearAllAppointments() {
    this.db.prepare('DELETE FROM appointments').run()
  }

  async clearAllPayments() {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
    })
    transaction()
  }

  async clearAllTreatments() {
    this.db.prepare('DELETE FROM treatments').run()
  }

  async clearAllInventory() {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM inventory').run()
    })
    transaction()
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // Reinitialize database connection
  reinitialize() {
    if (this.db) {
      this.close()
    }

    // Get database path
    let dbPath
    try {
      const { app } = require('electron')
      dbPath = join(app.getPath('userData'), 'dental_clinic.db')
    } catch (error) {
      // Fallback for testing or non-electron environments
      dbPath = join(process.cwd(), 'dental_clinic.db')
    }

    this.db = new Database(dbPath)

    // Enable foreign keys and other optimizations
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 1000')
    this.db.pragma('temp_store = MEMORY')

    console.log('✅ Database connection reinitialized')
  }

  // Check if database is open
  isOpen() {
    return this.db && this.db.open
  }

  // Force WAL checkpoint to ensure data is written to main database file
  forceCheckpoint() {
    if (this.db && this.isOpen()) {
      console.log('💾 Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 Checkpoint result:', checkpoint)
      return checkpoint
    }
    return null
  }
}

module.exports = { DatabaseService }
