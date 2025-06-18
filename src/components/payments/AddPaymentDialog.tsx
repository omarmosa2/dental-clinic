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

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddPaymentDialog({ open, onOpenChange }: AddPaymentDialogProps) {
  console.log('AddPaymentDialog rendered, open:', open)

  const { toast } = useToast()
  const { createPayment, isLoading } = usePaymentStore()
  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: 'none',
    amount: '',
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'check' | 'insurance',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_number: '',
    status: 'completed' as 'completed' | 'pending' | 'partial' | 'overdue' | 'failed' | 'refunded',
    notes: '',
    discount_amount: '',
    tax_amount: '',
    total_amount_due: '',
    amount_paid: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!open) {
      setFormData({
        patient_id: '',
        appointment_id: 'none',
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_number: '',
        status: 'completed',
        notes: '',
        discount_amount: '',
        tax_amount: '',
        total_amount_due: '',
        amount_paid: '',
      })
      setErrors({})
    }
  }, [open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.patient_id) {
      newErrors.patient_id = 'يرجى اختيار المريض'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'يرجى إدخال مبلغ صحيح'
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'يرجى اختيار تاريخ الدفع'
    }

    // التحقق من أن المبلغ المدفوع لا يتجاوز المبلغ الإجمالي المطلوب
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const amountPaid = parseFloat(formData.amount_paid) || parseFloat(formData.amount) || 0

    if (totalAmountDue > 0 && amountPaid > totalAmountDue) {
      newErrors.amount_paid = 'المبلغ المدفوع لا يمكن أن يكون أكبر من المبلغ الإجمالي المطلوب'
    }

    // التحقق من أن المبلغ المدفوع في هذه الدفعة لا يتجاوز المبلغ المتبقي
    const amount = parseFloat(formData.amount) || 0
    const remainingBalance = calculateRemainingBalance()

    if (totalAmountDue > 0 && amount > remainingBalance + amount) {
      newErrors.amount = 'مبلغ هذه الدفعة لا يمكن أن يكون أكبر من المبلغ المتبقي'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
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

      const paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'> = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || undefined,
        receipt_number: formData.receipt_number || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        tax_amount: taxAmount > 0 ? taxAmount : undefined,
        total_amount: totalAmount,
        total_amount_due: totalAmountDue,
        amount_paid: amountPaid,
        remaining_balance: remainingBalance,
      }

      await createPayment(paymentData)

      toast({
        title: 'تم بنجاح',
        description: 'تم تسجيل الدفعة بنجاح',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تسجيل الدفعة',
        variant: 'destructive',
      })
    }
  }

  const filteredAppointments = appointments.filter(
    appointment => appointment.patient_id === formData.patient_id
  )

  if (!open) {
    console.log('Dialog not open, returning null')
    return null
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border" dir="rtl">
          {/* Header */}
          <div className="border-b border-border p-6">
            <h2 className="text-xl font-semibold text-foreground">تسجيل دفعة جديدة</h2>
            <p className="text-muted-foreground mt-2">أدخل تفاصيل الدفعة الجديدة</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient and Appointment Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">المريض *</label>
                  <select
                    value={formData.patient_id}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      patient_id: e.target.value,
                      appointment_id: 'none'
                    }))}
                    className={`w-full p-2 border rounded-md bg-background text-foreground ${errors.patient_id ? 'border-destructive' : 'border-input'}`}
                  >
                    <option value="">اختر المريض</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                  {errors.patient_id && (
                    <p className="text-sm text-destructive">{errors.patient_id}</p>
                  )}
                </div>

                {/* Appointment Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">الموعد (اختياري)</label>
                  <select
                    value={formData.appointment_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_id: e.target.value }))}
                    disabled={!formData.patient_id}
                    className="w-full p-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  >
                    <option value="none">اختر الموعد</option>
                    {filteredAppointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.title} - {new Date(appointment.start_time).toLocaleDateString('ar-SA')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">المبلغ *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className={`w-full p-2 border rounded-md ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount}</p>
                  )}
                </div>

                {/* Discount Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">مبلغ الخصم</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* Tax Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">مبلغ الضريبة</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">طريقة الدفع</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="cash">نقداً</option>
                    <option value="card">بطاقة ائتمان</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="check">شيك</option>
                    <option value="insurance">تأمين</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ الدفع *</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className={`w-full p-2 border rounded-md ${errors.payment_date ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.payment_date && (
                    <p className="text-sm text-red-500">{errors.payment_date}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">الحالة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="completed">مكتمل</option>
                    <option value="pending">معلق</option>
                    <option value="partial">جزئي</option>
                    <option value="overdue">متأخر</option>
                    <option value="failed">فاشل</option>
                  </select>
                </div>
              </div>

              {/* Payment Tracking Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <h4 className="font-medium text-foreground">تتبع المدفوعات</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Amount Due */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المبلغ الإجمالي المطلوب</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.total_amount_due}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_amount_due: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500">المبلغ الكامل المطلوب للعلاج أو الخدمة</p>
                  </div>

                  {/* Amount Paid */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">إجمالي المبلغ المدفوع</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: e.target.value }))}
                      className={`w-full p-2 border rounded-md ${errors.amount_paid ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.amount_paid && (
                      <p className="text-sm text-red-500">{errors.amount_paid}</p>
                    )}
                    <p className="text-xs text-gray-500">إجمالي المبلغ المدفوع حتى الآن (شامل هذه الدفعة)</p>
                  </div>
                </div>

                {/* Remaining Balance Display */}
                {formData.total_amount_due && (
                  <div className="bg-card border border-border p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">المبلغ المتبقي:</span>
                      <span className={`text-lg font-bold ${calculateRemainingBalance() > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {calculateRemainingBalance().toFixed(2)} ريال
                      </span>
                    </div>
                    {calculateRemainingBalance() === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ تم سداد المبلغ بالكامل</p>
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

              {/* Receipt Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الإيصال</label>
                <input
                  type="text"
                  placeholder="رقم الإيصال (اختياري)"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <textarea
                  placeholder="وصف الدفعة (اختياري)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <textarea
                  placeholder="ملاحظات إضافية (اختياري)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="px-4 py-2 border border-input rounded-md text-foreground hover:bg-accent disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
