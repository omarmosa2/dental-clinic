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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
