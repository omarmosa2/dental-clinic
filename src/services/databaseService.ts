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
    this.db = new Database(dbPath)
    this.initializeDatabase()
    this.runMigrations()
  }

  private initializeDatabase() {
    // Read and execute schema
    const schemaPath = join(__dirname, '../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    this.db.exec(schema)

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
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

    const stmt = this.db.prepare(`
      INSERT INTO patients (
        id, first_name, last_name, date_of_birth, phone, email, address,
        emergency_contact_name, emergency_contact_phone, medical_history,
        allergies, insurance_info, notes, profile_image, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, patient.first_name, patient.last_name, patient.date_of_birth,
      patient.phone, patient.email, patient.address, patient.emergency_contact_name,
      patient.emergency_contact_phone, patient.medical_history, patient.allergies,
      patient.insurance_info, patient.notes, patient.profile_image, now, now
    )

    return { ...patient, id, created_at: now, updated_at: now }
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

    const stmt = this.db.prepare(`
      INSERT INTO appointments (
        id, patient_id, treatment_id, title, description, start_time, end_time,
        status, cost, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id, appointment.patient_id, appointment.treatment_id, appointment.title,
      appointment.description, appointment.start_time, appointment.end_time,
      appointment.status, appointment.cost, appointment.notes, now, now
    )

    return { ...appointment, id, created_at: now, updated_at: now }
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

    stmt.run(
      id, payment.patient_id, payment.appointment_id, payment.amount,
      payment.payment_method, payment.payment_date, payment.description,
      payment.receipt_number, status, payment.notes,
      discountAmount, taxAmount, totalAmount, totalAmountDue, amountPaid, remainingBalance, now, now
    )

    return { ...payment, id, created_at: now, updated_at: now }
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
