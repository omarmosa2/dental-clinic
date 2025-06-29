import { Payment, Appointment, Patient, InventoryItem } from '@/types'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
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

    // المدفوعات المتأخرة (المدفوعات المعلقة التي تجاوز تاريخ دفعها 30 يوماً)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const overdueAmount = payments
      .filter(p => {
        if (p.status !== 'pending') return false

        const paymentDate = new Date(p.payment_date || p.created_at)
        return paymentDate < thirtyDaysAgo
      })
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

    // حساب إجمالي المبالغ المتبقية من الدفعات الجزئية
    const totalRemainingFromPartialPayments = payments
      .filter(p => p.status === 'partial')
      .reduce((sum, p) => {
        // استخدم remaining_balance إذا كان متوفراً، وإلا احسب الفرق
        const remaining = p.remaining_balance !== undefined
          ? validateAmount(p.remaining_balance)
          : (validateAmount(p.total_amount_due || p.amount) - validateAmount(p.amount_paid || p.amount))
        return sum + Math.max(0, remaining)
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
      totalRemainingFromPartialPayments: Math.round(totalRemainingFromPartialPayments * 100) / 100,
      outstandingBalance: Math.round((pendingAmount + overdueAmount + totalRemainingFromPartialPayments) * 100) / 100,
      paymentMethodStats,
      totalTransactions: payments.length,
      completedTransactions: payments.filter(p => p.status === 'completed').length,
      partialTransactions: payments.filter(p => p.status === 'partial').length,
      pendingTransactions: payments.filter(p => p.status === 'pending').length,
      overdueTransactions: payments.filter(p => p.status === 'pending' && new Date(p.payment_date || p.created_at) < thirtyDaysAgo).length
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
      sum + ((item.cost_per_unit || 0) * (item.quantity || 0)), 0)
    const lowStockItems = inventory.filter(item =>
      (item.quantity || 0) <= (item.minimum_stock || 0) && (item.quantity || 0) > 0).length
    const outOfStockItems = inventory.filter(item => (item.quantity || 0) === 0).length
    const expiredItems = inventory.filter(item => {
      if (!item.expiry_date) return false
      return new Date(item.expiry_date) < new Date()
    }).length
    const nearExpiryItems = inventory.filter(item => {
      if (!item.expiry_date) return false
      const expiryDate = new Date(item.expiry_date)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date()
    }).length

    return {
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockItems,
      outOfStockItems,
      expiredItems,
      nearExpiryItems
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
    csv += `المرضى النشطون,${this.getActivePatients(data.patients, data.appointments)}\n`
    csv += `متوسط عمر المرضى,${this.calculateAverageAge(data.patients)}\n`
    csv += `توزيع الجنس,${this.getGenderDistribution(data.patients)}\n\n`

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

    // إضافة المبالغ المتبقية من الدفعات الجزئية
    if (financialStats.totalRemainingFromPartialPayments > 0) {
      csv += `المبالغ المتبقية من الدفعات الجزئية,${formatCurrency(financialStats.totalRemainingFromPartialPayments)}\n`
    }

    csv += `الرصيد المستحق الإجمالي,${formatCurrency(financialStats.outstandingBalance)}\n`
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
    csv += `عناصر نفدت من المخزون,${inventoryStats.outOfStockItems}\n`
    csv += `عناصر منتهية الصلاحية,${inventoryStats.expiredItems}\n`
    csv += `عناصر قريبة الانتهاء (30 يوم),${inventoryStats.nearExpiryItems}\n\n`

    // تفاصيل المواعيد المفلترة
    if (data.appointments.length > 0) {
      csv += 'تفاصيل المواعيد المفلترة\n'
      csv += 'التاريخ,الوقت,اسم المريض,عنوان الموعد,نوع العلاج,التكلفة,الحالة,ملاحظات\n'
      data.appointments.forEach(appointment => {
        const appointmentDate = formatDate(appointment.start_time)
        const appointmentTime = new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
        const patientName = appointment.patient?.full_name || appointment.patient?.name || 'غير محدد'
        const title = appointment.title || 'غير محدد'
        const treatmentType = appointment.treatment_type || 'غير محدد'
        const cost = appointment.cost ? formatCurrency(appointment.cost) : '0'
        const status = this.getStatusInArabic(appointment.status)
        const notes = appointment.notes || ''

        csv += `"${appointmentDate}","${appointmentTime}","${patientName}","${title}","${treatmentType}","${cost}","${status}","${notes}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المدفوعات المفلترة
    if (data.payments.length > 0) {
      csv += 'تفاصيل المدفوعات المفلترة\n'
      csv += 'تاريخ الدفع,اسم المريض,الوصف,المبلغ,المبلغ المدفوع,الرصيد المتبقي,طريقة الدفع,الحالة,رقم الإيصال,ملاحظات\n'
      data.payments.forEach(payment => {
        const paymentDate = formatDate(payment.payment_date)
        const patientName = payment.patient?.full_name || payment.patient?.name || 'غير محدد'
        const description = payment.description || 'غير محدد'

        // حساب المبالغ بناءً على نوع الدفعة
        let totalAmount, amountPaid, remainingBalance

        if (payment.status === 'partial') {
          // للدفعات الجزئية: استخدم المبالغ المحسوبة من النظام
          totalAmount = formatCurrency(Number(payment.total_amount_due || payment.amount) || 0)
          amountPaid = formatCurrency(Number(payment.amount_paid || payment.amount) || 0)
          remainingBalance = formatCurrency(Number(payment.remaining_balance || 0))
        } else if (payment.appointment_id && payment.appointment_total_cost) {
          // للمدفوعات المرتبطة بمواعيد: استخدم بيانات الموعد
          totalAmount = formatCurrency(Number(payment.appointment_total_cost) || 0)
          amountPaid = formatCurrency(Number(payment.appointment_total_paid || payment.amount) || 0)
          remainingBalance = formatCurrency(Number(payment.appointment_remaining_balance || 0))
        } else {
          // للمدفوعات العادية
          totalAmount = formatCurrency(Number(payment.amount) || 0)
          amountPaid = formatCurrency(Number(payment.amount) || 0)
          remainingBalance = formatCurrency(0)
        }

        const method = this.getPaymentMethodInArabic(payment.payment_method)
        const status = this.getPaymentStatusInArabic(payment.status)
        const receiptNumber = payment.receipt_number || ''
        const notes = payment.notes || ''

        csv += `"${paymentDate}","${patientName}","${description}","${totalAmount}","${amountPaid}","${remainingBalance}","${method}","${status}","${receiptNumber}","${notes}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المخزون المفلتر
    if (data.inventory.length > 0) {
      csv += 'تفاصيل المخزون المفلتر\n'
      csv += 'اسم الصنف,الوصف,الفئة,الكمية,الوحدة,الحد الأدنى,تكلفة الوحدة,القيمة الإجمالية,المورد,تاريخ الانتهاء,الحالة,تاريخ الإنشاء\n'
      data.inventory.forEach(item => {
        const itemName = item.name || 'غير محدد'
        const description = item.description || 'غير محدد'
        const category = item.category || 'غير محدد'
        const quantity = item.quantity || 0
        const unit = item.unit || 'قطعة'
        const minStock = item.minimum_stock || 0
        const costPerUnit = formatCurrency(item.cost_per_unit || 0)
        const totalValue = formatCurrency((item.cost_per_unit || 0) * (item.quantity || 0))
        const supplier = item.supplier || 'غير محدد'
        const expiryDate = item.expiry_date ? formatDate(item.expiry_date) : 'غير محدد'
        const status = this.getInventoryStatusInArabic(item.quantity || 0, item.minimum_stock || 0)
        const createdDate = formatDate(item.created_at)

        csv += `"${itemName}","${description}","${category}","${quantity}","${unit}","${minStock}","${costPerUnit}","${totalValue}","${supplier}","${expiryDate}","${status}","${createdDate}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المرضى (عينة من أحدث المرضى)
    if (data.patients.length > 0) {
      csv += 'تفاصيل المرضى (أحدث 50 مريض)\n'
      csv += 'الرقم التسلسلي,الاسم الكامل,رقم الهاتف,العمر,الجنس,الحالة الطبية,الحساسية,البريد الإلكتروني,العنوان,تاريخ التسجيل,آخر موعد,إجمالي المواعيد,إجمالي المدفوعات,الرصيد المتبقي,ملاحظات\n'

      // ترتيب المرضى حسب تاريخ الإنشاء (الأحدث أولاً) وأخذ أول 50
      const recentPatients = [...data.patients]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50)

      recentPatients.forEach(patient => {
        const serialNumber = patient.serial_number || 'غير محدد'
        const fullName = patient.full_name || patient.name || 'غير محدد'
        const phone = patient.phone || 'غير محدد'
        const age = patient.age || 'غير محدد'
        const gender = patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد'
        const patientCondition = patient.patient_condition || 'غير محدد'
        const allergies = patient.allergies || 'لا يوجد'
        const email = patient.email || 'غير محدد'
        const address = patient.address || 'غير محدد'
        const registrationDate = formatDate(patient.created_at)
        const notes = patient.notes || 'لا يوجد'

        // حساب إحصائيات المريض من البيانات المفلترة
        const patientAppointments = data.appointments.filter(apt => apt.patient_id === patient.id)
        const patientPayments = data.payments.filter(pay => pay.patient_id === patient.id)

        const lastAppointment = patientAppointments.length > 0
          ? formatDate(patientAppointments.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time)
          : 'لا يوجد'

        const totalAppointments = patientAppointments.length

        // حساب إجمالي المدفوعات والمبالغ المتبقية للمريض
        let totalPayments = 0
        let totalRemaining = 0

        // حساب المبالغ بالطريقة الصحيحة
        let patientTotalDue = 0
        let patientTotalPaid = 0

        // حساب المدفوعات المرتبطة بالمواعيد
        patientAppointments.forEach(appointment => {
          if (appointment.cost) {
            const appointmentPayments = patientPayments.filter(p => p.appointment_id === appointment.id)
            const appointmentTotalPaid = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
            patientTotalDue += appointment.cost
            patientTotalPaid += appointmentTotalPaid
          }
        })

        // إضافة المدفوعات العامة غير المرتبطة بمواعيد
        const generalPayments = patientPayments.filter(payment => !payment.appointment_id)
        generalPayments.forEach(payment => {
          patientTotalPaid += payment.amount || 0
          if (payment.total_amount_due) {
            patientTotalDue += payment.total_amount_due
          }
        })

        totalPayments += patientTotalPaid
        totalRemaining += Math.max(0, patientTotalDue - patientTotalPaid)

        csv += `"${serialNumber}","${fullName}","${phone}","${age}","${gender}","${patientCondition}","${allergies}","${email}","${address}","${registrationDate}","${lastAppointment}","${totalAppointments}","${formatCurrency(totalPayments)}","${formatCurrency(totalRemaining)}","${notes}"\n`
      })
      csv += '\n'
    }

    // ملخص إضافي للطبيب
    csv += 'ملخص إضافي للطبيب\n'
    csv += `متوسط قيمة الموعد,${appointmentStats.total > 0 ? formatCurrency(financialStats.totalRevenue / appointmentStats.total) : '0'}\n`
    csv += `متوسط المدفوعات اليومية,${this.calculateDailyAverage(data.payments, financialStats.totalRevenue)}\n`
    csv += `نسبة المدفوعات المكتملة,${financialStats.totalTransactions > 0 ? Math.round((financialStats.completedTransactions / financialStats.totalTransactions) * 100) : 0}%\n`
    csv += `نسبة المدفوعات الجزئية,${financialStats.totalTransactions > 0 ? Math.round((financialStats.partialTransactions / financialStats.totalTransactions) * 100) : 0}%\n`
    csv += `نسبة الإلغاء,${appointmentStats.total > 0 ? Math.round((appointmentStats.cancelled / appointmentStats.total) * 100) : 0}%\n`
    csv += `متوسط عدد المواعيد لكل مريض,${data.patients.length > 0 ? Math.round((appointmentStats.total / data.patients.length) * 100) / 100 : 0}\n`
    csv += `متوسط الإيرادات لكل مريض,${data.patients.length > 0 ? formatCurrency(financialStats.totalRevenue / data.patients.length) : '0'}\n\n`

    // تحليلات متقدمة للطبيب
    csv += 'تحليلات متقدمة\n'

    // تحليل الأداء المالي
    const totalExpectedRevenue = data.appointments.reduce((sum, apt) => sum + (apt.cost || 0), 0)
    const collectionRate = totalExpectedRevenue > 0 ? Math.round((financialStats.totalRevenue / totalExpectedRevenue) * 100) : 0
    csv += `معدل التحصيل,${collectionRate}%\n`

    // تحليل أنواع العلاج
    const treatmentTypes = this.analyzeTreatmentTypes(data.appointments)
    csv += `أكثر أنواع العلاج طلباً,${treatmentTypes.mostCommon}\n`
    csv += `أعلى أنواع العلاج قيمة,${treatmentTypes.highestValue}\n`

    // تحليل الأوقات
    const timeAnalysis = this.analyzeAppointmentTimes(data.appointments)
    csv += `أكثر الأوقات ازدحاماً,${timeAnalysis.peakHour}\n`
    csv += `أكثر الأيام ازدحاماً,${timeAnalysis.peakDay}\n`

    // تحليل المرضى
    const patientAnalysis = this.analyzePatients(data.patients, data.appointments, data.payments)
    csv += `أكثر المرضى زيارة,${patientAnalysis.mostFrequent}\n`
    csv += `أعلى المرضى إنفاقاً,${patientAnalysis.highestSpender}\n`

    // توصيات للطبيب
    csv += '\nتوصيات للطبيب\n'
    if (appointmentStats.attendanceRate < 80) {
      csv += `توصية,تحسين معدل الحضور - النسبة الحالية ${appointmentStats.attendanceRate}% منخفضة\n`
    }
    if (collectionRate < 90) {
      csv += `توصية,تحسين معدل التحصيل - النسبة الحالية ${collectionRate}% منخفضة\n`
    }
    if (financialStats.partialTransactions > financialStats.completedTransactions) {
      csv += `توصية,متابعة المدفوعات الجزئية - ${financialStats.partialTransactions} معاملة جزئية مقابل ${financialStats.completedTransactions} مكتملة\n`
    }
    if (inventoryStats.lowStockItems > 0) {
      csv += `توصية,تجديد المخزون - ${inventoryStats.lowStockItems} صنف منخفض المخزون\n`
    }
    if (inventoryStats.expiredItems > 0) {
      csv += `توصية,إزالة المواد المنتهية الصلاحية - ${inventoryStats.expiredItems} صنف منتهي الصلاحية\n`
    }
    if (inventoryStats.nearExpiryItems > 0) {
      csv += `توصية,استخدام المواد قريبة الانتهاء - ${inventoryStats.nearExpiryItems} صنف ينتهي خلال 30 يوم\n`
    }
    if (appointmentStats.cancelled > appointmentStats.completed * 0.2) {
      csv += `توصية,تقليل معدل الإلغاء - ${appointmentStats.cancelled} موعد ملغي من أصل ${appointmentStats.total}\n`
    }
    if (financialStats.overdueAmount > financialStats.totalRevenue * 0.1) {
      csv += `توصية,متابعة المدفوعات المتأخرة - ${formatCurrency(financialStats.overdueAmount)} مبلغ متأخر\n`
    }

    return csv
  }

  /**
   * ترجمة حالة الموعد إلى العربية
   */
  private static getStatusInArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'لم يحضر',
      'confirmed': 'مؤكد',
      'pending': 'معلق'
    }
    return statusMap[status] || status
  }

  /**
   * ترجمة طريقة الدفع إلى العربية
   */
  private static getPaymentMethodInArabic(method: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'credit_card': 'بطاقة ائتمان',
      'debit_card': 'بطاقة خصم'
    }
    return methodMap[method] || method
  }

  /**
   * ترجمة حالة الدفع إلى العربية
   */
  private static getPaymentStatusInArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completed': 'مكتمل',
      'partial': 'جزئي',
      'pending': 'معلق',
      'overdue': 'متأخر',
      'failed': 'فاشل',
      'refunded': 'مسترد'
    }
    return statusMap[status] || status
  }

  /**
   * تحديد حالة المخزون بالعربية
   */
  private static getInventoryStatusInArabic(quantity: number, minStock: number): string {
    if (quantity === 0) return 'نفد من المخزون'
    if (quantity <= minStock) return 'منخفض المخزون'
    return 'متوفر'
  }

  /**
   * حساب متوسط المدفوعات اليومية
   */
  private static calculateDailyAverage(payments: Payment[], totalRevenue: number): string {
    if (payments.length === 0) return '0'

    // حساب عدد الأيام الفريدة
    const uniqueDays = new Set(
      payments.map(p => p.payment_date.split('T')[0])
    ).size

    if (uniqueDays === 0) return '0'

    const dailyAverage = totalRevenue / uniqueDays
    return formatCurrency(dailyAverage)
  }

  /**
   * حساب العمر من تاريخ الميلاد
   */
  private static calculateAge(dateOfBirth: string): string {
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return age.toString()
    } catch (error) {
      return 'غير محدد'
    }
  }

  /**
   * حساب متوسط عمر المرضى
   */
  private static calculateAverageAge(patients: Patient[]): string {
    if (patients.length === 0) return '0'

    const totalAge = patients.reduce((sum, patient) => {
      const age = typeof patient.age === 'number' ? patient.age : 0
      return sum + age
    }, 0)

    const averageAge = totalAge / patients.length
    return Math.round(averageAge).toString()
  }

  /**
   * حساب توزيع الجنس
   */
  private static getGenderDistribution(patients: Patient[]): string {
    if (patients.length === 0) return 'لا يوجد بيانات'

    const maleCount = patients.filter(p => p.gender === 'male').length
    const femaleCount = patients.filter(p => p.gender === 'female').length
    const malePercentage = Math.round((maleCount / patients.length) * 100)
    const femalePercentage = Math.round((femaleCount / patients.length) * 100)

    return `ذكور: ${maleCount} (${malePercentage}%) - إناث: ${femaleCount} (${femalePercentage}%)`
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
   * تحليل أنواع العلاج
   */
  private static analyzeTreatmentTypes(appointments: Appointment[]) {
    const treatmentStats: { [key: string]: { count: number, totalValue: number } } = {}

    appointments.forEach(apt => {
      // استخدام title أو treatment_type
      const treatment = apt.title || apt.treatment_type || 'غير محدد'
      if (!treatmentStats[treatment]) {
        treatmentStats[treatment] = { count: 0, totalValue: 0 }
      }
      treatmentStats[treatment].count++
      treatmentStats[treatment].totalValue += apt.cost || 0
    })

    const sortedByCount = Object.entries(treatmentStats)
      .sort((a, b) => b[1].count - a[1].count)

    const sortedByValue = Object.entries(treatmentStats)
      .sort((a, b) => b[1].totalValue - a[1].totalValue)

    return {
      mostCommon: sortedByCount.length > 0 ? `${sortedByCount[0][0]} (${sortedByCount[0][1].count} مرة)` : 'لا يوجد',
      highestValue: sortedByValue.length > 0 ? `${sortedByValue[0][0]} (${formatCurrency(sortedByValue[0][1].totalValue)})` : 'لا يوجد'
    }
  }

  /**
   * تحليل أوقات المواعيد
   */
  private static analyzeAppointmentTimes(appointments: Appointment[]) {
    const hourStats: { [key: string]: number } = {}
    const dayStats: { [key: string]: number } = {}

    appointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const hour = date.getHours()
      const day = date.toLocaleDateString('ar-SA', { weekday: 'long' })

      hourStats[hour] = (hourStats[hour] || 0) + 1
      dayStats[day] = (dayStats[day] || 0) + 1
    })

    const peakHour = Object.entries(hourStats)
      .sort((a, b) => b[1] - a[1])[0]

    const peakDay = Object.entries(dayStats)
      .sort((a, b) => b[1] - a[1])[0]

    return {
      peakHour: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} موعد)` : 'لا يوجد',
      peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]} موعد)` : 'لا يوجد'
    }
  }

  /**
   * تحليل المرضى
   */
  private static analyzePatients(patients: Patient[], appointments: Appointment[], payments: Payment[]) {
    const patientStats: { [key: string]: { name: string, appointmentCount: number, totalPayments: number } } = {}

    // حساب إحصائيات كل مريض
    patients.forEach(patient => {
      const patientAppointments = appointments.filter(apt => apt.patient_id === patient.id)
      const patientPayments = payments.filter(pay => pay.patient_id === patient.id)

      const totalPayments = patientPayments.reduce((sum, payment) => {
        const amount = payment.status === 'partial' && payment.amount_paid !== undefined
          ? Number(payment.amount_paid)
          : Number(payment.amount)
        return sum + amount
      }, 0)

      patientStats[patient.id] = {
        name: patient.full_name || patient.name || 'غير محدد',
        appointmentCount: patientAppointments.length,
        totalPayments
      }
    })

    const sortedByAppointments = Object.values(patientStats)
      .sort((a, b) => b.appointmentCount - a.appointmentCount)

    const sortedByPayments = Object.values(patientStats)
      .sort((a, b) => b.totalPayments - a.totalPayments)

    return {
      mostFrequent: sortedByAppointments.length > 0
        ? `${sortedByAppointments[0].name} (${sortedByAppointments[0].appointmentCount} موعد)`
        : 'لا يوجد',
      highestSpender: sortedByPayments.length > 0
        ? `${sortedByPayments[0].name} (${formatCurrency(sortedByPayments[0].totalPayments)})`
        : 'لا يوجد'
    }
  }

  /**
   * تصدير التقرير الشامل المحسن
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

      // حساب الإحصائيات الشاملة
      const comprehensiveStats = this.calculateComprehensiveStats(data)

      const csvContent = this.generateEnhancedComprehensiveCSV({
        patients: data.patients,
        appointments: data.filteredAppointments,
        payments: data.filteredPayments,
        inventory: data.filteredInventory,
        filterInfo: data.filterInfo,
        stats: comprehensiveStats
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)

      // إنشاء اسم ملف وصفي مع التاريخ والوقت ومعلومات الفلترة
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')

      let fileName = `التقرير_الشامل_المفصل_${dateStr}_${timeStr}`

      // إضافة معلومات الفلترة لاسم الملف
      const hasFilters = data.filterInfo.appointmentFilter !== 'جميع البيانات' ||
                        data.filterInfo.paymentFilter !== 'جميع البيانات' ||
                        data.filterInfo.inventoryFilter !== 'جميع البيانات'

      if (hasFilters) {
        fileName += '_مفلتر'
      }

      fileName += '.csv'

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

  /**
   * حساب الإحصائيات الشاملة
   */
  private static calculateComprehensiveStats(data: {
    patients: Patient[]
    filteredAppointments: Appointment[]
    filteredPayments: Payment[]
    filteredInventory: InventoryItem[]
  }) {
    const financialStats = this.calculateFinancialStats(data.filteredPayments)

    return {
      totalPatients: data.patients.length,
      totalAppointments: data.filteredAppointments.length,
      totalPayments: data.filteredPayments.length,
      totalInventoryItems: data.filteredInventory.length,
      ...financialStats,
      appointmentsByStatus: this.groupByStatus(data.filteredAppointments, 'status'),
      paymentsByMethod: this.groupByMethod(data.filteredPayments),
      inventoryByCategory: this.groupByCategory(data.filteredInventory)
    }
  }

  /**
   * تجميع حسب الحالة
   */
  private static groupByStatus(items: any[], statusField: string) {
    return items.reduce((acc, item) => {
      const status = item[statusField] || 'غير محدد'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
  }

  /**
   * تجميع المدفوعات حسب طريقة الدفع
   */
  private static groupByMethod(payments: Payment[]) {
    return payments.reduce((acc, payment) => {
      const method = payment.payment_method || 'غير محدد'
      acc[method] = (acc[method] || 0) + 1
      return acc
    }, {})
  }

  /**
   * تجميع المخزون حسب الفئة
   */
  private static groupByCategory(inventory: InventoryItem[]) {
    return inventory.reduce((acc, item) => {
      const category = item.category || 'غير محدد'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
  }

  /**
   * توليد CSV شامل محسن
   */
  private static generateEnhancedComprehensiveCSV(data: {
    patients: Patient[]
    appointments: Appointment[]
    payments: Payment[]
    inventory: InventoryItem[]
    filterInfo: any
    stats: any
  }): string {
    let csv = '\uFEFF' // BOM for Arabic support

    // عنوان التقرير
    csv += 'التقرير الشامل المفصل للعيادة\n'
    csv += `تاريخ التقرير,${new Date().toLocaleDateString('ar-SA')}\n`
    csv += `وقت التقرير,${new Date().toLocaleTimeString('ar-SA')}\n\n`

    // معلومات الفلترة
    csv += 'معلومات الفلترة المطبقة\n'
    csv += `فلتر المواعيد,${data.filterInfo.appointmentFilter}\n`
    csv += `فلتر المدفوعات,${data.filterInfo.paymentFilter}\n`
    csv += `فلتر المخزون,${data.filterInfo.inventoryFilter}\n\n`

    // الإحصائيات العامة
    csv += 'الإحصائيات العامة\n'
    csv += `إجمالي المرضى,${data.stats.totalPatients}\n`
    csv += `إجمالي المواعيد المفلترة,${data.stats.totalAppointments}\n`
    csv += `إجمالي المدفوعات المفلترة,${data.stats.totalPayments}\n`
    csv += `إجمالي عناصر المخزون المفلترة,${data.stats.totalInventoryItems}\n`
    csv += `إجمالي الإيرادات,${formatCurrency(data.stats.totalRevenue)}\n`
    csv += `المبالغ المعلقة,${formatCurrency(data.stats.pendingAmount)}\n`
    csv += `المبالغ المتبقية,${formatCurrency(data.stats.totalRemainingBalance)}\n\n`

    // توزيع المواعيد حسب الحالة
    csv += 'توزيع المواعيد حسب الحالة\n'
    Object.entries(data.stats.appointmentsByStatus).forEach(([status, count]) => {
      csv += `${status},${count}\n`
    })
    csv += '\n'

    // توزيع المدفوعات حسب طريقة الدفع
    csv += 'توزيع المدفوعات حسب طريقة الدفع\n'
    Object.entries(data.stats.paymentsByMethod).forEach(([method, count]) => {
      csv += `${method},${count}\n`
    })
    csv += '\n'

    // توزيع المخزون حسب الفئة
    csv += 'توزيع المخزون حسب الفئة\n'
    Object.entries(data.stats.inventoryByCategory).forEach(([category, count]) => {
      csv += `${category},${count}\n`
    })
    csv += '\n'

    // تفاصيل المدفوعات
    if (data.payments.length > 0) {
      csv += 'تفاصيل المدفوعات المفلترة\n'
      csv += 'رقم الإيصال,المريض,المبلغ,طريقة الدفع,الحالة,تاريخ الدفع,الوصف\n'
      data.payments.forEach(payment => {
        const patientName = data.patients.find(p => p.id === payment.patient_id)?.full_name || 'غير محدد'
        csv += `"${payment.receipt_number || `#${payment.id.slice(-6)}`}","${patientName}","${formatCurrency(payment.amount)}","${payment.payment_method}","${payment.status}","${formatDate(payment.payment_date)}","${payment.description || '-'}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المواعيد
    if (data.appointments.length > 0) {
      csv += 'تفاصيل المواعيد المفلترة\n'
      csv += 'المريض,العنوان,التاريخ,الوقت,الحالة,التكلفة\n'
      data.appointments.forEach(appointment => {
        const patientName = data.patients.find(p => p.id === appointment.patient_id)?.full_name || 'غير محدد'
        csv += `"${patientName}","${appointment.title || '-'}","${formatDate(appointment.start_time)}","${formatTime(appointment.start_time)}","${appointment.status}","${formatCurrency(appointment.cost || 0)}"\n`
      })
      csv += '\n'
    }

    // تفاصيل المخزون
    if (data.inventory.length > 0) {
      csv += 'تفاصيل المخزون المفلتر\n'
      csv += 'اسم المنتج,الفئة,الكمية,السعر,تاريخ الانتهاء,الحالة\n'
      data.inventory.forEach(item => {
        csv += `"${item.name}","${item.category || '-'}","${item.quantity}","${formatCurrency(item.price || 0)}","${item.expiry_date ? formatDate(item.expiry_date) : '-'}","${item.status || '-'}"\n`
      })
    }

    return csv
  }
}
