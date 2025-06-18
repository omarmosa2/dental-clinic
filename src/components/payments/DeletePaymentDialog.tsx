import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

interface DeletePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

export default function DeletePaymentDialog({ open, onOpenChange, payment }: DeletePaymentDialogProps) {
  const { toast } = useToast()
  const { deletePayment, isLoading } = usePaymentStore()
  const { patients } = usePatientStore()

  const getPatientName = (payment: Payment) => {
    // First try to get patient from payment object
    if (payment.patient) {
      return `${payment.patient.first_name} ${payment.patient.last_name}`
    }

    // If not found, try to find patient from patients store
    const patient = patients.find(p => p.id === payment.patient_id)
    if (patient) {
      return `${patient.first_name} ${patient.last_name}`
    }

    return 'غير محدد'
  }

  const handleDelete = async () => {
    try {
      await deletePayment(payment.id)

      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الدفعة بنجاح',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الدفعة',
        variant: 'destructive',
      })
    }
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

  const getStatusLabel = (status: string) => {
    const statuses = {
      completed: 'مكتمل',
      pending: 'معلق',
      partial: 'جزئي',
      overdue: 'متأخر',
      failed: 'فاشل',
      refunded: 'مسترد'
    }
    return statuses[status as keyof typeof statuses] || status
  }

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-lg w-full border border-border" dir="rtl">
          {/* Header */}
          <div className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-destructive ml-3" />
              <div>
                <h2 className="text-xl font-semibold text-destructive">تأكيد حذف الدفعة</h2>
                <p className="text-muted-foreground mt-1">
                  هذا الإجراء لا يمكن التراجع عنه
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-4">
                <p>هل أنت متأكد من رغبتك في حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.</p>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">تفاصيل الدفعة:</h4>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">رقم الإيصال:</span>
                      <span className="mr-2 font-medium">
                        {payment.receipt_number || `#${payment.id.slice(-6)}`}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">المبلغ:</span>
                      <span className="mr-2 font-medium">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">المريض:</span>
                      <span className="mr-2 font-medium">
                        {getPatientName(payment)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">طريقة الدفع:</span>
                      <span className="mr-2 font-medium">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">الحالة:</span>
                      <span className="mr-2 font-medium">
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">تاريخ الدفع:</span>
                      <span className="mr-2 font-medium">
                        {formatDate(payment.payment_date)}
                      </span>
                    </div>
                  </div>

                  {payment.description && (
                    <div>
                      <span className="text-muted-foreground">الوصف:</span>
                      <span className="mr-2">{payment.description}</span>
                    </div>
                  )}

                  {payment.notes && (
                    <div>
                      <span className="text-muted-foreground">ملاحظات:</span>
                      <span className="mr-2">{payment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? 'جاري الحذف...' : 'حذف الدفعة'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
