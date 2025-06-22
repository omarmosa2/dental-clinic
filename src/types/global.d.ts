declare global {
  interface Window {
    electronAPI: {
      patients: {
        getAll: () => Promise<any[]>
        create: (patient: any) => Promise<any>
        update: (id: string, patient: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      appointments: {
        getAll: () => Promise<any[]>
        create: (appointment: any) => Promise<any>
        update: (id: string, appointment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      payments: {
        getAll: () => Promise<any[]>
        create: (payment: any) => Promise<any>
        update: (id: string, payment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      treatments: {
        getAll: () => Promise<any[]>
        create: (treatment: any) => Promise<any>
      }
      inventory: {
        getAll: () => Promise<any[]>
        create: (item: any) => Promise<any>
        update: (id: string, item: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      inventoryUsage: {
        getAll: () => Promise<any[]>
        create: (usage: any) => Promise<any>
        getByItem: (itemId: string) => Promise<any[]>
        getByAppointment: (appointmentId: string) => Promise<any[]>
      }
      backup: {
        create: () => Promise<string>
        restore: (backupPath: string) => Promise<boolean>
        list: () => Promise<string[]>
      }
      dialog: {
        showOpenDialog: (options: any) => Promise<any>
        showSaveDialog: (options: any) => Promise<any>
      }
      settings: {
        get: () => Promise<any>
        update: (settings: any) => Promise<any>
      }
      labs: {
        getAll: () => Promise<any[]>
        create: (lab: any) => Promise<any>
        update: (id: string, lab: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      labOrders: {
        getAll: () => Promise<any[]>
        create: (labOrder: any) => Promise<any>
        update: (id: string, labOrder: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      medications: {
        getAll: () => Promise<any[]>
        create: (medication: any) => Promise<any>
        update: (id: string, medication: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      prescriptions: {
        getAll: () => Promise<any[]>
        create: (prescription: any) => Promise<any>
        update: (id: string, prescription: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        search: (query: string) => Promise<any[]>
      }
      dentalTreatments: {
        getAll: () => Promise<any[]>
        getByPatient: (patientId: string) => Promise<any[]>
        create: (treatment: any) => Promise<any>
        update: (id: string, treatment: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      dentalTreatmentImages: {
        getAll: () => Promise<any[]>
        getByTreatment: (treatmentId: string) => Promise<any[]>
        create: (image: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
      }
      files: {
        uploadDentalImage: (fileBuffer: ArrayBuffer, fileName: string, patientId: string, toothNumber: number) => Promise<string>
        saveDentalImage: (base64Data: string, fileName: string, patientId: string, toothNumber: number) => Promise<string>
      }
    }
  }
}

export {}
