import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
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
  Download
} from 'lucide-react'
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
    isLoading,
    error,
    totalRevenue,
    pendingAmount,
    overdueAmount,
    totalRemainingBalance,
    partialPaymentsCount,
    paymentMethodStats,
    loadPayments,
    deletePayment,
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
              if (payments.length === 0) {
                alert('لا توجد بيانات مدفوعات للتصدير')
                return
              }

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

              const csvData = payments.map(payment => ({
                'رقم الإيصال': payment.receipt_number || `#${payment.id.slice(-6)}`,
                'المريض': getPatientName(payment),
                'المبلغ': payment.amount,
                'طريقة الدفع': getPaymentMethodLabel(payment.payment_method),
                'الحالة': payment.status,
                'تاريخ الدفع': new Date(payment.payment_date).toLocaleDateString('ar-SA'),
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

              alert(`تم تصدير ${payments.length} دفعة بنجاح!`)
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

      {/* Payments Table */}
      <PaymentTable
        payments={payments}
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
