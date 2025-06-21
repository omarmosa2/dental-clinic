import {
  Patient,
  Appointment,
  Payment,
  Treatment,
  ClinicSettings,
  DashboardStats,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  ReportData,
  ReportExportOptions,
  Lab,
  LabOrder
} from './index'

export interface ElectronAPI {
  // Patient operations
  patients: {
    getAll: () => Promise<Patient[]>
    create: (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => Promise<Patient>
    update: (id: string, patient: Partial<Patient>) => Promise<Patient | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Patient[]>
  }

  // Appointment operations
  appointments: {
    getAll: () => Promise<Appointment[]>
    create: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<Appointment>
    update: (id: string, appointment: Partial<Appointment>) => Promise<Appointment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Payment operations
  payments: {
    getAll: () => Promise<Payment[]>
    create: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<Payment>
    update: (id: string, payment: Partial<Payment>) => Promise<Payment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Treatment operations
  treatments: {
    getAll: () => Promise<Treatment[]>
    create: (treatment: Omit<Treatment, 'id' | 'created_at' | 'updated_at'>) => Promise<Treatment>
    update: (id: string, treatment: Partial<Treatment>) => Promise<Treatment | null>
    delete: (id: string) => Promise<boolean>
  }

  // Settings operations
  settings: {
    get: () => Promise<ClinicSettings | null>
    update: (settings: Partial<ClinicSettings>) => Promise<ClinicSettings>
  }

  // Dashboard operations
  dashboard: {
    getStats: () => Promise<DashboardStats>
  }

  // Backup operations
  backup: {
    create: () => Promise<string>
    restore: (backupPath: string) => Promise<boolean>
    list: () => Promise<string[]>
    delete: (backupName: string) => Promise<boolean>
  }

  // File operations
  files: {
    selectFile: (options?: any) => Promise<string | null>
    selectDirectory: (options?: any) => Promise<string | null>
    saveFile: (options?: any) => Promise<string | null>
  }

  // Export operations
  export: {
    pdf: (data: any, type: string) => Promise<string>
    excel: (data: any, type: string) => Promise<string>
  }

  // System operations
  system: {
    getVersion: () => Promise<string>
    getPath: (name: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
  }

  // Dialog operations
  dialog: {
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>
  }

  // Lab operations
  labs: {
    getAll: () => Promise<Lab[]>
    create: (lab: Omit<Lab, 'id' | 'created_at' | 'updated_at'>) => Promise<Lab>
    update: (id: string, lab: Partial<Lab>) => Promise<Lab | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<Lab[]>
  }

  // Lab order operations
  labOrders: {
    getAll: () => Promise<LabOrder[]>
    create: (labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>) => Promise<LabOrder>
    update: (id: string, labOrder: Partial<LabOrder>) => Promise<LabOrder | null>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<LabOrder[]>
  }

  // Reports operations
  reports: {
    generatePatientReport: (filter: ReportFilter) => Promise<PatientReportData>
    generateAppointmentReport: (filter: ReportFilter) => Promise<AppointmentReportData>
    generateFinancialReport: (filter: ReportFilter) => Promise<FinancialReportData>
    generateInventoryReport: (filter: ReportFilter) => Promise<InventoryReportData>
    generateAnalyticsReport: (filter: ReportFilter) => Promise<AnalyticsReportData>
    generateOverviewReport: (filter: ReportFilter) => Promise<ReportData>
    exportReport: (type: string, filter: ReportFilter, options: ReportExportOptions) => Promise<string>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
