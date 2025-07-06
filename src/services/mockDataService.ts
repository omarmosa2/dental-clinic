import { v4 as uuidv4 } from 'uuid'
import type {
  Patient,
  Appointment,
  Payment,
  Treatment,
  InventoryItem,
  ClinicSettings,
  Lab,
  LabOrder
} from '../types'

// Mock data for demo purposes
export class MockDataService {
  private static instance: MockDataService
  private patients: Patient[] = []
  private appointments: Appointment[] = []
  private payments: Payment[] = []
  private treatments: Treatment[] = []
  private inventory: InventoryItem[] = []
  private settings: ClinicSettings[] = []
  private labs: Lab[] = []
  private labOrders: LabOrder[] = []

  constructor() {
    this.initializeMockData()
  }

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService()
    }
    return MockDataService.instance
  }

  private initializeMockData() {
    this.initializeSettings()
    this.initializePatients()
    this.initializeTreatments()
    this.initializeAppointments()
    this.initializePayments()
    this.initializeInventory()
    this.initializeLabs()
    this.initializeLabOrders()
  }

  private initializeSettings() {
    const now = new Date().toISOString()
    this.settings = [{
      id: uuidv4(),
      clinic_name: 'عيادة الأسنان التجريبية',
      clinic_address: 'شارع الملك فهد، الرياض، المملكة العربية السعودية',
      clinic_phone: '+966 11 123 4567',
      clinic_email: 'info@dentalclinic-demo.com',
      clinic_logo: '',
      currency: 'SAR',
      language: 'ar',
      timezone: 'Asia/Riyadh',
      backup_frequency: 'daily',
      auto_save_interval: 300,
      appointment_duration: 30,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      working_days: 'السبت,الأحد,الاثنين,الثلاثاء,الأربعاء',
      app_password: null,
      password_enabled: 0,
      created_at: now,
      updated_at: now
    }]
  }

  private initializePatients() {
    const now = new Date().toISOString()
    this.patients = [
      {
        id: uuidv4(),
        serial_number: 'P001',
        full_name: 'أحمد محمد العلي',
        gender: 'male',
        age: 35,
        patient_condition: 'جيد',
        allergies: 'لا يوجد',
        medical_conditions: 'لا يوجد',
        email: 'ahmed.ali@email.com',
        address: 'الرياض، حي النخيل',
        notes: 'مريض منتظم، يحتاج متابعة دورية',
        phone: '+966 50 123 4567',
        date_added: now,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        serial_number: 'P002',
        full_name: 'فاطمة سعد الزهراني',
        gender: 'female',
        age: 28,
        patient_condition: 'ممتاز',
        allergies: 'حساسية من البنسلين',
        medical_conditions: 'لا يوجد',
        email: 'fatima.zahrani@email.com',
        address: 'جدة، حي الصفا',
        notes: 'تحتاج عناية خاصة بسبب الحساسية',
        phone: '+966 55 987 6543',
        date_added: now,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        serial_number: 'P003',
        full_name: 'خالد عبدالله القحطاني',
        gender: 'male',
        age: 42,
        patient_condition: 'جيد',
        allergies: 'لا يوجد',
        medical_conditions: 'ضغط الدم',
        email: 'khalid.qahtani@email.com',
        address: 'الدمام، حي الفيصلية',
        notes: 'يتناول أدوية ضغط الدم',
        phone: '+966 56 456 7890',
        date_added: now,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        serial_number: 'P004',
        full_name: 'نورا إبراهيم الشمري',
        gender: 'female',
        age: 31,
        patient_condition: 'جيد',
        allergies: 'لا يوجد',
        medical_conditions: 'لا يوجد',
        email: 'nora.shamri@email.com',
        address: 'الرياض، حي العليا',
        notes: 'مريضة جديدة، أول زيارة',
        phone: '+966 54 321 0987',
        date_added: now,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        serial_number: 'P005',
        full_name: 'محمد سالم الغامدي',
        gender: 'male',
        age: 25,
        patient_condition: 'ممتاز',
        allergies: 'لا يوجد',
        medical_conditions: 'لا يوجد',
        email: 'mohammed.ghamdi@email.com',
        address: 'مكة المكرمة، حي العزيزية',
        notes: 'طالب جامعي، يحتاج مواعيد مسائية',
        phone: '+966 53 789 0123',
        date_added: now,
        created_at: now,
        updated_at: now
      }
    ]
  }

  private initializeTreatments() {
    const now = new Date().toISOString()
    this.treatments = [
      {
        id: uuidv4(),
        name: 'تنظيف الأسنان',
        description: 'تنظيف شامل للأسنان وإزالة الجير',
        price: 150,
        duration: 30,
        category: 'وقائي',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'حشو الأسنان',
        description: 'حشو الأسنان بالمواد المركبة',
        price: 200,
        duration: 45,
        category: 'علاجي',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'علاج العصب',
        description: 'علاج جذور الأسنان',
        price: 800,
        duration: 90,
        category: 'علاجي',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'تبييض الأسنان',
        description: 'تبييض الأسنان بالليزر',
        price: 1200,
        duration: 60,
        category: 'تجميلي',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'قلع الأسنان',
        description: 'قلع الأسنان البسيط',
        price: 100,
        duration: 20,
        category: 'جراحي',
        created_at: now,
        updated_at: now
      }
    ]
  }

  private initializeAppointments() {
    const now = new Date()
    const appointments: Appointment[] = []
    
    // Create appointments for the next 30 days
    for (let i = 0; i < 15; i++) {
      const appointmentDate = new Date(now)
      appointmentDate.setDate(now.getDate() + Math.floor(Math.random() * 30))
      
      const hour = 8 + Math.floor(Math.random() * 10) // 8 AM to 6 PM
      const minute = Math.random() > 0.5 ? 0 : 30
      appointmentDate.setHours(hour, minute, 0, 0)
      
      const patient = this.patients[Math.floor(Math.random() * this.patients.length)]
      const treatment = this.treatments[Math.floor(Math.random() * this.treatments.length)]
      
      appointments.push({
        id: uuidv4(),
        patient_id: patient.id,
        patient_name: patient.full_name,
        treatment_id: treatment.id,
        treatment_name: treatment.name,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        appointment_time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        status: Math.random() > 0.7 ? 'completed' : Math.random() > 0.5 ? 'confirmed' : 'pending',
        notes: 'موعد تجريبي',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
    }
    
    this.appointments = appointments
  }

  private initializePayments() {
    const now = new Date().toISOString()
    const payments: Payment[] = []
    
    // Create payments for existing appointments
    this.appointments.forEach((appointment, index) => {
      if (appointment.status === 'completed' && Math.random() > 0.3) {
        const treatment = this.treatments.find(t => t.id === appointment.treatment_id)
        const amount = treatment ? treatment.price : 200
        
        payments.push({
          id: uuidv4(),
          patient_id: appointment.patient_id,
          patient_name: appointment.patient_name,
          treatment_id: appointment.treatment_id,
          treatment_name: appointment.treatment_name,
          amount: amount,
          payment_method: Math.random() > 0.5 ? 'cash' : 'card',
          payment_date: appointment.appointment_date,
          notes: 'دفعة كاملة',
          created_at: now,
          updated_at: now
        })
      }
    })
    
    this.payments = payments
  }

  private initializeInventory() {
    const now = new Date().toISOString()
    this.inventory = [
      {
        id: uuidv4(),
        name: 'قفازات طبية',
        category: 'مستهلكات',
        quantity: 500,
        unit: 'قطعة',
        price: 0.5,
        supplier: 'شركة المستلزمات الطبية',
        expiry_date: '2025-12-31',
        minimum_stock: 100,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'حشوات مركبة',
        category: 'مواد علاجية',
        quantity: 50,
        unit: 'أنبوب',
        price: 25,
        supplier: 'شركة المواد السنية',
        expiry_date: '2026-06-30',
        minimum_stock: 10,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'مخدر موضعي',
        category: 'أدوية',
        quantity: 20,
        unit: 'أمبولة',
        price: 15,
        supplier: 'شركة الأدوية المتقدمة',
        expiry_date: '2025-08-15',
        minimum_stock: 5,
        created_at: now,
        updated_at: now
      }
    ]
  }

  private initializeLabs() {
    const now = new Date().toISOString()
    this.labs = [
      {
        id: uuidv4(),
        name: 'مختبر الأسنان المتقدم',
        contact_person: 'د. سعد الأحمد',
        phone: '+966 11 555 0001',
        email: 'lab@advanced-dental.com',
        address: 'الرياض، حي الملز',
        services: 'تيجان، جسور، أطقم أسنان',
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'مختبر الابتسامة الذهبية',
        contact_person: 'أ. محمد الخالد',
        phone: '+966 11 555 0002',
        email: 'info@golden-smile.com',
        address: 'الرياض، حي العليا',
        services: 'تقويم، فينير، زراعة',
        created_at: now,
        updated_at: now
      }
    ]
  }

  private initializeLabOrders() {
    const now = new Date().toISOString()
    this.labOrders = [
      {
        id: uuidv4(),
        patient_id: this.patients[0].id,
        patient_name: this.patients[0].full_name,
        lab_id: this.labs[0].id,
        lab_name: this.labs[0].name,
        order_type: 'تاج',
        description: 'تاج للضرس العلوي الأيمن',
        order_date: now,
        expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'في التصنيع',
        cost: 800,
        notes: 'لون A2',
        created_at: now,
        updated_at: now
      }
    ]
  }

  // Patient operations
  async getAllPatients(): Promise<Patient[]> {
    return [...this.patients]
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const now = new Date().toISOString()
    const newPatient: Patient = {
      ...patient,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }
    this.patients.push(newPatient)
    return newPatient
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    const index = this.patients.findIndex(p => p.id === id)
    if (index === -1) return null
    
    this.patients[index] = {
      ...this.patients[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return this.patients[index]
  }

  async deletePatient(id: string): Promise<boolean> {
    const index = this.patients.findIndex(p => p.id === id)
    if (index === -1) return false
    
    this.patients.splice(index, 1)
    return true
  }

  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    return [...this.appointments]
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const now = new Date().toISOString()
    const newAppointment: Appointment = {
      ...appointment,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }
    this.appointments.push(newAppointment)
    return newAppointment
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const index = this.appointments.findIndex(a => a.id === id)
    if (index === -1) return null
    
    this.appointments[index] = {
      ...this.appointments[index],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return this.appointments[index]
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const index = this.appointments.findIndex(a => a.id === id)
    if (index === -1) return false
    
    this.appointments.splice(index, 1)
    return true
  }

  // Payment operations
  async getAllPayments(): Promise<Payment[]> {
    return [...this.payments]
  }

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const now = new Date().toISOString()
    const newPayment: Payment = {
      ...payment,
      id: uuidv4(),
      created_at: now,
      updated_at: now
    }
    this.payments.push(newPayment)
    return newPayment
  }

  // Treatment operations
  async getAllTreatments(): Promise<Treatment[]> {
    return [...this.treatments]
  }

  // Inventory operations
  async getAllInventory(): Promise<InventoryItem[]> {
    return [...this.inventory]
  }

  // Settings operations
  async getSettings(): Promise<ClinicSettings | null> {
    return this.settings[0] || null
  }

  async updateSettings(updates: Partial<ClinicSettings>): Promise<ClinicSettings | null> {
    if (this.settings.length === 0) return null
    
    this.settings[0] = {
      ...this.settings[0],
      ...updates,
      updated_at: new Date().toISOString()
    }
    return this.settings[0]
  }

  // Lab operations
  async getAllLabs(): Promise<Lab[]> {
    return [...this.labs]
  }

  async getAllLabOrders(): Promise<LabOrder[]> {
    return [...this.labOrders]
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const totalPatients = this.patients.length
    const totalAppointments = this.appointments.length
    const totalPayments = this.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const pendingAppointments = this.appointments.filter(a => a.status === 'pending').length
    
    return {
      totalPatients,
      totalAppointments,
      totalRevenue: totalPayments,
      pendingAppointments,
      completedAppointments: this.appointments.filter(a => a.status === 'completed').length,
      todayAppointments: this.appointments.filter(a => {
        const today = new Date().toISOString().split('T')[0]
        return a.appointment_date === today
      }).length
    }
  }
}

// Export singleton instance
export const mockDataService = MockDataService.getInstance()
