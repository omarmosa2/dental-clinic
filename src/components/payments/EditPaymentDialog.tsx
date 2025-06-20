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
import { Edit, CreditCard, DollarSign, Receipt, Calculator, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

interface EditPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

export default function EditPaymentDialog({ open, onOpenChange, payment }: EditPaymentDialogProps) {
  const { toast } = useToast()
  const { updatePayment, isLoading, getPaymentsByPatient } = usePaymentStore()
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

  const [autoCalculations, setAutoCalculations] = useState({
    previousPayments: 0,
    originalAmount: 0,
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

  // حساب إجمالي المدفوعات السابقة للمريض (باستثناء هذه الدفعة)
  const calculatePreviousPayments = (patientId: string, excludePaymentId: string) => {
    if (!patientId) return 0
    const patientPayments = getPaymentsByPatient(patientId)
    return patientPayments
      .filter(p => p.id !== excludePaymentId)
      .reduce((total, payment) => total + payment.amount, 0)
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
    if (formData.patient_id && payment) {
      setAutoCalculations(prev => ({ ...prev, isCalculating: true }))

      const previousPayments = calculatePreviousPayments(formData.patient_id, payment.id)
      const originalAmount = payment.amount

      setAutoCalculations({
        previousPayments,
        originalAmount,
        isCalculating: false
      })
    }
  }, [formData.patient_id, payment])

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
      const amountPaid = calculateTotalAmountPaid() // استخدام الحساب التلقائي
      const remainingBalance = totalAmountDue - amountPaid

      const paymentData = {
        patient_id: formData.patient_id,
        appointment_id: formData.appointment_id && formData.appointment_id !== 'none' ? formData.appointment_id : undefined,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        description: formData.description,
        receipt_number: formData.receipt_number || generateReceiptNumber(), // استخدام التوليد التلقائي إذا كان فارغاً
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl" dir="rtl">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center text-xl font-semibold text-foreground">
            <Edit className="w-5 h-5 ml-2 text-primary" />
            تعديل الدفعة
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            تعديل بيانات الدفعة رقم {payment.receipt_number || payment.id.slice(-6)}
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
                  <Label htmlFor="patient_id" className="text-foreground font-medium">المريض *</Label>
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
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Appointment Selection */}
                <div className="space-y-2">
                  <Label htmlFor="appointment_id" className="text-foreground font-medium">الموعد (اختياري)</Label>
                  <Select
                    value={formData.appointment_id}
                    onValueChange={(value) => handleInputChange('appointment_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الموعد" />
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

          {/* Amount and Payment Details */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <DollarSign className="w-4 h-4 ml-2 text-primary" />
                تفاصيل المبالغ والدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-foreground font-medium">المبلغ *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method" className="text-foreground font-medium">طريقة الدفع</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => handleInputChange('payment_method', value)}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date" className="text-foreground font-medium">تاريخ الدفع *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => handleInputChange('payment_date', e.target.value)}
                    required
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground font-medium">الحالة</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
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
                      <SelectItem value="refunded">مسترد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_amount" className="text-foreground font-medium">مبلغ الخصم</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => handleInputChange('discount_amount', e.target.value)}
                    placeholder="0.00"
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_amount" className="text-foreground font-medium">مبلغ الضريبة</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => handleInputChange('tax_amount', e.target.value)}
                    placeholder="0.00"
                    className="bg-background border-input text-foreground"
                  />
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
                        <span className="text-muted-foreground">المبلغ الأصلي:</span>
                        <span className="font-medium text-foreground">{autoCalculations.originalAmount.toFixed(2)} ريال</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Amount Due */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground font-medium" htmlFor="total_amount_due">
                    المبلغ الإجمالي المطلوب
                    {formData.appointment_id !== 'none' && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 ml-1" />
                        تلقائي
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="total_amount_due"
                    type="number"
                    step="0.01"
                    value={formData.total_amount_due}
                    onChange={(e) => handleInputChange('total_amount_due', e.target.value)}
                    placeholder="0.00"
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
                  <Label className="flex items-center gap-2 text-foreground font-medium" htmlFor="amount_paid">
                    إجمالي المبلغ المدفوع
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="w-3 h-3 ml-1" />
                      محسوب تلقائياً
                    </Badge>
                  </Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    step="0.01"
                    value={formData.amount_paid}
                    readOnly
                    className="bg-muted cursor-not-allowed border-input text-foreground font-medium"
                    placeholder="0.00"
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
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground" htmlFor="receipt_number">
                  رقم الإيصال
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 ml-1" />
                    مولد تلقائياً
                  </Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="receipt_number"
                    value={formData.receipt_number}
                    onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                    placeholder="رقم الإيصال"
                    className="flex-1 bg-background border-input text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('receipt_number', generateReceiptNumber())}
                    className="px-3"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ يمكن توليد رقم إيصال جديد تلقائياً
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="وصف الدفعة"
                  rows={3}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="ملاحظات إضافية"
                  rows={3}
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-end space-x-3 space-x-reverse border-t border-border pt-4">
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
              {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
