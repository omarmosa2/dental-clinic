const Database = require('better-sqlite3')
const { join } = require('path')
const { readFileSync } = require('fs')
const { v4: uuidv4 } = require('uuid')
const { ImageMigrationService } = require('./imageMigrationService')

class DatabaseService {
  constructor(dbPath = null) {
    // If no path provided, try to get it from electron app
    if (!dbPath) {
      try {
        // Use app directory instead of userData for portable installation
        const appDir = process.execPath ? require('path').dirname(process.execPath) : process.cwd()
        dbPath = join(appDir, 'dental_clinic.db')
      } catch (error) {
        // Fallback for testing or non-electron environments
        dbPath = join(process.cwd(), 'dental_clinic.db')
      }
    }

    console.log('🗄️ Initializing SQLite database at:', dbPath)
    this.db = new Database(dbPath)
    this.initializeDatabase()
    this.runMigrations()

    // Initialize image migration service
    this.imageMigrationService = new ImageMigrationService(this)

    // Check if image migration is needed
    this.checkAndRunImageMigration()
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
      },
      {
        version: 6,
        sql: `
          -- Fix treatment_status CHECK constraint issue
          -- This migration fixes the mismatch between expected and actual treatment_status values

          -- Check if dental_treatments table exists and has the problematic CHECK constraint
          -- We'll recreate the table with correct constraints if needed

          -- First, check if we need to fix the table
          CREATE TABLE IF NOT EXISTS dental_treatments_temp (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
            tooth_name TEXT,
            current_treatment TEXT,
            next_treatment TEXT,
            treatment_details TEXT,
            treatment_status TEXT DEFAULT 'planned',
            treatment_color TEXT DEFAULT '#ef4444',
            cost REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          );

          -- Copy existing data if dental_treatments table exists, converting old status values
          INSERT OR IGNORE INTO dental_treatments_temp
          SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                 current_treatment, next_treatment, treatment_details,
                 CASE
                   WHEN treatment_status = 'active' THEN 'in_progress'
                   WHEN treatment_status = 'on_hold' THEN 'planned'
                   ELSE COALESCE(treatment_status, 'planned')
                 END as treatment_status,
                 treatment_color, cost, notes, created_at, updated_at
          FROM dental_treatments
          WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='dental_treatments');

          -- Drop old table if it exists
          DROP TABLE IF EXISTS dental_treatments;

          -- Rename temp table to final name
          ALTER TABLE dental_treatments_temp RENAME TO dental_treatments;
        `
      },
      {
        version: 7,
        sql: `
          -- Force fix for treatment_status CHECK constraint
          -- This migration will definitely fix the issue by recreating the table

          PRAGMA foreign_keys = OFF;

          -- Create backup of existing data
          CREATE TABLE IF NOT EXISTS dental_treatments_backup AS
          SELECT * FROM dental_treatments;

          -- Drop the problematic table completely
          DROP TABLE IF EXISTS dental_treatments;

          -- Create new table with correct structure (no CHECK constraints for treatment_status)
          CREATE TABLE dental_treatments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
            tooth_name TEXT,
            current_treatment TEXT,
            next_treatment TEXT,
            treatment_details TEXT,
            treatment_status TEXT DEFAULT 'planned',
            treatment_color TEXT DEFAULT '#ef4444',
            cost REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          );

          -- Restore data with status conversion
          INSERT INTO dental_treatments
          SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                 current_treatment, next_treatment, treatment_details,
                 CASE
                   WHEN treatment_status = 'active' THEN 'in_progress'
                   WHEN treatment_status = 'on_hold' THEN 'planned'
                   ELSE COALESCE(treatment_status, 'planned')
                 END as treatment_status,
                 treatment_color, cost, notes, created_at, updated_at
          FROM dental_treatments_backup;

          -- Clean up backup
          DROP TABLE IF EXISTS dental_treatments_backup;

          PRAGMA foreign_keys = ON;
        `
      },
      {
        version: 8,
        sql: `
          -- Fix dental_treatment_images table structure
          -- Remove tooth_record_id field and ensure correct schema

          PRAGMA foreign_keys = OFF;

          -- Check if dental_treatment_images table has tooth_record_id column
          CREATE TABLE IF NOT EXISTS dental_treatment_images_backup AS
          SELECT * FROM dental_treatment_images;

          -- Drop the old table
          DROP TABLE IF EXISTS dental_treatment_images;

          -- Create new table with correct structure (no tooth_record_id)
          CREATE TABLE dental_treatment_images (
            id TEXT PRIMARY KEY,
            dental_treatment_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            tooth_number INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_type TEXT NOT NULL,
            description TEXT,
            taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
          );

          -- Migrate data from backup table (if any exists and has valid data)
          INSERT INTO dental_treatment_images (
            id, dental_treatment_id, patient_id, tooth_number, image_path,
            image_type, description, taken_date, created_at, updated_at
          )
          SELECT
            id, dental_treatment_id, patient_id, tooth_number, image_path,
            image_type, description, taken_date, created_at, updated_at
          FROM dental_treatment_images_backup
          WHERE dental_treatment_id IS NOT NULL
            AND patient_id IS NOT NULL
            AND tooth_number IS NOT NULL
            AND image_path IS NOT NULL
            AND image_type IS NOT NULL;

          -- Drop backup table
          DROP TABLE IF EXISTS dental_treatment_images_backup;

          PRAGMA foreign_keys = ON;
        `
      }
    ]

    migrations.forEach(migration => {
      if (version < migration.version) {
        try {
          console.log(`🔄 Applying migration version ${migration.version}`)
          this.db.exec(migration.sql)
          this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version)
          console.log(`✅ Applied migration version ${migration.version}`)
        } catch (error) {
          console.warn(`❌ Migration ${migration.version} warning:`, error.message)
        }
      }
    })

    // Force check for dental_treatment_images table structure and apply migration 8 if needed
    try {
      const imageTableColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images)").all()
      const imageColumnNames = imageTableColumns.map(col => col.name)
      console.log('🔍 [DEBUG] Current dental_treatment_images columns:', imageColumnNames)

      if (imageColumnNames.includes('tooth_record_id')) {
        console.log('🔄 Force applying migration 8: Fix dental_treatment_images table structure')

        // Apply migration 8 SQL directly
        this.db.exec(`
          PRAGMA foreign_keys = OFF;

          CREATE TABLE IF NOT EXISTS dental_treatment_images_backup AS
          SELECT * FROM dental_treatment_images;

          DROP TABLE IF EXISTS dental_treatment_images;

          CREATE TABLE dental_treatment_images (
            id TEXT PRIMARY KEY,
            dental_treatment_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            tooth_number INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_type TEXT NOT NULL,
            description TEXT,
            taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
          );

          INSERT INTO dental_treatment_images (
            id, dental_treatment_id, patient_id, tooth_number, image_path,
            image_type, description, taken_date, created_at, updated_at
          )
          SELECT
            id, dental_treatment_id, patient_id, tooth_number, image_path,
            image_type, description, taken_date, created_at, updated_at
          FROM dental_treatment_images_backup
          WHERE dental_treatment_id IS NOT NULL
            AND patient_id IS NOT NULL
            AND tooth_number IS NOT NULL
            AND image_path IS NOT NULL
            AND image_type IS NOT NULL;

          DROP TABLE IF EXISTS dental_treatment_images_backup;

          PRAGMA foreign_keys = ON;
        `)

        // Record that migration 8 was applied
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(8)
        console.log('✅ Force applied migration 8: dental_treatment_images table fixed')
      } else {
        console.log('✅ dental_treatment_images table structure is correct')
      }
    } catch (error) {
      console.error('❌ Error checking/fixing dental_treatment_images table:', error.message)
    }
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

  // Dental Treatment operations
  async getAllDentalTreatments() {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT dt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM dental_treatments dt
      LEFT JOIN patients p ON dt.patient_id = p.id
      LEFT JOIN appointments a ON dt.appointment_id = a.id
      ORDER BY dt.created_at DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentsByPatient(patientId) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    // Check if tooth_number column exists, if not use a default ordering
    const tableInfo = this.db.prepare(`PRAGMA table_info(dental_treatments)`).all()
    const columnNames = tableInfo.map(col => col.name)
    const hasToothNumber = columnNames.includes('tooth_number')

    const orderBy = hasToothNumber ? 'dt.tooth_number ASC' : 'dt.created_at DESC'

    const stmt = this.db.prepare(`
      SELECT dt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM dental_treatments dt
      LEFT JOIN patients p ON dt.patient_id = p.id
      LEFT JOIN appointments a ON dt.appointment_id = a.id
      WHERE dt.patient_id = ?
      ORDER BY ${orderBy}
    `)
    return stmt.all(patientId)
  }

  async getDentalTreatmentsByTooth(patientId, toothNumber) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    // Check if tooth_number column exists
    const tableInfo = this.db.prepare(`PRAGMA table_info(dental_treatments)`).all()
    const columnNames = tableInfo.map(col => col.name)
    const hasToothNumber = columnNames.includes('tooth_number')

    if (!hasToothNumber) {
      // If tooth_number doesn't exist, return empty array or all treatments for patient
      console.log('⚠️ [DEBUG] tooth_number column not found, returning empty array')
      return []
    }

    const stmt = this.db.prepare(`
      SELECT dt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM dental_treatments dt
      LEFT JOIN patients p ON dt.patient_id = p.id
      LEFT JOIN appointments a ON dt.appointment_id = a.id
      WHERE dt.patient_id = ? AND dt.tooth_number = ?
      ORDER BY dt.created_at DESC
    `)
    return stmt.all(patientId, toothNumber)
  }

  async createDentalTreatment(treatment) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    console.log('🦷 Creating dental treatment:', {
      patient_id: treatment.patient_id,
      tooth_number: treatment.tooth_number,
      tooth_name: treatment.tooth_name,
      treatment_status: treatment.treatment_status
    })

    // Get current table schema to determine which columns exist
    const tableInfo = this.db.prepare(`PRAGMA table_info(dental_treatments)`).all()
    const columnNames = tableInfo.map(col => col.name)

    // Build dynamic INSERT statement based on existing columns
    const baseColumns = ['id', 'patient_id', 'created_at', 'updated_at']
    const baseValues = [id, treatment.patient_id, now, now]

    // Add columns that exist in the table
    const columnMappings = {
      'appointment_id': treatment.appointment_id || null,
      'tooth_number': treatment.tooth_number || 1,
      'tooth_name': treatment.tooth_name || '',
      'current_treatment': treatment.current_treatment || '',
      'next_treatment': treatment.next_treatment || '',
      'treatment_details': treatment.treatment_details || '',
      'treatment_status': (() => {
        let status = treatment.treatment_status
        // تحويل القيم القديمة إلى الجديدة
        if (status === 'active') status = 'in_progress'
        else if (status === 'on_hold') status = 'planned'

        // التحقق من صحة القيمة
        const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']
        return validStatuses.includes(status) ? status : 'planned'
      })(),
      'treatment_color': treatment.treatment_color || '#ef4444',
      'cost': treatment.cost || 0,
      'notes': treatment.notes || '',
      'treatment_date': now, // Required field in existing schema
      'patient_age': treatment.patient_age || null,
      'patient_gender': treatment.patient_gender || null,
      'total_cost': treatment.total_cost || treatment.cost || 0,
      'paid_amount': treatment.paid_amount || 0,
      'next_appointment_date': treatment.next_appointment_date || null
    }

    // Add existing columns to the query
    Object.keys(columnMappings).forEach(column => {
      if (columnNames.includes(column)) {
        baseColumns.push(column)
        baseValues.push(columnMappings[column])
      }
    })

    const placeholders = baseValues.map(() => '?').join(', ')
    const columnsStr = baseColumns.join(', ')

    console.log('🔍 [DEBUG] Using columns:', baseColumns)

    const stmt = this.db.prepare(`
      INSERT INTO dental_treatments (${columnsStr})
      VALUES (${placeholders})
    `)

    const result = stmt.run(...baseValues)

    console.log('✅ Dental treatment created successfully:', { id, changes: result.changes })

    // Force WAL checkpoint to ensure data is written
    this.db.pragma('wal_checkpoint(TRUNCATE)')

    return { ...treatment, id, created_at: now, updated_at: now }
  }

  async updateDentalTreatment(id, updates) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const now = new Date().toISOString()

    // قائمة الأعمدة المسموحة في جدول dental_treatments
    const allowedColumns = [
      'patient_id', 'appointment_id', 'tooth_number', 'tooth_name',
      'current_treatment', 'next_treatment', 'treatment_details',
      'treatment_status', 'treatment_color', 'cost', 'notes'
    ]

    // تصفية البيانات للاحتفاظ بالأعمدة المسموحة فقط
    const filteredUpdates = {}
    Object.keys(updates).forEach(key => {
      if (allowedColumns.includes(key) && key !== 'id') {
        let value = updates[key]

        // تحويل قيم treatment_status القديمة إلى الجديدة
        if (key === 'treatment_status') {
          const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']
          if (value === 'active') value = 'in_progress'
          else if (value === 'on_hold') value = 'planned'

          // التأكد من أن القيمة صحيحة
          if (!validStatuses.includes(value)) {
            console.warn(`Invalid treatment_status value: ${value}, defaulting to 'planned'`)
            value = 'planned'
          }
        }

        filteredUpdates[key] = value
      }
    })

    const fields = Object.keys(filteredUpdates)
    if (fields.length === 0) {
      console.log('No valid fields to update')
      return { id, updated_at: now }
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => filteredUpdates[field])

    const stmt = this.db.prepare(`
      UPDATE dental_treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
    return { ...filteredUpdates, id, updated_at: now }
  }

  async deleteDentalTreatment(id) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare('DELETE FROM dental_treatments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async fixDentalTreatmentStatusConstraint() {
    try {
      console.log('🔧 [DEBUG] Fixing dental treatment status constraint...')

      // Check if the table exists and has the problematic CHECK constraint
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatments'
      `).get()

      if (tableExists) {
        // Get table schema to check for CHECK constraints
        const tableSchema = this.db.prepare(`
          SELECT sql FROM sqlite_master WHERE type='table' AND name='dental_treatments'
        `).get()

        console.log('🔍 [DEBUG] Current table schema:', tableSchema?.sql)

        // If the schema contains the old CHECK constraint, recreate the table
        if (tableSchema?.sql && tableSchema.sql.includes("treatment_status IN ('active', 'completed', 'cancelled', 'on_hold')")) {
          console.log('🔧 [DEBUG] Found problematic CHECK constraint, recreating table...')

          // Disable foreign keys temporarily
          this.db.exec('PRAGMA foreign_keys = OFF')

          try {
            // Create backup of existing data
            this.db.exec(`
              CREATE TABLE IF NOT EXISTS dental_treatments_backup AS
              SELECT * FROM dental_treatments
            `)

            // Drop the problematic table
            this.db.exec('DROP TABLE dental_treatments')

            // Create new table with correct structure (no CHECK constraints for treatment_status)
            this.db.exec(`
              CREATE TABLE dental_treatments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
                tooth_name TEXT,
                current_treatment TEXT,
                next_treatment TEXT,
                treatment_details TEXT,
                treatment_status TEXT DEFAULT 'planned',
                treatment_color TEXT DEFAULT '#ef4444',
                cost REAL DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              )
            `)

            // Restore data with status conversion
            this.db.exec(`
              INSERT INTO dental_treatments
              SELECT id, patient_id, appointment_id, tooth_number, tooth_name,
                     current_treatment, next_treatment, treatment_details,
                     CASE
                       WHEN treatment_status = 'active' THEN 'in_progress'
                       WHEN treatment_status = 'on_hold' THEN 'planned'
                       ELSE COALESCE(treatment_status, 'planned')
                     END as treatment_status,
                     treatment_color, cost, notes, created_at, updated_at
              FROM dental_treatments_backup
            `)

            // Clean up backup
            this.db.exec('DROP TABLE dental_treatments_backup')

            console.log('✅ [DEBUG] Table recreated successfully with correct constraints')

          } finally {
            // Re-enable foreign keys
            this.db.exec('PRAGMA foreign_keys = ON')
          }
        } else {
          console.log('✅ [DEBUG] Table schema is correct, no fix needed')
        }
      }

    } catch (error) {
      console.error('❌ [DEBUG] Error fixing dental treatment status constraint:', error)
      // Don't throw the error, just log it and continue
    }
  }

  async ensureDentalTreatmentTablesExist() {
    try {
      console.log('🔍 [DEBUG] Checking if dental treatment tables exist...')

      // First, try to fix the status constraint issue
      await this.fixDentalTreatmentStatusConstraint()

      // Check if dental_treatments table exists
      const dentalTreatmentsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatments'
      `).get()

      // Check if dental_treatment_images table exists
      const dentalTreatmentImagesTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'
      `).get()

      // Check if dental_treatment_prescriptions table exists
      const dentalTreatmentPrescriptionsTableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_prescriptions'
      `).get()

      console.log('🔍 [DEBUG] Dental treatment tables status:')
      console.log('  - dental_treatments:', !!dentalTreatmentsTableExists)
      console.log('  - dental_treatment_images:', !!dentalTreatmentImagesTableExists)
      console.log('  - dental_treatment_prescriptions:', !!dentalTreatmentPrescriptionsTableExists)

      // If dental_treatments table exists, check if it has the correct schema
      if (dentalTreatmentsTableExists) {
        console.log('🔍 [DEBUG] Checking dental_treatments table schema...')

        // Get current table schema
        const tableInfo = this.db.prepare(`PRAGMA table_info(dental_treatments)`).all()
        const columnNames = tableInfo.map(col => col.name)
        console.log('🔍 [DEBUG] Current dental_treatments columns:', columnNames)

        // Check if required columns exist
        const hasToothNumber = columnNames.includes('tooth_number')
        const hasToothName = columnNames.includes('tooth_name')
        const hasCurrentTreatment = columnNames.includes('current_treatment')
        const hasNextTreatment = columnNames.includes('next_treatment')
        const hasTreatmentDetails = columnNames.includes('treatment_details')
        const hasTreatmentColor = columnNames.includes('treatment_color')
        const hasCost = columnNames.includes('cost')

        console.log('🔍 [DEBUG] Schema check:')
        console.log('  - has tooth_number:', hasToothNumber)
        console.log('  - has tooth_name:', hasToothName)
        console.log('  - has current_treatment:', hasCurrentTreatment)
        console.log('  - has next_treatment:', hasNextTreatment)
        console.log('  - has treatment_details:', hasTreatmentDetails)
        console.log('  - has treatment_color:', hasTreatmentColor)
        console.log('  - has cost:', hasCost)

        // Add missing columns one by one
        if (!hasToothNumber) {
          console.log('🔧 [DEBUG] Adding tooth_number column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN tooth_number INTEGER NOT NULL DEFAULT 1`)
          console.log('✅ [DEBUG] tooth_number column added successfully')
        }

        if (!hasToothName) {
          console.log('🔧 [DEBUG] Adding tooth_name column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN tooth_name TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] tooth_name column added successfully')
        }

        if (!hasCurrentTreatment) {
          console.log('🔧 [DEBUG] Adding current_treatment column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN current_treatment TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] current_treatment column added successfully')
        }

        if (!hasNextTreatment) {
          console.log('🔧 [DEBUG] Adding next_treatment column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN next_treatment TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] next_treatment column added successfully')
        }

        if (!hasTreatmentDetails) {
          console.log('🔧 [DEBUG] Adding treatment_details column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN treatment_details TEXT DEFAULT ''`)
          console.log('✅ [DEBUG] treatment_details column added successfully')
        }

        if (!hasTreatmentColor) {
          console.log('🔧 [DEBUG] Adding treatment_color column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN treatment_color TEXT DEFAULT '#ef4444'`)
          console.log('✅ [DEBUG] treatment_color column added successfully')
        }

        if (!hasCost) {
          console.log('🔧 [DEBUG] Adding cost column to dental_treatments table...')
          this.db.exec(`ALTER TABLE dental_treatments ADD COLUMN cost REAL DEFAULT 0`)
          console.log('✅ [DEBUG] cost column added successfully')
        }
      }

      // Create dental_treatments table if it doesn't exist
      if (!dentalTreatmentsTableExists) {
        console.log('🏗️ [DEBUG] Creating dental_treatments table...')
        this.db.exec(`
          CREATE TABLE dental_treatments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            appointment_id TEXT,
            tooth_number INTEGER NOT NULL,
            tooth_name TEXT,
            current_treatment TEXT,
            next_treatment TEXT,
            treatment_details TEXT,
            treatment_status TEXT DEFAULT 'planned',
            treatment_color TEXT DEFAULT '#ef4444',
            cost REAL DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          )
        `)
        console.log('✅ [DEBUG] Dental treatments table created successfully')
      } else {
        console.log('✅ [DEBUG] Dental treatments table already exists')
      }

      // Create dental_treatment_images table if it doesn't exist
      if (!dentalTreatmentImagesTableExists) {
        console.log('🏗️ [DEBUG] Creating dental_treatment_images table...')
        this.db.exec(`
          CREATE TABLE dental_treatment_images (
            id TEXT PRIMARY KEY,
            dental_treatment_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            tooth_number INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            image_type TEXT NOT NULL,
            description TEXT,
            taken_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ [DEBUG] Dental treatment images table created successfully')
      } else {
        console.log('✅ [DEBUG] Dental treatment images table already exists')

        // Check if the table has the correct schema
        const imagesTableInfo = this.db.prepare(`PRAGMA table_info(dental_treatment_images)`).all()
        const imagesColumnNames = imagesTableInfo.map(col => col.name)
        console.log('🔍 [DEBUG] Current dental_treatment_images columns:', imagesColumnNames)

        // Check if we need to add missing columns
        const requiredColumns = ['patient_id', 'tooth_number', 'taken_date', 'updated_at']
        const missingColumns = requiredColumns.filter(col => !imagesColumnNames.includes(col))

        if (missingColumns.length > 0) {
          console.log('🔧 [DEBUG] Adding missing columns to dental_treatment_images:', missingColumns)

          for (const column of missingColumns) {
            try {
              if (column === 'patient_id') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN patient_id TEXT`)
              } else if (column === 'tooth_number') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN tooth_number INTEGER`)
              } else if (column === 'taken_date') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN taken_date DATETIME DEFAULT CURRENT_TIMESTAMP`)
              } else if (column === 'updated_at') {
                this.db.exec(`ALTER TABLE dental_treatment_images ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
              }
              console.log(`✅ [DEBUG] Added column ${column} to dental_treatment_images`)
            } catch (error) {
              console.warn(`⚠️ [DEBUG] Could not add column ${column}:`, error.message)
            }
          }
        }
      }

      // Create dental_treatment_prescriptions table if it doesn't exist
      if (!dentalTreatmentPrescriptionsTableExists) {
        console.log('🏗️ [DEBUG] Creating dental_treatment_prescriptions table...')
        this.db.exec(`
          CREATE TABLE dental_treatment_prescriptions (
            id TEXT PRIMARY KEY,
            dental_treatment_id TEXT NOT NULL,
            prescription_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dental_treatment_id) REFERENCES dental_treatments(id) ON DELETE CASCADE,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
          )
        `)
        console.log('✅ [DEBUG] Dental treatment prescriptions table created successfully')
      } else {
        console.log('✅ [DEBUG] Dental treatment prescriptions table already exists')
      }

      // Create indexes if they don't exist
      this.createDentalTreatmentIndexes()

    } catch (error) {
      console.error('❌ [DEBUG] Error in ensureDentalTreatmentTablesExist:', error)
      console.error('❌ [DEBUG] Error stack:', error.stack)
      throw error
    }
  }

  createDentalTreatmentIndexes() {
    try {
      console.log('🔍 Creating dental treatment indexes...')

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient ON dental_treatments(patient_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_appointment ON dental_treatments(appointment_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_tooth ON dental_treatments(tooth_number)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_status ON dental_treatments(treatment_status)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient_tooth ON dental_treatments(patient_id, tooth_number)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_type ON dental_treatment_images(image_type)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_treatment ON dental_treatment_prescriptions(dental_treatment_id)',
        'CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_prescription ON dental_treatment_prescriptions(prescription_id)'
      ]

      indexes.forEach(indexSql => {
        try {
          this.db.exec(indexSql)
        } catch (error) {
          console.warn('Index creation warning:', error.message)
        }
      })

      console.log('✅ Dental treatment indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating dental treatment indexes:', error)
    }
  }

  // Dental Treatment Image operations
  async getAllDentalTreatmentImages() {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_number,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dt.patient_id = p.id
      ORDER BY dti.created_at DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentImages(treatmentId) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT * FROM dental_treatment_images
      WHERE dental_treatment_id = ?
      ORDER BY image_type, created_at
    `)
    return stmt.all(treatmentId)
  }

  async getDentalTreatmentImagesByTreatment(treatmentId) {
    // Alias for getDentalTreatmentImages for compatibility
    return this.getDentalTreatmentImages(treatmentId)
  }

  async createDentalTreatmentImage(image) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO dental_treatment_images (
        id, dental_treatment_id, patient_id, tooth_number, image_path,
        image_type, description, taken_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, image.dental_treatment_id, image.patient_id, image.tooth_number,
      image.image_path, image.image_type, image.description,
      image.taken_date || now, now, now
    )

    return { ...image, id, taken_date: image.taken_date || now, created_at: now, updated_at: now }
  }

  async updateDentalTreatmentImage(id, updates) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const fields = Object.keys(updates).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updates[field])

    const stmt = this.db.prepare(`
      UPDATE dental_treatment_images
      SET ${setClause}
      WHERE id = ?
    `)

    stmt.run(...values, id)
    return { ...updates, id }
  }

  async deleteDentalTreatmentImage(id) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare('DELETE FROM dental_treatment_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }



  // Dental Treatment Prescription operations
  async getAllDentalTreatmentPrescriptions() {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT dtp.*,
             p.prescription_date,
             p.notes as prescription_notes,
             pt.full_name as patient_name,
             dt.tooth_number,
             dt.tooth_name
      FROM dental_treatment_prescriptions dtp
      LEFT JOIN prescriptions p ON dtp.prescription_id = p.id
      LEFT JOIN patients pt ON p.patient_id = pt.id
      LEFT JOIN dental_treatments dt ON dtp.dental_treatment_id = dt.id
      ORDER BY p.prescription_date DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentPrescriptions(treatmentId) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      SELECT dtp.*,
             p.prescription_date,
             p.notes as prescription_notes,
             pt.full_name as patient_name
      FROM dental_treatment_prescriptions dtp
      LEFT JOIN prescriptions p ON dtp.prescription_id = p.id
      LEFT JOIN patients pt ON p.patient_id = pt.id
      WHERE dtp.dental_treatment_id = ?
      ORDER BY p.prescription_date DESC
    `)
    return stmt.all(treatmentId)
  }

  async createDentalTreatmentPrescription(link) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO dental_treatment_prescriptions (
        id, dental_treatment_id, prescription_id, created_at
      ) VALUES (?, ?, ?, ?)
    `)

    stmt.run(id, link.dental_treatment_id, link.prescription_id, now)

    return { ...link, id, created_at: now }
  }

  async deleteDentalTreatmentPrescriptionByIds(treatmentId, prescriptionId) {
    this.ensureConnection()
    this.ensureDentalTreatmentTablesExist()

    const stmt = this.db.prepare(`
      DELETE FROM dental_treatment_prescriptions
      WHERE dental_treatment_id = ? AND prescription_id = ?
    `)
    const result = stmt.run(treatmentId, prescriptionId)
    return result.changes > 0
  }

  /**
   * Check if image migration is needed and run it
   */
  async checkAndRunImageMigration() {
    try {
      // Check if migration has already been run
      let migrationVersion = 0
      try {
        const result = this.db.prepare(`
          SELECT version FROM schema_version
          WHERE version = 9
        `).get()
        migrationVersion = result ? result.version : 0
      } catch (error) {
        // Migration tracking not available
      }

      if (migrationVersion >= 9) {
        console.log('✅ Image migration already completed')
        return
      }

      // Check if there are any images that need migration
      const imageRecords = this.db.prepare(`
        SELECT COUNT(*) as count FROM dental_treatment_images
      `).get()

      if (imageRecords.count === 0) {
        console.log('📁 No images found, skipping migration')
        // Mark migration as completed
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
        return
      }

      console.log('🔄 Starting automatic image migration...')
      const result = await this.imageMigrationService.migrateImages()

      if (result.success) {
        console.log('✅ Image migration completed successfully')
        // Mark migration as completed
        this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(9)
      } else {
        console.warn('⚠️ Image migration completed with issues')
      }

    } catch (error) {
      console.error('❌ Error during image migration check:', error)
      // Don't throw error as this shouldn't prevent app startup
    }
  }

  /**
   * Manually trigger image migration
   */
  async runImageMigration() {
    console.log('🔄 Manually triggering image migration...')
    return await this.imageMigrationService.migrateImages()
  }
}

module.exports = { DatabaseService }
