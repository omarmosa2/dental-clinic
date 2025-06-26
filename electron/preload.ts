import { contextBridge, ipcRenderer } from 'electron'

// Define the API interface
export interface ElectronAPI {
  // Patient operations
  patients: {
    getAll: () => Promise<any[]>
    create: (patient: any) => Promise<any>
    update: (id: string, patient: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Appointment operations
  appointments: {
    getAll: () => Promise<any[]>
    create: (appointment: any) => Promise<any>
    update: (id: string, appointment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }

  // Payment operations
  payments: {
    getAll: () => Promise<any[]>
    create: (payment: any) => Promise<any>
    update: (id: string, payment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Inventory operations
  inventory: {
    getAll: () => Promise<any[]>
    create: (item: any) => Promise<any>
    update: (id: string, item: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Inventory usage operations
  inventoryUsage: {
    getAll: () => Promise<any[]>
    create: (usage: any) => Promise<any>
    getByItem: (itemId: string) => Promise<any[]>
    getByAppointment: (appointmentId: string) => Promise<any[]>
  }

  // Treatment operations
  treatments: {
    getAll: () => Promise<any[]>
    create: (treatment: any) => Promise<any>
  }

  // Backup operations
  backup: {
    create: () => Promise<string>
    restore: (backupPath: string) => Promise<boolean>
    list: () => Promise<string[]>
  }

  // Dialog operations
  dialog: {
    showOpenDialog: (options: any) => Promise<any>
    showSaveDialog: (options: any) => Promise<any>
  }

  // Settings operations
  settings: {
    get: () => Promise<any>
    update: (settings: any) => Promise<any>
  }

  // Lab operations
  labs: {
    getAll: () => Promise<any[]>
    create: (lab: any) => Promise<any>
    update: (id: string, lab: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Lab order operations
  labOrders: {
    getAll: () => Promise<any[]>
    create: (labOrder: any) => Promise<any>
    update: (id: string, labOrder: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Medication operations
  medications: {
    getAll: () => Promise<any[]>
    create: (medication: any) => Promise<any>
    update: (id: string, medication: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Prescription operations
  prescriptions: {
    getAll: () => Promise<any[]>
    create: (prescription: any) => Promise<any>
    update: (id: string, prescription: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    search: (query: string) => Promise<any[]>
  }

  // Dental Treatment operations (LEGACY - for backward compatibility)
  dentalTreatments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    create: (treatment: any) => Promise<any>
    update: (id: string, treatment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }

  // NEW: Multiple treatments per tooth operations
  toothTreatments: {
    getAll: () => Promise<any[]>
    getByPatient: (patientId: string) => Promise<any[]>
    getByTooth: (patientId: string, toothNumber: number) => Promise<any[]>
    create: (treatment: any) => Promise<any>
    update: (id: string, treatment: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
    reorder: (patientId: string, toothNumber: number, treatmentIds: string[]) => Promise<void>
  }

  // Dental Treatment Images operations
  dentalTreatmentImages: {
    getAll: () => Promise<any[]>
    getByTreatment: (treatmentId: string) => Promise<any[]>
    create: (image: any) => Promise<any>
    delete: (id: string) => Promise<boolean>
  }

  // File operations
  files: {
    uploadDentalImage: (fileBuffer: ArrayBuffer, fileName: string, patientId: string, toothNumber: number) => Promise<string>
  }

  // License operations
  license: {
    checkStatus: () => Promise<{
      isValid: boolean
      error?: string
      isFirstRun: boolean
      licenseData?: any
    }>
    activate: (licenseKey: string) => Promise<{
      success: boolean
      error?: string
      licenseData?: any
    }>
    getMachineInfo: () => Promise<{
      hwid: string
      platform: string
      arch: string
      error?: string
    }>
    getLicenseInfo: () => Promise<{
      license?: string
      hwid: string
      activated: boolean
      timestamp?: number
      error?: string
    } | null>
    clearData: () => Promise<{
      success: boolean
      error?: string
    }>
    getStorageInfo: () => Promise<{
      usingElectronStore: boolean
      storageType: string
      storePath: string
      error?: string
    }>
  }

  // Authentication operations
  auth: {
    clearSession: () => Promise<{ success: boolean; error?: string }>
  }

  // System operations
  system: {
    getVersion: () => Promise<string>
    getPath: (name: string) => Promise<string>
    openExternal: (url: string) => Promise<void>
  }

  // Export operations
  export: {
    pdf: (data: any, type: string) => Promise<any>
    excel: (data: any, type: string) => Promise<any>
  }

  // Reports operations
  reports: {
    generatePatientReport: (filter: any) => Promise<any>
    generateAppointmentReport: (filter: any) => Promise<any>
    generateFinancialReport: (filter: any) => Promise<any>
    generateInventoryReport: (filter: any) => Promise<any>
    generateAnalyticsReport: (filter: any) => Promise<any>
    generateOverviewReport: (filter: any) => Promise<any>
    exportReport: (type: string, filter: any, options: any) => Promise<any>
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  patients: {
    getAll: () => ipcRenderer.invoke('db:patients:getAll'),
    create: (patient) => ipcRenderer.invoke('db:patients:create', patient),
    update: (id, patient) => ipcRenderer.invoke('db:patients:update', id, patient),
    delete: (id) => ipcRenderer.invoke('db:patients:delete', id),
    search: (query) => ipcRenderer.invoke('db:patients:search', query),
  },

  appointments: {
    getAll: () => ipcRenderer.invoke('db:appointments:getAll'),
    create: (appointment) => ipcRenderer.invoke('db:appointments:create', appointment),
    update: (id, appointment) => ipcRenderer.invoke('db:appointments:update', id, appointment),
    delete: (id) => ipcRenderer.invoke('db:appointments:delete', id),
    checkConflict: (startTime, endTime, excludeId) => ipcRenderer.invoke('db:appointments:checkConflict', startTime, endTime, excludeId),
  },

  payments: {
    getAll: () => ipcRenderer.invoke('db:payments:getAll'),
    create: (payment) => ipcRenderer.invoke('db:payments:create', payment),
    update: (id, payment) => ipcRenderer.invoke('db:payments:update', id, payment),
    delete: (id) => ipcRenderer.invoke('db:payments:delete', id),
    search: (query) => ipcRenderer.invoke('db:payments:search', query),
  },

  treatments: {
    getAll: () => ipcRenderer.invoke('db:treatments:getAll'),
    create: (treatment) => ipcRenderer.invoke('db:treatments:create', treatment),
  },

  inventory: {
    getAll: () => ipcRenderer.invoke('db:inventory:getAll'),
    create: (item) => ipcRenderer.invoke('db:inventory:create', item),
    update: (id, item) => ipcRenderer.invoke('db:inventory:update', id, item),
    delete: (id) => ipcRenderer.invoke('db:inventory:delete', id),
    search: (query) => ipcRenderer.invoke('db:inventory:search', query),
  },

  inventoryUsage: {
    getAll: () => ipcRenderer.invoke('db:inventoryUsage:getAll'),
    create: (usage) => ipcRenderer.invoke('db:inventoryUsage:create', usage),
    getByItem: (itemId) => ipcRenderer.invoke('db:inventoryUsage:getByItem', itemId),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('db:inventoryUsage:getByAppointment', appointmentId),
  },

  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
  },

  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
  },

  labs: {
    getAll: () => ipcRenderer.invoke('db:labs:getAll'),
    create: (lab) => ipcRenderer.invoke('db:labs:create', lab),
    update: (id, lab) => ipcRenderer.invoke('db:labs:update', id, lab),
    delete: (id) => ipcRenderer.invoke('db:labs:delete', id),
    search: (query) => ipcRenderer.invoke('db:labs:search', query),
  },

  labOrders: {
    getAll: () => ipcRenderer.invoke('db:labOrders:getAll'),
    create: (labOrder) => ipcRenderer.invoke('db:labOrders:create', labOrder),
    update: (id, labOrder) => ipcRenderer.invoke('db:labOrders:update', id, labOrder),
    delete: (id) => ipcRenderer.invoke('db:labOrders:delete', id),
    search: (query) => ipcRenderer.invoke('db:labOrders:search', query),
  },

  medications: {
    getAll: () => ipcRenderer.invoke('db:medications:getAll'),
    create: (medication) => ipcRenderer.invoke('db:medications:create', medication),
    update: (id, medication) => ipcRenderer.invoke('db:medications:update', id, medication),
    delete: (id) => ipcRenderer.invoke('db:medications:delete', id),
    search: (query) => ipcRenderer.invoke('db:medications:search', query),
  },

  prescriptions: {
    getAll: () => ipcRenderer.invoke('db:prescriptions:getAll'),
    create: (prescription) => ipcRenderer.invoke('db:prescriptions:create', prescription),
    update: (id, prescription) => ipcRenderer.invoke('db:prescriptions:update', id, prescription),
    delete: (id) => ipcRenderer.invoke('db:prescriptions:delete', id),
    search: (query) => ipcRenderer.invoke('db:prescriptions:search', query),
  },

  dentalTreatments: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:dentalTreatments:getByPatient', patientId),
    create: (treatment) => ipcRenderer.invoke('db:dentalTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:dentalTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatments:delete', id),
  },

  // NEW: Multiple treatments per tooth operations
  toothTreatments: {
    getAll: () => ipcRenderer.invoke('db:toothTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:toothTreatments:getByPatient', patientId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatments:getByTooth', patientId, toothNumber),
    create: (treatment) => ipcRenderer.invoke('db:toothTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:toothTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:toothTreatments:delete', id),
    reorder: (patientId, toothNumber, treatmentIds) => ipcRenderer.invoke('db:toothTreatments:reorder', patientId, toothNumber, treatmentIds),
  },

  // NEW: Tooth Treatment Images operations
  toothTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:toothTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:toothTreatmentImages:getByTreatment', treatmentId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatmentImages:getByTooth', patientId, toothNumber),
    create: (image) => ipcRenderer.invoke('db:toothTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:toothTreatmentImages:delete', id),
  },

  dentalTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:dentalTreatmentImages:getByTreatment', treatmentId),
    create: (image) => ipcRenderer.invoke('db:dentalTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatmentImages:delete', id),
  },

  files: {
    uploadDentalImage: (fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) =>
      ipcRenderer.invoke('files:uploadDentalImage', fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName),
    saveDentalImage: (base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) =>
      ipcRenderer.invoke('files:saveDentalImage', base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName),
    getDentalImage: (imagePath) => ipcRenderer.invoke('files:getDentalImage', imagePath),
    checkImageExists: (imagePath) => ipcRenderer.invoke('files:checkImageExists', imagePath)
  },

  license: {
    checkStatus: () => ipcRenderer.invoke('license:checkStatus'),
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
    getMachineInfo: () => ipcRenderer.invoke('license:getMachineInfo'),
    getLicenseInfo: () => ipcRenderer.invoke('license:getLicenseInfo'),
    clearData: () => ipcRenderer.invoke('license:clearData'),
    getStorageInfo: () => ipcRenderer.invoke('license:getStorageInfo')
  },

  auth: {
    clearSession: () => ipcRenderer.invoke('auth:clearSession')
  },

  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getPath: (name) => ipcRenderer.invoke('system:getPath', name),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  export: {
    pdf: (data, type) => ipcRenderer.invoke('export:pdf', data, type),
    excel: (data, type) => ipcRenderer.invoke('export:excel', data, type)
  },

  reports: {
    generatePatientReport: (filter) => ipcRenderer.invoke('reports:generatePatientReport', filter),
    generateAppointmentReport: (filter) => ipcRenderer.invoke('reports:generateAppointmentReport', filter),
    generateFinancialReport: (filter) => ipcRenderer.invoke('reports:generateFinancialReport', filter),
    generateInventoryReport: (filter) => ipcRenderer.invoke('reports:generateInventoryReport', filter),
    generateAnalyticsReport: (filter) => ipcRenderer.invoke('reports:generateAnalyticsReport', filter),
    generateOverviewReport: (filter) => ipcRenderer.invoke('reports:generateOverviewReport', filter),
    exportReport: (type, filter, options) => ipcRenderer.invoke('reports:exportReport', type, filter, options)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Debug: Log available APIs
console.log('Preload: electronAPI exposed with keys:', Object.keys(electronAPI))
console.log('Preload: files API available:', !!electronAPI.files)
console.log('Preload: uploadDentalImage available:', !!electronAPI.files?.uploadDentalImage)

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
