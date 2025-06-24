import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import AddPaymentDialog from '@/components/payments/AddPaymentDialog'
import EditPaymentDialog from '@/components/payments/EditPaymentDialog'
import DeletePaymentDialog from '@/components/payments/DeletePaymentDialog'
import PaymentReceiptDialog from '@/components/payments/PaymentReceiptDialog'
import PaymentTable from '@/components/payments/PaymentTable'
import {
  Plus,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  Filter,
  X
} from 'lucide-react'
import type { Payment } from '@/types'
import { notify } from '@/services/notificationService'

export default function Payments() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)



  const {
    payments,
    filteredPayments,
    isLoading,
    error,
    searchQuery,
    statusFilter,
    paymentMethodFilter,
    totalRevenue,
    pendingAmount,
    totalRemainingBalance,
    partialPaymentsCount,
    paymentMethodStats,
    loadPayments,
    deletePayment,
    clearError,
    setSearchQuery,
    setStatusFilter,
    setPaymentMethodFilter
  } = usePaymentStore()

  const { loadPatients, patients } = usePatientStore()

  // Time filtering for payments
  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  useEffect(() => {
    loadPayments()
    loadPatients()
  }, [loadPayments, loadPatients])

  useEffect(() => {
    if (error) {
      toast({
        title: 'خطأ',
        description: error,
        variant: 'destructive',
      })
      clearError()
    }
  }, [error, toast, clearError])

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowEditDialog(true)
  }

  const handleDeletePayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowDeleteDialog(true)
  }

  const handleShowReceipt = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowReceiptDialog(true)
  }

  const handleAddPayment = () => {
    console.log('Add payment clicked')
    setShowAddDialog(true)
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPaymentMethodFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || paymentMethodFilter !== 'all'



  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة المدفوعات</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            تتبع المدفوعات والفواتير والسجلات المالية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => {
              // Export payments data
              if (payments.length === 0) {
                notify.noDataToExport('لا توجد بيانات مدفوعات للتصدير')
                return
              }

              try {

              // Helper functions for export
              const getPatientName = (payment: Payment) => {
                const patient = patients.find(p => p.id === payment.patient_id)
                return patient?.full_name || 'غير محدد'
              }

              const getPaymentMethodLabel = (method: string) => {
                const methods = {
                  cash: 'نقداً',
                  card: 'بطاقة ائتمان',
                  bank_transfer: 'تحويل بنكي',
                  check: 'شيك',
                  insurance: 'تأمين'
                }
                return methods[method as keyof typeof methods] || method
              }

              // Match the table columns exactly
              const getStatusLabel = (status: string) => {
                const statusLabels = {
                  completed: 'مكتمل',
                  pending: 'معلق',
                  partial: 'جزئي',
                  overdue: 'متأخر',
                  failed: 'فاشل',
                  refunded: 'مسترد'
                }
                return statusLabels[status as keyof typeof statusLabels] || status
              }

              // Use filtered data for export to ensure accuracy
              const dataToExport = paymentStats.filteredData.length > 0 ? paymentStats.filteredData : payments

              const csvData = dataToExport.map(payment => ({
                'رقم الإيصال': payment.receipt_number || `#${payment.id.slice(-6)}`,
                'المريض': getPatientName(payment),
                'المبلغ': `$${payment.amount.toFixed(2)}`,
                'طريقة الدفع': getPaymentMethodLabel(payment.payment_method),
                'الحالة': getStatusLabel(payment.status),
                'تاريخ الدفع': formatDate(payment.payment_date)
              }))

              // Create CSV with BOM for Arabic support
              const headers = Object.keys(csvData[0]).join(',')
              const rows = csvData.map(row =>
                Object.values(row).map(value =>
                  `"${String(value).replace(/"/g, '""')}"`
                ).join(',')
              )
              const csvContent = '\uFEFF' + [headers, ...rows].join('\n')

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)

              // Generate descriptive filename with date and time
              const now = new Date()
              const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
              const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
              const fileName = `تقرير_المدفوعات_${dateStr}_${timeStr}.csv`

                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                // Add filter information to success message
                const filterInfo = paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate
                  ? ` (مفلترة من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate})`
                  : ''

                notify.exportSuccess(`تم تصدير ${dataToExport.length} دفعة بنجاح!${filterInfo}`)
              } catch (error) {
                console.error('Error exporting payments:', error)
                notify.exportError('فشل في تصدير بيانات المدفوعات')
              }
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={handleAddPayment}>
            <Plus className="w-4 h-4 ml-2" />
            تسجيل دفعة جديدة
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إجمالي الإيرادات' : 'الإيرادات المفلترة'}
            </CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatCurrency(totalRevenue)
                : formatCurrency(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'من المدفوعات المكتملة'
                : 'من المدفوعات المكتملة في الفترة المحددة'}
            </p>
            {paymentStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${
                paymentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 ml-1 ${paymentStats.trend.isPositive ? '' : 'rotate-180'}`} />
                <span>{Math.abs(paymentStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'المبالغ المعلقة' : 'المبالغ المعلقة المفلترة'}
            </CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatCurrency(pendingAmount)
                : formatCurrency(paymentStats.financialStats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'في انتظار الدفع'
                : 'في انتظار الدفع في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبالغ المتبقية</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalRemainingBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {partialPaymentsCount} دفعة جزئية
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إجمالي المدفوعات' : 'المدفوعات المفلترة'}
            </CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? payments.length
                : paymentStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'عملية دفع إجمالية'
                : 'عملية دفع في الفترة المحددة'}
            </p>
            {paymentStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${
                paymentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 ml-1 ${paymentStats.trend.isPositive ? '' : 'rotate-180'}`} />
                <span>{Math.abs(paymentStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg arabic-enhanced">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث في المدفوعات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 arabic-enhanced text-right"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="partial">جزئي</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="failed">فاشل</SelectItem>
                  <SelectItem value="refunded">مسترد</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="تصفية حسب طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع طرق الدفع</SelectItem>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="insurance">تأمين</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-4 text-sm text-muted-foreground arabic-enhanced">
              عرض {filteredPayments.length} من أصل {payments.length} مدفوعة
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments Table */}
      <PaymentTable
        payments={filteredPayments}
        patients={patients}
        isLoading={isLoading}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
        onShowReceipt={handleShowReceipt}
      />

      {/* Dialogs */}
      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {selectedPayment && (
        <>
          <EditPaymentDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            payment={selectedPayment}
          />

          <DeletePaymentDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            payment={selectedPayment}
          />

          <PaymentReceiptDialog
            open={showReceiptDialog}
            onOpenChange={setShowReceiptDialog}
            payment={selectedPayment}
          />
        </>
      )}
    </div>
  )
}
