const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Patient operations
  patients: {
    getAll: () => ipcRenderer.invoke('db:patients:getAll'),
    create: (patient) => ipcRenderer.invoke('db:patients:create', patient),
    update: (id, patient) => ipcRenderer.invoke('db:patients:update', id, patient),
    delete: (id) => ipcRenderer.invoke('db:patients:delete', id),
    search: (query) => ipcRenderer.invoke('db:patients:search', query)
  },

  // Appointment operations
  appointments: {
    getAll: () => ipcRenderer.invoke('db:appointments:getAll'),
    create: (appointment) => ipcRenderer.invoke('db:appointments:create', appointment),
    update: (id, appointment) => ipcRenderer.invoke('db:appointments:update', id, appointment),
    delete: (id) => ipcRenderer.invoke('db:appointments:delete', id)
  },

  // Payment operations
  payments: {
    getAll: () => ipcRenderer.invoke('db:payments:getAll'),
    create: (payment) => ipcRenderer.invoke('db:payments:create', payment),
    update: (id, payment) => ipcRenderer.invoke('db:payments:update', id, payment),
    delete: (id) => ipcRenderer.invoke('db:payments:delete', id)
  },

  // Treatment operations
  treatments: {
    getAll: () => ipcRenderer.invoke('db:treatments:getAll'),
    create: (treatment) => ipcRenderer.invoke('db:treatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:treatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:treatments:delete', id)
  },

  // Inventory operations
  inventory: {
    getAll: () => ipcRenderer.invoke('db:inventory:getAll'),
    create: (item) => ipcRenderer.invoke('db:inventory:create', item),
    update: (id, item) => ipcRenderer.invoke('db:inventory:update', id, item),
    delete: (id) => ipcRenderer.invoke('db:inventory:delete', id),
    search: (query) => ipcRenderer.invoke('db:inventory:search', query)
  },

  // Inventory usage operations
  inventoryUsage: {
    getAll: () => ipcRenderer.invoke('db:inventoryUsage:getAll'),
    create: (usage) => ipcRenderer.invoke('db:inventoryUsage:create', usage),
    getByItem: (itemId) => ipcRenderer.invoke('db:inventoryUsage:getByItem', itemId),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('db:inventoryUsage:getByAppointment', appointmentId)
  },

  // Settings operations
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings)
  },

  // Lab operations
  labs: {
    getAll: () => ipcRenderer.invoke('db:labs:getAll'),
    create: (lab) => ipcRenderer.invoke('db:labs:create', lab),
    update: (id, lab) => ipcRenderer.invoke('db:labs:update', id, lab),
    delete: (id) => ipcRenderer.invoke('db:labs:delete', id),
    search: (query) => ipcRenderer.invoke('db:labs:search', query)
  },

  // Lab Order operations
  labOrders: {
    getAll: () => ipcRenderer.invoke('db:labOrders:getAll'),
    create: (labOrder) => ipcRenderer.invoke('db:labOrders:create', labOrder),
    update: (id, labOrder) => ipcRenderer.invoke('db:labOrders:update', id, labOrder),
    delete: (id) => ipcRenderer.invoke('db:labOrders:delete', id),
    search: (query) => ipcRenderer.invoke('db:labOrders:search', query)
  },

  // Medication operations
  medications: {
    getAll: () => ipcRenderer.invoke('db:medications:getAll'),
    create: (medication) => ipcRenderer.invoke('db:medications:create', medication),
    update: (id, medication) => ipcRenderer.invoke('db:medications:update', id, medication),
    delete: (id) => ipcRenderer.invoke('db:medications:delete', id),
    search: (query) => ipcRenderer.invoke('db:medications:search', query)
  },

  // Prescription operations
  prescriptions: {
    getAll: () => ipcRenderer.invoke('db:prescriptions:getAll'),
    create: (prescription) => ipcRenderer.invoke('db:prescriptions:create', prescription),
    update: (id, prescription) => ipcRenderer.invoke('db:prescriptions:update', id, prescription),
    delete: (id) => ipcRenderer.invoke('db:prescriptions:delete', id),
    search: (query) => ipcRenderer.invoke('db:prescriptions:search', query)
  },

  // Dashboard operations
  dashboard: {
    getStats: () => ipcRenderer.invoke('db:dashboard:getStats')
  },

  // Backup operations
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupName) => ipcRenderer.invoke('backup:delete', backupName),
    test: () => ipcRenderer.invoke('backup:test')
  },

  // File operations
  files: {
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: (options) => ipcRenderer.invoke('dialog:selectDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
  },

  // Export operations
  export: {
    pdf: (data, type) => ipcRenderer.invoke('export:pdf', data, type),
    excel: (data, type) => ipcRenderer.invoke('export:excel', data, type)
  },

  // System operations
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getPath: (name) => ipcRenderer.invoke('system:getPath', name),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  // Shell operations (direct access)
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // Dialog operations
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },

  // License operations
  license: {
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
    validate: () => ipcRenderer.invoke('license:validate'),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    getDeviceInfo: () => ipcRenderer.invoke('license:getDeviceInfo')
  },

  // Reports operations
  reports: {
    generatePatientReport: (filter) => ipcRenderer.invoke('reports:generatePatientReport', filter),
    generateAppointmentReport: (filter) => ipcRenderer.invoke('reports:generateAppointmentReport', filter),
    generateFinancialReport: (filter) => ipcRenderer.invoke('reports:generateFinancialReport', filter),
    generateInventoryReport: (filter) => ipcRenderer.invoke('reports:generateInventoryReport', filter),
    generateAnalyticsReport: (filter) => ipcRenderer.invoke('reports:generateAnalyticsReport', filter),
    generateOverviewReport: (filter) => ipcRenderer.invoke('reports:generateOverviewReport', filter),
    exportReport: (type, filter, options) => ipcRenderer.invoke('reports:exportReport', type, filter, options)
  }
})
