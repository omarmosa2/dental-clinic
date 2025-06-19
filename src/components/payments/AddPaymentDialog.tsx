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
import { CreditCard, DollarSign, Receipt, Calculator, Sparkles } from 'lucide-react'
import type { Payment } from '@/types'

interface AddPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddPaymentDialog({ open, onOpenChange }: AddPaymentDialogProps) {
  console.log('AddPaymentDialog rendered, open:', open)

  const { toast } = useToast()
  const { createPayment, isLoading, getPaymentsByPatient } = usePaymentStore()
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

  // حساب إجمالي المدفوعات السابقة للمريض
  const calculatePreviousPayments = (patientId: string) => {
    if (!patientId) return 0
    const patientPayments = getPaymentsByPatient(patientId)
    return patientPayments.reduce((total, payment) => total + payment.amount, 0)
  }

  // جلب تكلفة الموعد تلقائياً
  const getAppointmentCost = (appointmentId: string) => {
    if (!appointmentId || appointmentId === 'none') return 0
    const appointment = appointments.find(apt => apt.id === appointmentId)
    return appointment?.cost || 0
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

  // حساب المبلغ الإجمالي للدفعة
  const calculateTotalAmount = () => {
    const amount = parseFloat(formData.amount) || 0
    const taxAmount = parseFloat(formData.tax_amount) || 0
    const discountAmount = parseFloat(formData.discount_amount) || 0
    return amount + taxAmount - discountAmount
  }

  // تحديث الحسابات التلقائية عند تغيير المريض
  useEffect(() => {
    if (formData.patient_id) {
      setAutoCalculations(prev => ({ ...prev, isCalculating: true }))

      const previousPayments = calculatePreviousPayments(formData.patient_id)
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
    }
  }, [formData.patient_id])

  // تحديث المبلغ المطلوب عند تغيير الموعد
  useEffect(() => {
    if (formData.appointment_id && formData.appointment_id !== 'none') {
      const appointmentCost = getAppointmentCost(formData.appointment_id)
      if (appointmentCost > 0 && !formData.total_amount_due) {
        setFormData(prev => ({
          ...prev,
          total_amount_due: appointmentCost.toString()
        }))
      }
    }
  }, [formData.appointment_id])

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

    // التحقق من أن المبلغ المدفوع في هذه الدفعة لا يتجاوز المبلغ المتبقي
    const totalAmountDue = parseFloat(formData.total_amount_due) || 0
    const currentAmount = parseFloat(formData.amount) || 0
    const remainingBeforeThisPayment = totalAmountDue - autoCalculations.previousPayments

    if (totalAmountDue > 0 && currentAmount > remainingBeforeThisPayment) {
      newErrors.amount = `مبلغ هذه الدفعة لا يمكن أن يكون أكبر من المبلغ المتبقي (${remainingBeforeThisPayment.toFixed(2)} ريال)`
    }

    // التحقق من أن إجمالي المدفوعات لا يتجاوز المبلغ المطلوب
    const totalPaid = calculateTotalAmountPaid()
    if (totalAmountDue > 0 && totalPaid > totalAmountDue) {
      newErrors.amount = 'إجمالي المدفوعات لا يمكن أن يتجاوز المبلغ الإجمالي المطلوب'
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
      const amountPaid = calculateTotalAmountPaid() // استخدام الحساب التلقائي
      const remainingBalance = totalAmountDue - amountPaid

      const paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'> = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description || undefined,
        receipt_number: formData.receipt_number || autoCalculations.suggestedReceiptNumber, // استخدام الرقم المولد تلقائياً
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
                    <SelectTrigger className={errors.patient_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="اختر المريض" />
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
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموعد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون موعد محدد</SelectItem>
                      {filteredAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.title} - {new Date(appointment.start_time).toLocaleDateString('ar-SA')}
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
                    onValueChange={(value: 'cash' | 'card' | 'bank_transfer' | 'check' | 'insurance') =>
                      setFormData(prev => ({ ...prev, payment_method: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة الدفع" />
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
                  <Label className="text-foreground font-medium">الحالة</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'completed' | 'pending' | 'partial' | 'overdue' | 'failed' | 'refunded') =>
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="pending">معلق</SelectItem>
                      <SelectItem value="partial">جزئي</SelectItem>
                      <SelectItem value="overdue">متأخر</SelectItem>
                      <SelectItem value="failed">فاشل</SelectItem>
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
                تتبع المدفوعات التلقائي
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                تتبع المبالغ المطلوبة والمدفوعة والمتبقية مع الحسابات التلقائية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Calculations Info */}
              {formData.patient_id && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-primary">الحسابات التلقائية</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المدفوعات السابقة:</span>
                        <span className="font-medium text-foreground">{autoCalculations.previousPayments.toFixed(2)} ريال</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم الإيصال المقترح:</span>
                        <span className="font-medium text-xs text-foreground">{autoCalculations.suggestedReceiptNumber}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Amount Due */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium">
                    المبلغ الإجمالي المطلوب
                    {formData.appointment_id !== 'none' && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 ml-1" />
                        تلقائي
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.total_amount_due}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount_due: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.appointment_id !== 'none'
                      ? 'تم جلب المبلغ من الموعد المحدد تلقائياً'
                      : 'المبلغ الكامل المطلوب للعلاج أو الخدمة'
                    }
                  </p>
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
                    ✓ محسوب تلقائياً: المدفوعات السابقة ({autoCalculations.previousPayments.toFixed(2)}) + هذه الدفعة ({(parseFloat(formData.amount) || 0).toFixed(2)})
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
                        {calculateRemainingBalance().toFixed(2)} ريال
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
                    <span className="font-medium text-foreground">{(parseFloat(formData.amount) || 0).toFixed(2)} ريال</span>
                  </div>
                  {formData.tax_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الضريبة:</span>
                      <span className="text-orange-600 dark:text-orange-400 font-medium">+{(parseFloat(formData.tax_amount) || 0).toFixed(2)} ريال</span>
                    </div>
                  )}
                  {formData.discount_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخصم:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{(parseFloat(formData.discount_amount) || 0).toFixed(2)} ريال</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t border-border pt-2">
                    <span className="text-foreground">إجمالي هذه الدفعة:</span>
                    <Badge variant="outline" className="text-base">
                      {calculateTotalAmount().toFixed(2)} ريال
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
