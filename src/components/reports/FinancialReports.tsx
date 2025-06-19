import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReportsStore } from '@/store/reportsStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import CurrencyDisplay from '@/components/ui/currency-display'
import { PdfService } from '@/services/pdfService'
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

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function FinancialReports() {
  const { financialReports, isLoading, isExporting, generateReport } = useReportsStore()
  const {
    payments,
    totalRevenue,
    pendingAmount,
    overdueAmount,
    paymentMethodStats,
    monthlyRevenue,
    loadPayments
  } = usePaymentStore()
  const { currency } = useSettingsStore()

  useEffect(() => {
    generateReport('financial')
    loadPayments()
  }, [generateReport, loadPayments])



  // Calculate financial statistics
  const calculateStats = () => {
    const completedPayments = payments.filter(p => p.status === 'completed')
    const pendingPayments = payments.filter(p => p.status === 'pending')
    const failedPayments = payments.filter(p => p.status === 'failed')
    const refundedPayments = payments.filter(p => p.status === 'refunded')

    const totalTransactions = payments.length
    const successRate = totalTransactions > 0 ? ((completedPayments.length / totalTransactions) * 100).toFixed(1) : '0'
    const averageTransaction = completedPayments.length > 0 ? (totalRevenue / completedPayments.length).toFixed(2) : '0'

    return {
      totalTransactions,
      completedCount: completedPayments.length,
      pendingCount: pendingPayments.length,
      failedCount: failedPayments.length,
      refundedCount: refundedPayments.length,
      successRate,
      averageTransaction
    }
  }

  const stats = calculateStats()

  // Prepare payment method chart data
  const paymentMethodData = Object.entries(paymentMethodStats).map(([method, amount]) => ({
    method: method === 'cash' ? 'نقداً' :
            method === 'card' ? 'بطاقة ائتمان' :
            method === 'bank_transfer' ? 'تحويل بنكي' :
            method === 'check' ? 'شيك' :
            method === 'insurance' ? 'تأمين' : method,
    amount
  }))

  // Prepare monthly revenue chart data
  const monthlyRevenueData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
    month,
    revenue
  }))

  // Payment status data for pie chart
  const statusData = [
    { name: 'مكتمل', value: stats.completedCount, color: '#10b981' },
    { name: 'معلق', value: stats.pendingCount, color: '#f59e0b' },
    { name: 'فاشل', value: stats.failedCount, color: '#ef4444' },
    { name: 'مسترد', value: stats.refundedCount, color: '#6b7280' }
  ]

  return (
    <div className="space-y-6">
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
            onClick={() => {
              // Export financial reports data
              if (payments.length === 0) {
                alert('لا توجد بيانات مالية للتصدير')
                return
              }

              const reportData = {
                'إجمالي الإيرادات': totalRevenue,
                'المبالغ المعلقة': pendingAmount,
                'المبالغ المتأخرة': overdueAmount,
                'إجمالي المعاملات': stats.totalTransactions,
                'المعاملات المكتملة': stats.completedCount,
                'المعاملات المعلقة': stats.pendingCount,
                'المعاملات الفاشلة': stats.failedCount,
                'المعاملات المستردة': stats.refundedCount,
                'معدل النجاح (%)': stats.successRate,
                'متوسط قيمة المعاملة': stats.averageTransaction,
                'العملة': currency,
                'تاريخ التقرير': new Date().toLocaleString('ar-SA')
              }

              // Create CSV with BOM for Arabic support
              const csvContent = '\uFEFF' + [
                'المؤشر,القيمة',
                ...Object.entries(reportData).map(([key, value]) =>
                  `"${key}","${value}"`
                )
              ].join('\n')

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)

              // Generate descriptive filename with date and time
              const now = new Date()
              const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
              const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
              const fileName = `التقرير_المالي_الإحصائي_${dateStr}_${timeStr}.csv`

              link.download = fileName
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              alert('تم تصدير التقرير المالي بنجاح!')
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
                if (!financialReports || payments.length === 0) {
                  alert('لا توجد بيانات مالية للتصدير')
                  return
                }

                // Create financial report data structure
                const reportData = {
                  totalRevenue,
                  completedPayments: totalRevenue,
                  pendingPayments: pendingAmount,
                  overduePayments: overdueAmount,
                  paymentMethodStats: Object.entries(paymentMethodStats).map(([method, amount]) => ({
                    method,
                    amount,
                    count: payments.filter(p => p.payment_method === method).length
                  })),
                  monthlyRevenue: Object.entries(monthlyRevenue).map(([period, amount]) => ({
                    period,
                    amount
                  })),
                  revenueTrend: [],
                  topTreatments: [],
                  outstandingBalance: pendingAmount + overdueAmount
                }

                await PdfService.exportFinancialReport(reportData)

                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التصدير بنجاح',
                    description: 'تم تصدير التقرير المالي كملف PDF',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                console.error('Error exporting PDF:', error)
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'خطأ في التصدير',
                    description: 'فشل في تصدير التقرير كملف PDF',
                    type: 'error'
                  }
                })
                window.dispatchEvent(event)
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              <CurrencyDisplay amount={totalRevenue} currency={currency} />
            </div>
            <p className="text-xs text-muted-foreground">
              من {stats.completedCount} معاملة مكتملة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبالغ المعلقة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              <CurrencyDisplay amount={pendingAmount} currency={currency} />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingCount} معاملة معلقة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("red")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبالغ المتأخرة</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("red")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              <CurrencyDisplay amount={overdueAmount} currency={currency} />
            </div>
            <p className="text-xs text-muted-foreground">
              تحتاج متابعة عاجلة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">معدل النجاح</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              من إجمالي {stats.totalTransactions} معاملة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع حالات المدفوعات</span>
            </CardTitle>
            <CardDescription>توزيع المدفوعات حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>طرق الدفع</span>
            </CardTitle>
            <CardDescription>الإيرادات حسب طريقة الدفع</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'المبلغ']} />
                <Bar dataKey="amount" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      {monthlyRevenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-5 h-5" />
              <span>الإيرادات الشهرية</span>
            </CardTitle>
            <CardDescription>تطور الإيرادات عبر الأشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'الإيرادات']} />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
