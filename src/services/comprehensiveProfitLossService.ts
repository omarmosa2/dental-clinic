import type { 
  Payment, 
  LabOrder, 
  ClinicNeed, 
  InventoryItem, 
  Patient, 
  Appointment,
  ComprehensiveProfitLossReport,
  ReportFilter 
} from '@/types'

/**
 * خدمة حساب التقرير الشامل للأرباح والخسائر
 * تربط جميع الجوانب المالية في التطبيق
 */
export class ComprehensiveProfitLossService {
  
  /**
   * دالة التحقق من صحة المبلغ
   */
  private static validateAmount(amount: any): number {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  /**
   * فلترة البيانات حسب التاريخ
   */
  private static filterByDateRange<T extends { created_at?: string; payment_date?: string; order_date?: string }>(
    data: T[], 
    dateRange: { startDate?: string; endDate?: string }, 
    dateField: keyof T
  ): T[] {
    if (!dateRange.startDate && !dateRange.endDate) {
      return data
    }

    return data.filter(item => {
      const itemDate = item[dateField] as string
      if (!itemDate) return true

      const date = new Date(itemDate)
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null

      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      
      return true
    })
  }

  /**
   * حساب إحصائيات الإيرادات
   */
  private static calculateRevenueStats(payments: Payment[]) {
    const completedPayments = this.validateAmount(
      payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + this.validateAmount(p.amount), 0)
    )

    const partialPayments = this.validateAmount(
      payments
        .filter(p => p.status === 'partial')
        .reduce((sum, p) => sum + this.validateAmount(p.amount), 0)
    )

    const totalRevenue = completedPayments + partialPayments

    // حساب المبالغ المتبقية من المدفوعات الجزئية
    const remainingBalances = this.validateAmount(
      payments
        .filter(p => p.status === 'partial' && p.appointment_remaining_balance)
        .reduce((sum, p) => sum + this.validateAmount(p.appointment_remaining_balance), 0)
    )

    return {
      completedPayments,
      totalRevenue,
      partialPayments,
      remainingBalances
    }
  }

  /**
   * حساب إحصائيات المصروفات
   */
  private static calculateExpenseStats(
    labOrders: LabOrder[], 
    clinicNeeds: ClinicNeed[], 
    inventoryItems: InventoryItem[]
  ) {
    // حسابات المخابر
    const labOrdersTotal = this.validateAmount(
      labOrders.reduce((sum, order) => sum + this.validateAmount(order.paid_amount || 0), 0)
    )

    const labOrdersRemaining = this.validateAmount(
      labOrders.reduce((sum, order) => sum + this.validateAmount(order.remaining_balance || 0), 0)
    )

    // حسابات احتياجات العيادة
    const clinicNeedsTotal = this.validateAmount(
      clinicNeeds
        .filter(need => need.status === 'received' || need.status === 'ordered')
        .reduce((sum, need) => sum + (this.validateAmount(need.quantity) * this.validateAmount(need.price)), 0)
    )

    const clinicNeedsRemaining = this.validateAmount(
      clinicNeeds
        .filter(need => need.status === 'pending' || need.status === 'ordered')
        .reduce((sum, need) => sum + (this.validateAmount(need.quantity) * this.validateAmount(need.price)), 0)
    )

    // حسابات المخزون (التكلفة الإجمالية للمخزون)
    const inventoryExpenses = this.validateAmount(
      inventoryItems.reduce((sum, item) => {
        const cost = this.validateAmount(item.cost_per_unit || 0)
        const quantity = this.validateAmount(item.quantity || 0)
        return sum + (cost * quantity)
      }, 0)
    )

    return {
      labOrdersTotal,
      labOrdersRemaining,
      clinicNeedsTotal,
      clinicNeedsRemaining,
      inventoryExpenses
    }
  }

  /**
   * حساب الأرباح والخسائر النهائية
   */
  private static calculateProfitLoss(
    totalIncome: number, 
    totalExpenses: number
  ) {
    const netProfit = totalIncome - totalExpenses
    const isProfit = netProfit >= 0
    const lossAmount = isProfit ? 0 : Math.abs(netProfit)
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

    return {
      totalIncome,
      totalExpenses,
      netProfit: isProfit ? netProfit : 0,
      profitMargin: this.validateAmount(profitMargin),
      lossAmount,
      isProfit
    }
  }

  /**
   * إنشاء التقرير الشامل للأرباح والخسائر
   */
  static generateComprehensiveProfitLossReport(
    payments: Payment[],
    labOrders: LabOrder[],
    clinicNeeds: ClinicNeed[],
    inventoryItems: InventoryItem[],
    patients: Patient[],
    appointments: Appointment[],
    filter?: ReportFilter
  ): ComprehensiveProfitLossReport {
    
    // فلترة البيانات حسب التاريخ إذا كان الفلتر موجود
    const filteredPayments = filter?.dateRange 
      ? this.filterByDateRange(payments, filter.dateRange, 'payment_date')
      : payments

    const filteredLabOrders = filter?.dateRange 
      ? this.filterByDateRange(labOrders, filter.dateRange, 'order_date')
      : labOrders

    const filteredClinicNeeds = filter?.dateRange 
      ? this.filterByDateRange(clinicNeeds, filter.dateRange, 'created_at')
      : clinicNeeds

    const filteredAppointments = filter?.dateRange 
      ? this.filterByDateRange(appointments, filter.dateRange, 'created_at')
      : appointments

    // حساب الإيرادات
    const revenue = this.calculateRevenueStats(filteredPayments)

    // حساب المصروفات
    const expenses = this.calculateExpenseStats(
      filteredLabOrders, 
      filteredClinicNeeds, 
      inventoryItems
    )

    // حساب إجمالي الدخل والمصروفات
    const totalIncome = revenue.totalRevenue
    const totalExpenses = expenses.labOrdersTotal + expenses.clinicNeedsTotal + expenses.inventoryExpenses

    // حساب الأرباح والخسائر
    const calculations = this.calculateProfitLoss(totalIncome, totalExpenses)

    // حساب التفاصيل الإضافية
    const details = {
      totalPatients: patients.length,
      totalAppointments: filteredAppointments.length,
      totalLabOrders: filteredLabOrders.length,
      totalClinicNeeds: filteredClinicNeeds.length,
      averageRevenuePerPatient: patients.length > 0 ? totalIncome / patients.length : 0,
      averageRevenuePerAppointment: filteredAppointments.length > 0 ? totalIncome / filteredAppointments.length : 0
    }

    // معلومات الفلترة
    const filterInfo = {
      dateRange: filter?.dateRange 
        ? `${filter.dateRange.startDate || 'البداية'} - ${filter.dateRange.endDate || 'النهاية'}`
        : 'جميع البيانات',
      totalRecords: payments.length + labOrders.length + clinicNeeds.length + appointments.length,
      filteredRecords: filteredPayments.length + filteredLabOrders.length + filteredClinicNeeds.length + filteredAppointments.length
    }

    return {
      revenue,
      expenses,
      calculations,
      details,
      filterInfo
    }
  }
}
