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
import { useRealTimeReportsByType } from '@/hooks/useRealTimeReports'
import { formatCurrency, formatDate, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue, parseAndFormatGregorianMonth } from '@/lib/utils'
import { validateNumericData, processFinancialData, groupDataByPeriod, ensurePaymentStatusData, ensurePaymentMethodData } from '@/lib/chartDataHelpers'
import { validatePayments, validateMonthlyRevenue, validatePaymentMethodStats, sanitizeFinancialResult } from '@/utils/dataValidation'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { PdfService } from '@/services/pdfService'
import { ExportService } from '@/services/exportService'
import { notify } from '@/services/notificationService'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
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
  }, [generateReport, loadPayments])

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

      // Use data from reports service if available
      const methodStats = reportData.revenueByPaymentMethod || paymentMethodStats || {}

      // If no data, calculate from payments directly using validated payments
      const validatedPayments = reportData.validatedPayments || payments
      if (Object.keys(methodStats).length === 0 && validatedPayments.length > 0) {
        const calculatedStats = {}
        validatedPayments
          .filter(p => p.status === 'completed')
          .forEach(payment => {
            const method = payment.payment_method || 'unknown'
            const amount = validateAmount(payment.amount)
            calculatedStats[method] = (calculatedStats[method] || 0) + amount
          })

        const data = Object.entries(calculatedStats)
          .filter(([method, amount]) => amount > 0)
          .map(([method, amount]) => ({
            method: methodMapping[method] || method,
            amount: validateAmount(amount),
            formattedAmount: formatCurrency(amount, currency),
            count: payments.filter(p => p.payment_method === method && p.status === 'completed').length
          }))
          .sort((a, b) => b.amount - a.amount)

        return ensurePaymentMethodData(data)
      }

      const data = Object.entries(methodStats)
        .filter(([method, amount]) => {
          const validAmount = validateAmount(amount)
          return validAmount > 0
        })
        .map(([method, amount]) => ({
          method: methodMapping[method] || method,
          amount: validateAmount(amount),
          formattedAmount: formatCurrency(validateAmount(amount), currency),
          count: payments.filter(p => p.payment_method === method && p.status === 'completed').length
        }))
        .sort((a, b) => b.amount - a.amount) // Sort by amount descending

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

      // Use data from reports service if available
      if (reportData.revenueTrend && reportData.revenueTrend.length > 0) {
        return reportData.revenueTrend.map(item => ({
          month: item.period,
          revenue: validateAmount(item.revenue || item.amount),
          formattedRevenue: formatCurrency(validateAmount(item.revenue || item.amount), currency)
        }))
      }

      // If no monthly revenue data, calculate from payments directly using validated payments
      const validatedPayments = reportData.validatedPayments || payments
      if (!monthlyRevenue || Object.keys(monthlyRevenue).length === 0) {
        const calculatedMonthlyRevenue = {}

        validatedPayments
          .filter(p => p.status === 'completed')
          .forEach(payment => {
            try {
              const paymentDate = new Date(payment.payment_date)
              if (isNaN(paymentDate.getTime())) {
                console.warn('Invalid payment date:', payment.payment_date)
                return
              }

              const month = paymentDate.toISOString().slice(0, 7) // YYYY-MM
              const amount = validateAmount(payment.amount)
              calculatedMonthlyRevenue[month] = (calculatedMonthlyRevenue[month] || 0) + amount
            } catch (error) {
              console.warn('Error processing payment date:', payment.payment_date, error)
            }
          })

        const data = Object.entries(calculatedMonthlyRevenue)
          .filter(([month, revenue]) => {
            const isValidMonth = month.match(/^\d{4}-\d{2}$/)
            const isValidRevenue = validateAmount(revenue) > 0
            return isValidMonth && isValidRevenue
          })
          .map(([month, revenue]) => {
            // Convert to Gregorian calendar format with Arabic month names
            const monthName = parseAndFormatGregorianMonth(month)

            return {
              month: monthName,
              revenue: validateAmount(revenue),
              formattedRevenue: formatCurrency(validateAmount(revenue), currency)
            }
          })
          .sort((a, b) => {
            // Sort chronologically by parsing the month string back to date
            const parseMonth = (monthStr) => {
              // This is a simplified approach - in production you might want more robust parsing
              return new Date(monthStr).getTime() || 0
            }
            return parseMonth(a.month) - parseMonth(b.month)
          })

        return data
      }

      // Fallback to calculating from store data
      const data = Object.entries(monthlyRevenue || {})
        .filter(([month, revenue]) => {
          const isValidMonth = month.match(/^\d{4}-\d{2}$/)
          const isValidRevenue = validateAmount(revenue) > 0
          return isValidMonth && isValidRevenue
        })
        .map(([month, revenue]) => {
          // Convert to Gregorian calendar format with Arabic month names
          const monthName = parseAndFormatGregorianMonth(month)

          return {
            month: monthName,
            revenue: validateAmount(revenue),
            formattedRevenue: formatCurrency(validateAmount(revenue), currency)
          }
        })
        .sort((a, b) => {
          // Sort chronologically
          const parseMonth = (monthStr) => {
            return new Date(monthStr).getTime() || 0
          }
          return parseMonth(a.month) - parseMonth(b.month)
        })

      if (!validateNumericData(data)) {
        console.warn('Financial Reports: Invalid monthly revenue data')
        return []
      }

      return data
    } catch (error) {
      console.error('Financial Reports: Error processing monthly revenue data:', error)
      return []
    }
  })()

  // Enhanced payment status data for pie chart with validation
  const statusData = (() => {
    try {
      const data = [
        { name: 'مكتمل', value: stats.completedCount, color: statusColors[0] }, // Green for completed
        { name: 'معلق', value: stats.pendingCount, color: statusColors[1] }, // Amber for pending
        { name: 'فاشل', value: stats.failedCount, color: statusColors[2] }, // Red for failed
        { name: 'مسترد', value: stats.refundedCount, color: statusColors[3] } // Gray for refunded
      ].map(item => ({
        ...item,
        percentage: stats.totalTransactions > 0 ? Math.round((item.value / stats.totalTransactions) * 100) : 0
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
                // Use filtered data for export
                const dataToExport = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مالية للتصدير')
                  return
                }

                // Use ExportService for consistent calculation and export
                await ExportService.exportPaymentsToCSV(dataToExport)
                notify.exportSuccess(`تم تصدير التقرير المالي بنجاح! (${dataToExport.length} معاملة)`)
              } catch (error) {
                console.error('Error exporting CSV:', error)
                notify.exportError('فشل في تصدير التقرير المالي')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                // استخدام البيانات المفلترة مع تطبيق جميع الفلاتر
                let dataToExport = [...payments]

                // تطبيق الفلترة الزمنية
                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  const startDate = new Date(paymentStats.timeFilter.startDate)
                  const endDate = new Date(paymentStats.timeFilter.endDate)
                  endDate.setHours(23, 59, 59, 999)

                  dataToExport = dataToExport.filter(payment => {
                    const paymentDate = new Date(payment.payment_date)
                    return paymentDate >= startDate && paymentDate <= endDate
                  })
                }

                if (dataToExport.length === 0) {
                  notify.noDataToExport('لا توجد بيانات مالية للتصدير')
                  return
                }

                // Calculate financial statistics from filtered data
                const validateAmount = (amount: any): number => {
                  const num = Number(amount)
                  return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
                }

                // Calculate totals from filtered payments
                // For partial payments, use amount_paid; for completed payments, use full amount
                const totalRevenue = dataToExport.reduce((sum, p) => {
                  if (p.status === 'completed') {
                    return sum + validateAmount(p.amount)
                  } else if (p.status === 'partial' && p.amount_paid !== undefined) {
                    return sum + validateAmount(p.amount_paid)
                  }
                  // Don't include pending or failed payments in revenue
                  return sum
                }, 0)

                const completedPayments = dataToExport.filter(p => p.status === 'completed').length
                const partialPayments = dataToExport.filter(p => p.status === 'partial').length
                const pendingPayments = dataToExport.filter(p => p.status === 'pending').length
                const failedPayments = dataToExport.filter(p => p.status === 'failed').length

                // Calculate overdue payments (pending payments older than 30 days)
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                const overduePayments = dataToExport.filter(p =>
                  p.status === 'pending' &&
                  new Date(p.payment_date || p.created_at) < thirtyDaysAgo
                ).length

                // Calculate remaining amounts from partial payments
                const totalRemainingFromPartialPayments = dataToExport
                  .filter(p => p.status === 'partial')
                  .reduce((sum, p) => {
                    const totalAmount = validateAmount(p.amount)
                    const paidAmount = validateAmount(p.amount_paid || 0)
                    return sum + (totalAmount - paidAmount)
                  }, 0)

                // Calculate payment method statistics
                const paymentMethodStats = {}
                dataToExport.forEach(payment => {
                  const method = payment.payment_method || 'unknown'
                  let amount = 0

                  if (payment.status === 'completed') {
                    amount = validateAmount(payment.amount)
                  } else if (payment.status === 'partial' && payment.amount_paid !== undefined) {
                    amount = validateAmount(payment.amount_paid)
                  }
                  // Only include completed and partial payments in method stats

                  if (amount > 0) {
                    paymentMethodStats[method] = (paymentMethodStats[method] || 0) + amount
                  }
                })

                // إعداد بيانات التقرير المالي الشامل
                const financialReportData = {
                  totalRevenue: totalRevenue,
                  totalPaid: totalRevenue,
                  totalPending: dataToExport.filter(p => p.status === 'pending').reduce((sum, p) => sum + validateAmount(p.amount), 0),
                  totalOverdue: totalRemainingFromPartialPayments,
                  completedPayments: completedPayments,
                  partialPayments: partialPayments,
                  pendingPayments: pendingPayments,
                  overduePayments: overduePayments,
                  failedPayments: failedPayments,
                  revenueByPaymentMethod: Object.entries(paymentMethodStats).map(([method, amount]) => ({
                    method: method === 'cash' ? 'نقدي' : method === 'card' ? 'بطاقة' : method === 'bank_transfer' ? 'تحويل بنكي' : method,
                    amount: validateAmount(amount),
                    percentage: totalRevenue > 0 ? (validateAmount(amount) / totalRevenue) * 100 : 0
                  })),
                  filterInfo: paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate
                    ? `البيانات المفلترة من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate}`
                    : 'جميع البيانات المالية',
                  dataCount: dataToExport.length,
                  totalTransactions: dataToExport.length,
                  successRate: dataToExport.length > 0 ? ((completedPayments + partialPayments) / dataToExport.length * 100).toFixed(1) : '0.0',
                  averageTransaction: dataToExport.length > 0 ? (totalRevenue / dataToExport.length).toFixed(2) : '0.00',
                  // إضافة تفاصيل المدفوعات للتقرير المفصل
                  payments: dataToExport.map(payment => ({
                    id: payment.id,
                    receipt_number: payment.receipt_number || `#${payment.id.slice(-6)}`,
                    patient_name: payment.patient?.full_name || 'غير محدد',
                    amount: payment.amount,
                    amount_paid: payment.amount_paid,
                    payment_method: payment.payment_method,
                    status: payment.status,
                    payment_date: payment.payment_date,
                    description: payment.description,
                    notes: payment.notes
                  }))
                }

                // Use PdfService for enhanced PDF export
                await PdfService.exportFinancialReport(financialReportData, settings)

                // رسالة نجاح مفصلة
                let successMessage = `تم تصدير التقرير المالي كملف PDF بنجاح! (${dataToExport.length} معاملة)`

                if (paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate) {
                  successMessage += ` - مفلتر من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate}`
                }

                successMessage += ` - إجمالي الإيرادات: $${totalRevenue.toFixed(2)}`

                notify.exportSuccess(successMessage)
              } catch (error) {
                console.error('Error exporting PDF:', error)
                notify.exportError('فشل في تصدير التقرير كملف PDF')
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
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
              توزيع المدفوعات حسب الحالة ({stats.totalTransactions} معاملة إجمالية)
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
              الإيرادات حسب طريقة الدفع ({formatCurrency(totalRevenue, currency)} إجمالي)
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
                  {formatCurrency(Math.max(...monthlyRevenueData.map(d => d.revenue)), currency)}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-xs text-muted-foreground">متوسط شهري</div>
                <div className="font-semibold">
                  {formatCurrency(
                    monthlyRevenueData.reduce((sum, d) => sum + d.revenue, 0) / monthlyRevenueData.length,
                    currency
                  )}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-xs text-muted-foreground">أقل شهر</div>
                <div className="font-semibold">
                  {formatCurrency(Math.min(...monthlyRevenueData.map(d => d.revenue)), currency)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
