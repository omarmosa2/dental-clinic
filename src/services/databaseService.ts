import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type {
  Patient,
  Appointment,
  Payment,
  Treatment,
  InventoryItem,
  ClinicSettings,
  DashboardStats,
  Lab,
  LabOrder
} from '../types'
import { MigrationService } from './migrationService'

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
    console.log('🗄️ Initializing SQLite database at:', dbPath)

    try {
      this.db = new Database(dbPath)
      console.log('✅ Database connection established')

      this.initializeDatabase()
      console.log('✅ Database schema initialized')

      this.runMigrations()
      console.log('✅ Database migrations completed')

      // Run patient schema migration
      this.runPatientSchemaMigration()
      console.log('✅ Patient schema migration completed')

      // Test database connection
      const testQuery = this.db.prepare('SELECT COUNT(*) as count FROM patients')
      const result = testQuery.get() as { count: number }
      console.log('✅ Database test successful. Patient count:', result.count)

    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  private initializeDatabase() {
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

  private createIndexes() {
    try {
      // Patient indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email)')

      // Appointment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_treatment ON appointments(treatment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)')

      // Payment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number)')

      // Inventory indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date)')

      // Inventory usage indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_item ON inventory_usage(inventory_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_appointment ON inventory_usage(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_usage(usage_date)')

      // Patient images indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_patient ON patient_images(patient_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_appointment ON patient_images(appointment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patient_images_type ON patient_images(image_type)')

      // Installment payments indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_payment ON installment_payments(payment_id)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status)')

      // Treatment indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_treatments_name ON treatments(name)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(category)')
    } catch (error) {
      console.error('Error creating indexes:', error)
    }
  }

  private runMigrations() {
    // Initialize migration tracking table
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          description TEXT,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN DEFAULT TRUE
        )
      `)
    } catch (error) {
      console.error('Failed to create migration tracking table:', error)
    }

    // Enhanced migration with transaction and rollback support
    const transaction = this.db.transaction(() => {
      try {
        // Check what migrations have been applied
        const appliedMigrations = new Set()
        try {
          const applied = this.db.prepare('SELECT version FROM schema_migrations WHERE success = TRUE').all() as { version: number }[]
          applied.forEach(m => appliedMigrations.add(m.version))
        } catch (error) {
          // Migration table doesn't exist yet, continue
        }

        // Migration 1: Add missing columns to payments table
        if (!appliedMigrations.has(1)) {
          console.log('🔄 Applying migration 1: Enhanced payments table structure')

          const columns = this.db.prepare("PRAGMA table_info(payments)").all() as any[]
          const columnNames = columns.map(col => col.name)

          if (!columnNames.includes('notes')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN notes TEXT')
          }

          if (!columnNames.includes('discount_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0')
          }

          if (!columnNames.includes('tax_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0')
          }

          if (!columnNames.includes('total_amount')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN total_amount DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET total_amount = amount WHERE total_amount IS NULL')
          }

          if (!columnNames.includes('total_amount_due')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN total_amount_due DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET total_amount_due = amount WHERE total_amount_due IS NULL')
          }

          if (!columnNames.includes('amount_paid')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN amount_paid DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET amount_paid = amount WHERE amount_paid IS NULL')
          }

          if (!columnNames.includes('remaining_balance')) {
            this.db.exec('ALTER TABLE payments ADD COLUMN remaining_balance DECIMAL(10,2)')
            this.db.exec('UPDATE payments SET remaining_balance = COALESCE(total_amount_due, amount) - COALESCE(amount_paid, amount) WHERE remaining_balance IS NULL')
          }

          // Record successful migration
          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(1, 'Enhanced payments table structure')
          console.log('✅ Migration 1 completed successfully')
        }

        // Migration 2: Add profile_image to patients if missing
        if (!appliedMigrations.has(2)) {
          console.log('🔄 Applying migration 2: Add profile_image to patients')

          const patientColumns = this.db.prepare("PRAGMA table_info(patients)").all() as any[]
          const patientColumnNames = patientColumns.map(col => col.name)

          if (!patientColumnNames.includes('profile_image')) {
            this.db.exec('ALTER TABLE patients ADD COLUMN profile_image TEXT')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(2, 'Add profile_image to patients')
          console.log('✅ Migration 2 completed successfully')
        }

        // Migration 3: Ensure all tables exist with proper structure
        if (!appliedMigrations.has(3)) {
          console.log('🔄 Applying migration 3: Ensure all tables exist')

          // Check if installment_payments table exists
          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
          const tableNames = tables.map(t => t.name)

          if (!tableNames.includes('installment_payments')) {
            this.db.exec(`
              CREATE TABLE installment_payments (
                id TEXT PRIMARY KEY,
                payment_id TEXT NOT NULL,
                installment_number INTEGER NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE NOT NULL,
                paid_date DATE,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
              )
            `)
          }

          if (!tableNames.includes('patient_images')) {
            this.db.exec(`
              CREATE TABLE patient_images (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                image_path TEXT NOT NULL,
                image_type TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              )
            `)
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(3, 'Ensure all tables exist')
          console.log('✅ Migration 3 completed successfully')
        }

        // Migration 4: Add doctor_name to settings table
        if (!appliedMigrations.has(4)) {
          console.log('🔄 Applying migration 4: Add doctor_name to settings')

          const settingsColumns = this.db.prepare("PRAGMA table_info(settings)").all() as any[]
          const settingsColumnNames = settingsColumns.map(col => col.name)

          if (!settingsColumnNames.includes('doctor_name')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN doctor_name TEXT DEFAULT \'د. محمد أحمد\'')
            this.db.exec('UPDATE settings SET doctor_name = \'د. محمد أحمد\' WHERE doctor_name IS NULL')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(4, 'Add doctor_name to settings')
          console.log('✅ Migration 4 completed successfully')
        }

        // Migration 5: Add password fields to settings table
        if (!appliedMigrations.has(5)) {
          console.log('🔄 Applying migration 5: Add password fields to settings')

          const settingsColumns = this.db.prepare("PRAGMA table_info(settings)").all() as any[]
          const settingsColumnNames = settingsColumns.map(col => col.name)

          if (!settingsColumnNames.includes('app_password')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN app_password TEXT')
          }

          if (!settingsColumnNames.includes('password_enabled')) {
            this.db.exec('ALTER TABLE settings ADD COLUMN password_enabled INTEGER DEFAULT 0')
          }

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(5, 'Add password fields to settings')
          console.log('✅ Migration 5 completed successfully')
        }

        // Migration 6: Create dental treatment tables
        if (!appliedMigrations.has(6)) {
          console.log('🔄 Applying migration 6: Create dental treatment tables')

          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
          const tableNames = tables.map(t => t.name)

          // Create dental_treatments table
          if (!tableNames.includes('dental_treatments')) {
            this.db.exec(`
              CREATE TABLE dental_treatments (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                appointment_id TEXT,
                tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
                tooth_name TEXT NOT NULL,
                current_treatment TEXT,
                next_treatment TEXT,
                treatment_details TEXT,
                treatment_status TEXT DEFAULT 'planned',
                treatment_color TEXT DEFAULT '#22c55e',
                cost DECIMAL(10,2),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
              )
            `)
          }

          // Create dental_treatment_images table
          if (!tableNames.includes('dental_treatment_images')) {
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
          }

          // Create dental_treatment_prescriptions table
          if (!tableNames.includes('dental_treatment_prescriptions')) {
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
          }

          // Create indexes for dental treatment tables
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_patient ON dental_treatments(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_tooth ON dental_treatments(tooth_number)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatments_status ON dental_treatments(treatment_status)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_treatment ON dental_treatment_prescriptions(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_prescriptions_prescription ON dental_treatment_prescriptions(prescription_id)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(6, 'Create dental treatment tables')
          console.log('✅ Migration 6 completed successfully')
        }

        // Migration 7: Fix dental_treatment_images table structure
        if (!appliedMigrations.has(7)) {
          console.log('🔄 Applying migration 7: Fix dental_treatment_images table structure')

          // Check if dental_treatment_images table has tooth_record_id column
          const imageTableColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images)").all() as any[]
          const imageColumnNames = imageTableColumns.map(col => col.name)

          if (imageColumnNames.includes('tooth_record_id')) {
            // Drop the old table and recreate it with correct structure
            this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')
            this.db.exec('ALTER TABLE dental_treatment_images RENAME TO dental_treatment_images_backup')

            // Create new table with correct structure
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

            // Migrate data from backup table (if any exists)
            try {
              this.db.exec(`
                INSERT INTO dental_treatment_images (
                  id, dental_treatment_id, patient_id, tooth_number, image_path,
                  image_type, description, taken_date, created_at, updated_at
                )
                SELECT
                  id, dental_treatment_id, patient_id, tooth_number, image_path,
                  image_type, description, taken_date, created_at, updated_at
                FROM dental_treatment_images_backup
                WHERE dental_treatment_id IS NOT NULL
              `)
            } catch (error) {
              console.log('No data to migrate from backup table')
            }

            // Drop backup table
            this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')
          }

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(7, 'Fix dental_treatment_images table structure')
          console.log('✅ Migration 7 completed successfully')
        }

        // Migration 8: Force recreate dental_treatment_images table
        if (!appliedMigrations.has(8)) {
          console.log('🔄 Applying migration 8: Force recreate dental_treatment_images table')

          // Always recreate the table to ensure correct structure
          this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')

          // Check if table exists
          const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'").all() as { name: string }[]

          if (tables.length > 0) {
            // Backup existing data
            this.db.exec('CREATE TABLE dental_treatment_images_backup AS SELECT * FROM dental_treatment_images')

            // Drop the old table
            this.db.exec('DROP TABLE dental_treatment_images')
          }

          // Create new table with correct structure
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

          // Migrate data from backup table (if any exists)
          try {
            const backupTables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images_backup'").all() as { name: string }[]
            if (backupTables.length > 0) {
              // Check what columns exist in backup
              const backupColumns = this.db.prepare("PRAGMA table_info(dental_treatment_images_backup)").all() as any[]
              const backupColumnNames = backupColumns.map(col => col.name)

              // Only migrate if we have the required columns
              if (backupColumnNames.includes('dental_treatment_id') &&
                  backupColumnNames.includes('patient_id') &&
                  backupColumnNames.includes('tooth_number') &&
                  backupColumnNames.includes('image_path') &&
                  backupColumnNames.includes('image_type')) {

                this.db.exec(`
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
                    AND image_type IS NOT NULL
                `)
                console.log('✅ Data migrated from backup table')
              }
            }
          } catch (error) {
            console.log('No data to migrate from backup table:', error.message)
          }

          // Drop backup table
          this.db.exec('DROP TABLE IF EXISTS dental_treatment_images_backup')

          // Recreate indexes
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_treatment ON dental_treatment_images(dental_treatment_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_patient ON dental_treatment_images(patient_id)')
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_dental_treatment_images_tooth ON dental_treatment_images(tooth_number)')

          this.db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(8, 'Force recreate dental_treatment_images table')
          console.log('✅ Migration 8 completed successfully')
        }

      } catch (error) {
        console.error('❌ Migration failed:', error)
        // Record failed migration
        this.db.prepare('INSERT INTO schema_migrations (version, description, success) VALUES (?, ?, FALSE)').run(0, `Migration failed: ${error.message}`)
        throw error
      }
    })

    try {
      transaction()
      console.log('✅ All database migrations completed successfully')
    } catch (error) {
      console.error('❌ Migration transaction failed:', error)
      throw error
    }
  }

  private runPatientSchemaMigration() {
    try {
      const migrationService = new MigrationService(this.db)
      migrationService.runMigration001()
    } catch (error) {
      console.error('❌ Patient schema migration failed:', error)
      // Don't throw error to prevent app from crashing
      // The migration will be retried on next startup
    }
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY full_name
    `)
    return stmt.all() as Patient[]
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🏥 Creating patient:', {
        serial_number: patient.serial_number,
        full_name: patient.full_name,
        gender: patient.gender,
        age: patient.age,
        phone: patient.phone
      })

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

      console.log('✅ Patient created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...patient, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create patient:', error)
      throw error
    }
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE patients SET
        serial_number = COALESCE(?, serial_number),
        full_name = COALESCE(?, full_name),
        gender = COALESCE(?, gender),
        age = COALESCE(?, age),
        patient_condition = COALESCE(?, patient_condition),
        allergies = COALESCE(?, allergies),
        medical_conditions = COALESCE(?, medical_conditions),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        notes = COALESCE(?, notes),
        phone = COALESCE(?, phone),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      patient.serial_number, patient.full_name, patient.gender, patient.age,
      patient.patient_condition, patient.allergies, patient.medical_conditions,
      patient.email, patient.address, patient.notes, patient.phone, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM patients WHERE id = ?')
    return getStmt.get(id) as Patient
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting cascade deletion for patient: ${id}`)

      // Use the comprehensive deletion method with transaction
      const result = await this.deletePatientWithAllData(id)

      if (result.success) {
        console.log(`✅ Patient ${id} and all related data deleted successfully:`)
        console.log(`- Patient images: ${result.deletedCounts.patient_images}`)
        console.log(`- Inventory usage records: ${result.deletedCounts.inventory_usage}`)
        console.log(`- Installment payments: ${result.deletedCounts.installment_payments}`)
        console.log(`- Payments: ${result.deletedCounts.payments}`)
        console.log(`- Appointments: ${result.deletedCounts.appointments}`)
        console.log(`- Patient record: ${result.deletedCounts.patient}`)

        // Force WAL checkpoint to ensure all data is written
        this.db.pragma('wal_checkpoint(TRUNCATE)')

        return result.deletedCounts.patient > 0
      } else {
        console.warn(`⚠️ Patient ${id} deletion failed or patient not found`)
        return false
      }
    } catch (error) {
      console.error(`❌ Failed to delete patient ${id}:`, error)
      throw new Error(`Failed to delete patient: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? OR serial_number LIKE ?
      ORDER BY full_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as Patient[]
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ORDER BY a.start_time
    `)
    const appointments = stmt.all() as Appointment[]

    // Add patient object for compatibility
    return appointments.map(appointment => {
      if (appointment.patient_name) {
        appointment.patient = {
          id: appointment.patient_id,
          full_name: appointment.patient_name,
          first_name: appointment.first_name,
          last_name: appointment.last_name,
          phone: appointment.phone,
          email: appointment.email,
          gender: appointment.gender
        } as any
      }
      return appointment
    })
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
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
        appointment.status, appointment.cost, appointment.notes, now, now
      )

      console.log('✅ Appointment created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      // Get the created appointment with patient and treatment data
      const getStmt = this.db.prepare(`
        SELECT
          a.*,
          p.full_name as patient_name,
          p.first_name,
          p.last_name,
          p.phone,
          p.email,
          p.gender,
          t.name as treatment_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE a.id = ?
      `)
      const createdAppointment = getStmt.get(id) as Appointment

      // Add patient object for compatibility
      if (createdAppointment && createdAppointment.patient_name) {
        createdAppointment.patient = {
          id: createdAppointment.patient_id,
          full_name: createdAppointment.patient_name,
          first_name: createdAppointment.first_name,
          last_name: createdAppointment.last_name,
          phone: createdAppointment.phone,
          email: createdAppointment.email,
          gender: createdAppointment.gender
        } as any
      }

      return createdAppointment
    } catch (error) {
      console.error('❌ Failed to create appointment:', error)
      console.error('Appointment data:', appointment)
      throw error
    }
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const now = new Date().toISOString()

    console.log('🔄 Updating appointment:', { id, appointment })

    const stmt = this.db.prepare(`
      UPDATE appointments SET
        patient_id = COALESCE(?, patient_id),
        treatment_id = COALESCE(?, treatment_id),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status),
        cost = COALESCE(?, cost),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `)

    const result = stmt.run(
      appointment.patient_id, appointment.treatment_id, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status, appointment.cost, appointment.notes, now, id
    )

    console.log('✅ Appointment update result:', { changes: result.changes, lastInsertRowid: result.lastInsertRowid })

    if (result.changes === 0) {
      throw new Error(`No appointment found with id: ${id}`)
    }

    // Force WAL checkpoint to ensure data is written
    this.db.pragma('wal_checkpoint(TRUNCATE)')

    // Get the updated appointment with patient and treatment data
    const getStmt = this.db.prepare(`
      SELECT
        a.*,
        p.full_name as patient_name,
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      WHERE a.id = ?
    `)
    const updatedAppointment = getStmt.get(id) as Appointment

    // Add patient object for compatibility
    if (updatedAppointment && updatedAppointment.patient_name) {
      updatedAppointment.patient = {
        id: updatedAppointment.patient_id,
        full_name: updatedAppointment.patient_name,
        first_name: updatedAppointment.first_name,
        last_name: updatedAppointment.last_name,
        phone: updatedAppointment.phone,
        email: updatedAppointment.email,
        gender: updatedAppointment.gender
      } as any
    }

    console.log('📋 Retrieved updated appointment with patient data:', updatedAppointment)

    return updatedAppointment
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM appointments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
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

    const payments = stmt.all() as any[]

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

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('💰 Creating payment:', {
        patient_id: payment.patient_id,
        amount: payment.amount,
        payment_method: payment.payment_method
      })

      // Calculate payment amounts
      const discountAmount = payment.discount_amount || 0
      const taxAmount = payment.tax_amount || 0
      const totalAmount = payment.amount + taxAmount - discountAmount
      const totalAmountDue = payment.total_amount_due || totalAmount
      const amountPaid = payment.amount_paid || payment.amount
      const remainingBalance = totalAmountDue - amountPaid

      // Determine status based on remaining balance
      let status = payment.status
      if (!status) {
        if (remainingBalance <= 0) {
          status = 'completed'
        } else if (amountPaid > 0 && remainingBalance > 0) {
          status = 'partial'
        } else {
          status = 'pending'
        }
      }

      const stmt = this.db.prepare(`
        INSERT INTO payments (
          id, patient_id, appointment_id, amount, payment_method, payment_date,
          description, receipt_number, status, notes, discount_amount, tax_amount,
          total_amount, total_amount_due, amount_paid, remaining_balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, payment.patient_id, payment.appointment_id, payment.amount,
        payment.payment_method, payment.payment_date, payment.description,
        payment.receipt_number, status, payment.notes,
        discountAmount, taxAmount, totalAmount, totalAmountDue, amountPaid, remainingBalance, now, now
      )

      console.log('✅ Payment created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...payment, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create payment:', error)
      throw error
    }
  }

  async updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
    const now = new Date().toISOString()

    // Get current payment data to calculate new values
    const currentPayment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment
    if (!currentPayment) {
      throw new Error('Payment not found')
    }

    // Calculate updated amounts
    const amount = payment.amount !== undefined ? payment.amount : currentPayment.amount
    const discountAmount = payment.discount_amount !== undefined ? payment.discount_amount : (currentPayment.discount_amount || 0)
    const taxAmount = payment.tax_amount !== undefined ? payment.tax_amount : (currentPayment.tax_amount || 0)
    const totalAmount = amount + taxAmount - discountAmount
    const totalAmountDue = payment.total_amount_due !== undefined ? payment.total_amount_due : (currentPayment.total_amount_due || totalAmount)
    const amountPaid = payment.amount_paid !== undefined ? payment.amount_paid : (currentPayment.amount_paid || amount)
    const remainingBalance = totalAmountDue - amountPaid

    // Determine status based on remaining balance if not explicitly provided
    let status = payment.status !== undefined ? payment.status : currentPayment.status
    if (payment.amount !== undefined || payment.total_amount_due !== undefined || payment.amount_paid !== undefined) {
      if (remainingBalance <= 0) {
        status = 'completed'
      } else if (amountPaid > 0 && remainingBalance > 0) {
        status = 'partial'
      } else if (amountPaid === 0) {
        status = 'pending'
      }
    }

    const stmt = this.db.prepare(`
      UPDATE payments SET
        amount = ?,
        payment_method = COALESCE(?, payment_method),
        payment_date = COALESCE(?, payment_date),
        description = COALESCE(?, description),
        receipt_number = COALESCE(?, receipt_number),
        status = ?,
        notes = COALESCE(?, notes),
        discount_amount = ?,
        tax_amount = ?,
        total_amount = ?,
        total_amount_due = ?,
        amount_paid = ?,
        remaining_balance = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      amount, payment.payment_method, payment.payment_date,
      payment.description, payment.receipt_number, status,
      payment.notes, discountAmount, taxAmount, totalAmount,
      totalAmountDue, amountPaid, remainingBalance, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM payments WHERE id = ?')
    return getStmt.get(id) as Payment
  }

  async deletePayment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM payments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchPayments(query: string): Promise<Payment[]> {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        pt.full_name as patient_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      WHERE
        pt.full_name LIKE ? OR
        p.receipt_number LIKE ? OR
        p.description LIKE ?
      ORDER BY p.payment_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm) as Payment[]
  }

  // Treatment operations
  async getAllTreatments(): Promise<Treatment[]> {
    const stmt = this.db.prepare('SELECT * FROM treatments ORDER BY name')
    return stmt.all() as Treatment[]
  }

  async createTreatment(treatment: Omit<Treatment, 'id' | 'created_at' | 'updated_at'>): Promise<Treatment> {
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

  async updateTreatment(id: string, treatment: Partial<Treatment>): Promise<Treatment> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE treatments SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        default_cost = COALESCE(?, default_cost),
        duration_minutes = COALESCE(?, duration_minutes),
        category = COALESCE(?, category),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      treatment.name, treatment.description, treatment.default_cost,
      treatment.duration_minutes, treatment.category, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM treatments WHERE id = ?')
    return getStmt.get(id) as Treatment
  }

  async deleteTreatment(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM treatments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async clearAllTreatments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM treatments').run()

      // Insert default treatments with Arabic names
      const now = new Date().toISOString()
      const insertStmt = this.db.prepare(`
        INSERT INTO treatments (id, name, description, default_cost, duration_minutes, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const defaultTreatments = [
        { name: 'فحص عام', description: 'فحص شامل للأسنان واللثة', cost: 100, duration: 30, category: 'فحص' },
        { name: 'تنظيف الأسنان', description: 'تنظيف وتلميع الأسنان', cost: 150, duration: 45, category: 'تنظيف' },
        { name: 'حشو الأسنان', description: 'حشو الأسنان المتضررة', cost: 200, duration: 60, category: 'علاج' }
      ]

      defaultTreatments.forEach(treatment => {
        insertStmt.run(
          uuidv4(), treatment.name, treatment.description, treatment.cost,
          treatment.duration, treatment.category, now, now
        )
      })
    })

    transaction()
  }

  // Inventory operations
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    const stmt = this.db.prepare('SELECT * FROM inventory ORDER BY name')
    return stmt.all() as InventoryItem[]
  }

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('📦 Creating inventory item:', {
        name: item.name,
        category: item.category,
        quantity: item.quantity
      })

      const stmt = this.db.prepare(`
        INSERT INTO inventory (
          id, name, description, category, quantity, unit, cost_per_unit,
          supplier, expiry_date, minimum_stock, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, item.name, item.description, item.category, item.quantity,
        item.unit, item.cost_per_unit, item.supplier, item.expiry_date,
        item.minimum_stock, now, now
      )

      console.log('✅ Inventory item created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...item, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create inventory item:', error)
      throw error
    }
  }

  async updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE inventory SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        cost_per_unit = COALESCE(?, cost_per_unit),
        supplier = COALESCE(?, supplier),
        expiry_date = COALESCE(?, expiry_date),
        minimum_stock = COALESCE(?, minimum_stock),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      item.name, item.description, item.category, item.quantity,
      item.unit, item.cost_per_unit, item.supplier, item.expiry_date,
      item.minimum_stock, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM inventory WHERE id = ?')
    return getStmt.get(id) as InventoryItem
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM inventory WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchInventoryItems(query: string): Promise<InventoryItem[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM inventory
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ? OR supplier LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as InventoryItem[]
  }

  async clearAllInventoryItems(): Promise<void> {
    this.db.prepare('DELETE FROM inventory').run()
  }

  // Inventory Usage operations
  async getAllInventoryUsage(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all()
  }

  async createInventoryUsage(usage: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO inventory_usage (
        id, inventory_id, appointment_id, quantity_used, usage_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, usage.inventory_id, usage.appointment_id, usage.quantity_used,
      usage.usage_date || now, usage.notes
    )

    // Update inventory quantity
    const updateInventoryStmt = this.db.prepare(`
      UPDATE inventory SET quantity = quantity - ? WHERE id = ?
    `)
    updateInventoryStmt.run(usage.quantity_used, usage.inventory_id)

    return { ...usage, id, usage_date: usage.usage_date || now }
  }

  async getInventoryUsageByItem(itemId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      WHERE iu.inventory_id = ?
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all(itemId)
  }

  async getInventoryUsageByAppointment(appointmentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        iu.*,
        i.name as inventory_name,
        i.unit as inventory_unit
      FROM inventory_usage iu
      LEFT JOIN inventory i ON iu.inventory_id = i.id
      WHERE iu.appointment_id = ?
      ORDER BY iu.usage_date DESC
    `)
    return stmt.all(appointmentId)
  }

  // Patient Images operations
  async getAllPatientImages(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        pi.*,
        p.first_name || ' ' || p.last_name as patient_name
      FROM patient_images pi
      LEFT JOIN patients p ON pi.patient_id = p.id
      ORDER BY pi.taken_date DESC
    `)
    return stmt.all()
  }

  async createPatientImage(image: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO patient_images (
        id, patient_id, appointment_id, image_path, image_type, description, taken_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, image.patient_id, image.appointment_id, image.image_path,
      image.image_type, image.description, image.taken_date || now, now
    )

    return { ...image, id, taken_date: image.taken_date || now, created_at: now }
  }

  async getPatientImagesByPatient(patientId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patient_images
      WHERE patient_id = ?
      ORDER BY taken_date DESC
    `)
    return stmt.all(patientId)
  }

  async deletePatientImage(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM patient_images WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  // Installment Payments operations
  async getAllInstallmentPayments(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT
        ip.*,
        p.receipt_number as payment_receipt,
        pt.first_name || ' ' || pt.last_name as patient_name
      FROM installment_payments ip
      LEFT JOIN payments p ON ip.payment_id = p.id
      LEFT JOIN patients pt ON p.patient_id = pt.id
      ORDER BY ip.due_date
    `)
    return stmt.all()
  }

  async createInstallmentPayment(installment: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO installment_payments (
        id, payment_id, installment_number, amount, due_date, paid_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, installment.payment_id, installment.installment_number, installment.amount,
      installment.due_date, installment.paid_date, installment.status || 'pending', now, now
    )

    return { ...installment, id, created_at: now, updated_at: now }
  }

  async updateInstallmentPayment(id: string, installment: any): Promise<any> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE installment_payments SET
        amount = COALESCE(?, amount),
        due_date = COALESCE(?, due_date),
        paid_date = COALESCE(?, paid_date),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      installment.amount, installment.due_date, installment.paid_date,
      installment.status, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM installment_payments WHERE id = ?')
    return getStmt.get(id)
  }

  async getInstallmentPaymentsByPayment(paymentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM installment_payments
      WHERE payment_id = ?
      ORDER BY installment_number
    `)
    return stmt.all(paymentId)
  }

  // Clear operations (matching LowDB functionality)
  async clearAllPatients(): Promise<void> {
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

  async clearAllAppointments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM inventory_usage').run()
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
      this.db.prepare('DELETE FROM appointments').run()
    })
    transaction()
  }

  async clearAllPayments(): Promise<void> {
    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM installment_payments').run()
      this.db.prepare('DELETE FROM payments').run()
    })
    transaction()
  }

  // Enhanced transaction management for complex operations
  async executeTransaction<T>(operations: () => T, errorMessage?: string): Promise<T> {
    const transaction = this.db.transaction(operations)
    try {
      const result = transaction()
      console.log('✅ Transaction completed successfully')
      return result
    } catch (error) {
      const message = errorMessage || 'Transaction failed'
      console.error(`❌ ${message}:`, error)
      throw new Error(`${message}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Enhanced error handling with detailed logging
  async safeExecute<T>(operation: () => T, errorMessage: string, context?: any): Promise<T> {
    try {
      return operation()
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error)
      if (context) {
        console.error('Context:', context)
      }
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Data integrity validation
  async validateDataIntegrity(): Promise<{isValid: boolean, issues: string[]}> {
    const issues: string[] = []

    try {
      // Check for orphaned appointments (appointments without valid patients)
      const orphanedAppointments = this.db.prepare(`
        SELECT COUNT(*) as count FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedAppointments.count > 0) {
        issues.push(`Found ${orphanedAppointments.count} appointments without valid patients`)
      }

      // Check for orphaned payments (payments without valid patients)
      const orphanedPayments = this.db.prepare(`
        SELECT COUNT(*) as count FROM payments p
        LEFT JOIN patients pt ON p.patient_id = pt.id
        WHERE pt.id IS NULL
      `).get() as { count: number }

      if (orphanedPayments.count > 0) {
        issues.push(`Found ${orphanedPayments.count} payments without valid patients`)
      }

      // Check for orphaned installment payments
      const orphanedInstallments = this.db.prepare(`
        SELECT COUNT(*) as count FROM installment_payments ip
        LEFT JOIN payments p ON ip.payment_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedInstallments.count > 0) {
        issues.push(`Found ${orphanedInstallments.count} installment payments without valid payments`)
      }

      // Check for orphaned patient images
      const orphanedImages = this.db.prepare(`
        SELECT COUNT(*) as count FROM patient_images pi
        LEFT JOIN patients p ON pi.patient_id = p.id
        WHERE p.id IS NULL
      `).get() as { count: number }

      if (orphanedImages.count > 0) {
        issues.push(`Found ${orphanedImages.count} patient images without valid patients`)
      }

      // Check for orphaned inventory usage
      const orphanedUsage = this.db.prepare(`
        SELECT COUNT(*) as count FROM inventory_usage iu
        LEFT JOIN inventory i ON iu.inventory_id = i.id
        WHERE i.id IS NULL
      `).get() as { count: number }

      if (orphanedUsage.count > 0) {
        issues.push(`Found ${orphanedUsage.count} inventory usage records without valid inventory items`)
      }

      console.log(`🔍 Data integrity check completed. Issues found: ${issues.length}`)
      return { isValid: issues.length === 0, issues }

    } catch (error) {
      console.error('❌ Data integrity validation failed:', error)
      issues.push('Failed to validate data integrity')
      return { isValid: false, issues }
    }
  }

  // Clean up orphaned data
  async cleanupOrphanedData(): Promise<{cleaned: boolean, summary: string[]}> {
    const summary: string[] = []

    try {
      const transaction = this.db.transaction(() => {
        // Clean orphaned installment payments
        const deletedInstallments = this.db.prepare(`
          DELETE FROM installment_payments
          WHERE payment_id NOT IN (SELECT id FROM payments)
        `).run()

        if (deletedInstallments.changes > 0) {
          summary.push(`Cleaned ${deletedInstallments.changes} orphaned installment payments`)
        }

        // Clean orphaned patient images
        const deletedImages = this.db.prepare(`
          DELETE FROM patient_images
          WHERE patient_id NOT IN (SELECT id FROM patients)
        `).run()

        if (deletedImages.changes > 0) {
          summary.push(`Cleaned ${deletedImages.changes} orphaned patient images`)
        }

        // Clean orphaned inventory usage
        const deletedUsage = this.db.prepare(`
          DELETE FROM inventory_usage
          WHERE inventory_id NOT IN (SELECT id FROM inventory)
        `).run()

        if (deletedUsage.changes > 0) {
          summary.push(`Cleaned ${deletedUsage.changes} orphaned inventory usage records`)
        }
      })

      transaction()
      console.log('✅ Orphaned data cleanup completed')
      return { cleaned: true, summary }

    } catch (error) {
      console.error('❌ Orphaned data cleanup failed:', error)
      return { cleaned: false, summary: ['Failed to cleanup orphaned data'] }
    }
  }

  // Enhanced complex operations with transactions
  async createAppointmentWithPayment(
    appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>,
    paymentData?: Omit<Payment, 'id' | 'appointment_id' | 'created_at' | 'updated_at'>
  ): Promise<{appointment: Appointment, payment?: Payment}> {
    return this.executeTransaction(() => {
      // Create appointment first
      const appointment = this.createAppointmentSync(appointmentData)

      let payment: Payment | undefined
      if (paymentData) {
        // Create payment linked to appointment
        payment = this.createPaymentSync({
          ...paymentData,
          appointment_id: appointment.id
        })
      }

      return { appointment, payment }
    }, 'Failed to create appointment with payment')
  }

  async deletePatientWithAllData(patientId: string): Promise<{success: boolean, deletedCounts: any}> {
    return this.executeTransaction(() => {
      const deletedCounts = {
        patient_images: 0,
        inventory_usage: 0,
        installment_payments: 0,
        payments: 0,
        appointments: 0,
        patient: 0
      }

      // Delete in correct order due to foreign key constraints
      deletedCounts.patient_images = this.db.prepare('DELETE FROM patient_images WHERE patient_id = ?').run(patientId).changes
      deletedCounts.inventory_usage = this.db.prepare('DELETE FROM inventory_usage WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id = ?)').run(patientId).changes
      deletedCounts.installment_payments = this.db.prepare('DELETE FROM installment_payments WHERE payment_id IN (SELECT id FROM payments WHERE patient_id = ?)').run(patientId).changes
      deletedCounts.payments = this.db.prepare('DELETE FROM payments WHERE patient_id = ?').run(patientId).changes
      deletedCounts.appointments = this.db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(patientId).changes
      deletedCounts.patient = this.db.prepare('DELETE FROM patients WHERE id = ?').run(patientId).changes

      return { success: true, deletedCounts }
    }, 'Failed to delete patient with all data')
  }

  // Synchronous versions for use within transactions
  private createAppointmentSync(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Appointment {
    const id = uuidv4()
    const now = new Date().toISOString()

    // Validate patient_id exists
    if (!appointment.patient_id) {
      throw new Error('Patient ID is required')
    }

    const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
    const patientExists = patientCheck.get(appointment.patient_id)
    if (!patientExists) {
      throw new Error(`Patient with ID '${appointment.patient_id}' does not exist`)
    }

    // Validate treatment_id if provided
    const treatmentId = appointment.treatment_id && appointment.treatment_id.trim() !== '' ? appointment.treatment_id : null
    if (treatmentId) {
      const treatmentCheck = this.db.prepare('SELECT id FROM treatments WHERE id = ?')
      const treatmentExists = treatmentCheck.get(treatmentId)
      if (!treatmentExists) {
        throw new Error(`Treatment with ID '${treatmentId}' does not exist`)
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO appointments (
        id, patient_id, treatment_id, title, description, start_time, end_time,
        status, cost, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, appointment.patient_id, treatmentId, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status || 'scheduled', appointment.cost, appointment.notes, now, now
    )

    return { ...appointment, id, treatment_id: treatmentId, created_at: now, updated_at: now }
  }

  private createPaymentSync(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Payment {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO payments (
        id, patient_id, appointment_id, amount, payment_method, payment_date,
        status, description, receipt_number, notes, discount_amount, tax_amount,
        total_amount, total_amount_due, amount_paid, remaining_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const totalAmount = payment.total_amount || payment.amount
    const totalAmountDue = payment.total_amount_due || totalAmount
    const amountPaid = payment.amount_paid || payment.amount
    const remainingBalance = totalAmountDue - amountPaid

    stmt.run(
      id, payment.patient_id, payment.appointment_id, payment.amount,
      payment.payment_method, payment.payment_date, payment.status || 'completed',
      payment.description, payment.receipt_number, payment.notes,
      payment.discount_amount || 0, payment.tax_amount || 0,
      totalAmount, totalAmountDue, amountPaid, remainingBalance, now, now
    )

    return {
      ...payment,
      id,
      total_amount: totalAmount,
      total_amount_due: totalAmountDue,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      created_at: now,
      updated_at: now
    }
  }

  // Batch operations for better performance
  async batchCreatePatients(patients: Omit<Patient, 'id' | 'created_at' | 'updated_at'>[]): Promise<Patient[]> {
    return this.executeTransaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, phone, email, address,
          emergency_contact_name, emergency_contact_phone, medical_history,
          allergies, insurance_info, notes, profile_image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      return patients.map(patient => {
        const id = uuidv4()
        stmt.run(
          id, patient.first_name, patient.last_name, patient.date_of_birth,
          patient.phone, patient.email, patient.address, patient.emergency_contact_name,
          patient.emergency_contact_phone, patient.medical_history, patient.allergies,
          patient.insurance_info, patient.notes, patient.profile_image, now, now
        )
        return { ...patient, id, created_at: now, updated_at: now }
      })
    }, 'Failed to batch create patients')
  }

  async batchCreateAppointments(appointments: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>[]): Promise<Appointment[]> {
    const transaction = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO appointments (
          id, patient_id, treatment_id, title, description, start_time, end_time,
          status, cost, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      return appointments.map(appointment => {
        const id = uuidv4()
        stmt.run(
          id, appointment.patient_id, appointment.treatment_id, appointment.title,
          appointment.description, appointment.start_time, appointment.end_time,
          appointment.status, appointment.cost, appointment.notes, now, now
        )
        return { ...appointment, id, created_at: now, updated_at: now }
      })
    })

    return transaction()
  }

  // Enhanced backup and restore operations
  async createBackup(backupPath?: string): Promise<{success: boolean, path?: string, message: string}> {
    try {
      if (!backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        backupPath = join(app.getPath('userData'), `backup_${timestamp}.db`)
      }

      // Validate data integrity before backup
      const integrityCheck = await this.validateDataIntegrity()
      if (!integrityCheck.isValid) {
        console.warn('⚠️ Data integrity issues found before backup:', integrityCheck.issues)
      }

      // Create backup using SQLite backup API
      const backupDb = new Database(backupPath)
      this.db.backup(backupDb)
      backupDb.close()

      console.log('✅ Database backup created successfully:', backupPath)
      return {
        success: true,
        path: backupPath,
        message: `Backup created successfully at ${backupPath}`
      }

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      return {
        success: false,
        message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async restoreFromBackup(backupPath: string): Promise<{success: boolean, message: string}> {
    try {
      // Validate backup file exists
      if (!require('fs').existsSync(backupPath)) {
        throw new Error('Backup file does not exist')
      }

      // Create a backup of current database before restore
      const currentBackupResult = await this.createBackup()
      if (!currentBackupResult.success) {
        throw new Error('Failed to create current database backup before restore')
      }

      // Close current database
      this.close()

      // Copy backup file to current database location
      const currentDbPath = join(app.getPath('userData'), 'dental_clinic.db')
      require('fs').copyFileSync(backupPath, currentDbPath)

      // Reinitialize database
      this.db = new Database(currentDbPath)
      this.initializeDatabase()

      console.log('✅ Database restored successfully from:', backupPath)
      return {
        success: true,
        message: `Database restored successfully from ${backupPath}`
      }

    } catch (error) {
      console.error('❌ Database restore failed:', error)
      return {
        success: false,
        message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Database health check
  async performHealthCheck(): Promise<{healthy: boolean, issues: string[], recommendations: string[]}> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // Check database file integrity
      const integrityCheck = this.db.pragma('integrity_check')
      if (integrityCheck !== 'ok') {
        issues.push('Database file integrity check failed')
        recommendations.push('Consider running database repair or restore from backup')
      }

      // Check foreign key constraints
      const foreignKeyCheck = this.db.pragma('foreign_key_check')
      if (foreignKeyCheck.length > 0) {
        issues.push(`Found ${foreignKeyCheck.length} foreign key constraint violations`)
        recommendations.push('Run data cleanup to fix foreign key violations')
      }

      // Check data integrity
      const dataIntegrity = await this.validateDataIntegrity()
      if (!dataIntegrity.isValid) {
        issues.push(...dataIntegrity.issues)
        recommendations.push('Run orphaned data cleanup')
      }

      // Check database size and performance
      const dbStats = this.db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "table"').get() as { count: number }
      if (dbStats.count === 0) {
        issues.push('No tables found in database')
        recommendations.push('Reinitialize database schema')
      }

      console.log(`🏥 Database health check completed. Issues: ${issues.length}`)
      return {
        healthy: issues.length === 0,
        issues,
        recommendations
      }

    } catch (error) {
      console.error('❌ Health check failed:', error)
      return {
        healthy: false,
        issues: ['Health check failed to complete'],
        recommendations: ['Check database connection and file permissions']
      }
    }
  }

  // Lab operations
  async getAllLabs(): Promise<Lab[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM labs
      ORDER BY name
    `)
    return stmt.all() as Lab[]
  }

  async createLab(lab: Omit<Lab, 'id' | 'created_at' | 'updated_at'>): Promise<Lab> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🧪 Creating lab:', {
        name: lab.name,
        contact_info: lab.contact_info,
        address: lab.address
      })

      const stmt = this.db.prepare(`
        INSERT INTO labs (
          id, name, contact_info, address, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, lab.name, lab.contact_info, lab.address, now, now
      )

      console.log('✅ Lab created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...lab, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create lab:', error)
      throw error
    }
  }

  async updateLab(id: string, lab: Partial<Lab>): Promise<Lab> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE labs SET
        name = COALESCE(?, name),
        contact_info = COALESCE(?, contact_info),
        address = COALESCE(?, address),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      lab.name, lab.contact_info, lab.address, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM labs WHERE id = ?')
    return getStmt.get(id) as Lab
  }

  async deleteLab(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Starting deletion for lab: ${id}`)

      // Check if lab has any orders
      const ordersCheck = this.db.prepare('SELECT COUNT(*) as count FROM lab_orders WHERE lab_id = ?')
      const ordersCount = ordersCheck.get(id) as { count: number }

      if (ordersCount.count > 0) {
        console.warn(`⚠️ Lab ${id} has ${ordersCount.count} orders. Deleting lab will cascade delete orders.`)
      }

      // Delete lab (will cascade delete orders due to foreign key constraint)
      const stmt = this.db.prepare('DELETE FROM labs WHERE id = ?')
      const result = stmt.run(id)

      console.log(`✅ Lab ${id} deleted successfully. Affected rows: ${result.changes}`)

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result.changes > 0
    } catch (error) {
      console.error(`❌ Failed to delete lab ${id}:`, error)
      throw new Error(`Failed to delete lab: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchLabs(query: string): Promise<Lab[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM labs
      WHERE name LIKE ? OR contact_info LIKE ? OR address LIKE ?
      ORDER BY name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm) as Lab[]
  }

  // Lab order operations
  async getAllLabOrders(): Promise<LabOrder[]> {
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
    const labOrders = stmt.all() as any[]

    // Add lab and patient objects for compatibility
    return labOrders.map(order => {
      const labOrder: LabOrder = {
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

      if (order.lab_name) {
        labOrder.lab = {
          id: order.lab_id,
          name: order.lab_name,
          contact_info: order.lab_contact_info,
          address: order.lab_address,
          created_at: '',
          updated_at: ''
        }
      }

      if (order.patient_name) {
        labOrder.patient = {
          id: order.patient_id,
          full_name: order.patient_name,
          phone: order.patient_phone,
          gender: order.patient_gender
        } as any
      }

      return labOrder
    })
  }

  async createLabOrder(labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>): Promise<LabOrder> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      // Validate lab_id exists (required)
      if (!labOrder.lab_id) {
        throw new Error('Lab ID is required')
      }

      const labCheck = this.db.prepare('SELECT id FROM labs WHERE id = ?')
      const labExists = labCheck.get(labOrder.lab_id)
      if (!labExists) {
        throw new Error(`Lab with ID '${labOrder.lab_id}' does not exist`)
      }

      // Validate patient_id exists (if provided)
      if (labOrder.patient_id) {
        const patientCheck = this.db.prepare('SELECT id FROM patients WHERE id = ?')
        const patientExists = patientCheck.get(labOrder.patient_id)
        if (!patientExists) {
          throw new Error(`Patient with ID '${labOrder.patient_id}' does not exist`)
        }
      }

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

  async updateLabOrder(id: string, labOrder: Partial<LabOrder>): Promise<LabOrder> {
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

    const getStmt = this.db.prepare('SELECT * FROM lab_orders WHERE id = ?')
    return getStmt.get(id) as LabOrder
  }

  async deleteLabOrder(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting lab order: ${id}`)

      const stmt = this.db.prepare('DELETE FROM lab_orders WHERE id = ?')
      const result = stmt.run(id)

      console.log(`✅ Lab order ${id} deleted successfully. Affected rows: ${result.changes}`)

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return result.changes > 0
    } catch (error) {
      console.error(`❌ Failed to delete lab order ${id}:`, error)
      throw new Error(`Failed to delete lab order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchLabOrders(query: string): Promise<LabOrder[]> {
    const stmt = this.db.prepare(`
      SELECT
        lo.*,
        l.name as lab_name,
        p.full_name as patient_name
      FROM lab_orders lo
      LEFT JOIN labs l ON lo.lab_id = l.id
      LEFT JOIN patients p ON lo.patient_id = p.id
      WHERE lo.service_name LIKE ? OR l.name LIKE ? OR p.full_name LIKE ? OR lo.notes LIKE ?
      ORDER BY lo.order_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as LabOrder[]
  }

  // Settings operations
  async getSettings(): Promise<ClinicSettings> {
    const stmt = this.db.prepare('SELECT * FROM settings WHERE id = ?')
    return stmt.get('clinic_settings') as ClinicSettings
  }

  async updateSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE settings SET
        clinic_name = COALESCE(?, clinic_name),
        doctor_name = COALESCE(?, doctor_name),
        clinic_address = COALESCE(?, clinic_address),
        clinic_phone = COALESCE(?, clinic_phone),
        clinic_email = COALESCE(?, clinic_email),
        clinic_logo = COALESCE(?, clinic_logo),
        currency = COALESCE(?, currency),
        language = COALESCE(?, language),
        timezone = COALESCE(?, timezone),
        backup_frequency = COALESCE(?, backup_frequency),
        auto_save_interval = COALESCE(?, auto_save_interval),
        appointment_duration = COALESCE(?, appointment_duration),
        working_hours_start = COALESCE(?, working_hours_start),
        working_hours_end = COALESCE(?, working_hours_end),
        working_days = COALESCE(?, working_days),
        app_password = COALESCE(?, app_password),
        password_enabled = COALESCE(?, password_enabled),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      settings.clinic_name, settings.doctor_name, settings.clinic_address, settings.clinic_phone,
      settings.clinic_email, settings.clinic_logo, settings.currency,
      settings.language, settings.timezone, settings.backup_frequency,
      settings.auto_save_interval, settings.appointment_duration,
      settings.working_hours_start, settings.working_hours_end,
      settings.working_days, settings.app_password, settings.password_enabled, now, 'clinic_settings'
    )

    return this.getSettings()
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const totalPatients = this.db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number }
    const totalAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments').get() as { count: number }
    const totalRevenue = this.db.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "completed"').get() as { total: number }
    const pendingPayments = this.db.prepare('SELECT COUNT(*) as count FROM payments WHERE status = "pending"').get() as { count: number }

    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = this.db.prepare('SELECT COUNT(*) as count FROM appointments WHERE DATE(start_time) = ?').get(today) as { count: number }

    const thisMonth = new Date().toISOString().slice(0, 7)
    const thisMonthRevenue = this.db.prepare('SELECT SUM(amount) as total FROM payments WHERE status = "completed" AND strftime("%Y-%m", payment_date) = ?').get(thisMonth) as { total: number }

    const lowStockItems = this.db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= minimum_stock').get() as { count: number }

    return {
      total_patients: totalPatients.count,
      total_appointments: totalAppointments.count,
      total_revenue: totalRevenue.total || 0,
      pending_payments: pendingPayments.count,
      today_appointments: todayAppointments.count,
      this_month_revenue: thisMonthRevenue.total || 0,
      low_stock_items: lowStockItems.count
    }
  }

  // Dental Treatment operations
  async getAllDentalTreatments(): Promise<any[]> {
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

  async getDentalTreatmentsByPatient(patientId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dt.*,
             p.full_name as patient_name,
             a.title as appointment_title
      FROM dental_treatments dt
      LEFT JOIN patients p ON dt.patient_id = p.id
      LEFT JOIN appointments a ON dt.appointment_id = a.id
      WHERE dt.patient_id = ?
      ORDER BY dt.tooth_number ASC
    `)
    return stmt.all(patientId)
  }

  async getDentalTreatmentsByTooth(patientId: string, toothNumber: number): Promise<any[]> {
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

  async createDentalTreatment(treatment: any): Promise<any> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      INSERT INTO dental_treatments (
        id, patient_id, appointment_id, tooth_number, tooth_name,
        current_treatment, next_treatment, treatment_details,
        treatment_status, treatment_color, cost, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, treatment.patient_id, treatment.appointment_id, treatment.tooth_number,
      treatment.tooth_name, treatment.current_treatment, treatment.next_treatment,
      treatment.treatment_details, treatment.treatment_status, treatment.treatment_color,
      treatment.cost, treatment.notes, now, now
    )

    return { ...treatment, id, created_at: now, updated_at: now }
  }

  async updateDentalTreatment(id: string, updates: any): Promise<void> {
    const now = new Date().toISOString()

    // قائمة الأعمدة المسموحة في جدول dental_treatments
    const allowedColumns = [
      'patient_id', 'appointment_id', 'tooth_number', 'tooth_name',
      'current_treatment', 'next_treatment', 'treatment_details',
      'treatment_status', 'treatment_color', 'cost', 'notes'
    ]

    // تصفية البيانات للاحتفاظ بالأعمدة المسموحة فقط
    const filteredUpdates: any = {}
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
      return
    }

    const setClause = fields.map(key => `${key} = ?`).join(', ')
    const values = Object.values(filteredUpdates)

    const stmt = this.db.prepare(`
      UPDATE dental_treatments
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(...values, now, id)
  }

  async deleteDentalTreatment(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM dental_treatments WHERE id = ?')
    stmt.run(id)
  }

  // Dental Treatment Images operations
  async getAllDentalTreatmentImages(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dti.patient_id = p.id
      ORDER BY dti.taken_date DESC
    `)
    return stmt.all()
  }

  async getDentalTreatmentImagesByTreatment(treatmentId: string): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dti.*,
             dt.tooth_name,
             p.full_name as patient_name
      FROM dental_treatment_images dti
      LEFT JOIN dental_treatments dt ON dti.dental_treatment_id = dt.id
      LEFT JOIN patients p ON dti.patient_id = p.id
      WHERE dti.dental_treatment_id = ?
      ORDER BY dti.taken_date DESC
    `)
    return stmt.all(treatmentId)
  }

  async createDentalTreatmentImage(image: any): Promise<any> {
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

  async deleteDentalTreatmentImage(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM dental_treatment_images WHERE id = ?')
    stmt.run(id)
  }

  // Dental Treatment Prescriptions operations
  async getAllDentalTreatmentPrescriptions(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT dtp.*,
             dt.tooth_name,
             p.prescription_date,
             p.notes as prescription_notes
      FROM dental_treatment_prescriptions dtp
      LEFT JOIN dental_treatments dt ON dtp.dental_treatment_id = dt.id
      LEFT JOIN prescriptions p ON dtp.prescription_id = p.id
      ORDER BY dtp.created_at DESC
    `)
    return stmt.all()
  }

  async createDentalTreatmentPrescription(link: any): Promise<any> {
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

  async deleteDentalTreatmentPrescriptionByIds(treatmentId: string, prescriptionId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM dental_treatment_prescriptions
      WHERE dental_treatment_id = ? AND prescription_id = ?
    `)
    stmt.run(treatmentId, prescriptionId)
  }

  close() {
    this.db.close()
  }
}
