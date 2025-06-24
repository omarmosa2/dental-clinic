import { Payment, Appointment, Patient, InventoryItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { validateBeforeExport } from '@/utils/exportValidation'

/**
 * خدمة التصدير الشامل المحسنة
 * تضمن دقة 100% في البيانات المصدرة مع احترام الفلاتر الزمنية
 */
export class ComprehensiveExportService {

  /**
   * حساب الإحصائيات المالية بدقة مع المدفوعات الجزئية
   */
  static calculateFinancialStats(payments: Payment[]) {
    const validateAmount = (amount: any): number => {
      const num = Number(amount)
      return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
    }

    // حساب الإيرادات الإجمالية (مكتملة + جزئية)
    const totalRevenue = payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .reduce((sum, payment) => {
        // للمدفوعات الجزئية، استخدم amount_paid إذا كان متوفراً
        const amount = payment.status === 'partial' && payment.amount_paid !== undefined
          ? validateAmount(payment.amount_paid)
          : validateAmount(payment.amount)
        return sum + amount
      }, 0)

    // المدفوعات المعلقة
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)

    // المدفوعات المتأخرة
    const overdueAmount = payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)

    // المدفوعات المكتملة فقط
    const completedAmount = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, payment) => sum + validateAmount(payment.amount), 0)

    // المدفوعات الجزئية
    const partialAmount = payments
      .filter(p => p.status === 'partial')
      .reduce((sum, payment) => {
        const amount = payment.amount_paid !== undefined
          ? validateAmount(payment.amount_paid)
          : validateAmount(payment.amount)
        return sum + amount
      }, 0)

    // إحصائيات طرق الدفع
    const paymentMethodStats: { [key: string]: { amount: number, count: number } } = {}
    payments
      .filter(p => p.status === 'completed' || p.status === 'partial')
      .forEach(payment => {
        const method = payment.payment_method || 'غير محدد'
        const amount = payment.status === 'partial' && payment.amount_paid !== undefined
          ? validateAmount(payment.amount_paid)
          : validateAmount(payment.amount)

        if (!paymentMethodStats[method]) {
          paymentMethodStats[method] = { amount: 0, count: 0 }
        }
        paymentMethodStats[method].amount += amount
        paymentMethodStats[method].count += 1
      })

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedAmount: Math.round(completedAmount * 100) / 100,
      partialAmount: Math.round(partialAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      paymentMethodStats,
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      partialTransactions: payments.filter(p => p.status === 'partial').length,
      pendingTransactions: payments.filter(p => p.status === 'pending').length,
      overdueTransactions: payments.filter(p => p.status === 'overdue').length
    }
  }

  /**
   * حساب إحصائيات المواعيد
   */
  static calculateAppointmentStats(appointments: Appointment[]) {
    const total = appointments.length
    const completed = appointments.filter(a => a.status === 'completed').length
    const cancelled = appointments.filter(a => a.status === 'cancelled').length
    const noShow = appointments.filter(a => a.status === 'no-show').length
    const scheduled = appointments.filter(a => a.status === 'scheduled').length

    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      attendanceRate
    }
  }

  /**
   * حساب إحصائيات المخزون
   */
  static calculateInventoryStats(inventory: InventoryItem[]) {
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) =>
      sum + (item.unit_price * item.quantity), 0)
    const lowStockItems = inventory.filter(item =>
      item.quantity <= item.minimum_stock && item.quantity > 0).length
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockItems,
      outOfStockItems
    }
  }

  /**
   * إنشاء تقرير شامل بصيغة CSV
   */
  static generateComprehensiveCSV(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    filterInfo: {
      appointmentFilter: string
      paymentFilter: string
      inventoryFilter: string
    }
  }): string {
    const financialStats = this.calculateFinancialStats(data.payments)
    const appointmentStats = this.calculateAppointmentStats(data.appointments)
    const inventoryStats = this.calculateInventoryStats(data.inventory)

    // إنشاء محتوى CSV مع BOM للدعم العربي
    let csv = '\uFEFF'

    // معلومات التقرير
    csv += 'التقرير الشامل - عيادة الأسنان الحديثة\n'
    csv += `تاريخ التقرير,${formatDate(new Date().toISOString())}\n`
    csv += `وقت الإنشاء,${new Date().toLocaleTimeString('ar-SA')}\n\n`

    // معلومات الفلترة
    csv += 'معلومات الفلترة المطبقة\n'
    csv += `فلتر المواعيد,${data.filterInfo.appointmentFilter}\n`
    csv += `فلتر المدفوعات,${data.filterInfo.paymentFilter}\n`
    csv += `فلتر المخزون,${data.filterInfo.inventoryFilter}\n\n`

    // إحصائيات المرضى
    csv += 'إحصائيات المرضى\n'
    csv += `إجمالي المرضى,${data.patients.length}\n`
    csv += `المرضى الجدد هذا الشهر,${this.getNewPatientsThisMonth(data.patients)}\n`
    csv += `المرضى النشطون,${this.getActivePatients(data.patients, data.appointments)}\n\n`

    // إحصائيات المواعيد المفلترة
    csv += 'إحصائيات المواعيد (مفلترة)\n'
    csv += `إجمالي المواعيد,${appointmentStats.total}\n`
    csv += `المواعيد المكتملة,${appointmentStats.completed}\n`
    csv += `المواعيد الملغية,${appointmentStats.cancelled}\n`
    csv += `المواعيد المجدولة,${appointmentStats.scheduled}\n`
    csv += `معدل الحضور,${appointmentStats.attendanceRate}%\n\n`

    // الإحصائيات المالية المفلترة
    csv += 'الإحصائيات المالية (مفلترة)\n'
    csv += `إجمالي الإيرادات,${formatCurrency(financialStats.totalRevenue)}\n`
    csv += `المدفوعات المكتملة,${formatCurrency(financialStats.completedAmount)}\n`
    csv += `المدفوعات الجزئية,${formatCurrency(financialStats.partialAmount)}\n`
    csv += `المدفوعات المعلقة,${formatCurrency(financialStats.pendingAmount)}\n`
    csv += `المدفوعات المتأخرة,${formatCurrency(financialStats.overdueAmount)}\n`
    csv += `إجمالي المعاملات,${financialStats.totalTransactions}\n\n`

    // توزيع طرق الدفع
    csv += 'توزيع طرق الدفع\n'
    csv += 'طريقة الدفع,المبلغ,عدد المعاملات\n'
    Object.entries(financialStats.paymentMethodStats).forEach(([method, stats]) => {
      csv += `"${method}","${formatCurrency(stats.amount)}","${stats.count}"\n`
    })
    csv += '\n'

    // إحصائيات المخزون المفلترة
    csv += 'إحصائيات المخزون (مفلترة)\n'
    csv += `إجمالي العناصر,${inventoryStats.totalItems}\n`
    csv += `القيمة الإجمالية,${formatCurrency(inventoryStats.totalValue)}\n`
    csv += `عناصر منخفضة المخزون,${inventoryStats.lowStockItems}\n`
    csv += `عناصر نفدت من المخزون,${inventoryStats.outOfStockItems}\n\n`

    return csv
  }

  /**
   * حساب المرضى الجدد هذا الشهر
   */
  private static getNewPatientsThisMonth(patients: Patient[]): number {
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    return patients.filter(p =>
      p.created_at.startsWith(thisMonth)
    ).length
  }

  /**
   * حساب المرضى النشطون (لديهم مواعيد في آخر 3 أشهر)
   */
  private static getActivePatients(patients: Patient[], appointments: Appointment[]): number {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const activePatientIds = new Set(
      appointments
        .filter(a => new Date(a.start_time) >= threeMonthsAgo)
        .map(a => a.patient_id)
    )

    return activePatientIds.size
  }

  /**
   * تصدير التقرير الشامل
   */
  static async exportComprehensiveReport(data: {
    patients: Patient[]
    filteredAppointments: Appointment[]
    filteredPayments: Payment[]
    filteredInventory: InventoryItem[]
    filterInfo: {
      appointmentFilter: string
      paymentFilter: string
      inventoryFilter: string
    }
  }): Promise<void> {
    try {
      // التحقق من صحة البيانات قبل التصدير
      const isValid = validateBeforeExport({
        payments: data.filteredPayments,
        appointments: data.filteredAppointments,
        inventory: data.filteredInventory,
        filterInfo: data.filterInfo
      })

      if (!isValid) {
        throw new Error('فشل في التحقق من صحة البيانات')
      }
      const csvContent = this.generateComprehensiveCSV({
        patients: data.patients,
        appointments: data.filteredAppointments,
        payments: data.filteredPayments,
        inventory: data.filteredInventory,
        filterInfo: data.filterInfo
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)

      // إنشاء اسم ملف وصفي مع التاريخ والوقت
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
      const fileName = `التقرير_الشامل_المفلتر_${dateStr}_${timeStr}.csv`

      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // تنظيف الذاكرة
      URL.revokeObjectURL(link.href)

    } catch (error) {
      console.error('Error exporting comprehensive report:', error)
      throw new Error('فشل في تصدير التقرير الشامل')
    }
  }
}
