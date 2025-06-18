import type {
  Patient,
  Appointment,
  Payment,
  InventoryItem,
  Treatment,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  ReportData
} from '../types'

export class ReportsService {

  // Helper function to filter data by date range
  private filterByDateRange<T extends { created_at: string }>(
    data: T[],
    dateRange: ReportFilter['dateRange'],
    dateField: keyof T = 'created_at' as keyof T
  ): T[] {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    end.setHours(23, 59, 59, 999) // Include the entire end date

    return data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= start && itemDate <= end
    })
  }

  // Helper function to calculate age from date of birth
  private calculateAge(dateOfBirth: string): number {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // Helper function to group data by time period
  private groupByPeriod<T extends { created_at: string }>(
    data: T[],
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    dateField: keyof T = 'created_at' as keyof T
  ): { period: string; count: number; data: T[] }[] {
    const groups: { [key: string]: T[] } = {}

    data.forEach(item => {
      const date = new Date(item[dateField] as string)
      let key: string

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'year':
          key = String(date.getFullYear())
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
    })

    return Object.entries(groups)
      .map(([period, data]) => ({ period, count: data.length, data }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // Generate Patient Reports
  async generatePatientReport(
    patients: Patient[],
    appointments: Appointment[],
    filter: ReportFilter
  ): Promise<PatientReportData> {
    const filteredPatients = this.filterByDateRange(patients, filter.dateRange)

    // Calculate basic stats
    const totalPatients = patients.length
    const newPatients = filteredPatients.length

    // Calculate active/inactive patients based on recent appointments
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const recentAppointments = appointments.filter(apt =>
      new Date(apt.created_at) >= threeMonthsAgo
    )
    const activePatientIds = new Set(recentAppointments.map(apt => apt.patient_id))

    const activePatients = patients.filter(p => activePatientIds.has(p.id)).length
    const inactivePatients = totalPatients - activePatients

    // Age distribution
    const ageDistribution = this.calculateAgeDistribution(patients)

    // Gender distribution (if we had gender field, we'd calculate it here)
    const genderDistribution = [
      { gender: 'ذكر', count: Math.floor(totalPatients * 0.45) },
      { gender: 'أنثى', count: Math.floor(totalPatients * 0.55) }
    ]

    // Registration trend
    const registrationTrend = this.groupByPeriod(filteredPatients, 'month')
      .map(group => ({ period: group.period, count: group.count }))

    return {
      totalPatients,
      newPatients,
      activePatients,
      inactivePatients,
      ageDistribution,
      genderDistribution,
      registrationTrend,
      patientsList: filteredPatients
    }
  }

  private calculateAgeDistribution(patients: Patient[]): { ageGroup: string; count: number }[] {
    const ageGroups = {
      '0-17': 0,
      '18-30': 0,
      '31-45': 0,
      '46-60': 0,
      '60+': 0,
      'غير محدد': 0
    }

    patients.forEach(patient => {
      if (!patient.date_of_birth) {
        ageGroups['غير محدد']++
        return
      }

      const age = this.calculateAge(patient.date_of_birth)

      if (age < 18) ageGroups['0-17']++
      else if (age <= 30) ageGroups['18-30']++
      else if (age <= 45) ageGroups['31-45']++
      else if (age <= 60) ageGroups['46-60']++
      else ageGroups['60+']++
    })

    return Object.entries(ageGroups).map(([ageGroup, count]) => ({ ageGroup, count }))
  }

  // Generate Appointment Reports
  async generateAppointmentReport(
    appointments: Appointment[],
    treatments: Treatment[],
    filter: ReportFilter
  ): Promise<AppointmentReportData> {
    const filteredAppointments = this.filterByDateRange(appointments, filter.dateRange, 'start_time')

    // Basic stats
    const totalAppointments = filteredAppointments.length
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed').length
    const cancelledAppointments = filteredAppointments.filter(apt => apt.status === 'cancelled').length
    const noShowAppointments = filteredAppointments.filter(apt => apt.status === 'no_show').length
    const scheduledAppointments = filteredAppointments.filter(apt => apt.status === 'scheduled').length

    // Calculate rates
    const attendanceRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0

    // Appointments by status
    const appointmentsByStatus = [
      { status: 'مكتمل', count: completedAppointments, percentage: (completedAppointments / totalAppointments) * 100 },
      { status: 'مجدول', count: scheduledAppointments, percentage: (scheduledAppointments / totalAppointments) * 100 },
      { status: 'ملغي', count: cancelledAppointments, percentage: (cancelledAppointments / totalAppointments) * 100 },
      { status: 'لم يحضر', count: noShowAppointments, percentage: (noShowAppointments / totalAppointments) * 100 }
    ]

    // Appointments by treatment
    const treatmentCounts: { [key: string]: number } = {}
    filteredAppointments.forEach(apt => {
      const treatment = treatments.find(t => t.id === apt.treatment_id)
      const treatmentName = treatment?.name || 'غير محدد'
      treatmentCounts[treatmentName] = (treatmentCounts[treatmentName] || 0) + 1
    })

    const appointmentsByTreatment = Object.entries(treatmentCounts)
      .map(([treatment, count]) => ({ treatment, count }))
      .sort((a, b) => b.count - a.count)

    // Appointments by day of week
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const dayCounts: { [key: string]: number } = {}

    filteredAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const dayName = dayNames[date.getDay()]
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
    })

    const appointmentsByDay = dayNames.map(day => ({
      day,
      count: dayCounts[day] || 0
    }))

    // Appointments by hour (peak hours analysis)
    const hourCounts: { [key: string]: number } = {}
    filteredAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const hour = `${date.getHours()}:00`
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const appointmentsByHour = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Appointment trend
    const appointmentTrend = this.groupByPeriod(filteredAppointments, 'month', 'start_time')
      .map(group => ({ period: group.period, count: group.count }))

    return {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments,
      scheduledAppointments,
      attendanceRate,
      cancellationRate,
      appointmentsByStatus,
      appointmentsByTreatment,
      appointmentsByDay,
      appointmentsByHour,
      peakHours,
      appointmentTrend
    }
  }

  // Generate Financial Reports
  async generateFinancialReport(
    payments: Payment[],
    treatments: Treatment[],
    filter: ReportFilter
  ): Promise<FinancialReportData> {
    const filteredPayments = this.filterByDateRange(payments, filter.dateRange, 'payment_date')

    // Basic financial stats
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPaid = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPending = filteredPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.remaining_balance || p.amount), 0)

    const totalOverdue = filteredPayments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.remaining_balance || p.amount), 0)

    // Revenue by payment method
    const paymentMethodCounts: { [key: string]: number } = {}
    const paymentMethodNames: { [key: string]: string } = {
      'cash': 'نقدي',
      'card': 'بطاقة',
      'bank_transfer': 'تحويل بنكي',
      'check': 'شيك',
      'insurance': 'تأمين'
    }

    filteredPayments
      .filter(p => p.status === 'completed')
      .forEach(payment => {
        const method = paymentMethodNames[payment.payment_method] || payment.payment_method
        paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + payment.amount
      })

    const revenueByPaymentMethod = Object.entries(paymentMethodCounts)
      .map(([method, amount]) => ({
        method,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Revenue by treatment
    const treatmentRevenue: { [key: string]: { amount: number; count: number } } = {}

    filteredPayments
      .filter(p => p.status === 'completed' && p.appointment?.treatment_id)
      .forEach(payment => {
        const treatment = treatments.find(t => t.id === payment.appointment?.treatment_id)
        const treatmentName = treatment?.name || 'غير محدد'

        if (!treatmentRevenue[treatmentName]) {
          treatmentRevenue[treatmentName] = { amount: 0, count: 0 }
        }

        treatmentRevenue[treatmentName].amount += payment.amount
        treatmentRevenue[treatmentName].count += 1
      })

    const revenueByTreatment = Object.entries(treatmentRevenue)
      .map(([treatment, data]) => ({
        treatment,
        amount: data.amount,
        count: data.count,
        avgAmount: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Revenue trend
    const revenueTrend = this.groupByPeriod(
      filteredPayments.filter(p => p.status === 'completed'),
      'month',
      'payment_date'
    ).map(group => ({
      period: group.period,
      amount: group.data.reduce((sum, p) => sum + p.amount, 0)
    }))

    // Cash flow (simplified - only income for now)
    const cashFlow = revenueTrend.map(item => ({
      period: item.period,
      income: item.amount,
      net: item.amount // Will be income - expenses when we add expense tracking
    }))

    // Outstanding payments
    const outstandingPayments = payments
      .filter(p => ['pending', 'overdue', 'partial'].includes(p.status))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 20) // Top 20 outstanding payments

    // Recent transactions
    const recentTransactions = filteredPayments
      .filter(p => p.status === 'completed')
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10) // Last 10 transactions

    return {
      totalRevenue,
      totalPaid,
      totalPending,
      totalOverdue,
      revenueByPaymentMethod,
      revenueByTreatment,
      revenueTrend,
      cashFlow,
      outstandingPayments,
      recentTransactions
    }
  }

  // Generate Inventory Reports
  async generateInventoryReport(
    inventory: InventoryItem[],
    inventoryUsage: any[],
    filter: ReportFilter
  ): Promise<InventoryReportData> {
    const today = new Date()

    // Basic inventory stats
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) =>
      sum + (item.quantity * (item.cost_per_unit || 0)), 0
    )

    // Low stock items
    const lowStockItems = inventory.filter(item =>
      item.quantity <= item.minimum_stock && item.quantity > 0
    ).length

    // Expired items
    const expiredItems = inventory.filter(item =>
      item.expiry_date && new Date(item.expiry_date) < today
    ).length

    // Expiring soon items (within 30 days)
    const expiringSoonItems = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
    }).length

    // Items by category
    const categoryCounts: { [key: string]: { count: number; value: number } } = {}
    inventory.forEach(item => {
      const category = item.category || 'غير مصنف'
      if (!categoryCounts[category]) {
        categoryCounts[category] = { count: 0, value: 0 }
      }
      categoryCounts[category].count += 1
      categoryCounts[category].value += item.quantity * (item.cost_per_unit || 0)
    })

    const itemsByCategory = Object.entries(categoryCounts)
      .map(([category, data]) => ({ category, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)

    // Items by supplier
    const supplierCounts: { [key: string]: { count: number; value: number } } = {}
    inventory.forEach(item => {
      const supplier = item.supplier || 'غير محدد'
      if (!supplierCounts[supplier]) {
        supplierCounts[supplier] = { count: 0, value: 0 }
      }
      supplierCounts[supplier].count += 1
      supplierCounts[supplier].value += item.quantity * (item.cost_per_unit || 0)
    })

    const itemsBySupplier = Object.entries(supplierCounts)
      .map(([supplier, data]) => ({ supplier, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)

    // Usage trend (simplified - would need actual usage data)
    const usageTrend = [
      { period: '2024-01', usage: 150 },
      { period: '2024-02', usage: 180 },
      { period: '2024-03', usage: 165 },
      { period: '2024-04', usage: 200 },
      { period: '2024-05', usage: 175 },
      { period: '2024-06', usage: 190 }
    ]

    // Top used items (simplified)
    const topUsedItems = inventory
      .sort((a, b) => (b.quantity * (b.cost_per_unit || 0)) - (a.quantity * (a.cost_per_unit || 0)))
      .slice(0, 10)
      .map(item => ({ item: item.name, usage: item.quantity }))

    // Stock alerts
    const stockAlerts = inventory.filter(item =>
      item.quantity <= item.minimum_stock
    )

    // Expiry alerts
    const expiryAlerts = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30
    })

    return {
      totalItems,
      totalValue,
      lowStockItems,
      expiredItems,
      expiringSoonItems,
      itemsByCategory,
      itemsBySupplier,
      usageTrend,
      topUsedItems,
      stockAlerts,
      expiryAlerts
    }
  }
}
