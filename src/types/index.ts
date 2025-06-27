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
  appointment_id?: string // ربط مباشر بالموعد
  amount: number // المبلغ المدفوع في هذه الدفعة
  payment_method: 'cash' | 'bank_transfer'
  payment_date: string
  description?: string
  receipt_number?: string
  status: 'completed' | 'partial' | 'pending'
  notes?: string
  discount_amount?: number
  tax_amount?: number
  total_amount?: number // المبلغ الإجمالي لهذه الدفعة (amount + tax - discount)

  // حقول تتبع الرصيد لكل موعد
  appointment_total_cost?: number // التكلفة الإجمالية للموعد
  appointment_total_paid?: number // إجمالي المدفوع لهذا الموعد حتى الآن
  appointment_remaining_balance?: number // المتبقي لهذا الموعد

  // حقول عامة للمدفوعات غير المرتبطة بموعد
  total_amount_due?: number // المبلغ الإجمالي المطلوب (للمدفوعات العامة)
  amount_paid?: number // إجمالي المبلغ المدفوع (للمدفوعات العامة)
  remaining_balance?: number // المبلغ المتبقي (للمدفوعات العامة)

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
  unit_price?: number // Alias for cost_per_unit for compatibility
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
  appointment_id?: string // ربط طلب المختبر بموعد محدد
  tooth_treatment_id?: string // ربط طلب المختبر بعلاج سن محدد
  service_name: string
  cost: number
  order_date: string
  expected_delivery_date?: string // تاريخ التسليم المتوقع
  actual_delivery_date?: string // تاريخ التسليم الفعلي
  status: 'معلق' | 'مكتمل' | 'ملغي'
  notes?: string
  paid_amount?: number
  remaining_balance?: number
  created_at: string
  updated_at?: string
  // Populated fields
  lab?: Lab
  patient?: Patient
  appointment?: Appointment
  tooth_treatment?: {
    id: string
    tooth_number: number
    treatment_type: string
  }
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
  app_password?: string | null
  password_enabled?: number
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
  tooth_treatment_id?: string // ربط الوصفة بعلاج سن محدد
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
  tooth_treatment?: {
    id: string
    tooth_number: number
    treatment_type: string
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

// Multiple treatments per tooth interface
export interface ToothTreatment {
  id: string
  patient_id: string
  tooth_number: number
  tooth_name: string
  treatment_type: string
  treatment_category: string
  treatment_status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  treatment_color: string
  start_date?: string
  completion_date?: string
  cost?: number
  priority: number // For ordering treatments
  notes?: string
  appointment_id?: string
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

// Clinic Need interface
export interface ClinicNeed {
  id: string
  serial_number: string
  need_name: string
  quantity: number
  price: number
  description?: string
  category?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  supplier?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Database schema for lowdb
// Treatment Reports Data Interface
export interface TreatmentReportData {
  // Basic Statistics
  totalTreatments: number
  completedTreatments: number
  plannedTreatments: number
  inProgressTreatments: number
  cancelledTreatments: number

  // Financial Statistics
  totalRevenue: number
  averageTreatmentCost: number
  revenueByCategory: { category: string; revenue: number; count: number }[]

  // Treatment Analysis
  treatmentsByType: { type: string; count: number; percentage: number }[]
  treatmentsByCategory: { category: string; count: number; percentage: number }[]
  treatmentsByStatus: { status: string; count: number; percentage: number }[]

  // Performance Metrics
  completionRate: number
  averageCompletionTime: number // in days
  treatmentTrend: { period: string; completed: number; planned: number }[]

  // Popular Treatments
  mostPopularTreatments: { name: string; count: number; revenue: number }[]

  // Patient Analysis
  patientsWithMultipleTreatments: number
  averageTreatmentsPerPatient: number

  // Time Analysis
  treatmentsByMonth: { month: string; count: number }[]
  peakTreatmentDays: { day: string; count: number }[]

  // Detailed Lists
  treatmentsList: ToothTreatment[]
  pendingTreatments: ToothTreatment[]
  overdueTreatments: ToothTreatment[]
}

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
  dentalTreatmentImages: DentalTreatmentImage[]
  toothTreatments: ToothTreatment[] // Multiple treatments per tooth
  clinicNeeds: ClinicNeed[]
  // New integrated tables
  patientTreatmentTimeline: PatientTreatmentTimeline[]
  treatmentPlans: TreatmentPlan[]
  treatmentPlanItems: TreatmentPlanItem[]
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
  appointmentsList?: Appointment[]
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
  outOfStockItems?: number
  expiringSoonItems: number
  itemsByCategory: { category: string; count: number; value: number }[]
  itemsBySupplier: { supplier: string; count: number; value: number }[]
  usageTrend: { period: string; usage: number }[]
  topUsedItems: { item: string; usage: number }[]
  stockAlerts: InventoryItem[]
  expiryAlerts: InventoryItem[]
  inventoryItems?: InventoryItem[]
  filterInfo?: string
  dataCount?: number
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

// New interfaces for enhanced integration

// Patient treatment timeline for comprehensive tracking
export interface PatientTreatmentTimeline {
  id: string
  patient_id: string
  appointment_id?: string
  tooth_treatment_id?: string
  prescription_id?: string
  lab_order_id?: string
  timeline_type: 'appointment' | 'treatment' | 'prescription' | 'lab_order' | 'payment' | 'note'
  title: string
  description?: string
  event_date: string
  status: 'active' | 'completed' | 'cancelled'
  priority: 1 | 2 | 3 // 1 = high, 2 = medium, 3 = low
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  appointment?: Appointment
  tooth_treatment?: ToothTreatment
  prescription?: Prescription
  lab_order?: LabOrder
}

// Treatment plan for comprehensive treatment planning
export interface TreatmentPlan {
  id: string
  patient_id: string
  plan_name: string
  description?: string
  total_estimated_cost: number
  estimated_duration_weeks?: number
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date?: string
  target_completion_date?: string
  actual_completion_date?: string
  created_by?: string // Doctor/user who created the plan
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  patient?: Patient
  items?: TreatmentPlanItem[]
}

// Treatment plan items for detailed treatment steps
export interface TreatmentPlanItem {
  id: string
  treatment_plan_id: string
  tooth_treatment_id?: string
  sequence_order: number
  title: string
  description?: string
  estimated_cost: number
  estimated_duration_minutes?: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  dependencies?: string // JSON array of treatment_plan_item IDs that must be completed first
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  treatment_plan?: TreatmentPlan
  tooth_treatment?: ToothTreatment
}

// Enhanced patient data with integrated information
export interface PatientIntegratedData {
  patient: Patient
  appointments: Appointment[]
  treatments: ToothTreatment[]
  payments: Payment[]
  prescriptions: Prescription[]
  labOrders: LabOrder[]
  timeline: PatientTreatmentTimeline[]
  treatmentPlans: TreatmentPlan[]
  // Statistics
  stats: {
    totalAppointments: number
    completedTreatments: number
    pendingTreatments: number
    totalPaid: number
    remainingBalance: number
    lastVisit?: string
    nextAppointment?: string
  }
}

// Global Search Types
export interface SearchResult {
  id: string
  type: 'patient' | 'appointment' | 'payment' | 'treatment' | 'prescription'
  title: string
  subtitle: string
  description?: string
  relevanceScore: number
  data: any
  relatedData?: {
    patientId?: string
    appointmentId?: string
    paymentId?: string
    treatmentId?: string
  }
}

export interface SearchResults {
  patients: SearchResult[]
  appointments: SearchResult[]
  payments: SearchResult[]
  treatments: SearchResult[]
  prescriptions: SearchResult[]
  totalCount: number
  searchTime: number
  query: string
}

export interface SearchCriteria {
  query: string
  types?: ('patient' | 'appointment' | 'payment' | 'treatment' | 'prescription')[]
  dateRange?: {
    start: string
    end: string
  }
  filters?: {
    status?: string
    category?: string
    priority?: string
  }
  sortBy?: 'relevance' | 'date' | 'name'
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

// Smart Alerts Types
export interface SmartAlert {
  id: string
  type: 'appointment' | 'payment' | 'treatment' | 'follow_up' | 'prescription' | 'lab_order' | 'inventory'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  patientId?: string
  patientName?: string
  relatedData: {
    appointmentId?: string
    paymentId?: string
    treatmentId?: string
    prescriptionId?: string
    labOrderId?: string
    inventoryId?: string
  }
  actionRequired: boolean
  dueDate?: string
  createdAt: string
  isRead: boolean
  isDismissed: boolean
  snoozeUntil?: string
}

export interface CrossReferencedAlert extends SmartAlert {
  crossReferences: {
    relatedAppointments?: Appointment[]
    relatedPayments?: Payment[]
    relatedTreatments?: ToothTreatment[]
    relatedPrescriptions?: Prescription[]
  }
}

// Quick Access Types
export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
  shortcut?: string
  category: 'patient' | 'appointment' | 'payment' | 'treatment' | 'report'
  priority: number
}

export interface QuickAccessData {
  recentPatients: Patient[]
  todayAppointments: Appointment[]
  pendingPayments: Payment[]
  urgentTreatments: ToothTreatment[]
  recentActivities: ActivityLog[]
  quickStats: {
    totalPatients: number
    todayAppointments: number
    pendingPayments: number
    urgentAlerts: number
  }
}

export interface ActivityLog {
  id: string
  type: 'patient_added' | 'appointment_created' | 'payment_received' | 'treatment_completed'
  title: string
  description: string
  patientId?: string
  patientName?: string
  timestamp: string
  icon: string
}

// Quick Links Types
export interface QuickLink {
  id: string
  title: string
  description: string
  icon: string
  url: string
  action?: () => void
  category: string
  priority: number
  contextual: boolean
}

// Cross-Referenced Stats
export interface CrossReferencedStats {
  patientId: string
  overview: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
    totalPayments: number
    totalPaid: number
    remainingBalance: number
    activeTreatments: number
    completedTreatments: number
    activePrescriptions: number
  }
  trends: {
    appointmentFrequency: 'increasing' | 'decreasing' | 'stable'
    paymentPattern: 'regular' | 'irregular' | 'delayed'
    treatmentProgress: 'on_track' | 'delayed' | 'ahead'
  }
  alerts: SmartAlert[]
  recommendations: string[]
}



