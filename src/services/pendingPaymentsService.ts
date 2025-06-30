import {
  Payment,
  Appointment,
  ToothTreatment,
  Patient,
  PendingPaymentItem,
  PendingPaymentsSummary,
  PendingPaymentsFilter,
  ComprehensiveInvoiceSettings,
  ComprehensiveInvoiceData,
  ClinicSettings
} from '@/types'

/**
 * خدمة حسابات المدفوعات المعلقة
 * تضمن دقة الحسابات ومنع الأخطاء المحاسبية
 */
export class PendingPaymentsService {

  /**
   * حساب نطاق التاريخ بناءً على الفلتر
   */
  static calculateDateRange(filter: PendingPaymentsFilter): { from: string; to: string } {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    switch (filter.date_range) {
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return {
          from: lastMonth.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        return {
          from: threeMonthsAgo.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_6_months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        return {
          from: sixMonthsAgo.toISOString().split('T')[0],
          to: today
        }
      }
      case 'last_year': {
        const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return {
          from: lastYear.toISOString().split('T')[0],
          to: today
        }
      }
      case 'custom': {
        return {
          from: filter.custom_start_date || today,
          to: filter.custom_end_date || today
        }
      }
      default:
        return { from: today, to: today }
    }
  }

  /**
   * فلترة المدفوعات المعلقة حسب التاريخ
   */
  static filterPaymentsByDate(
    payments: Payment[],
    dateRange: { from: string; to: string }
  ): Payment[] {
    return payments.filter(payment => {
      const paymentDate = payment.payment_date
      return paymentDate >= dateRange.from && paymentDate <= dateRange.to
    })
  }

  /**
   * الحصول على المدفوعات المعلقة لمريض محدد
   */
  static async getPatientPendingPayments(
    patientId: string,
    filter: PendingPaymentsFilter,
    payments: Payment[]
  ): Promise<PendingPaymentItem[]> {
    try {
      const dateRange = this.calculateDateRange(filter)

      // التحقق من وجود البيانات المطلوبة
      const safePayments = payments || []

      // فلترة المدفوعات المعلقة للمريض
      const patientPendingPayments = safePayments.filter(payment =>
        payment.patient_id === patientId &&
        payment.status === 'pending'
      )

      // فلترة حسب التاريخ
      const filteredPayments = this.filterPaymentsByDate(patientPendingPayments, dateRange)

      // تحويل المدفوعات إلى عناصر فاتورة
      const pendingItems: PendingPaymentItem[] = []

      for (const payment of filteredPayments) {
        // البحث عن الموعد المرتبط
        const appointment = payment.appointment_id
          ? safeAppointments.find(apt => apt.id === payment.appointment_id)
          : undefined

        // البحث عن العلاجات المرتبطة بالموعد
        const relatedTreatments = appointment
          ? safeTreatments.filter(treatment => treatment.appointment_id === appointment.id)
          : []

        // إنشاء عنصر فاتورة للدفعة
        // للمدفوعات المعلقة، استخدام المبلغ الإجمالي المطلوب إذا كان المبلغ المدفوع 0
        const paymentAmount = payment.amount || 0
        const totalAmountDue = payment.total_amount_due || 0
        const remainingBalance = payment.remaining_balance || 0

        // تحديد المبلغ المعلق الصحيح
        let pendingAmount = paymentAmount
        if (paymentAmount === 0 && totalAmountDue > 0) {
          pendingAmount = totalAmountDue
        } else if (paymentAmount === 0 && remainingBalance > 0) {
          pendingAmount = remainingBalance
        } else if (remainingBalance > 0) {
          pendingAmount = remainingBalance
        }



        const item: PendingPaymentItem = {
          id: payment.id,
          patient_id: payment.patient_id,
          appointment_id: payment.appointment_id,
          appointment_date: appointment?.start_time?.split('T')[0],
          appointment_title: appointment?.title,
          treatment_type: relatedTreatments.length > 0
            ? relatedTreatments.map(t => t.treatment_type).join(', ')
            : undefined,
          tooth_number: relatedTreatments.length === 1 ? relatedTreatments[0].tooth_number : undefined,
          tooth_name: relatedTreatments.length === 1 ? relatedTreatments[0].tooth_name : undefined,
          amount: this.roundToTwoDecimals(pendingAmount),
          description: payment.description,
          payment_date: payment.payment_date,
          notes: payment.notes,
          discount_amount: this.roundToTwoDecimals(payment.discount_amount || 0),
          tax_amount: this.roundToTwoDecimals(payment.tax_amount || 0),
          total_amount: this.roundToTwoDecimals(payment.total_amount || pendingAmount)
        }

        pendingItems.push(item)
      }

      // لا حاجة لإضافة أي شيء آخر - فقط المدفوعات المعلقة من جدول المدفوعات

      return pendingItems.sort((a, b) =>
        new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      )

    } catch (error) {
      console.error('خطأ في جلب المدفوعات المعلقة:', error)
      throw new Error('فشل في جلب المدفوعات المعلقة')
    }
  }



  /**
   * حساب ملخص المدفوعات المعلقة مع الخصومات والضرائب
   */
  static calculatePendingPaymentsSummary(
    patientId: string,
    patientName: string,
    items: PendingPaymentItem[],
    settings: ComprehensiveInvoiceSettings,
    dateRange: { from: string; to: string }
  ): PendingPaymentsSummary {
    // حساب المجموع الفرعي
    const subtotal = this.roundToTwoDecimals(
      items.reduce((sum, item) => sum + item.amount, 0)
    )

    // حساب الخصم
    let totalDiscount = 0
    if (settings.apply_discount && settings.discount_value > 0) {
      if (settings.discount_type === 'percentage') {
        totalDiscount = this.roundToTwoDecimals((subtotal * settings.discount_value) / 100)
      } else {
        totalDiscount = this.roundToTwoDecimals(Math.min(settings.discount_value, subtotal))
      }
    }

    // حساب المبلغ بعد الخصم
    const amountAfterDiscount = this.roundToTwoDecimals(subtotal - totalDiscount)

    // حساب الضريبة
    let totalTax = 0
    if (settings.include_tax && settings.tax_rate > 0) {
      totalTax = this.roundToTwoDecimals((amountAfterDiscount * settings.tax_rate) / 100)
    }

    // حساب المجموع النهائي
    const finalTotal = this.roundToTwoDecimals(amountAfterDiscount + totalTax)

    return {
      patient_id: patientId,
      patient_name: patientName,
      total_pending_amount: subtotal,
      total_items: items.length,
      items: items,
      subtotal: subtotal,
      total_discount: totalDiscount,
      total_tax: totalTax,
      final_total: finalTotal,
      date_range: dateRange
    }
  }

  /**
   * تقريب الرقم إلى منزلتين عشريتين لضمان دقة الحسابات
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
  }

  /**
   * توليد رقم فاتورة فريد
   */
  static generateInvoiceNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

    return `INV-${year}${month}${day}-${time}-${random}`
  }

  /**
   * إنشاء بيانات الفاتورة الشاملة
   */
  static createComprehensiveInvoiceData(
    patient: Patient,
    summary: PendingPaymentsSummary,
    settings: ComprehensiveInvoiceSettings,
    clinicInfo: ClinicSettings
  ): ComprehensiveInvoiceData {
    return {
      invoice_number: this.generateInvoiceNumber(),
      invoice_date: new Date().toISOString().split('T')[0],
      patient: patient,
      summary: summary,
      settings: settings,
      clinic_info: clinicInfo,
      generated_at: new Date().toISOString()
    }
  }

  /**
   * التحقق من صحة البيانات المالية
   */
  static validateFinancialData(summary: PendingPaymentsSummary): boolean {
    // التحقق من أن المجموع الفرعي يساوي مجموع العناصر
    const calculatedSubtotal = this.roundToTwoDecimals(
      summary.items.reduce((sum, item) => sum + item.amount, 0)
    )

    if (Math.abs(calculatedSubtotal - summary.subtotal) > 0.01) {
      console.error('خطأ في حساب المجموع الفرعي')
      return false
    }

    // التحقق من أن المجموع النهائي صحيح
    const expectedFinalTotal = this.roundToTwoDecimals(
      summary.subtotal - summary.total_discount + summary.total_tax
    )

    if (Math.abs(expectedFinalTotal - summary.final_total) > 0.01) {
      console.error('خطأ في حساب المجموع النهائي')
      return false
    }

    return true
  }
}
