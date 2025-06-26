import type {
  SmartAlert,
  CrossReferencedAlert,
  Patient,
  Appointment,
  Payment,
  ToothTreatment,
  Prescription
} from '@/types'

/**
 * خدمة التنبيهات الذكية
 * تولد تنبيهات مترابطة وذكية بناءً على البيانات
 */
export class SmartAlertsService {

  /**
   * جلب جميع التنبيهات الذكية
   */
  static async getAllAlerts(): Promise<SmartAlert[]> {
    try {
      // جلب التنبيهات المحفوظة من قاعدة البيانات
      const savedAlerts = await window.electronAPI?.smartAlerts?.getAll?.() || []
      console.log('📋 Loaded saved alerts from database:', savedAlerts.length)

      // توليد تنبيهات جديدة
      const generatedAlerts = await this.generateSmartAlerts()
      console.log('🔄 Generated new alerts:', generatedAlerts.length)

      // حفظ التنبيهات الجديدة في قاعدة البيانات
      for (const alert of generatedAlerts) {
        try {
          // تحقق من عدم وجود التنبيه مسبقاً
          const existingAlert = savedAlerts.find(saved => saved.id === alert.id)
          if (!existingAlert) {
            await window.electronAPI?.smartAlerts?.create?.(alert)
            console.log('💾 Saved new alert to database:', alert.id)
          }
        } catch (error) {
          console.error('Error saving alert to database:', error)
        }
      }

      // دمج التنبيهات وإزالة المكررات
      const allAlerts = [...savedAlerts, ...generatedAlerts]
      const uniqueAlerts = this.removeDuplicateAlerts(allAlerts)

      // تنظيف التنبيهات المؤجلة المنتهية الصلاحية
      await this.clearExpiredSnoozedAlerts()

      // ترتيب حسب الأولوية والتاريخ
      return this.sortAlertsByPriority(uniqueAlerts)

    } catch (error) {
      console.error('Error getting all alerts:', error)
      return []
    }
  }

  /**
   * توليد تنبيهات ذكية جديدة
   */
  private static async generateSmartAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      // تنبيهات المواعيد
      const appointmentAlerts = await this.generateAppointmentAlerts()
      alerts.push(...appointmentAlerts)

      // تنبيهات الدفعات
      const paymentAlerts = await this.generatePaymentAlerts()
      alerts.push(...paymentAlerts)

      // تنبيهات العلاجات
      const treatmentAlerts = await this.generateTreatmentAlerts()
      alerts.push(...treatmentAlerts)

      // تنبيهات الوصفات
      const prescriptionAlerts = await this.generatePrescriptionAlerts()
      alerts.push(...prescriptionAlerts)

      // تنبيهات المتابعة
      const followUpAlerts = await this.generateFollowUpAlerts()
      alerts.push(...followUpAlerts)

    } catch (error) {
      console.error('Error generating smart alerts:', error)
    }

    return alerts
  }

  /**
   * توليد تنبيهات المواعيد
   */
  private static async generateAppointmentAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const appointments = await window.electronAPI?.appointments?.getAll?.() || []
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      appointments.forEach((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.start_time)

        // تنبيه للمواعيد اليوم
        if (this.isSameDay(appointmentDate, today) && appointment.status === 'scheduled') {
          alerts.push({
            id: `appointment_today_${appointment.id}`,
            type: 'appointment',
            priority: 'high',
            title: `موعد اليوم - ${appointment.patient?.full_name || 'مريض غير محدد'}`,
            description: `موعد مجدول اليوم في ${this.formatTime(appointment.start_time)} - ${appointment.title}`,
            patientId: appointment.patient_id,
            patientName: appointment.patient?.full_name,
            relatedData: {
              appointmentId: appointment.id
            },
            actionRequired: true,
            dueDate: appointment.start_time,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false
          })
        }

        // تنبيه للمواعيد المتأخرة
        if (appointmentDate < today && appointment.status === 'scheduled') {
          const daysLate = Math.floor((today.getTime() - appointmentDate.getTime()) / (1000 * 60 * 60 * 24))
          alerts.push({
            id: `appointment_overdue_${appointment.id}`,
            type: 'appointment',
            priority: 'high',
            title: `موعد متأخر - ${appointment.patient?.full_name || 'مريض غير محدد'}`,
            description: `موعد متأخر منذ ${daysLate} يوم - ${appointment.title}`,
            patientId: appointment.patient_id,
            patientName: appointment.patient?.full_name,
            relatedData: {
              appointmentId: appointment.id
            },
            actionRequired: true,
            dueDate: appointment.start_time,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false
          })
        }
      })

    } catch (error) {
      console.error('Error generating appointment alerts:', error)
    }

    return alerts
  }

  /**
   * توليد تنبيهات الدفعات
   */
  private static async generatePaymentAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const payments = await window.electronAPI?.payments?.getAll?.() || []
      const today = new Date()

      payments.forEach((payment: Payment) => {
        // تنبيه للدفعات المعلقة
        if (payment.status === 'pending' && payment.remaining_balance && payment.remaining_balance > 0) {
          const paymentDate = new Date(payment.payment_date)
          const daysOverdue = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysOverdue > 0) {
            alerts.push({
              id: `payment_overdue_${payment.id}`,
              type: 'payment',
              priority: daysOverdue > 7 ? 'high' : 'medium',
              title: `دفعة معلقة - ${payment.patient?.full_name || 'مريض غير محدد'}`,
              description: `دفعة معلقة منذ ${daysOverdue} يوم - المبلغ: ${payment.remaining_balance}$`,
              patientId: payment.patient_id,
              patientName: payment.patient?.full_name,
              relatedData: {
                paymentId: payment.id,
                appointmentId: payment.appointment_id
              },
              actionRequired: true,
              dueDate: payment.payment_date,
              createdAt: new Date().toISOString(),
              isRead: false,
              isDismissed: false
            })
          }
        }
      })

    } catch (error) {
      console.error('Error generating payment alerts:', error)
    }

    return alerts
  }

  /**
   * توليد تنبيهات العلاجات
   */
  private static async generateTreatmentAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const treatments = await window.electronAPI?.toothTreatments?.getAll?.() || []
      const today = new Date()

      treatments.forEach((treatment: ToothTreatment) => {
        // تنبيه للعلاجات المعلقة لفترة طويلة
        if (treatment.treatment_status === 'planned' || treatment.treatment_status === 'in_progress') {
          const createdDate = new Date(treatment.created_at)
          const daysPending = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysPending > 14) { // أكثر من أسبوعين
            alerts.push({
              id: `treatment_pending_${treatment.id}`,
              type: 'treatment',
              priority: daysPending > 30 ? 'high' : 'medium',
              title: `علاج معلق - ${treatment.patient?.full_name || 'مريض غير محدد'}`,
              description: `علاج ${treatment.treatment_type} للسن ${treatment.tooth_number} معلق منذ ${daysPending} يوم`,
              patientId: treatment.patient_id,
              patientName: treatment.patient?.full_name,
              relatedData: {
                treatmentId: treatment.id,
                appointmentId: treatment.appointment_id
              },
              actionRequired: true,
              createdAt: new Date().toISOString(),
              isRead: false,
              isDismissed: false
            })
          }
        }
      })

    } catch (error) {
      console.error('Error generating treatment alerts:', error)
    }

    return alerts
  }

  /**
   * توليد تنبيهات الوصفات
   */
  private static async generatePrescriptionAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const prescriptions = await window.electronAPI?.prescriptions?.getAll?.() || []
      const today = new Date()

      prescriptions.forEach((prescription: Prescription) => {
        const prescriptionDate = new Date(prescription.prescription_date)
        const daysSince = Math.floor((today.getTime() - prescriptionDate.getTime()) / (1000 * 60 * 60 * 24))

        // تنبيه للوصفات القديمة (قد تحتاج تجديد)
        if (daysSince > 30) {
          alerts.push({
            id: `prescription_old_${prescription.id}`,
            type: 'prescription',
            priority: 'medium',
            title: `وصفة قديمة - ${prescription.patient?.full_name || 'مريض غير محدد'}`,
            description: `وصفة صادرة منذ ${daysSince} يوم - قد تحتاج تجديد`,
            patientId: prescription.patient_id,
            patientName: prescription.patient?.full_name,
            relatedData: {
              appointmentId: prescription.appointment_id,
              treatmentId: prescription.tooth_treatment_id
            },
            actionRequired: false,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false
          })
        }
      })

    } catch (error) {
      console.error('Error generating prescription alerts:', error)
    }

    return alerts
  }

  /**
   * توليد تنبيهات المتابعة
   */
  private static async generateFollowUpAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const appointments = await window.electronAPI?.appointments?.getAll?.() || []
      const today = new Date()

      // البحث عن المرضى الذين لم يزوروا العيادة لفترة طويلة
      const patientLastVisit: { [key: string]: Date } = {}

      appointments.forEach((appointment: Appointment) => {
        if (appointment.status === 'completed' && appointment.patient_id) {
          const appointmentDate = new Date(appointment.start_time)
          if (!patientLastVisit[appointment.patient_id] || appointmentDate > patientLastVisit[appointment.patient_id]) {
            patientLastVisit[appointment.patient_id] = appointmentDate
          }
        }
      })

      // إنشاء تنبيهات للمرضى الذين لم يزوروا لفترة طويلة
      Object.entries(patientLastVisit).forEach(([patientId, lastVisit]) => {
        const daysSinceLastVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceLastVisit > 90) { // أكثر من 3 أشهر
          // الحصول على بيانات المريض
          window.electronAPI?.patients?.getById?.(patientId).then((patient: Patient) => {
            if (patient) {
              alerts.push({
                id: `follow_up_${patientId}`,
                type: 'follow_up',
                priority: 'low',
                title: `متابعة مطلوبة - ${patient.full_name}`,
                description: `لم يزر المريض العيادة منذ ${daysSinceLastVisit} يوم - قد يحتاج متابعة`,
                patientId: patient.id,
                patientName: patient.full_name,
                relatedData: {},
                actionRequired: false,
                createdAt: new Date().toISOString(),
                isRead: false,
                isDismissed: false
              })
            }
          })
        }
      })

    } catch (error) {
      console.error('Error generating follow-up alerts:', error)
    }

    return alerts
  }



  /**
   * إنشاء تنبيه جديد
   */
  static async createAlert(alert: Omit<SmartAlert, 'id' | 'createdAt'>): Promise<SmartAlert> {
    const newAlert: SmartAlert = {
      ...alert,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }

    try {
      await window.electronAPI?.smartAlerts?.create?.(newAlert)
      return newAlert
    } catch (error) {
      console.error('Error creating alert:', error)
      throw error
    }
  }

  /**
   * تحديث حالة التنبيه
   */
  static async updateAlert(alertId: string, updates: Partial<SmartAlert>): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.update?.(alertId, updates)
      console.log('✅ Alert updated in database:', alertId, updates)
    } catch (error) {
      console.error('Error updating alert:', error)
      throw error
    }
  }

  /**
   * حذف تنبيه
   */
  static async deleteAlert(alertId: string): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.delete?.(alertId)
      console.log('✅ Alert deleted from database:', alertId)
    } catch (error) {
      console.error('Error deleting alert:', error)
      throw error
    }
  }

  /**
   * تنظيف التنبيهات المؤجلة المنتهية الصلاحية
   */
  static async clearExpiredSnoozedAlerts(): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.clearExpiredSnoozed?.()
      console.log('✅ Cleared expired snoozed alerts')
    } catch (error) {
      console.error('Error clearing expired snoozed alerts:', error)
    }
  }

  /**
   * تنظيف التنبيهات المخفية
   */
  static async clearDismissedAlerts(): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.clearDismissed?.()
      console.log('✅ Cleared dismissed alerts')
    } catch (error) {
      console.error('Error clearing dismissed alerts:', error)
    }
  }

  /**
   * إزالة التنبيهات المكررة
   */
  private static removeDuplicateAlerts(alerts: SmartAlert[]): SmartAlert[] {
    const seen = new Set<string>()
    return alerts.filter(alert => {
      if (seen.has(alert.id)) {
        return false
      }
      seen.add(alert.id)
      return true
    })
  }

  /**
   * ترتيب التنبيهات حسب الأولوية والتاريخ
   */
  private static sortAlertsByPriority(alerts: SmartAlert[]): SmartAlert[] {
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }

    return alerts.sort((a, b) => {
      // ترتيب حسب الأولوية أولاً
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      // ثم حسب التاريخ (الأحدث أولاً)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  // Helper methods
  private static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  private static formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
