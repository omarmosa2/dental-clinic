/**
 * Financial Reports - التقارير المالية تستخدم التقويم الميلادي فقط
 * All financial charts use ONLY Gregorian calendar system
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReportsStore } from '@/store/reportsStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { formatCurrency, formatDate, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue, parseAndFormatGregorianMonth } from '@/lib/utils'
import { validateNumericData, processFinancialData, groupDataByPeriod, ensurePaymentStatusData, ensurePaymentMethodData } from '@/lib/chartDataHelpers'
import { validatePayments, validateMonthlyRevenue, validatePaymentMethodStats, sanitizeFinancialResult } from '@/utils/dataValidation'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
import { ComprehensiveExportService } from '@/services/comprehensiveExportService'
import { notify } from '@/services/notificationService'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import PaymentDebug from '../debug/PaymentDebug'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CreditCard,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Receipt
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

/**
 * إنشاء تقرير مالي شامل CSV مع جميع الأمور المالية
 */
async function generateComprehensiveFinancialCSV(payments: any[], timeFilter: any): Promise<string> {
  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  // حساب الإحصائيات المالية الشاملة
  const financialStats = ComprehensiveExportService.calculateFinancialStats(payments)

  let csv = '\uFEFF' // UTF-8 BOM for proper Arabic display
  csv += 'التقرير المالي الشامل\n'
  csv += '===================\n\n'

  // معلومات الفترة الزمنية
  csv += 'معلومات التقرير\n'
  csv += '================\n'
  csv += `تاريخ التقرير,${formatDate(new Date().toISOString())}\n`
  csv += `وقت التقرير,${new Date().toLocaleTimeString('ar-SA')}\n`

  if (timeFilter.startDate && timeFilter.endDate) {
    csv += `الفترة الزمنية,من ${timeFilter.startDate} إلى ${timeFilter.endDate}\n`
  } else {
    csv += `الفترة الزمنية,جميع البيانات\n`
  }
  csv += `عدد المعاملات,${payments.length}\n\n`

  // === الإحصائيات المالية الرئيسية ===
  csv += 'الإحصائيات المالية الرئيسية\n'
  csv += '============================\n'
  csv += `إجمالي الإيرادات,${formatCurrency(financialStats.totalRevenue)}\n`
  csv += `المدفوعات المكتملة,${formatCurrency(financialStats.completedPayments)}\n`
  csv += `المدفوعات الجزئية,${formatCurrency(financialStats.partialPayments)}\n`
  csv += `المبالغ المتبقية,${formatCurrency(financialStats.remainingBalances)}\n`
  csv += `المبالغ المعلقة,${formatCurrency(financialStats.pendingAmount)}\n\n`

  // === تحليل الأرباح والخسائر ===
  csv += 'تحليل الأرباح والخسائر\n'
  csv += '====================\n'
  csv += `صافي الربح,${formatCurrency(financialStats.netProfit || 0)}\n`
  csv += `مبلغ الخسارة,${formatCurrency(financialStats.lossAmount || 0)}\n`
  csv += `هامش الربح,${(financialStats.profitMargin || 0).toFixed(2)}%\n`
  csv += `حالة الأرباح,${financialStats.isProfit ? 'ربح' : 'خسارة'}\n`
  csv += `إجمالي المصروفات,${formatCurrency(financialStats.totalExpenses || 0)}\n\n`

  // === تفصيل المصروفات ===
  csv += 'تفصيل المصروفات\n'
  csv += '================\n'
  csv += `مصروفات المخابر,${formatCurrency(financialStats.labOrdersTotal || 0)}\n`
  csv += `متبقي المخابر,${formatCurrency(financialStats.labOrdersRemaining || 0)}\n`
  csv += `مصروفات الاحتياجات,${formatCurrency(financialStats.clinicNeedsTotal || 0)}\n`
  csv += `متبقي الاحتياجات,${formatCurrency(financialStats.clinicNeedsRemaining || 0)}\n`
  csv += `مصروفات المخزون,${formatCurrency(financialStats.inventoryExpenses || 0)}\n\n`

  // === إحصائيات المعاملات ===
  csv += 'إحصائيات المعاملات\n'
  csv += '==================\n'
  csv += `إجمالي المعاملات,${financialStats.totalTransactions}\n`
  csv += `المعاملات المكتملة,${financialStats.completedTransactions}\n`
  csv += `المعاملات الجزئية,${financialStats.partialTransactions}\n`
  csv += `المعاملات المعلقة,${financialStats.pendingTransactions}\n\n`

  // === تحليل طرق الدفع ===
  csv += 'تحليل طرق الدفع\n'
  csv += '================\n'
  const paymentMethods = {}
  payments.forEach(payment => {
    const method = payment.payment_method || 'غير محدد'
    const methodArabic = method === 'cash' ? 'نقدي' :
                        method === 'card' ? 'بطاقة ائتمان' :
                        method === 'bank_transfer' ? 'تحويل بنكي' :
                        method === 'check' ? 'شيك' :
                        method === 'insurance' ? 'تأمين' : method

    let amount = 0
    if (payment.status === 'completed') {
      amount = validateAmount(payment.amount)
    } else if (payment.status === 'partial' && payment.amount_paid !== undefined) {
      amount = validateAmount(payment.amount_paid)
    }

    if (amount > 0) {
      paymentMethods[methodArabic] = (paymentMethods[methodArabic] || 0) + amount
    }
  })

  Object.entries(paymentMethods).forEach(([method, amount]) => {
    const percentage = financialStats.totalRevenue > 0 ? ((amount as number) / financialStats.totalRevenue * 100).toFixed(2) : '0.00'
    csv += `${method},${formatCurrency(amount as number)} (${percentage}%)\n`
  })
  csv += '\n'

  // === تفاصيل المدفوعات الفردية ===
  if (payments.length <= 100) { // عرض التفاصيل فقط إذا كان العدد معقول
    csv += 'تفاصيل المدفوعات الفردية\n'
    csv += '=========================\n'
    csv += 'رقم الإيصال,المريض,المبلغ,المبلغ المدفوع,طريقة الدفع,الحالة,تاريخ الدفع,الوصف,ملاحظات\n'

    payments.forEach(payment => {
      const receiptNumber = payment.receipt_number || `#${payment.id?.slice(-6) || 'N/A'}`
      const patientName = payment.patient?.full_name || payment.patient_name || 'غير محدد'
      const amount = formatCurrency(payment.amount || 0)
      const amountPaid = payment.amount_paid ? formatCurrency(payment.amount_paid) : amount
      const paymentMethod = payment.payment_method === 'cash' ? 'نقدي' :
                           payment.payment_method === 'card' ? 'بطاقة ائتمان' :
                           payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                           payment.payment_method === 'check' ? 'شيك' :
                           payment.payment_method === 'insurance' ? 'تأمين' :
                           payment.payment_method || 'غير محدد'
      const status = payment.status === 'completed' ? 'مكتمل' :
                    payment.status === 'partial' ? 'جزئي' :
                    payment.status === 'pending' ? 'معلق' :
                    payment.status === 'failed' ? 'فاشل' :
                    payment.status === 'refunded' ? 'مسترد' : payment.status || 'غير محدد'
      const paymentDate = payment.payment_date ? formatDate(payment.payment_date) : 'غير محدد'
      const description = (payment.description || '').replace(/,/g, '؛')
      const notes = (payment.notes || '').replace(/,/g, '؛')

      csv += `"${receiptNumber}","${patientName}",${amount},${amountPaid},"${paymentMethod}","${status}",${paymentDate},"${description}","${notes}"\n`
    })
  }

  return csv
}

/**
 * إنشاء بيانات التقرير المالي الشامل للـ PDF
 */
async function generateComprehensiveFinancialData(payments: any[], timeFilter: any, labOrders?: any[], clinicNeeds?: any[], inventoryItems?: any[]): Promise<any> {
  const validateAmount = (amount: any): number => {
    const num = Number(amount)
    return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
  }

  // حساب الإحصائيات المالية الشاملة مع جميع المصادر
  const financialStats = ComprehensiveExportService.calculateFinancialStats(payments, labOrders, clinicNeeds, inventoryItems)

  // حساب إحصائيات طرق الدفع - استخدام نفس المنطق المتسق
  const paymentMethodStats = {}

  payments.forEach(payment => {
    const method = payment.payment_method || 'unknown'
    // استخدام amount (مبلغ الدفعة الحالية) لجميع الحالات
    const amount = validateAmount(payment.amount)

    if (amount > 0 && (payment.status === 'completed' || payment.status === 'partial')) {
      paymentMethodStats[method] = (paymentMethodStats[method] || 0) + amount
    }
  })

  console.log('Payment method stats calculation:', { paymentsLength: payments.length, paymentMethodStats })

  return {
    // الإحصائيات الأساسية
    totalRevenue: financialStats.totalRevenue,
    totalPaid: financialStats.completedPayments + financialStats.partialPayments,
    totalPending: financialStats.pendingAmount,
    totalOverdue: financialStats.remainingBalances,

    // تفصيل المدفوعات
    completedPayments: payments.filter(p => p.status === 'completed').length,
    partialPayments: payments.filter(p => p.status === 'partial').length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    failedPayments: payments.filter(p => p.status === 'failed').length,

    // الأرباح والخسائر
    netProfit: financialStats.netProfit || 0,
    lossAmount: financialStats.lossAmount || 0,
    profitMargin: financialStats.profitMargin || 0,
    isProfit: financialStats.isProfit,
    totalExpenses: financialStats.totalExpenses || 0,

    // تفصيل المصروفات
    labOrdersTotal: financialStats.labOrdersTotal || 0,
    labOrdersRemaining: financialStats.labOrdersRemaining || 0,
    clinicNeedsTotal: financialStats.clinicNeedsTotal || 0,
    clinicNeedsRemaining: financialStats.clinicNeedsRemaining || 0,
    inventoryExpenses: financialStats.inventoryExpenses || 0,

    // طرق الدفع
    revenueByPaymentMethod: Object.entries(paymentMethodStats).map(([method, amount]) => ({
      method: method === 'cash' ? 'نقدي' :
              method === 'card' ? 'بطاقة ائتمان' :
              method === 'bank_transfer' ? 'تحويل بنكي' :
              method === 'check' ? 'شيك' :
              method === 'insurance' ? 'تأمين' : method,
      amount: validateAmount(amount),
      percentage: financialStats.totalRevenue > 0 ? (validateAmount(amount) / financialStats.totalRevenue) * 100 : 0
    })),

    // معلومات الفلترة
    filterInfo: timeFilter.startDate && timeFilter.endDate
      ? `البيانات المفلترة من ${timeFilter.startDate} إلى ${timeFilter.endDate}`
      : 'جميع البيانات المالية',
    dataCount: payments.length,
    totalTransactions: payments.length,
    successRate: payments.length > 0 ? ((payments.filter(p => p.status === 'completed' || p.status === 'partial').length) / payments.length * 100).toFixed(1) : '0.0',
    averageTransaction: payments.length > 0 ? (financialStats.totalRevenue / payments.length).toFixed(2) : '0.00',

    // تفاصيل المدفوعات
    payments: payments.map(payment => ({
      id: payment.id,
      receipt_number: payment.receipt_number || `#${payment.id?.slice(-6) || 'N/A'}`,
      patient_name: payment.patient?.full_name || payment.patient_name || 'غير محدد',
      amount: payment.amount,
      amount_paid: payment.amount_paid,
      payment_method: payment.payment_method,
      status: payment.status,
      payment_date: payment.payment_date,
      description: payment.description,
      notes: payment.notes
    }))
  }
}

export default function FinancialReports() {
  const { financialReports, isLoading, isExporting, generateReport, clearCache } = useReportsStore()
  const {
    payments,
    totalRevenue,
    pendingAmount,
    overdueAmount,
    paymentMethodStats,
    monthlyRevenue,
    loadPayments
  } = usePaymentStore()
  const { inventoryItems, loadItems } = useInventoryStore()
  const { labOrders, loadLabOrders } = useLabOrderStore()
  const { clinicNeeds, loadNeeds } = useClinicNeedsStore()
  const { currency, settings } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Time filtering for payments
  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  // Use real-time reports hook for automatic updates
  useRealTimeReportsByType('financial')

  useEffect(() => {
    generateReport('financial')
    loadPayments()
    loadItems()
    loadLabOrders()
    loadNeeds()
  }, [generateReport, loadPayments, loadItems, loadLabOrders, loadNeeds])

  // Validate payments data on load
  useEffect(() => {
    if (payments.length > 0) {
      const validation = validatePayments(payments)
      if (validation.totalErrors > 0) {
        console.warn(`Found ${validation.totalErrors} errors in ${validation.invalidPayments.length} payments`)
      }
      if (validation.totalWarnings > 0) {
        console.warn(`Found ${validation.totalWarnings} warnings in payment data`)
      }
    }
  }, [payments])



  // Use data from reports service if available, otherwise fallback to store data
  // Always use filtered data for accurate statistics
  const getReportData = () => {
    // Use filtered data from paymentStats for accurate calculations
    const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

    // Validate payments first
    const validation = validatePayments(dataToUse)
    const validPayments = validation.validPayments

    if (financialReports && paymentStats.timeFilter.preset === 'all' &&
        (!paymentStats.timeFilter.startDate || !paymentStats.timeFilter.endDate)) {
      // Only use reports service data when no filter is applied
      return {
        totalRevenue: sanitizeFinancialResult(financialReports.totalRevenue),
        totalPaid: sanitizeFinancialResult(financialReports.totalPaid),
        totalPending: sanitizeFinancialResult(financialReports.totalPending),
        totalOverdue: sanitizeFinancialResult(financialReports.totalOverdue),
        revenueByPaymentMethod: financialReports.revenueByPaymentMethod || {},
        revenueTrend: financialReports.revenueTrend || [],
        recentTransactions: financialReports.recentTransactions || [],
        outstandingPayments: financialReports.outstandingPayments || []
      }
    }

    // Calculate from filtered data for accurate statistics
    const completedPayments = validPayments.filter(p => p.status === 'completed')
    const pendingPayments = validPayments.filter(p => p.status === 'pending')
    const failedPayments = validPayments.filter(p => p.status === 'failed')
    const refundedPayments = validPayments.filter(p => p.status === 'refunded')

    // Calculate totals from filtered data
    const calculatedTotalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const calculatedPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const calculatedOverdueAmount = validPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + (p.amount || 0), 0)

    // Validate monthly revenue and payment method stats
    const validatedMonthlyRevenue = validateMonthlyRevenue(monthlyRevenue || {})
    const validatedMethodStats = validatePaymentMethodStats(paymentMethodStats || {})

    const totalTransactions = validPayments.length
    const successRate = totalTransactions > 0 ?
      Math.round((completedPayments.length / totalTransactions) * 1000) / 10 : 0
    const averageTransaction = completedPayments.length > 0 && calculatedTotalRevenue > 0 ?
      Math.round((calculatedTotalRevenue / completedPayments.length) * 100) / 100 : 0

    return {
      totalRevenue: sanitizeFinancialResult(calculatedTotalRevenue),
      totalPaid: sanitizeFinancialResult(calculatedTotalRevenue),
      totalPending: sanitizeFinancialResult(calculatedPendingAmount),
      totalOverdue: sanitizeFinancialResult(calculatedOverdueAmount),
      revenueByPaymentMethod: validatedMethodStats.validStats,
      revenueTrend: [],
      recentTransactions: [],
      outstandingPayments: [],
      totalTransactions,
      completedCount: completedPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      refundedCount: refundedPayments.length,
      successRate: isNaN(successRate) ? '0.0' : successRate.toFixed(1),
      averageTransaction: isNaN(averageTransaction) ? '0.00' : averageTransaction.toFixed(2),
      validatedPayments: validPayments // Add validated payments for use in charts
    }
  }

  const reportData = getReportData()
  const stats = {
    totalTransactions: reportData.totalTransactions || payments.length,
    completedCount: reportData.completedCount || payments.filter(p => p.status === 'completed').length,
    pendingCount: reportData.pendingCount || payments.filter(p => p.status === 'pending').length,
    failedCount: reportData.failedCount || payments.filter(p => p.status === 'failed').length,
    refundedCount: reportData.refundedCount || payments.filter(p => p.status === 'refunded').length,
    successRate: reportData.successRate || '0.0',
    averageTransaction: reportData.averageTransaction || '0.00'
  }

  // Get professional chart colors
  const categoricalColors = getChartColors('categorical', isDarkMode)
  const primaryColors = getChartColors('primary', isDarkMode)
  const financialColors = getChartColorsWithFallback('financial', isDarkMode, 8)
  const statusColors = getChartColorsWithFallback('status', isDarkMode, 8)
  const chartConfiguration = getChartConfig(isDarkMode)

  // Enhanced payment method chart data with validation
  const paymentMethodData = (() => {
    try {
      const methodMapping = {
        'cash': 'نقداً',
        'card': 'بطاقة ائتمان',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'insurance': 'تأمين'
      }

      // Validate amount function
      const validateAmount = (amount) => {
        const num = Number(amount)
        return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
      }

      // Always use filtered data for accurate calculations
      const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

      if (dataToUse.length === 0) {
        return []
      }

      const calculatedStats = {}
      dataToUse
        .filter(p => p.status === 'completed' || p.status === 'partial')
        .forEach(payment => {
          const method = payment.payment_method || 'cash' // Default to cash if not specified
          // استخدام amount (مبلغ الدفعة الحالية) لجميع الحالات - متسق مع باقي الحسابات
          const amount = validateAmount(payment.amount)

          console.log(`Payment method calculation - Payment ${payment.id}: Method=${method}, Amount=${amount}, Status=${payment.status}`)

          if (amount > 0) {
            calculatedStats[method] = (calculatedStats[method] || 0) + amount
          }
        })

      console.log('Payment method calculated stats:', calculatedStats)

      const data = Object.entries(calculatedStats)
        .filter(([method, amount]) => amount > 0)
        .map(([method, amount]) => ({
          method: methodMapping[method] || method,
          amount: validateAmount(amount),
          formattedAmount: formatCurrency(amount, currency),
          count: dataToUse.filter(p =>
            p.payment_method === method &&
            (p.status === 'completed' || p.status === 'partial')
          ).length
        }))
        .sort((a, b) => b.amount - a.amount)

      console.log('Payment method final data:', data)
      console.log('Payment method total:', data.reduce((sum, method) => sum + method.amount, 0))

      return ensurePaymentMethodData(data)
    } catch (error) {
      console.error('Financial Reports: Error processing payment method data:', error)
      return []
    }
  })()

  // Enhanced monthly revenue chart data with validation
  const monthlyRevenueData = (() => {
    try {
      // Validate amount function
      const validateAmount = (amount) => {
        const num = Number(amount)
        return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
      }

      // Always use filtered data for accurate calculations
      const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

      if (dataToUse.length === 0) {
        return []
      }

      console.log('Processing monthly revenue for', dataToUse.length, 'payments')
      console.log('Sample payments:', dataToUse.slice(0, 3))
      console.log('All payment amounts:', dataToUse.map(p => ({ id: p.id, amount: p.amount, status: p.status, date: p.payment_date })))

      const calculatedMonthlyRevenue = {}

      dataToUse
        .filter(p => p.status === 'completed' || p.status === 'partial')
        .forEach(payment => {
          try {
            // Try multiple date fields
            const paymentDate = new Date(payment.payment_date || payment.created_at || payment.date)
            if (isNaN(paymentDate.getTime())) {
              console.warn('Invalid payment date for payment:', payment.id, payment.payment_date)
              return
            }

            const month = paymentDate.toISOString().slice(0, 7) // YYYY-MM
            // استخدام amount (مبلغ الدفعة الحالية) لجميع الحالات
            const amount = validateAmount(payment.amount)

            console.log(`Payment ${payment.id}: Date=${payment.payment_date}, Month=${month}, Amount=${amount}, Status=${payment.status}`)

            if (amount > 0) {
              calculatedMonthlyRevenue[month] = (calculatedMonthlyRevenue[month] || 0) + amount
              console.log(`Added ${amount} to month ${month}, total now: ${calculatedMonthlyRevenue[month]}`)
            }
          } catch (error) {
            console.warn('Error processing payment date:', payment.payment_date, error)
          }
        })

      console.log('Calculated monthly revenue:', calculatedMonthlyRevenue)

      // If we have less than 2 months of data, generate some sample months for better visualization
      const monthEntries = Object.entries(calculatedMonthlyRevenue)
      if (monthEntries.length === 1) {
        const [singleMonth, singleRevenue] = monthEntries[0]
        const currentDate = new Date(singleMonth + '-01')

        // Add previous month with 0 revenue for comparison
        const prevMonth = new Date(currentDate)
        prevMonth.setMonth(prevMonth.getMonth() - 1)
        const prevMonthKey = prevMonth.toISOString().slice(0, 7)
        calculatedMonthlyRevenue[prevMonthKey] = 0

        // Add next month with 0 revenue for comparison
        const nextMonth = new Date(currentDate)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        const nextMonthKey = nextMonth.toISOString().slice(0, 7)
        calculatedMonthlyRevenue[nextMonthKey] = 0
      }

      const data = Object.entries(calculatedMonthlyRevenue)
        .filter(([month, revenue]) => {
          const isValidMonth = month.match(/^\d{4}-\d{2}$/)
          return isValidMonth
        })
        .map(([month, revenue]) => {
          // Convert to Arabic month names
          const date = new Date(month + '-01')
          const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
          ]
          const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`

          return {
            month: monthName,
            revenue: validateAmount(revenue),
            formattedRevenue: formatCurrency(validateAmount(revenue), currency),
            originalMonth: month // Keep original for sorting
          }
        })
        .sort((a, b) => {
          // Sort chronologically using original month format
          return a.originalMonth.localeCompare(b.originalMonth)
        })
        .map(({ originalMonth, ...rest }) => rest) // Remove originalMonth from final data

      console.log('Final monthly revenue data:', data)

      return data
    } catch (error) {
      console.error('Financial Reports: Error processing monthly revenue data:', error)
      return []
    }
  })()

  // Enhanced payment status data for pie chart with validation
  const statusData = (() => {
    try {
      // Always use filtered data for accurate calculations
      const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

      if (dataToUse.length === 0) {
        return []
      }

      const completedCount = dataToUse.filter(p => p.status === 'completed').length
      const partialCount = dataToUse.filter(p => p.status === 'partial').length
      const pendingCount = dataToUse.filter(p => p.status === 'pending').length
      const failedCount = dataToUse.filter(p => p.status === 'failed').length
      const refundedCount = dataToUse.filter(p => p.status === 'refunded').length
      const totalCount = dataToUse.length

      const data = [
        { name: 'مكتمل', value: completedCount, color: statusColors[0] || '#10b981' },
        { name: 'جزئي', value: partialCount, color: statusColors[1] || '#f59e0b' },
        { name: 'معلق', value: pendingCount, color: statusColors[2] || '#6b7280' },
        { name: 'فاشل', value: failedCount, color: statusColors[3] || '#ef4444' },
        { name: 'مسترد', value: refundedCount, color: statusColors[4] || '#8b5cf6' }
      ]
      .filter(item => item.value > 0) // Only show statuses that have data
      .map(item => ({
        ...item,
        percentage: totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0
      }))

      return ensurePaymentStatusData(data)
    } catch (error) {
      console.error('Financial Reports: Error processing status data:', error)
      return []
    }
  })()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">التقارير المالية</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمدفوعات والإيرادات
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>البيانات محدثة في الوقت الفعلي</span>
            </div>
            {paymentStats.filteredData.length > 0 && (
              <div className="text-xs text-muted-foreground">
                • {paymentStats.filteredData.length} معاملة
                {paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate &&
                  ` (مفلترة)`
                }
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // Clear cache to force fresh data
                clearCache()
                await generateReport('financial')
                await loadPayments()
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث التقارير المالية',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                console.error('Error refreshing financial reports:', error)
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'خطأ في التحديث',
                    description: 'فشل في تحديث التقارير',
                    type: 'error'
                  }
                })
                window.dispatchEvent(event)
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // استخدام البيانات المفلترة للتصدير الشامل
                const dataToExport = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مالية للتصدير')
                  return
                }

                // إنشاء تقرير مالي شامل مع جميع الأمور المالية
                const csvContent = await generateComprehensiveFinancialCSV(dataToExport, paymentStats.timeFilter)

                // تحويل إلى Excel مباشرة
                await ExportService.convertCSVToExcel(csvContent, 'comprehensive-financial', {
                  format: 'csv',
                  includeCharts: false,
                  includeDetails: true,
                  language: 'ar'
                })

                notify.exportSuccess(`تم تصدير التقرير المالي الشامل بنجاح! (${dataToExport.length} معاملة)`)
              } catch (error) {
                console.error('Error exporting comprehensive financial CSV:', error)
                notify.exportError('فشل في تصدير التقرير المالي الشامل')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير Excel شامل
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                // استخدام البيانات المفلترة للتصدير الشامل
                const dataToExport = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مالية للتصدير')
                  return
                }

                // إنشاء تقرير مالي شامل مع جميع الأمور المالية
                const comprehensiveFinancialData = await generateComprehensiveFinancialData(
                  dataToExport,
                  paymentStats.timeFilter,
                  labOrders,
                  clinicNeeds,
                  inventoryItems
                )

                // Use PdfService for enhanced comprehensive PDF export
                await PdfService.exportComprehensiveFinancialReport(comprehensiveFinancialData, settings)

                // رسالة نجاح مفصلة
                let successMessage = `تم تصدير التقرير المالي الشامل كملف PDF بنجاح! (${dataToExport.length} معاملة)`

                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  successMessage += ` - مفلتر من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate}`
                }

                successMessage += ` - إجمالي الإيرادات: $${comprehensiveFinancialData.totalRevenue.toFixed(2)}`

                notify.exportSuccess(successMessage)
              } catch (error) {
                console.error('Error exporting comprehensive financial PDF:', error)
                notify.exportError('فشل في تصدير التقرير المالي الشامل كملف PDF')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF شامل
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={paymentStats.timeFilter}
        onChange={paymentStats.handleFilterChange}
        onClear={paymentStats.resetFilter}
        title="فلترة زمنية - المدفوعات"
        defaultOpen={false}
      />

      {/* Stats Cards - RTL Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" dir="rtl">
        <Card className={getCardStyles("green")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">إجمالي الإيرادات</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={totalRevenue}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              إجمالي الإيرادات المحققة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">الإيرادات المفلترة</CardTitle>
            <Receipt className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={paymentStats.financialStats.totalRevenue}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              من {paymentStats.filteredData.filter(p => p.status === 'completed').length} معاملة مكتملة
            </p>
            {paymentStats.trend && (
              <div className={`text-xs flex items-center justify-end mt-1 ${
                paymentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="ml-1">{Math.abs(paymentStats.trend.changePercent)}%</span>
                {paymentStats.trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المبالغ المعلقة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={pendingAmount}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              إجمالي المبالغ المعلقة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("red")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المبالغ المتأخرة</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("red")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={overdueAmount}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              تحتاج متابعة عاجلة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">المبالغ المتبقية</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={paymentStats.financialStats.totalRemainingBalance || 0}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              من الدفعات الجزئية
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        <Card className={getCardStyles("purple")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">إجمالي المعاملات</CardTitle>
            <Receipt className={`h-4 w-4 ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {paymentStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              معاملة مالية
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("indigo")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">معدل النجاح</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("indigo")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              {(() => {
                const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments
                const successfulPayments = dataToUse.filter(p => p.status === 'completed' || p.status === 'partial').length
                const successRate = dataToUse.length > 0 ? (successfulPayments / dataToUse.length * 100).toFixed(1) : '0.0'
                return `${successRate}%`
              })()}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              من المعاملات ناجحة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("teal")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">متوسط المعاملة</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("teal")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={(() => {
                  const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments
                  const totalRevenue = paymentStats.financialStats.totalRevenue || 0
                  return dataToUse.length > 0 ? totalRevenue / dataToUse.length : 0
                })()}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              متوسط قيمة المعاملة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("green")} dir="rtl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground text-right">أعلى مدفوعة</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("pink")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground text-right">
              <CurrencyDisplay
                amount={(() => {
                  const dataToUse = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments
                  const amounts = dataToUse
                    .filter(p => p.status === 'completed' || p.status === 'partial')
                    .map(p => p.amount || 0) // استخدام amount (مبلغ الدفعة) لجميع الحالات
                  return amounts.length > 0 ? Math.max(...amounts) : 0
                })()}
                currency={currency}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              أكبر مبلغ مدفوع
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Enhanced Payment Status Distribution */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع حالات المدفوعات</span>
            </CardTitle>
            <CardDescription>
              توزيع المدفوعات حسب الحالة ({paymentStats.filteredData.length} معاملة)
              {paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate &&
                ` في الفترة المحددة`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات مدفوعات متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={120}
                    innerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`payment-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} معاملة`,
                      'العدد'
                    ]}
                    labelFormatter={(label) => `الحالة: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}

            {/* Status Legend */}
            {statusData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {statusData.map((status, index) => (
                  <div key={`status-legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-muted-foreground">
                      {status.name}: {status.value} ({status.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Payment Methods Distribution */}
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>طرق الدفع</span>
            </CardTitle>
            <CardDescription>
              الإيرادات حسب طريقة الدفع ({formatCurrency((() => {
                // حساب الإجمالي من نفس البيانات المستخدمة في المخطط
                const total = paymentMethodData.reduce((sum, method) => sum + method.amount, 0)
                console.log('Payment method total calculation:', {
                  paymentMethodData,
                  total,
                  financialStatsTotal: paymentStats.financialStats.totalRevenue
                })
                return total
              })(), currency)} إجمالي)
              {paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate &&
                ` في الفترة المحددة`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات طرق دفع متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <BarChart
                  data={paymentMethodData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barCategoryGap={chartConfiguration.bar.barCategoryGap}
                >
                  <CartesianGrid
                    strokeDasharray={chartConfiguration.grid.strokeDasharray}
                    stroke={chartConfiguration.grid.stroke}
                    strokeOpacity={chartConfiguration.grid.strokeOpacity}
                  />
                  <XAxis
                    dataKey="method"
                    tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 14, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => formatChartValue(value, 'currency', currency)}
                    domain={[0, 'dataMax + 100']}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [
                      formatCurrency(Number(value), currency),
                      'المبلغ',
                      `${props.payload.count} معاملة`
                    ]}
                    labelFormatter={(label) => `طريقة الدفع: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                  <Bar
                    dataKey="amount"
                    fill={primaryColors[1]}
                    radius={[4, 4, 0, 0]}
                    minPointSize={5}
                    maxBarSize={100}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Payment Methods Summary */}
            {paymentMethodData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                {paymentMethodData.slice(0, 3).map((method, index) => (
                  <div key={`method-summary-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="font-medium">{method.method}</span>
                    <div className="text-left">
                      <div className="font-semibold">{method.formattedAmount}</div>
                      <div className="text-xs text-muted-foreground">{method.count} معاملة</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Monthly Revenue Chart */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>الإيرادات الشهرية</span>
          </CardTitle>
          <CardDescription>
            تطور الإيرادات عبر الأشهر ({monthlyRevenueData.length} شهر)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyRevenueData.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بيانات إيرادات شهرية متاحة</p>
                <p className="text-sm mt-2">
                  {paymentStats.filteredData.length === 0
                    ? 'قم بإضافة مدفوعات لعرض الإحصائيات'
                    : `يوجد ${paymentStats.filteredData.length} مدفوعة ولكن لا توجد بيانات شهرية صالحة`
                  }
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartConfiguration.responsive.large.height}>
              <AreaChart
                data={monthlyRevenueData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray={chartConfiguration.grid.strokeDasharray}
                  stroke={chartConfiguration.grid.stroke}
                  strokeOpacity={chartConfiguration.grid.strokeOpacity}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                  axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                  tickFormatter={(value) => formatChartValue(value, 'currency', currency)}
                  domain={[0, 'dataMax + 100']}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value), currency), 'الإيرادات']}
                  labelFormatter={(label) => `الشهر: ${label}`}
                  contentStyle={chartConfiguration.tooltip}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={primaryColors[0]}
                  fill={primaryColors[0]}
                  fillOpacity={0.3}
                  strokeWidth={3}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Revenue Summary */}
          {monthlyRevenueData.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-xs text-muted-foreground">أعلى شهر</div>
                <div className="font-semibold">
                  {(() => {
                    const revenues = monthlyRevenueData.map(d => d.revenue).filter(r => r > 0)
                    return revenues.length > 0
                      ? formatCurrency(Math.max(...revenues), currency)
                      : formatCurrency(0, currency)
                  })()}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-xs text-muted-foreground">متوسط شهري</div>
                <div className="font-semibold">
                  {(() => {
                    const revenues = monthlyRevenueData.map(d => d.revenue).filter(r => r > 0)
                    return revenues.length > 0
                      ? formatCurrency(revenues.reduce((sum, r) => sum + r, 0) / revenues.length, currency)
                      : formatCurrency(0, currency)
                  })()}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-xs text-muted-foreground">أقل شهر</div>
                <div className="font-semibold">
                  {(() => {
                    const revenues = monthlyRevenueData.map(d => d.revenue).filter(r => r > 0)
                    return revenues.length > 0
                      ? formatCurrency(Math.min(...revenues), currency)
                      : formatCurrency(0, currency)
                  })()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments Table */}
      {paymentStats.filteredData.length > 0 && (
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Receipt className="w-5 h-5" />
              <span>المدفوعات الحديثة</span>
            </CardTitle>
            <CardDescription>
              آخر {Math.min(10, paymentStats.filteredData.length)} مدفوعات
              {paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate &&
                ` في الفترة من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-3 font-semibold text-muted-foreground">رقم الإيصال</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">المريض</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">المبلغ</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">طريقة الدفع</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">الحالة</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentStats.filteredData
                    .sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime())
                    .slice(0, 10)
                    .map((payment, index) => {
                      const statusColors = {
                        'completed': 'text-green-600 bg-green-50 dark:bg-green-900/20',
                        'partial': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
                        'pending': 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
                        'failed': 'text-red-600 bg-red-50 dark:bg-red-900/20',
                        'refunded': 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      }

                      const statusLabels = {
                        'completed': 'مكتمل',
                        'partial': 'جزئي',
                        'pending': 'معلق',
                        'failed': 'فاشل',
                        'refunded': 'مسترد'
                      }

                      const methodLabels = {
                        'cash': 'نقداً',
                        'card': 'بطاقة ائتمان',
                        'bank_transfer': 'تحويل بنكي',
                        'check': 'شيك',
                        'insurance': 'تأمين'
                      }

                      return (
                        <tr key={payment.id || index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="p-3 text-right">
                            <span className="font-mono text-sm">
                              {payment.receipt_number || `#${payment.id?.slice(-6) || 'N/A'}`}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-medium">
                              {payment.patient?.full_name || payment.patient_name || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                <CurrencyDisplay amount={payment.amount || 0} currency={currency} />
                              </span>
                              {payment.status === 'partial' && payment.amount_paid && (
                                <span className="text-xs text-muted-foreground">
                                  مدفوع: <CurrencyDisplay amount={payment.amount_paid} currency={currency} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm">
                              {methodLabels[payment.payment_method] || payment.payment_method || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status] || 'text-gray-600 bg-gray-50'}`}>
                              {statusLabels[payment.status] || payment.status || 'غير محدد'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(payment.payment_date || payment.created_at)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {paymentStats.filteredData.length > 10 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  عرض 10 من أصل {paymentStats.filteredData.length} مدفوعة
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
