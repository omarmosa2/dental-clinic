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
  DashboardStats
} from '../types'

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
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name)')
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
    try {
      // Add missing columns to payments table if they don't exist
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
        // Update existing records
        this.db.exec('UPDATE payments SET total_amount = amount WHERE total_amount IS NULL')
      }

      // Add new payment tracking columns
      if (!columnNames.includes('total_amount_due')) {
        this.db.exec('ALTER TABLE payments ADD COLUMN total_amount_due DECIMAL(10,2)')
        // Set default value for existing records
        this.db.exec('UPDATE payments SET total_amount_due = amount WHERE total_amount_due IS NULL')
      }

      if (!columnNames.includes('amount_paid')) {
        this.db.exec('ALTER TABLE payments ADD COLUMN amount_paid DECIMAL(10,2)')
        // Set default value for existing records
        this.db.exec('UPDATE payments SET amount_paid = amount WHERE amount_paid IS NULL')
      }

      if (!columnNames.includes('remaining_balance')) {
        this.db.exec('ALTER TABLE payments ADD COLUMN remaining_balance DECIMAL(10,2)')
        // Calculate remaining balance for existing records
        this.db.exec('UPDATE payments SET remaining_balance = COALESCE(total_amount_due, amount) - COALESCE(amount_paid, amount) WHERE remaining_balance IS NULL')
      }
    } catch (error) {
      console.error('Migration error:', error)
    }
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      ORDER BY last_name, first_name
    `)
    return stmt.all() as Patient[]
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const id = uuidv4()
    const now = new Date().toISOString()

    try {
      console.log('🏥 Creating patient:', {
        first_name: patient.first_name,
        last_name: patient.last_name,
        phone: patient.phone
      })

      const stmt = this.db.prepare(`
        INSERT INTO patients (
          id, first_name, last_name, date_of_birth, phone, email, address,
          emergency_contact_name, emergency_contact_phone, medical_history,
          allergies, insurance_info, notes, profile_image, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        id, patient.first_name, patient.last_name, patient.date_of_birth,
        patient.phone, patient.email, patient.address, patient.emergency_contact_name,
        patient.emergency_contact_phone, patient.medical_history, patient.allergies,
        patient.insurance_info, patient.notes, patient.profile_image, now, now
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
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        date_of_birth = COALESCE(?, date_of_birth),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        emergency_contact_name = COALESCE(?, emergency_contact_name),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        medical_history = COALESCE(?, medical_history),
        allergies = COALESCE(?, allergies),
        insurance_info = COALESCE(?, insurance_info),
        notes = COALESCE(?, notes),
        profile_image = COALESCE(?, profile_image),
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      patient.first_name, patient.last_name, patient.date_of_birth,
      patient.phone, patient.email, patient.address, patient.emergency_contact_name,
      patient.emergency_contact_phone, patient.medical_history, patient.allergies,
      patient.insurance_info, patient.notes, patient.profile_image, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM patients WHERE id = ?')
    return getStmt.get(id) as Patient
  }

  async deletePatient(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM patients WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM patients
      WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER BY last_name, first_name
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as Patient[]
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    const stmt = this.db.prepare(`
      SELECT
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        t.name as treatment_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN treatments t ON a.treatment_id = t.id
      ORDER BY a.start_time
    `)
    return stmt.all() as Appointment[]
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
        appointment.status, appointment.cost, appointment.notes, now, now
      )

      console.log('✅ Appointment created successfully:', { id, changes: result.changes })

      // Force WAL checkpoint to ensure data is written
      this.db.pragma('wal_checkpoint(TRUNCATE)')

      return { ...appointment, id, created_at: now, updated_at: now }
    } catch (error) {
      console.error('❌ Failed to create appointment:', error)
      console.error('Appointment data:', appointment)
      throw error
    }
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const now = new Date().toISOString()

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

    stmt.run(
      appointment.patient_id, appointment.treatment_id, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status, appointment.cost, appointment.notes, now, id
    )

    const getStmt = this.db.prepare('SELECT * FROM appointments WHERE id = ?')
    return getStmt.get(id) as Appointment
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
        pt.first_name || ' ' || pt.last_name as patient_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      ORDER BY p.payment_date DESC
    `)
    return stmt.all() as Payment[]
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
        pt.first_name || ' ' || pt.last_name as patient_name
      FROM payments p
      LEFT JOIN patients pt ON p.patient_id = pt.id
      WHERE
        pt.first_name LIKE ? OR
        pt.last_name LIKE ? OR
        p.receipt_number LIKE ? OR
        p.description LIKE ?
      ORDER BY p.payment_date DESC
    `)
    const searchTerm = `%${query}%`
    return stmt.all(searchTerm, searchTerm, searchTerm, searchTerm) as Payment[]
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

  // Transaction management for complex operations
  async executeTransaction<T>(operations: () => T): Promise<T> {
    const transaction = this.db.transaction(operations)
    return transaction()
  }

  // Enhanced error handling with rollback
  async safeExecute<T>(operation: () => T, errorMessage: string): Promise<T> {
    try {
      return operation()
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Batch operations for better performance
  async batchCreatePatients(patients: Omit<Patient, 'id' | 'created_at' | 'updated_at'>[]): Promise<Patient[]> {
    const transaction = this.db.transaction(() => {
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
    })

    return transaction()
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
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      settings.clinic_name, settings.clinic_address, settings.clinic_phone,
      settings.clinic_email, settings.clinic_logo, settings.currency,
      settings.language, settings.timezone, settings.backup_frequency,
      settings.auto_save_interval, settings.appointment_duration,
      settings.working_hours_start, settings.working_hours_end,
      settings.working_days, now, 'clinic_settings'
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

  close() {
    this.db.close()
  }
}
