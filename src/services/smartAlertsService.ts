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
 * نظام الأحداث للتحديث في الوقت الفعلي
 */
class AlertsEventSystem {
  private static listeners: Map<string, Set<Function>> = new Map()

  static addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  static removeEventListener(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  static emit(event: string, data?: any) {
    console.log(`🔔 Emitting alert event: ${event}`, data)
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in alert event listener for ${event}:`, error)
        }
      })
    }

    // أيضاً إرسال الحدث عبر window للمكونات الأخرى
    window.dispatchEvent(new CustomEvent(`alerts:${event}`, { detail: data }))
  }

  static removeAllListeners() {
    this.listeners.clear()
  }
}

/**
 * خدمة التنبيهات الذكية
 * تولد تنبيهات مترابطة وذكية بناءً على البيانات
 * مع دعم التحديث في الوقت الفعلي
 */
export class SmartAlertsService {

  /**
   * جلب جميع التنبيهات الذكية
   */
  static async getAllAlerts(): Promise<SmartAlert[]> {
    try {
      console.log('🔄 Starting to load all alerts...')

      // جلب التنبيهات المحفوظة من قاعدة البيانات
      const savedAlerts = await window.electronAPI?.smartAlerts?.getAll?.() || []
      console.log('📋 Loaded saved alerts from database:', savedAlerts.length)

      // تنظيف التنبيهات القديمة والمنتهية الصلاحية
      await this.cleanupOutdatedAlerts()

      // توليد تنبيهات جديدة من البيانات الحقيقية
      const generatedAlerts = await this.generateSmartAlerts()
      console.log('🔄 Generated new alerts from real data:', generatedAlerts.length)

      // حفظ التنبيهات الجديدة في قاعدة البيانات
      for (const alert of generatedAlerts) {
        try {
          // تحقق من عدم وجود التنبيه مسبقاً
          const existingAlert = savedAlerts.find(saved => saved.id === alert.id)
          if (!existingAlert) {
            await window.electronAPI?.smartAlerts?.create?.(alert)
            console.log('💾 Saved new alert to database:', alert.id, alert.title)
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
      const sortedAlerts = this.sortAlertsByPriority(uniqueAlerts)

      console.log('✅ Final alerts count:', sortedAlerts.length)
      console.log('📊 Alert breakdown:', {
        total: sortedAlerts.length,
        unread: sortedAlerts.filter(a => !a.isRead).length,
        undismissed: sortedAlerts.filter(a => !a.isDismissed).length,
        actionRequired: sortedAlerts.filter(a => a.actionRequired).length
      })

      return sortedAlerts

    } catch (error) {
      console.error('❌ Error getting all alerts:', error)
      return []
    }
  }

  /**
   * توليد تنبيهات ذكية جديدة
   */
  private static async generateSmartAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      console.log('🔄 Generating alerts from real data...')

      // تنبيهات المواعيد
      const appointmentAlerts = await this.generateAppointmentAlerts()
      console.log('📅 Generated appointment alerts:', appointmentAlerts.length)
      alerts.push(...appointmentAlerts)

      // تنبيهات الدفعات
      const paymentAlerts = await this.generatePaymentAlerts()
      console.log('💰 Generated payment alerts:', paymentAlerts.length)
      alerts.push(...paymentAlerts)

      // تنبيهات العلاجات
      const treatmentAlerts = await this.generateTreatmentAlerts()
      console.log('🦷 Generated treatment alerts:', treatmentAlerts.length)
      alerts.push(...treatmentAlerts)

      // تنبيهات الوصفات
      const prescriptionAlerts = await this.generatePrescriptionAlerts()
      console.log('💊 Generated prescription alerts:', prescriptionAlerts.length)
      alerts.push(...prescriptionAlerts)

      // تنبيهات المتابعة
      const followUpAlerts = await this.generateFollowUpAlerts()
      console.log('👤 Generated follow-up alerts:', followUpAlerts.length)
      alerts.push(...followUpAlerts)

      // تنبيهات المخزون والاحتياجات
      const inventoryAlerts = await this.generateInventoryAlerts()
      console.log('📦 Generated inventory alerts:', inventoryAlerts.length)
      alerts.push(...inventoryAlerts)

      console.log('✅ Total generated alerts:', alerts.length)

    } catch (error) {
      console.error('❌ Error generating smart alerts:', error)
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
      console.log('📅 Checking appointments for alerts:', appointments.length)

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      appointments.forEach((appointment: Appointment) => {
        // تحقق من صحة التاريخ
        if (!appointment.start_time) {
          console.warn('Appointment missing start_time:', appointment.id)
          return
        }

        const appointmentDate = new Date(appointment.start_time)

        // تحقق من صحة التاريخ
        if (isNaN(appointmentDate.getTime())) {
          console.warn('Invalid appointment date:', appointment.start_time, 'for appointment:', appointment.id)
          return
        }

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

        // تنبيه للمواعيد غداً
        if (this.isSameDay(appointmentDate, tomorrow) && appointment.status === 'scheduled') {
          alerts.push({
            id: `appointment_tomorrow_${appointment.id}`,
            type: 'appointment',
            priority: 'medium',
            title: `موعد غداً - ${appointment.patient?.full_name || 'مريض غير محدد'}`,
            description: `موعد مجدول غداً في ${this.formatTime(appointment.start_time)} - ${appointment.title}`,
            patientId: appointment.patient_id,
            patientName: appointment.patient?.full_name,
            relatedData: {
              appointmentId: appointment.id
            },
            actionRequired: false,
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

        // تنبيه للمواعيد المؤكدة التي تحتاج تذكير (2-6 ساعات قبل الموعد)
        if ((appointment.status === 'confirmed' || appointment.status === 'scheduled') && this.isSameDay(appointmentDate, today)) {
          const appointmentTime = new Date(appointment.start_time)
          const currentTime = new Date()
          const hoursUntilAppointment = (appointmentTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60)

          // تذكير قبل 2-6 ساعات من الموعد كما هو محدد في المتطلبات
          if (hoursUntilAppointment <= 6 && hoursUntilAppointment >= 2) {
            alerts.push({
              id: `appointment_reminder_${appointment.id}`,
              type: 'appointment',
              priority: 'medium',
              title: `تذكير موعد - ${appointment.patient?.full_name || 'مريض غير محدد'}`,
              description: `موعد خلال ${Math.round(hoursUntilAppointment)} ساعة - ${appointment.title}`,
              patientId: appointment.patient_id,
              patientName: appointment.patient?.full_name,
              relatedData: {
                appointmentId: appointment.id
              },
              actionRequired: false,
              dueDate: appointment.start_time,
              createdAt: new Date().toISOString(),
              isRead: false,
              isDismissed: false
            })
          }
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
          // تحقق من صحة التاريخ
          if (!payment.payment_date) {
            console.warn('Payment missing payment_date:', payment.id)
            return
          }

          const paymentDate = new Date(payment.payment_date)

          // تحقق من صحة التاريخ
          if (isNaN(paymentDate.getTime())) {
            console.warn('Invalid payment date:', payment.payment_date, 'for payment:', payment.id)
            return
          }

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

        // تنبيه للدفعات الجزئية
        if (payment.status === 'partial' && payment.remaining_balance && payment.remaining_balance > 0) {
          alerts.push({
            id: `payment_partial_${payment.id}`,
            type: 'payment',
            priority: 'medium',
            title: `دفعة جزئية - ${payment.patient?.full_name || 'مريض غير محدد'}`,
            description: `تم دفع ${payment.amount}$ من أصل ${payment.amount + payment.remaining_balance}$ - المتبقي: ${payment.remaining_balance}$`,
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

        // تنبيه للدفعات المرفوضة
        if (payment.status === 'failed' || payment.status === 'rejected') {
          alerts.push({
            id: `payment_failed_${payment.id}`,
            type: 'payment',
            priority: 'high',
            title: `دفعة مرفوضة - ${payment.patient?.full_name || 'مريض غير محدد'}`,
            description: `دفعة بقيمة ${payment.amount}$ تم رفضها - ${payment.notes || 'بحاجة لمراجعة'}`,
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

        // تنبيه للعلاجات التي تحتاج متابعة
        if (treatment.treatment_status === 'completed' && treatment.notes && treatment.notes.includes('متابعة')) {
          const treatmentDate = new Date(treatment.updated_at || treatment.created_at)
          const daysSinceCompletion = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSinceCompletion > 7) { // أكثر من أسبوع
            alerts.push({
              id: `treatment_followup_${treatment.id}`,
              type: 'treatment',
              priority: 'medium',
              title: `متابعة علاج - ${treatment.patient?.full_name || 'مريض غير محدد'}`,
              description: `علاج ${treatment.treatment_type} للسن ${treatment.tooth_number} يحتاج متابعة`,
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

        // تنبيه للعلاجات المعقدة التي تحتاج عدة جلسات
        if (treatment.treatment_type && ['تقويم', 'زراعة', 'علاج عصب', 'تركيب'].some(type => treatment.treatment_type.includes(type))) {
          const treatmentDate = new Date(treatment.created_at)
          const daysSinceStart = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSinceStart > 21 && treatment.treatment_status !== 'completed') { // أكثر من 3 أسابيع
            alerts.push({
              id: `treatment_complex_${treatment.id}`,
              type: 'treatment',
              priority: 'medium',
              title: `علاج معقد - ${treatment.patient?.full_name || 'مريض غير محدد'}`,
              description: `علاج ${treatment.treatment_type} للسن ${treatment.tooth_number} قيد التنفيذ منذ ${daysSinceStart} يوم`,
              patientId: treatment.patient_id,
              patientName: treatment.patient?.full_name,
              relatedData: {
                treatmentId: treatment.id,
                appointmentId: treatment.appointment_id
              },
              actionRequired: false,
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
              prescriptionId: prescription.id,
              appointmentId: prescription.appointment_id,
              treatmentId: prescription.tooth_treatment_id
            },
            actionRequired: false,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false
          })
        }

        // تنبيه للوصفات التي تحتاج متابعة
        if (prescription.notes && prescription.notes.includes('متابعة') && daysSince > 7) {
          alerts.push({
            id: `prescription_followup_${prescription.id}`,
            type: 'prescription',
            priority: 'medium',
            title: `متابعة وصفة - ${prescription.patient?.full_name || 'مريض غير محدد'}`,
            description: `وصفة تحتاج متابعة - ${prescription.notes}`,
            patientId: prescription.patient_id,
            patientName: prescription.patient?.full_name,
            relatedData: {
              prescriptionId: prescription.id,
              appointmentId: prescription.appointment_id,
              treatmentId: prescription.tooth_treatment_id
            },
            actionRequired: true,
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
      for (const [patientId, lastVisit] of Object.entries(patientLastVisit)) {
        const daysSinceLastVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceLastVisit > 90) { // أكثر من 3 أشهر كما هو محدد في المتطلبات
          try {
            // الحصول على بيانات المريض
            const patient = await window.electronAPI?.patients?.getById?.(patientId)
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
          } catch (error) {
            console.error('Error getting patient data for follow-up alert:', error)
          }
        }
      }

    } catch (error) {
      console.error('Error generating follow-up alerts:', error)
    }

    return alerts
  }



  /**
   * إنشاء تنبيه جديد مع إشعار في الوقت الفعلي
   */
  static async createAlert(alert: Omit<SmartAlert, 'id' | 'createdAt'>): Promise<SmartAlert> {
    const newAlert: SmartAlert = {
      ...alert,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }

    try {
      await window.electronAPI?.smartAlerts?.create?.(newAlert)

      // إرسال حدث الإنشاء في الوقت الفعلي
      AlertsEventSystem.emit('alert:created', { alert: newAlert })
      AlertsEventSystem.emit('alerts:changed')

      return newAlert
    } catch (error) {
      console.error('Error creating alert:', error)
      throw error
    }
  }

  /**
   * حذف التنبيهات المرتبطة بموعد معين
   */
  static async deleteAppointmentAlerts(appointmentId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting alerts for appointment:', appointmentId)
      const alerts = await window.electronAPI?.smartAlerts?.getAll?.() || []

      let deletedCount = 0
      for (const alert of alerts) {
        if (alert.type === 'appointment' && alert.relatedData?.appointmentId === appointmentId) {
          try {
            await window.electronAPI?.smartAlerts?.delete?.(alert.id)
            deletedCount++
          } catch (error) {
            console.warn('Error deleting appointment alert:', alert.id, error)
          }
        }
      }

      console.log(`🗑️ Deleted ${deletedCount} alerts for appointment ${appointmentId}`)

      // إرسال حدث التحديث في الوقت الفعلي
      AlertsEventSystem.emit('alerts:changed')
    } catch (error) {
      console.error('Error deleting appointment alerts:', error)
    }
  }

  /**
   * حذف التنبيهات المرتبطة بدفعة معينة
   */
  static async deletePaymentAlerts(paymentId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting alerts for payment:', paymentId)
      const alerts = await window.electronAPI?.smartAlerts?.getAll?.() || []

      let deletedCount = 0
      for (const alert of alerts) {
        if (alert.type === 'payment' && alert.relatedData?.paymentId === paymentId) {
          try {
            await window.electronAPI?.smartAlerts?.delete?.(alert.id)
            deletedCount++
          } catch (error) {
            console.warn('Error deleting payment alert:', alert.id, error)
          }
        }
      }

      console.log(`🗑️ Deleted ${deletedCount} alerts for payment ${paymentId}`)

      // إرسال حدث التحديث في الوقت الفعلي
      AlertsEventSystem.emit('alerts:changed')
    } catch (error) {
      console.error('Error deleting payment alerts:', error)
    }
  }

  /**
   * تحديث حالة التنبيه مع إشعار في الوقت الفعلي
   */
  static async updateAlert(alertId: string, updates: Partial<SmartAlert>): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.update?.(alertId, updates)
      console.log('✅ Alert updated in database:', alertId, updates)

      // إرسال حدث التحديث في الوقت الفعلي
      AlertsEventSystem.emit('alert:updated', { alertId, updates })
      AlertsEventSystem.emit('alerts:changed')

    } catch (error) {
      console.error('Error updating alert:', error)
      throw error
    }
  }

  /**
   * حذف تنبيه مع إشعار في الوقت الفعلي
   */
  static async deleteAlert(alertId: string): Promise<void> {
    try {
      await window.electronAPI?.smartAlerts?.delete?.(alertId)
      console.log('✅ Alert deleted from database:', alertId)

      // إرسال حدث الحذف في الوقت الفعلي
      AlertsEventSystem.emit('alert:deleted', { alertId })
      AlertsEventSystem.emit('alerts:changed')

    } catch (error) {
      console.error('Error deleting alert:', error)
      throw error
    }
  }

  /**
   * الاستماع لأحداث التنبيهات
   */
  static addEventListener(event: string, callback: Function) {
    AlertsEventSystem.addEventListener(event, callback)
  }

  /**
   * إزالة مستمع الأحداث
   */
  static removeEventListener(event: string, callback: Function) {
    AlertsEventSystem.removeEventListener(event, callback)
  }

  /**
   * إرسال حدث تنبيه مخصص
   */
  static emitEvent(event: string, data?: any) {
    AlertsEventSystem.emit(event, data)
  }

  /**
   * تنظيف جميع المستمعين
   */
  static clearAllEventListeners() {
    AlertsEventSystem.removeAllListeners()
  }

  /**
   * توليد تنبيهات المخزون والاحتياجات
   */
  private static async generateInventoryAlerts(): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = []

    try {
      const inventoryItems = await window.electronAPI?.inventory?.getAll?.() || []
      const today = new Date()

      inventoryItems.forEach((item: any) => {
        // تنبيه للعناصر المنتهية الصلاحية
        if (item.expiry_date) {
          const expiryDate = new Date(item.expiry_date)
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
            alerts.push({
              id: `inventory_expiry_${item.id}`,
              type: 'inventory',
              priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
              title: `انتهاء صلاحية قريب - ${item.name}`,
              description: `ينتهي في ${daysUntilExpiry} يوم - الكمية: ${item.quantity}`,
              relatedData: {
                inventoryId: item.id
              },
              actionRequired: true,
              dueDate: item.expiry_date,
              createdAt: new Date().toISOString(),
              isRead: false,
              isDismissed: false
            })
          } else if (daysUntilExpiry < 0) {
            alerts.push({
              id: `inventory_expired_${item.id}`,
              type: 'inventory',
              priority: 'high',
              title: `منتهي الصلاحية - ${item.name}`,
              description: `انتهت الصلاحية منذ ${Math.abs(daysUntilExpiry)} يوم - الكمية: ${item.quantity}`,
              relatedData: {
                inventoryId: item.id
              },
              actionRequired: true,
              createdAt: new Date().toISOString(),
              isRead: false,
              isDismissed: false
            })
          }
        }

        // تنبيه للعناصر قليلة المخزون
        if (item.quantity <= (item.min_quantity || 5)) {
          alerts.push({
            id: `inventory_low_${item.id}`,
            type: 'inventory',
            priority: item.quantity === 0 ? 'high' : 'medium',
            title: `مخزون منخفض - ${item.name}`,
            description: `الكمية المتبقية: ${item.quantity} - الحد الأدنى: ${item.min_quantity || 5}`,
            relatedData: {
              inventoryId: item.id
            },
            actionRequired: true,
            createdAt: new Date().toISOString(),
            isRead: false,
            isDismissed: false
          })
        }
      })

    } catch (error) {
      console.error('Error generating inventory alerts:', error)
    }

    return alerts
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
   * تنظيف التنبيهات القديمة والمنتهية الصلاحية
   */
  private static async cleanupOutdatedAlerts() {
    try {
      console.log('🧹 Cleaning up outdated alerts...')
      const alerts = await window.electronAPI?.smartAlerts?.getAll?.() || []
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))

      let cleanedCount = 0

      for (const alert of alerts) {
        let shouldDelete = false

        // حذف التنبيهات المرفوضة القديمة (أكثر من 3 أيام)
        if (alert.isDismissed && new Date(alert.createdAt) < threeDaysAgo) {
          shouldDelete = true
        }

        // حذف تنبيهات المواعيد للمواعيد المكتملة أو الملغاة
        if (alert.type === 'appointment' && alert.relatedData?.appointmentId) {
          try {
            const appointments = await window.electronAPI?.appointments?.getAll?.() || []
            const relatedAppointment = appointments.find(a => a.id === alert.relatedData?.appointmentId)

            if (relatedAppointment && (relatedAppointment.status === 'completed' || relatedAppointment.status === 'cancelled')) {
              shouldDelete = true
            }

            // حذف تنبيهات المواعيد القديمة (أكثر من أسبوع من تاريخ الموعد)
            if (relatedAppointment && relatedAppointment.start_time) {
              const appointmentDate = new Date(relatedAppointment.start_time)
              const oneWeekAfterAppointment = new Date(appointmentDate.getTime() + (7 * 24 * 60 * 60 * 1000))
              if (now > oneWeekAfterAppointment) {
                shouldDelete = true
              }
            }
          } catch (error) {
            console.warn('Error checking appointment for alert cleanup:', error)
          }
        }

        // حذف تنبيهات الدفعات للدفعات المكتملة
        if (alert.type === 'payment' && alert.relatedData?.paymentId) {
          try {
            const payments = await window.electronAPI?.payments?.getAll?.() || []
            const relatedPayment = payments.find(p => p.id === alert.relatedData?.paymentId)

            if (relatedPayment && (relatedPayment.status === 'completed' || relatedPayment.remaining_balance <= 0)) {
              shouldDelete = true
            }
          } catch (error) {
            console.warn('Error checking payment for alert cleanup:', error)
          }
        }

        if (shouldDelete) {
          try {
            await window.electronAPI?.smartAlerts?.delete?.(alert.id)
            cleanedCount++
          } catch (error) {
            console.warn('Error deleting outdated alert:', alert.id, error)
          }
        }
      }

      console.log(`🧹 Cleaned up ${cleanedCount} outdated alerts`)
    } catch (error) {
      console.error('Error during alert cleanup:', error)
    }
  }

  /**
   * إزالة التنبيهات المكررة بطريقة أكثر ذكاءً
   */
  private static removeDuplicateAlerts(alerts: SmartAlert[]): SmartAlert[] {
    const seen = new Map<string, SmartAlert>()

    alerts.forEach(alert => {
      const existingAlert = seen.get(alert.id)

      if (!existingAlert) {
        // إذا لم يكن موجود، أضفه
        seen.set(alert.id, alert)
      } else {
        // إذا كان موجود، احتفظ بالأحدث أو الذي له بيانات أكثر
        const existingDate = new Date(existingAlert.createdAt).getTime()
        const newDate = new Date(alert.createdAt).getTime()

        if (newDate > existingDate ||
            (alert.isRead !== undefined && existingAlert.isRead === undefined) ||
            (alert.isDismissed !== undefined && existingAlert.isDismissed === undefined)) {
          seen.set(alert.id, alert)
        }
      }
    })

    return Array.from(seen.values())
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
    try {
      if (!dateString) {
        return '--'
      }

      const date = new Date(dateString)

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '--'
      }

      return date.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting time:', error)
      return '--'
    }
  }
}
