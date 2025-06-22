export interface Patient {
  id: string
  serial_number: string
  full_name: string
  gender: 'male' | 'female'
  age: number
  patient_condition: string
  allergies?: string
  medical_conditions?: string
  email?: string
  address?: string
  notes?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Treatment {
  id: string
  name: string
  description?: string
  default_cost?: number
  duration_minutes?: number
  category?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  treatment_id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  cost?: number
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  treatment?: Treatment
}

export interface Payment {
  id: string
  patient_id: string
  appointment_id?: string
  amount: number // المبلغ المدفوع في هذه الدفعة
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'insurance'
  payment_date: string
  description?: string
  receipt_number?: string
  status: 'pending' | 'completed' | 'partial' | 'overdue' | 'failed' | 'refunded'
  notes?: string
  discount_amount?: number
  tax_amount?: number
  total_amount?: number // المبلغ الإجمالي لهذه الدفعة (amount + tax - discount)
  total_amount_due?: number // المبلغ الإجمالي المطلوب للعلاج/الخدمة
  amount_paid?: number // إجمالي المبلغ المدفوع حتى الآن
  remaining_balance?: number // المبلغ المتبقي (total_amount_due - amount_paid)
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
}

export interface PaymentSummary {
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  monthlyRevenue: { [key: string]: number }
  paymentMethodStats: { [key: string]: number }
  recentPayments: Payment[]
}

export interface InstallmentPayment {
  id: string
  payment_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_date?: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
  updated_at: string
}

export interface PatientImage {
  id: string
  patient_id: string
  appointment_id?: string
  image_path: string
  image_type: 'before' | 'after' | 'xray' | 'document'
  description?: string
  taken_date: string
  created_at: string
}

export interface InventoryItem {
  id: string
  name: string
  description?: string
  category?: string
  quantity: number
  unit?: string
  cost_per_unit?: number
  supplier?: string
  expiry_date?: string
  minimum_stock: number
  created_at: string
  updated_at: string
}

export interface InventoryUsage {
  id: string
  inventory_id: string
  appointment_id?: string
  quantity_used: number
  usage_date: string
  notes?: string
  inventory?: InventoryItem
}

export interface Lab {
  id: string
  name: string
  contact_info?: string
  address?: string
  created_at: string
  updated_at?: string
}

export interface LabOrder {
  id: string
  lab_id: string
  patient_id?: string
  service_name: string
  cost: number
  order_date: string
  status: 'معلق' | 'مكتمل' | 'ملغي'
  notes?: string
  paid_amount?: number
  remaining_balance?: number
  created_at: string
  updated_at?: string
  // Populated fields
  lab?: Lab
  patient?: Patient
}

export interface ClinicSettings {
  id: string
  clinic_name: string
  doctor_name?: string
  clinic_address?: string
  clinic_phone?: string
  clinic_email?: string
  clinic_logo?: string
  currency: string
  language: string
  timezone: string
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'disabled'
  auto_save_interval: number
  appointment_duration: number
  working_hours_start: string
  working_hours_end: string
  working_days: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total_patients: number
  total_appointments: number
  total_revenue: number
  pending_payments: number
  today_appointments: number
  this_month_revenue: number
  low_stock_items: number
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource?: Appointment
}

export interface SearchResult {
  type: 'patient' | 'appointment' | 'payment'
  id: string
  title: string
  subtitle: string
  data: Patient | Appointment | Payment
}

// Medication and Prescription Types
export interface Medication {
  id: string
  name: string
  instructions?: string
  created_at: string
  updated_at: string
}

export interface Prescription {
  id: string
  patient_id: string
  appointment_id?: string
  prescription_date: string
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: {
    id: string
    full_name: string
  }
  appointment?: {
    id: string
    title: string
  }
  medications?: PrescriptionMedication[]
}

export interface PrescriptionMedication {
  id: string
  prescription_id: string
  medication_id: string
  dose?: string
  created_at: string
  // Populated fields
  medication_name?: string
  medication_instructions?: string
}

// Dental Treatment interfaces
export interface DentalTreatment {
  id: string
  patient_id: string
  appointment_id?: string
  tooth_number: number
  tooth_name: string
  current_treatment?: string
  next_treatment?: string
  treatment_details?: string
  treatment_status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  treatment_color: string
  cost?: number
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
  images?: DentalTreatmentImage[]
  prescriptions?: Prescription[]
}

export interface DentalTreatmentImage {
  id: string
  dental_treatment_id: string
  patient_id: string
  tooth_number: number
  image_path: string
  image_type: 'before' | 'after' | 'xray' | 'clinical'
  description?: string
  taken_date: string
  created_at: string
  updated_at: string
}

export interface DentalTreatmentPrescription {
  id: string
  dental_treatment_id: string
  prescription_id: string
  created_at: string
  // Populated fields
  prescription?: Prescription
}

// Tooth information for dental chart
export interface ToothInfo {
  number: number
  name: string
  arabicName: string
  position: 'upper' | 'lower'
  side: 'right' | 'left'
  type: 'incisor' | 'canine' | 'premolar' | 'molar'
}

// Treatment status colors
export const TREATMENT_COLORS = {
  healthy: '#22c55e',      // Green - سليم
  filling: '#f97316',      // Orange - حشو
  root_canal: '#ef4444',   // Red - عصب
  crown: '#8b5cf6',        // Purple - تاج
  extraction: '#6b7280',   // Gray - خلع
  cleaning: '#06b6d4',     // Cyan - تنظيف
  planned: '#3b82f6',      // Blue - مخطط
  in_progress: '#eab308',  // Yellow - قيد التنفيذ
  completed: '#22c55e',    // Green - مكتمل
  cancelled: '#6b7280'     // Gray - ملغي
} as const

export type TreatmentColorKey = keyof typeof TREATMENT_COLORS

// Database schema for lowdb
export interface DatabaseSchema {
  patients: Patient[]
  appointments: Appointment[]
  payments: Payment[]
  treatments: Treatment[]
  inventory: InventoryItem[]
  settings: ClinicSettings[]
  installmentPayments: InstallmentPayment[]
  patientImages: PatientImage[]
  inventoryUsage: InventoryUsage[]
  labs: Lab[]
  labOrders: LabOrder[]
  medications: Medication[]
  prescriptions: Prescription[]
  prescriptionMedications: PrescriptionMedication[]
  dentalTreatments: DentalTreatment[]
  dentalTreatmentImages: DentalTreatmentImage[]
  dentalTreatmentPrescriptions: DentalTreatmentPrescription[]
}

// Reports and Analytics Types
export interface ReportFilter {
  dateRange: {
    start: string
    end: string
    preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  }
  patientIds?: string[]
  treatmentIds?: string[]
  paymentMethods?: string[]
  appointmentStatuses?: string[]
  paymentStatuses?: string[]
}

export interface PatientReportData {
  totalPatients: number
  newPatients: number
  activePatients: number
  inactivePatients: number
  ageDistribution: { ageGroup: string; count: number }[]
  genderDistribution: { gender: string; count: number }[]
  registrationTrend: { period: string; count: number }[]
  patientsList: Patient[]
}

export interface AppointmentReportData {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  scheduledAppointments: number
  attendanceRate: number
  cancellationRate: number
  appointmentsByStatus: { status: string; count: number; percentage: number }[]
  appointmentsByTreatment: { treatment: string; count: number }[]
  appointmentsByDay: { day: string; count: number }[]
  appointmentsByHour: { hour: string; count: number }[]
  peakHours: { hour: string; count: number }[]
  appointmentTrend: { period: string; count: number }[]
}

export interface FinancialReportData {
  totalRevenue: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  revenueByPaymentMethod: { method: string; amount: number; percentage: number }[]
  revenueByTreatment: { treatment: string; amount: number; count: number; avgAmount: number }[]
  revenueTrend: { period: string; amount: number }[]
  cashFlow: { period: string; income: number; expenses?: number; net: number }[]
  outstandingPayments: Payment[]
  recentTransactions: Payment[]
}

export interface InventoryReportData {
  totalItems: number
  totalValue: number
  lowStockItems: number
  expiredItems: number
  expiringSoonItems: number
  itemsByCategory: { category: string; count: number; value: number }[]
  itemsBySupplier: { supplier: string; count: number; value: number }[]
  usageTrend: { period: string; usage: number }[]
  topUsedItems: { item: string; usage: number }[]
  stockAlerts: InventoryItem[]
  expiryAlerts: InventoryItem[]
}

export interface AnalyticsReportData {
  kpis: {
    patientGrowthRate: number
    revenueGrowthRate: number
    appointmentUtilization: number
    averageRevenuePerPatient: number
    patientRetentionRate: number
    appointmentNoShowRate: number
  }
  trends: {
    patientTrend: { period: string; value: number; change: number }[]
    revenueTrend: { period: string; value: number; change: number }[]
    appointmentTrend: { period: string; value: number; change: number }[]
  }
  comparisons: {
    currentPeriod: any
    previousPeriod: any
    changePercentage: number
  }
  predictions: {
    nextMonthRevenue: number
    nextMonthAppointments: number
    confidence: number
  }
}

export interface ReportData {
  patients?: PatientReportData
  appointments?: AppointmentReportData
  financial?: FinancialReportData
  inventory?: InventoryReportData
  analytics?: AnalyticsReportData
  generatedAt: string
  filter: ReportFilter
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  includeDetails: boolean
  language: 'ar' | 'en'
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'A3' | 'Letter'
}

// Re-export license types
export * from './license'
