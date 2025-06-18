import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatCurrency } from '@/lib/utils'
import AddPaymentDialog from '@/components/payments/AddPaymentDialog'
import EditPaymentDialog from '@/components/payments/EditPaymentDialog'
import DeletePaymentDialog from '@/components/payments/DeletePaymentDialog'
import PaymentReceiptDialog from '@/components/payments/PaymentReceiptDialog'
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  MoreVertical,
  RefreshCw,
  Download
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Payment } from '@/types'

export default function Payments() {
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
    overdueAmount,
    totalRemainingBalance,
    partialPaymentsCount,
    paymentMethodStats,
    loadPayments,
    deletePayment,
    setSearchQuery,
    setStatusFilter,
    setPaymentMethodFilter,
    clearError
  } = usePaymentStore()

  const { loadPatients, patients } = usePatientStore()

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'مكتمل', variant: 'default' as const },
      pending: { label: 'معلق', variant: 'secondary' as const },
      partial: { label: 'جزئي', variant: 'outline' as const },
      overdue: { label: 'متأخر', variant: 'destructive' as const },
      failed: { label: 'فاشل', variant: 'destructive' as const },
      refunded: { label: 'مسترد', variant: 'outline' as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
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

  const getPatientName = (payment: Payment) => {
    // First try to get patient from payment object
    if (payment.patient) {
      return payment.patient.full_name || 'غير محدد'
    }

    // If not found, try to find patient from patients store
    const patient = patients.find(p => p.id === payment.patient_id)
    if (patient) {
      return patient.full_name || 'غير محدد'
    }

    return 'غير محدد'
  }

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
            onClick={loadPayments}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Export payments data
              if (filteredPayments.length === 0) {
                alert('لا توجد بيانات مدفوعات للتصدير')
                return
              }

              const csvData = filteredPayments.map(payment => ({
                'رقم الإيصال': payment.receipt_number || `#${payment.id.slice(-6)}`,
                'المريض': getPatientName(payment),
                'المبلغ': payment.amount,
                'طريقة الدفع': getPaymentMethodLabel(payment.payment_method),
                'الحالة': payment.status,
                'تاريخ الدفع': formatDate(payment.payment_date),
                'الوصف': payment.description || ''
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

              alert(`تم تصدير ${filteredPayments.length} دفعة بنجاح!`)
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              من المدفوعات المكتملة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبالغ المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              في انتظار الدفع
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبالغ المتأخرة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج متابعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبالغ المتبقية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRemainingBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {partialPaymentsCount} دفعة جزئية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              عملية دفع مسجلة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث في المدفوعات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="حالة الدفع" />
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
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="card">بطاقة ائتمان</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
                <SelectItem value="insurance">تأمين</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل المدفوعات</CardTitle>
          <CardDescription>
            {filteredPayments.length} من أصل {payments.length} دفعة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">لا توجد مدفوعات</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || paymentMethodFilter !== 'all'
                  ? 'لم يتم العثور على مدفوعات تطابق معايير البحث'
                  : 'لم يتم تسجيل أي مدفوعات بعد'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium">رقم الإيصال</th>
                    <th className="text-right py-3 px-4 font-medium">المريض</th>
                    <th className="text-right py-3 px-4 font-medium">المبلغ</th>
                    <th className="text-right py-3 px-4 font-medium">طريقة الدفع</th>
                    <th className="text-right py-3 px-4 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium">تاريخ الدفع</th>
                    <th className="text-right py-3 px-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {payment.receipt_number || `#${payment.id.slice(-6)}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">
                            {getPatientName(payment)}
                          </div>
                          {payment.patient?.phone && (
                            <div className="text-sm text-muted-foreground">
                              {payment.patient.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatCurrency(payment.amount)}
                          </div>
                          {payment.total_amount_due && (
                            <div className="text-xs text-muted-foreground">
                              من أصل {formatCurrency(payment.total_amount_due)}
                            </div>
                          )}
                          {payment.remaining_balance !== undefined && payment.remaining_balance > 0 && (
                            <div className="text-xs text-red-600">
                              متبقي: {formatCurrency(payment.remaining_balance)}
                            </div>
                          )}
                          {payment.remaining_balance === 0 && payment.total_amount_due && (
                            <div className="text-xs text-green-600">
                              ✓ مكتمل
                            </div>
                          )}
                          {payment.description && (
                            <div className="text-sm text-muted-foreground">
                              {payment.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {formatDate(payment.payment_date)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleShowReceipt(payment)}>
                              <Receipt className="w-4 h-4 ml-2" />
                              عرض الإيصال
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditPayment(payment)}>
                              <Edit className="w-4 h-4 ml-2" />
                              تحرير
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeletePayment(payment)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
