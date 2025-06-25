import React, { useState, useEffect } from 'react'
import { Patient, Appointment, Payment } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Heart,
  AlertTriangle,
  Edit,
  X
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'

interface PatientDetailsModalProps {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (patient: Patient) => void
}

export default function PatientDetailsModal({
  patient,
  open,
  onOpenChange,
  onEdit
}: PatientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([])
  const [patientPayments, setPatientPayments] = useState<Payment[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)

  const { appointments } = useAppointmentStore()
  const { payments } = usePaymentStore()

  useEffect(() => {
    if (patient && open) {
      // Filter appointments for this patient
      setIsLoadingAppointments(true)
      const filteredAppointments = appointments.filter(apt => apt.patient_id === patient.id)
      setPatientAppointments(filteredAppointments)
      setIsLoadingAppointments(false)

      // Filter payments for this patient
      setIsLoadingPayments(true)
      const filteredPayments = payments.filter(payment => payment.patient_id === patient.id)
      setPatientPayments(filteredPayments)
      setIsLoadingPayments(false)
    }
  }, [patient, open, appointments, payments])

  if (!patient) return null

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: 'مجدول', variant: 'default' as const },
      completed: { label: 'مكتمل', variant: 'default' as const },
      cancelled: { label: 'ملغي', variant: 'destructive' as const },
      no_show: { label: 'لم يحضر', variant: 'secondary' as const },
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      completed: { label: 'مكتمل', variant: 'default' as const },
      partial: { label: 'جزئي', variant: 'outline' as const },
      pending: { label: 'معلق', variant: 'secondary' as const }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <DialogTitle className="text-xl arabic-enhanced text-right">
                تفاصيل المريض - {patient.full_name}
              </DialogTitle>
              <DialogDescription className="arabic-enhanced text-right">
                معلومات شاملة عن المريض وسجلاته الطبية
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(patient)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="arabic-enhanced flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              معلومات المريض
            </TabsTrigger>
            <TabsTrigger value="appointments" className="arabic-enhanced flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              المواعيد ({patientAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="arabic-enhanced flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              المدفوعات ({patientPayments.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-right">
                      <User className="w-5 h-5" />
                      المعلومات الأساسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">#{patient.serial_number}</Badge>
                      <span className="text-muted-foreground">الرقم التسلسلي:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{patient.full_name}</span>
                      <span className="text-muted-foreground">الاسم الكامل:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={patient.gender === 'male' ? 'default' : 'secondary'}>
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <span className="text-muted-foreground">الجنس:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{patient.age} سنة</span>
                      <span className="text-muted-foreground">العمر:</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{formatDate(patient.created_at)}</span>
                      <span className="text-muted-foreground">تاريخ التسجيل:</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-right">
                      <Phone className="w-5 h-5" />
                      معلومات الاتصال
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      {patient.phone ? (
                        <div className="flex items-center gap-2">
                          <span>{patient.phone}</span>
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">رقم الهاتف:</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {patient.email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{patient.email}</span>
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">البريد الإلكتروني:</span>
                    </div>
                    <div className="flex items-start justify-between">
                      {patient.address ? (
                        <div className="flex items-start gap-2 max-w-[200px]">
                          <span className="text-sm text-right">{patient.address}</span>
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">غير محدد</span>
                      )}
                      <span className="text-muted-foreground">العنوان:</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Medical Information */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-right">
                      <Heart className="w-5 h-5" />
                      المعلومات الطبية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                        <FileText className="w-4 h-4" />
                        حالة المريض
                      </h4>
                      <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.patient_condition}</p>
                    </div>

                    {patient.allergies && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600 dark:text-orange-400 text-right">
                          <AlertTriangle className="w-4 h-4" />
                          الحساسية
                        </h4>
                        <div className="text-sm bg-orange-50 dark:bg-yellow-900 border border-orange-200 dark:border-yellow-600 p-3 rounded-md text-orange-900 dark:text-yellow-100 text-right">
                          {patient.allergies}
                        </div>
                      </div>
                    )}

                    {patient.medical_conditions && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                          <Heart className="w-4 h-4" />
                          الحالات الطبية
                        </h4>
                        <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.medical_conditions}</p>
                      </div>
                    )}

                    {patient.notes && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-right">
                          <FileText className="w-4 h-4" />
                          ملاحظات إضافية
                        </h4>
                        <p className="text-sm bg-muted p-3 rounded-md text-right">{patient.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="appointments" className="space-y-4">
              {isLoadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد مواعيد</h3>
                      <p className="text-muted-foreground">لم يتم تحديد أي مواعيد لهذا المريض بعد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-right">
                      <Calendar className="w-5 h-5" />
                      جدول المواعيد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الحالة
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              التكلفة
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الوقت
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              التاريخ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              العنوان
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                              الرقم التسلسلي
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {patientAppointments.map((appointment, index) => {
                            const status = getStatusBadge(appointment.status)
                            return (
                              <tr key={appointment.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 text-sm">
                                  <Badge variant={status.variant}>{status.label}</Badge>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium">
                                  {appointment.cost ? (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {formatCurrency(appointment.cost)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                  {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {formatDate(appointment.start_time)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {appointment.title}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-foreground">
                                  {index + 1}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* تفاصيل إضافية للمواعيد */}
                    {patientAppointments.some(a => a.description) && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-foreground">تفاصيل إضافية:</h4>
                        {patientAppointments.map((appointment) => (
                          appointment.description && (
                            <div key={`desc-${appointment.id}`} className="p-3 bg-muted/30 rounded border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-foreground">
                                  {appointment.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(appointment.start_time)} - {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">الوصف: </span>
                                <span className="text-xs text-foreground">{appointment.description}</span>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : patientPayments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد مدفوعات</h3>
                      <p className="text-muted-foreground">لم يتم تسجيل أي مدفوعات لهذا المريض بعد</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Payment Summary */}
                  {(() => {
                    // حساب الملخص المالي
                    const totalAmountDue = patientPayments.reduce((sum, payment) =>
                      sum + (payment.total_amount_due || 0), 0)
                    const totalAmountPaid = patientPayments.reduce((sum, payment) =>
                      sum + (payment.amount_paid || payment.amount || 0), 0)
                    const totalRemainingBalance = patientPayments.reduce((sum, payment) =>
                      sum + (payment.remaining_balance || 0), 0)

                    return (
                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-border">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-primary text-right">
                            <DollarSign className="w-5 h-5" />
                            ملخص المدفوعات
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* جدول ملخص المدفوعات */}
                          <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                            <table className="w-full">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    المبلغ
                                  </th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    البيان
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-background divide-y divide-border">
                                <tr>
                                  <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(totalAmountDue)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    الإجمالي المطلوب
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(totalAmountPaid)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    المبلغ المدفوع
                                  </td>
                                </tr>
                                <tr className="bg-muted/50">
                                  <td className="px-4 py-3 text-sm font-bold">
                                    <span className={totalRemainingBalance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                      {formatCurrency(totalRemainingBalance)}
                                    </span>
                                    {totalRemainingBalance === 0 && (
                                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ مكتمل</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                                    المبلغ المتبقي
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* Payment List as Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground text-right">
                        <DollarSign className="w-5 h-5" />
                        تفاصيل المدفوعات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg border border-border" dir="rtl">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                الحالة
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                طريقة الدفع
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                المتبقي
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                الإجمالي المطلوب
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                المبلغ المدفوع
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                تاريخ الدفع
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                الرقم التسلسلي
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-background divide-y divide-border">
                            {patientPayments.map((payment, index) => {
                              const status = getPaymentStatusBadge(payment.status)
                              return (
                                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                  <td className="px-4 py-3 text-sm">
                                    <Badge variant={status.variant}>{status.label}</Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {payment.payment_method === 'cash' ? 'نقداً' :
                                     payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                     payment.payment_method}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium">
                                    {payment.remaining_balance !== undefined ? (
                                      <span className={payment.remaining_balance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                        {formatCurrency(payment.remaining_balance)}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {payment.total_amount_due ? formatCurrency(payment.total_amount_due) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(payment.amount)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {formatDate(payment.payment_date)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {index + 1}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* تفاصيل إضافية للمدفوعات */}
                      {patientPayments.some(p => p.description || p.receipt_number) && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-foreground">تفاصيل إضافية:</h4>
                          {patientPayments.map((payment) => (
                            (payment.description || payment.receipt_number) && (
                              <div key={`details-${payment.id}`} className="p-3 bg-muted/30 rounded border border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(payment.payment_date)} - {formatCurrency(payment.amount)}
                                  </span>
                                </div>
                                {payment.description && (
                                  <div className="mb-1">
                                    <span className="text-xs text-muted-foreground">الوصف: </span>
                                    <span className="text-xs text-foreground">{payment.description}</span>
                                  </div>
                                )}
                                {payment.receipt_number && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">رقم الإيصال: </span>
                                    <span className="text-xs text-foreground">{payment.receipt_number}</span>
                                  </div>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
