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
    // Run patient schema migration BEFORE executing schema.sql
    this.runPatientSchemaMigration()

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
      'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name)',
      'CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number)',
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

    // Check if lab tables exist and create them if they don't
    this.ensureLabTablesExist()

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
      },
      {
        version: 4,
        sql: `
          -- Add doctor_name column to settings table
          ALTER TABLE settings ADD COLUMN doctor_name TEXT DEFAULT 'د. محمد أحمد';

          -- Update existing settings with default doctor name if null
          UPDATE settings SET doctor_name = 'د. محمد أحمد' WHERE doctor_name IS NULL;
        `
      },
      {
        version: 5,
        sql: `
          -- Add laboratory tables
          CREATE TABLE IF NOT EXISTS labs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_info TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS lab_orders (
            id TEXT PRIMARY KEY,
            lab_id TEXT NOT NULL,
            patient_id TEXT,
            service_name TEXT NOT NULL,
            cost REAL NOT NULL,
            order_date TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('معلق', 'مكتمل', 'ملغي')),
            notes TEXT,
            paid_amount REAL DEFAULT 0,
            remaining_balance REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
          );

          -- Laboratory indexes for search and performance optimization
          CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date ON lab_orders(patient_id, order_date);
          CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date);
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

  ensureLabTablesExist() {
    try {
      console.log('🧪 [DEBUG] ensureLabTablesExist() called')

      // List all existing tables first
      const allTables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all()
      console.log('📋 [DEBUG] All existing tables:', allTables.map(t => t.name))

      // Check if labs table exists
      const labsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='labs'
      `).get()
      console.log('🔍 [DEBUG] Labs table exists:', !!labsTableExists)

      // Check if lab_orders table exists
      const labOrdersTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='lab_orders'
      `).get()
      console.log('🔍 [DEBUG] Lab orders table exists:', !!labOrdersTableExists)

      if (!labsTableExists) {
        console.log('🏗️ [DEBUG] Creating labs table...')
        this.db.exec(`
          CREATE TABLE labs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_info TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Labs table created successfully')

        // Verify table was created
        const verifyLabs = this.db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='labs'
        `).get()
        console.log('🔍 [DEBUG] Labs table verification after creation:', !!verifyLabs)
      } else {
        console.log('✅ [DEBUG] Labs table already exists')
      }

      if (!labOrdersTableExists) {
        console.log('🏗️ [DEBUG] Creating lab_orders table...')
        this.db.exec(`
          CREATE TABLE lab_orders (
            id TEXT PRIMARY KEY,
            lab_id TEXT NOT NULL,
            patient_id TEXT,
            service_name TEXT NOT NULL,
            cost REAL NOT NULL,
            order_date TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('معلق', 'مكتمل', 'ملغي')),
            notes TEXT,
            paid_amount REAL DEFAULT 0,
            remaining_balance REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
          )
        `)
        console.log('✅ [DEBUG] Lab orders table created successfully')

        // Verify table was created
        const verifyLabOrders = this.db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='lab_orders'
        `).get()
        console.log('🔍 [DEBUG] Lab orders table verification after creation:', !!verifyLabOrders)
      } else {
        console.log('✅ [DEBUG] Lab orders table already exists')
      }

      // Create indexes if they don't exist
      this.createLabIndexes()

      // Final verification - list all tables again
      const finalTables = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all()
      console.log('📋 [DEBUG] All tables after ensureLabTablesExist:', finalTables.map(t => t.name))

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureLabTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createLabIndexes() {
    try {
      console.log('🔍 Creating laboratory indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_labs_name ON labs(name)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_orders(order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_service ON lab_orders(service_name)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_date ON lab_orders(lab_id, order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_date ON lab_orders(patient_id, order_date)',
        'CREATE INDEX IF NOT EXISTS idx_lab_orders_status_date ON lab_orders(status, order_date)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Laboratory indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating lab indexes:', error)
    }
  }

  runPatientSchemaMigration() {
    try {
      console.log('🔄 Starting patient schema migration...')

      // Check if patients table exists and what schema it has
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='patients'
      `).get()

      if (!tableExists) {
        console.log('✅ No patients table found - will be created by schema.sql')
        return
      }

      // Check if migration is needed by checking if new columns exist
      const tableInfo = this.db.pragma('table_info(patients)')
      console.log('📋 Current table structure:', tableInfo.map(col => col.name))

      const hasNewSchema = tableInfo.some(col => col.name === 'serial_number')
      const hasOldSchema = tableInfo.some(col => col.name === 'first_name')

      console.log('🔍 Schema analysis:')
      console.log('  - Has new schema (serial_number):', hasNewSchema)
      console.log('  - Has old schema (first_name):', hasOldSchema)

      if (hasNewSchema && !hasOldSchema) {
        console.log('✅ Migration already completed - new schema detected')
        return
      }

      if (!hasOldSchema) {
        console.log('✅ No old schema detected - no migration needed')
        return
      }

      // Get current patient count
      const patientCount = this.db.prepare('SELECT COUNT(*) as count FROM patients').get()
      console.log(`📊 Found ${patientCount.count} patients to migrate`)

      // Begin transaction for safe migration
      const transaction = this.db.transaction(() => {
        console.log('📋 Creating backup of existing patients...')

        // Step 1: Create backup table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS patients_backup AS
          SELECT * FROM patients
        `)

        console.log('🗑️ Dropping old patients table...')

        // Step 2: Drop existing table
        this.db.exec('DROP TABLE IF EXISTS patients')

        console.log('🏗️ Creating new patients table...')

        // Step 3: Create new table with updated schema
        this.db.exec(`
          CREATE TABLE patients (
            id TEXT PRIMARY KEY,
            serial_number TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
            age INTEGER NOT NULL CHECK (age > 0),
            patient_condition TEXT NOT NULL,
            allergies TEXT,
            medical_conditions TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)

        console.log('📊 Migrating existing patient data...')

        // Step 4: Migrate data from backup
        const migrateStmt = this.db.prepare(`
          INSERT INTO patients (
            id, serial_number, full_name, gender, age, patient_condition,
            allergies, medical_conditions, email, address, notes, phone,
            created_at, updated_at
          )
          SELECT
            id,
            SUBSTR(id, 1, 8) as serial_number,
            COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') as full_name,
            'male' as gender,
            CASE
              WHEN date_of_birth IS NOT NULL AND date_of_birth != ''
              THEN CAST((julianday('now') - julianday(date_of_birth)) / 365.25 AS INTEGER)
              ELSE 25
            END as age,
            COALESCE(NULLIF(medical_history, ''), 'يحتاج إلى تقييم طبي') as patient_condition,
            allergies,
            insurance_info as medical_conditions,
            email,
            address,
            notes,
            phone,
            created_at,
            updated_at
          FROM patients_backup
        `)

        const result = migrateStmt.run()
        console.log(`✅ Migrated ${result.changes} patient records`)

        // Step 5: Clean up backup table
        this.db.exec('DROP TABLE IF EXISTS patients_backup')

        console.log('🔧 Migration completed successfully')
      })

      // Execute the transaction
      transaction()

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      console.log('✅ Patient schema migration completed successfully')

    } catch (error) {
      console.error('❌ Migration failed:', error)

      // Try to restore from backup if it exists
      try {
        const backupExists = this.db.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='patients_backup'
        `).get()

        if (backupExists) {
          console.log('🔄 Attempting to restore from backup...')
          this.db.exec('DROP TABLE IF EXISTS patients')
          this.db.exec('ALTER TABLE patients_backup RENAME TO patients')
          console.log('✅ Restored from backup')
        }
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError)
      }

      // Don't throw error to prevent app from crashing
      console.log('⚠️ Migration failed but continuing with app startup')
    }
  }

  // Patient operations
  async getAllPatients() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY full_name
    `)
    return stmt.all()
  }

  async createPatient(patient) {
    const id = uuidv4()
    const now = new Date().toISOString()

    console.log('📝 Creating patient in SQLite:', patient.serial_number, patient.full_name)

    const stmt = this.db.prepare(`
      INSERT INTO patients (
        id, serial_number, full_name, gender, age, patient_condition,
        allergies, medical_conditions, email, address, notes, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      id, patient.serial_number, patient.full_name, patient.gender, patient.age,
      patient.patient_condition, patient.allergies, patient.medical_conditions,
      patient.email, patient.address, patient.notes, patient.phone, now, now
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
      WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR serial_number LIKE ?
      ORDER BY full_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  // Appointment operations
  async getAllAppointments() {
    this.ensureConnection()

    const stmt = this.db.prepare(`
      SELECT a.*, p.full_name as patient_name, t.name as treatment_name
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
        const allPatients = this.db.prepare('SELECT id, full_name FROM patients').all()
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
      SELECT
        p.*,
        pt.full_name as patient_name,
        pt.full_name as patient_full_name,
        pt.phone as patient_phone,
        pt.email as patient_email,
        a.title as appointment_title
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      ORDER BY p.payment_date DESC
    `)

    const payments = stmt.all()

    // Transform the data to include patient and appointment objects
    return payments.map(payment => ({
      ...payment,
      patient: payment.patient_id ? {
        id: payment.patient_id,
        full_name: payment.patient_full_name,
        first_name: payment.patient_full_name?.split(' ')[0] || '',
        last_name: payment.patient_full_name?.split(' ').slice(1).join(' ') || '',
        phone: payment.patient_phone,
        email: payment.patient_email
      } : null,
      appointment: payment.appointment_id ? {
        id: payment.appointment_id,
        title: payment.appointment_title
      } : null
    }))
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

    // Get patient data to include in the response
    const patientStmt = this.db.prepare('SELECT * FROM patients WHERE id = ?')
    const patient = patientStmt.get(payment.patient_id)

    const createdPayment = { ...payment, id, created_at: now, updated_at: now }

    if (patient) {
      createdPayment.patient = {
        id: patient.id,
        full_name: patient.full_name,
        first_name: patient.full_name?.split(' ')[0] || '',
        last_name: patient.full_name?.split(' ').slice(1).join(' ') || '',
        phone: patient.phone,
        email: patient.email
      }
    }

    return createdPayment
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
      SELECT p.*, pt.full_name as patient_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      WHERE pt.full_name LIKE ? OR p.receipt_number LIKE ?
      ORDER BY p.payment_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm)
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
        doctor_name: 'د. محمد أحمد',
        clinic_address: '',
        clinic_phone: '',
        clinic_email: '',
        clinic_logo: '',
        currency: 'USD',
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
          id, clinic_name, doctor_name, clinic_address, clinic_phone, clinic_email, clinic_logo,
          currency, language, timezone, backup_frequency, auto_save_interval,
          appointment_duration, working_hours_start, working_hours_end, working_days,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id, settings.clinic_name, settings.doctor_name, settings.clinic_address, settings.clinic_phone,
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
    const totalRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ?').get('completed').total || 0
    const pendingPayments = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ?').get('pending').total || 0

    // Today's appointments
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE DATE(start_time) = ?').get(today).count

    // This month's revenue
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const thisMonthRevenue = this.db.prepare('SELECT SUM(total_amount) as total FROM payments WHERE status = ? AND payment_date LIKE ?').get('completed', `${thisMonth}%`).total || 0

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

  // Lab operations
  async getAllLabs() {
    console.log('🔍 [DEBUG] getAllLabs() called')

    try {
      this.ensureConnection()
      console.log('✅ [DEBUG] Database connection ensured')

      this.ensureLabTablesExist() // Ensure tables exist before querying
      console.log('✅ [DEBUG] Lab tables existence ensured')

      const stmt = this.db.prepare('SELECT * FROM labs ORDER BY name')
      const labs = stmt.all()
      console.log(`📊 [DEBUG] Found ${labs.length} labs in database:`, labs)

      return labs
    } catch (error) {
      console.error('❌ [DEBUG] Error in getAllLabs():', error)
      throw error
    }
  }

  async createLab(lab) {
    console.log('🔍 [DEBUG] createLab() called with data:', lab)

    try {
      this.ensureConnection()
      console.log('✅ [DEBUG] Database connection ensured for createLab')

      this.ensureLabTablesExist() // Ensure tables exist before inserting
      console.log('✅ [DEBUG] Lab tables existence ensured for createLab')

      const id = uuidv4()
      const now = new Date().toISOString()
      console.log('🆔 [DEBUG] Generated ID:', id, 'Timestamp:', now)

      // Validate input data
      if (!lab.name || lab.name.trim() === '') {
        throw new Error('Lab name is required')
      }
      console.log('✅ [DEBUG] Lab data validation passed')

      console.log('🧪 [DEBUG] Creating lab with data:', {
        id,
        name: lab.name,
        contact_info: lab.contact_info,
        address: lab.address,
        created_at: now,
        updated_at: now
      })

      const stmt = this.db.prepare(`
        INSERT INTO labs (
          id, name, contact_info, address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      console.log('✅ [DEBUG] SQL statement prepared')

      const result = stmt.run(
        id, lab.name, lab.contact_info, lab.address, now, now
      )
      console.log('✅ [DEBUG] SQL statement executed. Result:', result)

      console.log('✅ [DEBUG] Lab created successfully:', {
        id,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      })

      // Force WAL checkpoint to ensure data is written
      console.log('💾 [DEBUG] Forcing WAL checkpoint...')
      const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
      console.log('💾 [DEBUG] Checkpoint result:', checkpoint)

      // Verify the lab was actually inserted
      const verifyStmt = this.db.prepare('SELECT * FROM labs WHERE id = ?')
      const insertedLab = verifyStmt.get(id)
      console.log('🔍 [DEBUG] Verification - Lab found in database:', insertedLab)

      const finalResult = { ...lab, id, created_at: now, updated_at: now }
      console.log('📤 [DEBUG] Returning final result:', finalResult)

      return finalResult
    } catch (error) {
      console.error('❌ [DEBUG] Error in createLab():', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  async updateLab(id, updates) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE labs
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteLab(id) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare('DELETE FROM labs WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchLabs(query) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM labs
      WHERE name LIKE ? OR contact_info LIKE ? OR address LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Lab order operations
  async getAllLabOrders() {
    console.log('🔍 [DEBUG] getAllLabOrders() called')
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        l.contact_info as lab_contact_info,
        l.address as lab_address,
        p.full_name as patient_name,
        p.phone as patient_phone,
        p.gender as patient_gender
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      ORDER BY lo.order_date DESC
    `)
    const labOrders = stmt.all()
    console.log('📊 [DEBUG] Raw lab orders from database:', labOrders.length)

    // Add lab and patient objects for compatibility
    return labOrders.map((order, index) => {
      console.log(`🔍 [DEBUG] Processing lab order ${index + 1}:`, {
        id: order.id,
        lab_id: order.lab_id,
        lab_name: order.lab_name,
        service_name: order.service_name
      })

      const labOrder = {
        id: order.id,
        lab_id: order.lab_id,
        patient_id: order.patient_id,
        service_name: order.service_name,
        cost: order.cost,
        order_date: order.order_date,
        status: order.status,
        notes: order.notes,
        paid_amount: order.paid_amount,
        remaining_balance: order.remaining_balance,
        created_at: order.created_at,
        updated_at: order.updated_at
      }

      // Always create lab object, even if lab_name is null
      labOrder.lab = {
        id: order.lab_id,
        name: order.lab_name || 'مختبر محذوف',
        contact_info: order.lab_contact_info || '',
        address: order.lab_address || '',
        created_at: '',
        updated_at: ''
      }

      if (order.patient_name) {
        labOrder.patient = {
          id: order.patient_id,
          full_name: order.patient_name,
          phone: order.patient_phone,
          gender: order.patient_gender
        }
      }

      console.log(`✅ [DEBUG] Processed lab order with lab name: "${labOrder.lab.name}"`)
      return labOrder
    })
  }

  async createLabOrder(labOrder) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🧪 Creating lab order:', {
        lab_id: labOrder.lab_id,
        patient_id: labOrder.patient_id,
        service_name: labOrder.service_name,
        cost: labOrder.cost,
        status: labOrder.status
      })

      const stmt = this.db.prepare(`
        INSERT INTO lab_orders (
          id, lab_id, patient_id, service_name, cost, order_date, status,
          notes, paid_amount, remaining_balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, labOrder.lab_id, labOrder.patient_id, labOrder.service_name,
        labOrder.cost, labOrder.order_date, labOrder.status,
        labOrder.notes, labOrder.paid_amount || 0, labOrder.remaining_balance || labOrder.cost,
        now, now
      )

      console.log('✅ Lab order created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...labOrder, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create lab order:', error)
      throw error
    }
  }

  async updateLabOrder(id, labOrder) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE lab_orders SET
        lab_id = COALESCE(?, lab_id),
        patient_id = COALESCE(?, patient_id),
        service_name = COALESCE(?, service_name),
        cost = COALESCE(?, cost),
        order_date = COALESCE(?, order_date),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        paid_amount = COALESCE(?, paid_amount),
        remaining_balance = COALESCE(?, remaining_balance),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      labOrder.lab_id, labOrder.patient_id, labOrder.service_name,
      labOrder.cost, labOrder.order_date, labOrder.status,
      labOrder.notes, labOrder.paid_amount, labOrder.remaining_balance,
      now, id
    )

    return { ...labOrder, id, updated_at: now }
  }

  async deleteLabOrder(id) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare('DELETE FROM lab_orders WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchLabOrders(query) {
    this.ensureConnection()
    this.ensureLabTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        p.full_name as patient_name
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      WHERE l.name LIKE ? OR p.full_name LIKE ? OR lo.service_name LIKE ?
      ORDER BY lo.order_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }

  // Medications operations
  async ensureMedicationTablesExist() {
    try {
      console.log('🔍 [DEBUG] Checking if medication tables exist...')

      // Check if medications table exists
      const medicationsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='medications'
      `).get()

      // Check if prescriptions table exists
      const prescriptionsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='prescriptions'
      `).get()

      // Check if prescription_medications table exists
      const prescriptionMedicationsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='prescription_medications'
      `).get()

      console.log('🔍 [DEBUG] Medication tables status:')
      console.log('  - medications:', !!medicationsTableExists)
      console.log('  - prescriptions:', !!prescriptionsTableExists)
      console.log('  - prescription_medications:', !!prescriptionMedicationsTableExists)

      // Create medications table if it doesn't exist
      if (!medicationsTableExists) {
        console.log('🏗️ [DEBUG] Creating medications table...')
        this.db.exec(`
          CREATE TABLE medications (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            instructions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('✅ [DEBUG] Medications table created successfully')
      } else {
        console.log('✅ [DEBUG] Medications table already exists')
      }

      // Create prescriptions table if it doesn't exist
      if (!prescriptionsTableExists) {
        console.log('🏗️ [DEBUG] Creating prescriptions table...')
        this.db.exec(`
          CREATE TABLE prescriptions (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            prescription_date TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          )
        `)
        console.log('✅ [DEBUG] Prescriptions table created successfully')
      } else {
        console.log('✅ [DEBUG] Prescriptions table already exists')
      }

      // Create prescription_medications table if it doesn't exist
      if (!prescriptionMedicationsTableExists) {
        console.log('🏗️ [DEBUG] Creating prescription_medications table...')
        this.db.exec(`
          CREATE TABLE prescription_medications (
            id TEXT PRIMARY KEY,
            prescription_id TEXT NOT NULL,
            medication_id TEXT NOT NULL,
            dose TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ [DEBUG] Prescription medications table created successfully')
      } else {
        console.log('✅ [DEBUG] Prescription medications table already exists')
      }

      // Create indexes if they don't exist
      this.createMedicationIndexes()

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureMedicationTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createMedicationIndexes() {
    try {
      console.log('🔍 Creating medication indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date)',
        'CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, prescription_date)',
        'CREATE INDEX IF NOT EXISTS idx_prescription_medications_prescription ON prescription_medications(prescription_id)',
        'CREATE INDEX IF NOT EXISTS idx_prescription_medications_medication ON prescription_medications(medication_id)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Medication indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating medication indexes:', error)
    }
  }

  async getAllMedications() {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM medications
      ORDER BY name
    `)
    return stmt.all()
  }

  async createMedication(medication) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO medications (id, name, instructions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const result = stmt.run(id, medication.name, medication.instructions, now, now)
    console.log('✅ Medication inserted, changes:', result.changes)

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return { ...medication, id, created_at: now, updated_at: now }
  }

  async updateMedication(id, updates) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const now = new Date().toISOString()
    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE medications
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...updates, id, updated_at: now }
  }

  async deleteMedication(id) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare('DELETE FROM medications WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async getAllPrescriptions() {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        a.title as appointment_title
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      ORDER BY p.prescription_date DESC
    `)

    const prescriptions = stmt.all()

    // Get medications for each prescription
    const medicationsStmt = this.db.prepare(`
      SELECT
        pm.*,
        m.name as medication_name,
        m.instructions as medication_instructions
      FROM prescription_medications pm
      LEFT JOIN medications m ON pm.medication_id = m.id
      WHERE pm.prescription_id = ?
    `)

    return prescriptions.map(prescription => ({
      ...prescription,
      patient: prescription.patient_id ? {
        id: prescription.patient_id,
        full_name: prescription.patient_name
      } : null,
      appointment: prescription.appointment_id ? {
        id: prescription.appointment_id,
        title: prescription.appointment_title
      } : null,
      medications: medicationsStmt.all(prescription.id)
    }))
  }

  async createPrescription(prescription) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Insert prescription
      const prescriptionStmt = this.db.prepare(`
        INSERT INTO prescriptions (id, patient_id, appointment_id, prescription_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      prescriptionStmt.run(
        id,
        prescription.patient_id,
        prescription.appointment_id,
        prescription.prescription_date,
        prescription.notes,
        now,
        now
      )

      // Insert prescription medications
      if (prescription.medications && prescription.medications.length > 0) {
        const medicationStmt = this.db.prepare(`
          INSERT INTO prescription_medications (id, prescription_id, medication_id, dose, created_at)
          VALUES (?, ?, ?, ?, ?)
        `)

        prescription.medications.forEach(med => {
          const medId = uuidv4()
          medicationStmt.run(medId, id, med.medication_id, med.dose, now)
        })
      }
    })

    transaction()

    // Force WAL checkpoint
    const checkpoint = this.db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('💾 Checkpoint result:', checkpoint)

    return { ...prescription, id, created_at: now, updated_at: now }
  }

  async updatePrescription(id, updates) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const now = new Date().toISOString()

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Update prescription
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'medications')
      if (fields.length > 0) {
        const setClause = fields.map(field => `${field} = ?`).join(', ')
        const values = fields.map(field => updates[field])

        const stmt = this.db.prepare(`
          UPDATE prescriptions
          SET ${setClause}, updated_at = ?
          WHERE id = ?
        `)

        stmt.run(...values, now, id)
      }

      // Update medications if provided
      if (updates.medications) {
        // Delete existing medications
        const deleteStmt = this.db.prepare('DELETE FROM prescription_medications WHERE prescription_id = ?')
        deleteStmt.run(id)

        // Insert new medications
        if (updates.medications.length > 0) {
          const medicationStmt = this.db.prepare(`
            INSERT INTO prescription_medications (id, prescription_id, medication_id, dose, created_at)
            VALUES (?, ?, ?, ?, ?)
          `)

          updates.medications.forEach(med => {
            const medId = uuidv4()
            medicationStmt.run(medId, id, med.medication_id, med.dose, now)
          })
        }
      }
    })

    transaction()

    return { ...updates, id, updated_at: now }
  }

  async deletePrescription(id) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare('DELETE FROM prescriptions WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchMedications(query) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM medications
      WHERE name LIKE ? OR instructions LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm)
  }

  async searchPrescriptions(query) {
    this.ensureConnection()
    this.ensureMedicationTablesExist()

    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name,
        a.title as appointment_title
      FROM prescriptions p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN appointments a ON p.appointment_id = a.id
      WHERE pt.full_name LIKE ? OR a.title LIKE ? OR p.notes LIKE ?
      ORDER BY p.prescription_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm)
  }
}

module.exports = { DatabaseService }
