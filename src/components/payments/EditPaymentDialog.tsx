import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Payment } from '@/types'

interface EditPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

export default function EditPaymentDialog({ open, onOpenChange, payment }: EditPaymentDialogProps) {
  const { toast } = useToast()
  const { updatePayment, isLoading } = usePaymentStore()
  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: 'none',
    amount: '',
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'check' | 'insurance',
    payment_date: '',
    description: '',
    receipt_number: '',
    status: 'completed' as 'completed' | 'pending' | 'partial' | 'overdue' | 'failed' | 'refunded',
    notes: '',
    discount_amount: '',
    tax_amount: '',
    total_amount_due: '',
    amount_paid: '',
  })

  // حساب المبلغ المتبقي تلقائياً
  const calculateRemainingBalance = () => {
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const amountPaid = parseFloat(formData.amount_paid) || parseFloat(formData.amount) || 0
    return Math.max(0, totalAmountDue - amountPaid)
  }

  // حساب المبلغ الإجمالي للدفعة
  const calculateTotalAmount = () => {
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = parseFloat(formData.tax_amount) || 0
    const discountAmount = parseFloat(formData.discount_amount) || 0
    return amount + taxAmount - discountAmount
  }

  useEffect(() => {
    if (payment && open) {
      setFormData({
        patient_id: payment.patient_id || '',
        appointment_id: payment.appointment_id || 'none',
        amount: payment.amount.toString(),
        payment_method: payment.payment_method,
        payment_date: payment.payment_date.split('T')[0],
        description: payment.description || '',
        receipt_number: payment.receipt_number || '',
        status: payment.status,
        notes: payment.notes || '',
        discount_amount: payment.discount_amount?.toString() || '',
        tax_amount: payment.tax_amount?.toString() || '',
        total_amount_due: payment.total_amount_due?.toString() || '',
        amount_paid: payment.amount_paid?.toString() || '',
      })
    }
  }, [payment, open])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.patient_id || !formData.amount || !formData.payment_date) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      })
      return
    }

    try {
      const amount = parseFloat(formData.amount)
      const discountAmount = formData.discount_amount ? parseFloat(formData.discount_amount) : 0
      const taxAmount = formData.tax_amount ? parseFloat(formData.tax_amount) : 0
      const totalAmount = amount + taxAmount - discountAmount
      const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : totalAmount
      const amountPaid = formData.amount_paid ? parseFloat(formData.amount_paid) : amount
      const remainingBalance = totalAmountDue - amountPaid

      const paymentData = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description,
        receipt_number: formData.receipt_number,
        status: formData.status,
        notes: formData.notes,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        tax_amount: taxAmount > 0 ? taxAmount : undefined,
        total_amount: totalAmount,
        total_amount_due: totalAmountDue,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
      }

      await updatePayment(payment.id, paymentData)

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث الدفعة بنجاح',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الدفعة',
        variant: 'destructive',
      })
    }
  }

  const filteredAppointments = appointments.filter(
    appointment => appointment.patient_id === formData.patient_id
  )

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
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir="rtl">
          {/* Header */}
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">تعديل الدفعة</h2>
            <p className="text-gray-600 mt-2">
              تعديل بيانات الدفعة رقم {payment.receipt_number || payment.id.slice(-6)}
            </p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient_id">المريض *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(value) => handleInputChange('patient_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المريض" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appointment Selection */}
            <div className="space-y-2">
              <Label htmlFor="appointment_id">الموعد (اختياري)</Label>
              <Select
                value={formData.appointment_id}
                onValueChange={(value) => handleInputChange('appointment_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموعد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون موعد</SelectItem>
                  {filteredAppointments.map((appointment) => (
                    <SelectItem key={appointment.id} value={appointment.id}>
                      {appointment.title} - {new Date(appointment.start_time).toLocaleDateString('ar-SA')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">طريقة الدفع</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="insurance">تأمين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Date and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">تاريخ الدفع *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="partial">جزئي</SelectItem>
                    <SelectItem value="overdue">متأخر</SelectItem>
                    <SelectItem value="failed">فاشل</SelectItem>
                    <SelectItem value="refunded">مسترد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_amount">مبلغ الخصم</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => handleInputChange('discount_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_amount">مبلغ الضريبة</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={(e) => handleInputChange('tax_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Payment Tracking Section */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-gray-900">تتبع المدفوعات</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Amount Due */}
                <div className="space-y-2">
                  <Label htmlFor="total_amount_due">المبلغ الإجمالي المطلوب</Label>
                  <Input
                    id="total_amount_due"
                    type="number"
                    step="0.01"
                    value={formData.total_amount_due}
                    onChange={(e) => handleInputChange('total_amount_due', e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">المبلغ الكامل المطلوب للعلاج أو الخدمة</p>
                </div>

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label htmlFor="amount_paid">إجمالي المبلغ المدفوع</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    onChange={(e) => handleInputChange('amount_paid', e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">إجمالي المبلغ المدفوع حتى الآن (شامل هذه الدفعة)</p>
                </div>
              </div>

              {/* Remaining Balance Display */}
              {formData.total_amount_due && (
                <div className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">المبلغ المتبقي:</span>
                    <span className={`text-lg font-bold ${calculateRemainingBalance() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculateRemainingBalance().toFixed(2)} ريال
                    </span>
                  </div>
                  {calculateRemainingBalance() === 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ تم سداد المبلغ بالكامل</p>
                  )}
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-white p-3 rounded border">
                <h5 className="text-sm font-medium mb-2">ملخص هذه الدفعة:</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>المبلغ الأساسي:</span>
                    <span>{(parseFloat(formData.amount) || 0).toFixed(2)} ريال</span>
                  </div>
                  {formData.tax_amount && (
                    <div className="flex justify-between">
                      <span>الضريبة:</span>
                      <span>+{(parseFloat(formData.tax_amount) || 0).toFixed(2)} ريال</span>
                    </div>
                  )}
                  {formData.discount_amount && (
                    <div className="flex justify-between">
                      <span>الخصم:</span>
                      <span className="text-green-600">-{(parseFloat(formData.discount_amount) || 0).toFixed(2)} ريال</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>إجمالي هذه الدفعة:</span>
                    <span>{calculateTotalAmount().toFixed(2)} ريال</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt_number">رقم الإيصال</Label>
              <Input
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                placeholder="رقم الإيصال"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="وصف الدفعة"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="ملاحظات إضافية"
                rows={3}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
