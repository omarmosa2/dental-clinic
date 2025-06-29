import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { CreditCard, DollarSign, Receipt, Calculator, Sparkles, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preSelectedPatientId?: string
}

export default function AddPaymentDialog({ open, onOpenChange, preSelectedPatientId }: AddPaymentDialogProps) {

  const { toast } = useToast()
  const { createPayment, isLoading, getPaymentsByPatient, getPaymentsByAppointment } = usePaymentStore()
  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: 'none',
    amount: '',
    payment_method: 'cash' as 'cash' | 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_number: '',
    status: 'completed' as 'completed' | 'partial' | 'pending',
    notes: '',
    discount_amount: '',
    tax_amount: '',
    total_amount_due: '',
    amount_paid: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoCalculations, setAutoCalculations] = useState({
    previousPayments: 0,
    suggestedReceiptNumber: '',
    isCalculating: false
  })

  // توليد رقم إيصال تلقائي احترافي
  const generateReceiptNumber = () => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const time = now.getTime().toString().slice(-4)
    return `RCP-${year}${month}${day}-${time}`
  }

  // حساب إجمالي المدفوعات السابقة للموعد المحدد
  const calculatePreviousPayments = (appointmentId: string) => {
    if (!appointmentId || appointmentId === 'none') return 0
    const appointmentPayments = getPaymentsByAppointment(appointmentId)
    return appointmentPayments.reduce((total, payment) => total + payment.amount, 0)
  }

  // الحصول على المبلغ الإجمالي المطلوب (من الإدخال اليدوي)
  const getTotalAmountDue = () => {
    return parseFloat(formData.total_amount_due) || 0
  }

  // حساب إجمالي المبلغ المدفوع تلقائياً (المدفوعات السابقة + الدفعة الحالية)
  const calculateTotalAmountPaid = () => {
    const currentAmount = parseFloat(formData.amount) || 0
    return autoCalculations.previousPayments + currentAmount
  }

  // حساب المبلغ المتبقي تلقائياً
  const calculateRemainingBalance = () => {
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const totalPaid = calculateTotalAmountPaid()
    return Math.max(0, totalAmountDue - totalPaid)
  }

  // اقتراح الحالة تلقائياً بناءً على المبلغ
  const getSuggestedStatus = (): 'completed' | 'partial' | 'pending' => {
    const amount = parseFloat(formData.amount) || 0
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0

    if (totalAmountDue > 0) {
      if (formData.appointment_id && formData.appointment_id !== 'none') {
        // للمدفوعات المرتبطة بموعد - استخدام المبلغ الإجمالي المدخل يدوياً
        const previousPayments = autoCalculations.previousPayments
        const newTotalPaid = previousPayments + amount

        if (newTotalPaid >= totalAmountDue) {
          return 'completed'
        } else if (newTotalPaid > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      } else {
        // للمدفوعات العامة
        const amountPaid = calculateTotalAmountPaid()

        if (amountPaid >= totalAmountDue) {
          return 'completed'
        } else if (amountPaid > 0) {
          return 'partial'
        } else {
          return 'pending'
        }
      }
    }

    return 'completed' // افتراضي
  }

  // حساب المبلغ الإجمالي للدفعة
  const calculateTotalAmount = () => {
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = parseFloat(formData.tax_amount) || 0
    const discountAmount = parseFloat(formData.discount_amount) || 0
    return amount + taxAmount - discountAmount
  }

  // تحديث الحسابات التلقائية عند تغيير الموعد
  useEffect(() => {
    if (formData.appointment_id && formData.appointment_id !== 'none') {
      setAutoCalculations(prev => ({ ...prev, isCalculating: true }))

      const previousPayments = calculatePreviousPayments(formData.appointment_id)
      const suggestedReceiptNumber = generateReceiptNumber()

      setAutoCalculations({
        previousPayments,
        suggestedReceiptNumber,
        isCalculating: false
      })

      // تحديث رقم الإيصال إذا كان فارغاً
      if (!formData.receipt_number) {
        setFormData(prev => ({ ...prev, receipt_number: suggestedReceiptNumber }))
      }
    } else {
      // إذا لم يتم اختيار موعد، اجعل المدفوعات السابقة = 0
      setAutoCalculations(prev => ({
        ...prev,
        previousPayments: 0,
        suggestedReceiptNumber: generateReceiptNumber()
      }))
    }
  }, [formData.appointment_id])

  // ملاحظة: المبلغ الإجمالي المطلوب يتم إدخاله يدوياً بالكامل
  // لا نحتاج لتحديثه تلقائياً من تكلفة الموعد

  // تحديث إجمالي المبلغ المدفوع تلقائياً
  useEffect(() => {
    if (formData.amount && autoCalculations.previousPayments >= 0) {
      const totalPaid = calculateTotalAmountPaid()
      setFormData(prev => ({
        ...prev,
        amount_paid: totalPaid.toString()
      }))
    }
  }, [formData.amount, autoCalculations.previousPayments])

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
      setAutoCalculations({
        previousPayments: 0,
        suggestedReceiptNumber: '',
        isCalculating: false
      })
    }
  }, [open])

  // Separate useEffect for pre-selected patient (only when dialog opens)
  useEffect(() => {
    if (open && preSelectedPatientId) {
      setFormData(prev => ({
        ...prev,
        patient_id: preSelectedPatientId
      }))
    }
  }, [open, preSelectedPatientId])

  // تحديث الحالة تلقائياً عند تغيير المبلغ أو المبلغ الإجمالي
  useEffect(() => {
    if (formData.amount && parseFloat(formData.amount) > 0 && formData.total_amount_due && parseFloat(formData.total_amount_due) > 0) {
      const suggestedStatus = getSuggestedStatus()
      setFormData(prev => ({
        ...prev,
        status: suggestedStatus
      }))
    }
  }, [formData.amount, formData.total_amount_due, formData.appointment_id, autoCalculations.previousPayments])

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

    // التحقق من المبلغ الإجمالي المطلوب (اختياري)
    // إذا تم إدخاله، يجب أن يكون أكبر من صفر
    if (formData.total_amount_due && parseFloat(formData.total_amount_due) <= 0) {
      newErrors.total_amount_due = 'المبلغ الإجمالي المطلوب يجب أن يكون أكبر من صفر'
    }

    console.log('🔍 Validation check:', {
      total_amount_due: formData.total_amount_due,
      amount: formData.amount,
      patient_id: formData.patient_id,
      payment_method: formData.payment_method,
      errors: newErrors
    })

    // التحقق من صحة المبلغ
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const currentAmount = parseFloat(formData.amount) || 0

    if (formData.appointment_id && formData.appointment_id !== 'none') {
      // للمدفوعات المرتبطة بموعد - استخدام المبلغ الإجمالي المدخل
      const remainingBeforeThisPayment = totalAmountDue - autoCalculations.previousPayments

      if (totalAmountDue > 0 && currentAmount > remainingBeforeThisPayment) {
        newErrors.amount = `مبلغ هذه الدفعة لا يمكن أن يكون أكبر من المبلغ المتبقي (${remainingBeforeThisPayment.toFixed(2)} $)`
      }

      if (currentAmount <= 0) {
        newErrors.amount = 'يجب أن يكون مبلغ الدفعة أكبر من صفر'
      }
    } else {
      // للمدفوعات العامة غير المرتبطة بموعد
      const totalPaid = calculateTotalAmountPaid()

      if (totalAmountDue > 0 && totalPaid > totalAmountDue) {
        newErrors.amount = 'إجمالي المدفوعات لا يمكن أن يتجاوز المبلغ الإجمالي المطلوب'
      }

      if (currentAmount <= 0) {
        newErrors.amount = 'يجب أن يكون مبلغ الدفعة أكبر من صفر'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Starting form submission...')
    console.log('📝 Current form data:', formData)

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    console.log('✅ Form validation passed')

    try {
      const amount = parseFloat(formData.amount)
      const discountAmount = formData.discount_amount ? parseFloat(formData.discount_amount) : 0
      const taxAmount = formData.tax_amount ? parseFloat(formData.tax_amount) : 0
      const totalAmount = amount + taxAmount - discountAmount

      // استخدام الحالة المحددة في النموذج (التي تم تحديدها تلقائياً أو يدوياً)
      const finalStatus = formData.status

      const paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'> = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || undefined,
        receipt_number: formData.receipt_number || autoCalculations.suggestedReceiptNumber,
        status: finalStatus, // استخدام الحالة المحددة في النموذج
        notes: formData.notes || undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        tax_amount: taxAmount > 0 ? taxAmount : undefined,
        total_amount: totalAmount,
      }

      // إضافة المبلغ الإجمالي المطلوب لجميع المدفوعات
      const totalAmountDue = formData.total_amount_due ? parseFloat(formData.total_amount_due) : totalAmount
      paymentData.total_amount_due = totalAmountDue

      // إضافة البيانات الخاصة بالمواعيد أو المدفوعات العامة
      if (formData.appointment_id && formData.appointment_id !== 'none') {
        // دفعة مرتبطة بموعد - استخدام المبلغ الإجمالي المدخل يدوياً
        paymentData.appointment_total_cost = totalAmountDue

        // حساب المبلغ المدفوع والمتبقي للموعد
        const amountPaid = calculateTotalAmountPaid()
        const remainingBalance = totalAmountDue - amountPaid
        paymentData.amount_paid = amountPaid
        paymentData.remaining_balance = remainingBalance
      } else {
        // دفعة عامة غير مرتبطة بموعد
        const amountPaid = calculateTotalAmountPaid()
        const remainingBalance = totalAmountDue - amountPaid

        paymentData.amount_paid = amountPaid
        paymentData.remaining_balance = remainingBalance
      }

      console.log('💰 Submitting payment data:', paymentData)
      console.log('📊 Form data before submit:', formData)
      console.log('🔍 Total amount due being sent:', totalAmountDue)
      console.log('🔍 Payment data total_amount_due:', paymentData.total_amount_due)

      const result = await createPayment(paymentData)
      console.log('✅ Payment created successfully:', result)

      toast({
        title: 'تم بنجاح',
        description: 'تم تسجيل الدفعة بنجاح',
      })

      // إعادة تعيين النموذج
      setFormData({
        patient_id: preSelectedPatientId || '',
        appointment_id: 'none',
        amount: '',
        payment_method: 'cash' as 'cash' | 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_number: '',
        status: 'completed' as 'completed' | 'partial' | 'pending',
        notes: '',
        discount_amount: '',
        tax_amount: '',
        total_amount_due: '',
        amount_paid: '',
      })

      onOpenChange(false)
    } catch (error) {
      console.error('❌ Failed to submit payment:', error)
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تسجيل الدفعة',
        variant: 'destructive',
      })
    }
  }

  const filteredAppointments = appointments.filter(
    appointment => appointment.patient_id === formData.patient_id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center text-xl font-semibold text-foreground">
            <CreditCard className="w-5 h-5 ml-2 text-primary" />
            تسجيل دفعة جديدة
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            أدخل تفاصيل الدفعة الجديدة وتتبع المدفوعات
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient and Appointment Selection */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Receipt className="w-4 h-4 ml-2 text-primary" />
                معلومات المريض والموعد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">المريض *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      patient_id: value,
                      appointment_id: 'none'
                    }))}
                  >
                    <SelectTrigger className={errors.patient_id ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}>
                      <SelectValue placeholder="اختر المريض" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.patient_id && (
                    <p className="text-sm text-destructive">{errors.patient_id}</p>
                  )}
                </div>

                {/* Appointment Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">الموعد (اختياري)</Label>
                  <Select
                    value={formData.appointment_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, appointment_id: value }))}
                    disabled={!formData.patient_id}
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر الموعد" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون موعد محدد</SelectItem>
                      {filteredAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.title} - {formatDate(appointment.start_time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Fields */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <DollarSign className="w-4 h-4 ml-2 text-primary" />
                تفاصيل المبالغ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className={errors.amount ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount}</p>
                  )}
                </div>

                {/* Discount Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">مبلغ الخصم</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                {/* Tax Amount */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">مبلغ الضريبة</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <CreditCard className="w-4 h-4 ml-2 text-primary" />
                تفاصيل الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">طريقة الدفع</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: 'cash' | 'bank_transfer') =>
                      setFormData(prev => ({ ...prev, payment_method: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر طريقة الدفع" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">تاريخ الدفع *</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className={errors.payment_date ? 'border-destructive bg-background text-foreground' : 'bg-background border-input text-foreground'}
                  />
                  {errors.payment_date && (
                    <p className="text-sm text-destructive">{errors.payment_date}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">
                    الحالة
                    {formData.amount && parseFloat(formData.amount) > 0 && (
                      <span className="text-xs text-muted-foreground mr-2">
                        (مقترح: {getSuggestedStatus() === 'completed' ? 'مكتمل' :
                                getSuggestedStatus() === 'partial' ? 'جزئي' : 'معلق'})
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'completed' | 'partial' | 'pending') =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue placeholder="اختر الحالة" className="text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <span>مكتمل</span>
                          {getSuggestedStatus() === 'completed' && (
                            <span className="text-xs text-green-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="partial">
                        <div className="flex items-center gap-2">
                          <span>جزئي</span>
                          {getSuggestedStatus() === 'partial' && (
                            <span className="text-xs text-orange-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <span>معلق</span>
                          {getSuggestedStatus() === 'pending' && (
                            <span className="text-xs text-blue-600">✓ مقترح</span>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Tracking Section */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Sparkles className="w-4 h-4 ml-2 text-primary" />
                تتبع المدفوعات للموعد
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                تتبع دقيق للمدفوعات والرصيد المتبقي لكل موعد على حدة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Appointment Payment Summary */}
              {formData.appointment_id && formData.appointment_id !== 'none' && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-primary">ملخص مدفوعات الموعد</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ الإجمالي المطلوب:</span>
                        <span className="font-medium text-foreground">{getTotalAmountDue().toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المدفوع سابقاً:</span>
                        <span className="font-medium text-foreground">{autoCalculations.previousPayments.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المتبقي قبل هذه الدفعة:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {(getTotalAmountDue() - autoCalculations.previousPayments).toFixed(2)} $
                        </span>
                      </div>
                    </div>
                    {formData.amount && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المتبقي بعد هذه الدفعة:</span>
                          <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                            {calculateRemainingBalance().toFixed(2)} $
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {formData.appointment_id === 'none' && (
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/30 border-yellow-200 dark:border-yellow-800 shadow-sm transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">دفعة عامة غير مرتبطة بموعد</span>
                    </div>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      هذه دفعة عامة غير مرتبطة بموعد محدد، يمكنك تحديد المبلغ المطلوب يدوياً
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Amount Due */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium">
                    المبلغ الإجمالي المطلوب
                    <Badge variant="secondary" className="text-xs">
                      اختياري
                    </Badge>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="أدخل المبلغ الإجمالي المطلوب (اختياري)"
                    value={formData.total_amount_due}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount_due: e.target.value }))}
                    className={`bg-background border-input text-foreground ${errors.total_amount_due ? 'border-destructive' : ''}`}
                  />
                  {errors.total_amount_due && (
                    <p className="text-sm text-destructive">{errors.total_amount_due}</p>
                  )}
                  {!errors.total_amount_due && (
                    <p className="text-xs text-muted-foreground">
                      💡 إدخال المبلغ الإجمالي يساعد في تتبع المدفوعات الجزئية
                    </p>
                  )}
                </div>

                {/* Amount Paid */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium">
                    إجمالي المبلغ المدفوع
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="w-3 h-3 ml-1" />
                      محسوب تلقائياً
                    </Badge>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount_paid}
                    readOnly
                    className="bg-muted cursor-not-allowed border-input text-foreground font-medium"
                  />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ محسوب تلقائياً: المدفوعات السابقة (${autoCalculations.previousPayments.toFixed(2)}) + هذه الدفعة (${(parseFloat(formData.amount) || 0).toFixed(2)})
                  </p>
                </div>
              </div>

              {/* Remaining Balance Display */}
              {formData.total_amount_due && (
                <Card className={`shadow-sm transition-all duration-200 ${
                  calculateRemainingBalance() > 0
                    ? "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800"
                    : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">المبلغ المتبقي:</span>
                      <Badge variant={calculateRemainingBalance() > 0 ? "destructive" : "default"} className="text-lg px-3 py-1">
                        ${calculateRemainingBalance().toFixed(2)}
                      </Badge>
                    </div>
                    {calculateRemainingBalance() === 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2">✓ تم سداد المبلغ بالكامل</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Summary */}
              <Card className="bg-gradient-to-r from-muted/30 to-muted/50 border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-card-foreground">ملخص هذه الدفعة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبلغ الأساسي:</span>
                    <span className="font-medium text-foreground">${(parseFloat(formData.amount) || 0).toFixed(2)}</span>
                  </div>
                  {formData.tax_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة:</span>
                      <span className="text-orange-600 dark:text-orange-400 font-medium">+${(parseFloat(formData.tax_amount) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {formData.discount_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخصم:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-${(parseFloat(formData.discount_amount) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t border-border pt-2">
                    <span className="text-foreground">إجمالي هذه الدفعة:</span>
                    <Badge variant="outline" className="text-base">
                      ${calculateTotalAmount().toFixed(2)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Receipt Number */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  رقم الإيصال
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 ml-1" />
                    مولد تلقائياً
                  </Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="رقم الإيصال"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                    className="flex-1 bg-background border-input text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, receipt_number: generateReceiptNumber() }))}
                    className="px-3"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ تم توليد رقم إيصال فريد تلقائياً
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-foreground">الوصف</Label>
                <Textarea
                  placeholder="وصف الدفعة (اختياري)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-foreground">ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية (اختياري)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-end space-x-2 space-x-reverse border-t border-border pt-4">
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ الدفعة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
