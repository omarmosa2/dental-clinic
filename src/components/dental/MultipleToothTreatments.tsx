import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Calendar,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  XCircle
} from 'lucide-react'
import { ToothTreatment, TreatmentSession } from '@/types'
import {
  TREATMENT_TYPES,
  TREATMENT_CATEGORIES,
  TREATMENT_STATUS_OPTIONS,
  getTreatmentsByCategory,
  getTreatmentByValue,
  getCategoryInfo
} from '@/data/teethData'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import TreatmentSessions from './TreatmentSessions'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'

interface MultipleToothTreatmentsProps {
  patientId: string
  toothNumber: number
  toothName: string
  treatments: ToothTreatment[]
  onAddTreatment: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment | null>
  onUpdateTreatment: (id: string, updates: Partial<ToothTreatment>) => Promise<void>
  onDeleteTreatment: (id: string) => Promise<void>
  onReorderTreatments: (treatmentIds: string[]) => Promise<void>
  onSessionStatsUpdate?: () => void
}

export default function MultipleToothTreatments({
  patientId,
  toothNumber,
  toothName,
  treatments,
  onAddTreatment,
  onUpdateTreatment,
  onDeleteTreatment,
  onReorderTreatments,
  onSessionStatsUpdate
}: MultipleToothTreatmentsProps) {
  const { isDarkMode } = useTheme()
  const { createPayment, updatePayment, getPaymentsByPatient } = usePaymentStore()
  const { patients } = usePatientStore()
  const { labs, loadLabs } = useLabStore()
  const { createLabOrder, updateLabOrder, deleteLabOrder, getLabOrdersByTreatment } = useLabOrderStore()
  const [isAddingTreatment, setIsAddingTreatment] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)
  const [newTreatment, setNewTreatment] = useState<Partial<ToothTreatment>>({
    patient_id: patientId,
    tooth_number: toothNumber,
    tooth_name: toothName,
    treatment_status: 'planned',
    cost: 0,
    start_date: new Date().toISOString().split('T')[0] // تحديد التاريخ المحلي تلقائياً
    // priority will be auto-assigned by the database service
  })

  // Treatment Sessions state
  const [treatmentSessions, setTreatmentSessions] = useState<{ [treatmentId: string]: TreatmentSession[] }>({})
  const [selectedTreatmentForSessions, setSelectedTreatmentForSessions] = useState<string | null>(null)

  // Load labs on component mount
  useEffect(() => {
    loadLabs()
  }, [loadLabs])

  // Sort treatments by priority
  const sortedTreatments = [...treatments].sort((a, b) => a.priority - b.priority)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Clock className="w-4 h-4 text-blue-500" />
      case 'in_progress': return <PlayCircle className="w-4 h-4 text-yellow-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    const statusOption = TREATMENT_STATUS_OPTIONS.find(s => s.value === status)
    return statusOption?.color || '#6b7280'
  }

  // دالة إنشاء دفعة معلقة للعلاج
  const createPendingPaymentForTreatment = async (treatmentId: string) => {
    try {
      // الحصول على بيانات المريض
      const patient = patients.find(p => p.id === patientId)
      if (!patient) {
        notify.error('لم يتم العثور على بيانات المريض')
        return
      }

      // إنشاء وصف للدفعة
      const treatmentTypeInfo = getTreatmentByValue(newTreatment.treatment_type!)
      const description = `علاج ${treatmentTypeInfo?.label || newTreatment.treatment_type} - سن ${toothName || toothNumber}`

      // بيانات الدفعة المعلقة
      const paymentData = {
        patient_id: patientId,
        tooth_treatment_id: treatmentId, // ربط مباشر بالعلاج
        amount: 0, // مبلغ مدفوع = 0 لجعل الحالة معلقة
        payment_method: 'cash' as const,
        payment_date: new Date().toISOString().split('T')[0],
        description: description, // وصف نظيف بدون معرف العلاج
        status: 'pending' as const,
        notes: `دفعة معلقة لعلاج سن ${toothName || toothNumber}`, // ملاحظات نظيفة بدون معرف العلاج
        total_amount_due: newTreatment.cost || 0,
        amount_paid: 0,
        remaining_balance: newTreatment.cost || 0,
        treatment_total_cost: newTreatment.cost || 0,
        treatment_total_paid: 0,
        treatment_remaining_balance: newTreatment.cost || 0
      }

      await createPayment(paymentData)
      notify.success('تم إنشاء دفعة معلقة في جدول المدفوعات')
    } catch (error) {
      console.error('خطأ في إنشاء الدفعة المعلقة:', error)
      notify.error('فشل في إنشاء الدفعة المعلقة')
    }
  }

  // دالة إنشاء طلب مخبر للعلاج
  const createLabOrderForTreatment = async (treatmentId: string) => {
    if (!selectedLab || labCost <= 0) {
      return // لا نحتاج طلب مخبر إذا لم يتم اختيار مخبر أو تكلفة
    }

    try {
      const patient = patients.find(p => p.id === patientId)
      const treatmentType = getTreatmentByValue(newTreatment.treatment_type!)

      const labOrderData = {
        lab_id: selectedLab,
        patient_id: patientId,
        tooth_treatment_id: treatmentId,
        tooth_number: toothNumber,
        service_name: `${treatmentType?.label || 'علاج تعويضات'} - السن ${toothNumber}`,
        cost: labCost,
        order_date: new Date().toISOString().split('T')[0],
        status: 'معلق' as const,
        notes: `طلب مخبر للمريض: ${patient?.full_name || 'غير محدد'} - السن: ${toothName}`,
        paid_amount: 0,
        remaining_balance: labCost
      }

      await createLabOrder(labOrderData)
      notify.success('تم إنشاء طلب المخبر بنجاح')
    } catch (error) {
      console.error('خطأ في إنشاء طلب المخبر:', error)
      notify.error('فشل في إنشاء طلب المخبر')
    }
  }

  const handleAddTreatment = async () => {
    if (!newTreatment.treatment_type || !newTreatment.treatment_category) {
      notify.error('يرجى اختيار نوع العلاج والتصنيف')
      return
    }

    try {
      const treatmentData = {
        ...newTreatment,
        treatment_color: getTreatmentByValue(newTreatment.treatment_type!)?.color || '#22c55e'
      } as Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>

      const newTreatmentResult = await onAddTreatment(treatmentData)

      // إنشاء دفعة معلقة إذا تم تعبئة التكلفة وتم إنشاء العلاج بنجاح
      if (newTreatmentResult && newTreatment.cost && newTreatment.cost > 0) {
        await createPendingPaymentForTreatment(newTreatmentResult.id)
      }

      // إنشاء طلب مخبر إذا كان العلاج من فئة التعويضات وتم اختيار مخبر
      if (newTreatmentResult && newTreatment.treatment_category === 'التعويضات') {
        await createLabOrderForTreatment(newTreatmentResult.id)
      }

      // Reset form
      setNewTreatment({
        patient_id: patientId,
        tooth_number: toothNumber,
        tooth_name: toothName,
        treatment_status: 'planned',
        cost: 0,
        start_date: new Date().toISOString().split('T')[0] // تحديد التاريخ المحلي تلقائياً
        // priority will be auto-assigned by the database service
      })
      setSelectedCategory('')
      setSelectedLab('')
      setLabCost(0)
      setIsAddingTreatment(false)
      notify.success('تم إضافة العلاج بنجاح')
    } catch (error) {
      notify.error('فشل في إضافة العلاج')
    }
  }

  const handleUpdateTreatment = async (id: string, updates: Partial<ToothTreatment>) => {
    try {
      await onUpdateTreatment(id, updates)
      setEditingTreatment(null)
      notify.success('تم تحديث العلاج بنجاح')
    } catch (error) {
      notify.error('فشل في تحديث العلاج')
    }
  }

  const handleDeleteTreatment = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العلاج؟')) {
      try {
        await onDeleteTreatment(id)
        notify.success('تم حذف العلاج بنجاح')
      } catch (error) {
        notify.error('فشل في حذف العلاج')
      }
    }
  }

  const moveTreatmentUp = async (index: number) => {
    if (index === 0) return

    const newOrder = [...sortedTreatments]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp

    const treatmentIds = newOrder.map(t => t.id)
    await onReorderTreatments(treatmentIds)
  }

  const moveTreatmentDown = async (index: number) => {
    if (index === sortedTreatments.length - 1) return

    const newOrder = [...sortedTreatments]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp

    const treatmentIds = newOrder.map(t => t.id)
    await onReorderTreatments(treatmentIds)
  }

  const filteredTreatmentTypes = selectedCategory
    ? getTreatmentsByCategory(selectedCategory as any)
    : TREATMENT_TYPES

  // Treatment Sessions functions
  const loadTreatmentSessions = async (treatmentId: string) => {
    try {
      const sessions = await window.electronAPI.treatmentSessions.getByTreatment(treatmentId)
      setTreatmentSessions(prev => ({ ...prev, [treatmentId]: sessions }))
    } catch (error) {
      console.error('Error loading treatment sessions:', error)
      notify.error('فشل في تحميل جلسات العلاج')
    }
  }

  const handleAddSession = async (treatmentId: string, sessionData: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await window.electronAPI.treatmentSessions.create(sessionData)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم إضافة الجلسة بنجاح')
    } catch (error) {
      console.error('Error adding session:', error)
      notify.error('فشل في إضافة الجلسة')
    }
  }

  const handleUpdateSession = async (treatmentId: string, sessionId: string, updates: Partial<TreatmentSession>) => {
    try {
      await window.electronAPI.treatmentSessions.update(sessionId, updates)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم تحديث الجلسة بنجاح')
    } catch (error) {
      console.error('Error updating session:', error)
      notify.error('فشل في تحديث الجلسة')
    }
  }

  const handleDeleteSession = async (treatmentId: string, sessionId: string) => {
    try {
      await window.electronAPI.treatmentSessions.delete(sessionId)
      await loadTreatmentSessions(treatmentId)
      // تحديث إحصائيات الجلسات في الصفحة الرئيسية
      onSessionStatsUpdate?.()
      notify.success('تم حذف الجلسة بنجاح')
    } catch (error) {
      console.error('Error deleting session:', error)
      notify.error('فشل في حذف الجلسة')
    }
  }

  // Load sessions when a treatment is selected
  useEffect(() => {
    if (selectedTreatmentForSessions) {
      loadTreatmentSessions(selectedTreatmentForSessions)
    }
  }, [selectedTreatmentForSessions])

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">علاجات السن رقم {toothNumber}</h3>
          <p className="text-sm text-muted-foreground">{toothName}</p>
        </div>
        <Button
          onClick={() => setIsAddingTreatment(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة علاج
        </Button>
      </div>

      {/* Existing Treatments */}
      <div className="space-y-3">
        {sortedTreatments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">لا توجد علاجات مسجلة لهذا السن</p>
            </CardContent>
          </Card>
        ) : (
          sortedTreatments.map((treatment, index) => (
            <Card key={treatment.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{treatment.priority}
                      </span>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveTreatmentUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveTreatmentDown(index)}
                          disabled={index === sortedTreatments.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: treatment.treatment_color }}
                    />

                    <div>
                      <CardTitle className="text-base">
                        {getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}
                      </CardTitle>
                      <CardDescription>
                        {getCategoryInfo(treatment.treatment_category as any)?.label}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: getStatusColor(treatment.treatment_status) + '20',
                        color: getStatusColor(treatment.treatment_status)
                      }}
                    >
                      {getStatusIcon(treatment.treatment_status)}
                      <span className="mr-1">
                        {TREATMENT_STATUS_OPTIONS.find(s => s.value === treatment.treatment_status)?.label}
                      </span>
                    </Badge>

                    <Button
                      variant={selectedTreatmentForSessions === treatment.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTreatmentForSessions(
                        selectedTreatmentForSessions === treatment.id ? null : treatment.id
                      )}
                      className={cn(
                        "transition-all duration-200 gap-1.5",
                        selectedTreatmentForSessions === treatment.id
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      )}
                      title="إدارة جلسات العلاج"
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">الجلسات</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTreatment(treatment.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTreatment(treatment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {treatment.cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>${treatment.cost}</span>
                    </div>
                  )}

                  {treatment.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(treatment.start_date)}</span>
                    </div>
                  )}

                  {treatment.completion_date && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{formatDate(treatment.completion_date)}</span>
                    </div>
                  )}
                </div>

                {treatment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                    {treatment.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Treatment Form */}
      {editingTreatment && (
        <Card className={cn(
          "border-2 shadow-lg",
          isDarkMode
            ? "border-orange-800/50 bg-orange-950/20 shadow-orange-900/20"
            : "border-orange-200 bg-orange-50/50 shadow-orange-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-orange-800/30" : "border-orange-200/50"
          )}>
            <CardTitle className={cn(
              "text-lg",
              isDarkMode ? "text-orange-200" : "text-orange-900"
            )}>تعديل العلاج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const treatment = treatments.find(t => t.id === editingTreatment)
              if (!treatment) return null

              return (
                <EditTreatmentFormContent
                  treatment={treatment}
                  onSave={handleUpdateTreatment}
                  onCancel={() => setEditingTreatment(null)}
                />
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Treatment Sessions Management */}
      {selectedTreatmentForSessions && (
        <Card className={cn(
          "border-2 shadow-lg",
          isDarkMode
            ? "border-blue-800/50 bg-blue-950/20 shadow-blue-900/20"
            : "border-blue-200 bg-blue-50/50 shadow-blue-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-blue-800/30" : "border-blue-200/50"
          )}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn(
                "text-lg",
                isDarkMode ? "text-blue-200" : "text-blue-900"
              )}>
                إدارة جلسات العلاج
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTreatmentForSessions(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              {(() => {
                const treatment = treatments.find(t => t.id === selectedTreatmentForSessions)
                return treatment ? `${getTreatmentByValue(treatment.treatment_type)?.label || treatment.treatment_type}` : ''
              })()}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {(() => {
              const treatment = treatments.find(t => t.id === selectedTreatmentForSessions)
              if (!treatment) return null

              return (
                <TreatmentSessions
                  treatment={treatment}
                  sessions={treatmentSessions[selectedTreatmentForSessions] || []}
                  onAddSession={(sessionData) => handleAddSession(selectedTreatmentForSessions, sessionData)}
                  onUpdateSession={(sessionId, updates) => handleUpdateSession(selectedTreatmentForSessions, sessionId, updates)}
                  onDeleteSession={(sessionId) => handleDeleteSession(selectedTreatmentForSessions, sessionId)}
                />
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Add Treatment Form */}
      {isAddingTreatment && (
        <Card className={cn(
          "border-2 shadow-lg",
          isDarkMode
            ? "border-blue-800/50 bg-blue-950/20 shadow-blue-900/20"
            : "border-blue-200 bg-blue-50/50 shadow-blue-100/50"
        )}>
          <CardHeader className={cn(
            "border-b",
            isDarkMode ? "border-blue-800/30" : "border-blue-200/50"
          )}>
            <CardTitle className={cn(
              "text-lg",
              isDarkMode ? "text-blue-200" : "text-blue-900"
            )}>إضافة علاج جديد</CardTitle>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4 p-6",
            isDarkMode ? "bg-blue-950/10" : "bg-blue-50/30"
          )}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>تصنيف العلاج</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value)
                    setNewTreatment(prev => ({ ...prev, treatment_category: value }))
                  }}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>نوع العلاج</Label>
                <Select
                  value={newTreatment.treatment_type || ''}
                  onValueChange={(value) => setNewTreatment(prev => ({ ...prev, treatment_type: value }))}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    !selectedCategory && "opacity-50 cursor-not-allowed",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTreatmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>حالة العلاج</Label>
                <Select
                  value={newTreatment.treatment_status || 'planned'}
                  onValueChange={(value) => setNewTreatment(prev => ({ ...prev, treatment_status: value as any }))}
                >
                  <SelectTrigger className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* حقل التكلفة */}
              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>التكلفة ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newTreatment.cost || ''}
                  onChange={(e) => setNewTreatment(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}
                />
                {newTreatment.cost && newTreatment.cost > 0 && (
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-blue-300" : "text-blue-600"
                  )}>
                    💡 سيتم إنشاء دفعة معلقة في جدول المدفوعات
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={cn(
                  "font-medium",
                  isDarkMode ? "text-blue-200" : "text-blue-800"
                )}>تاريخ العلاج</Label>
                <Input
                  type="date"
                  value={newTreatment.start_date || ''}
                  onChange={(e) => setNewTreatment(prev => ({ ...prev, start_date: e.target.value }))}
                  className={cn(
                    "border-2 transition-colors",
                    isDarkMode
                      ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                      : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                  )}
                />
              </div>
            </div>

            {/* حقول المخبر - تظهر فقط لعلاجات التعويضات */}
            {selectedCategory === 'التعويضات' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
                <div className="space-y-2">
                  <Label className={cn(
                    "font-medium flex items-center gap-2",
                    isDarkMode ? "text-purple-200" : "text-purple-800"
                  )}>
                    🏭 اختيار المخبر
                  </Label>
                  <Select
                    value={selectedLab}
                    onValueChange={setSelectedLab}
                  >
                    <SelectTrigger className={cn(
                      "border-2 transition-colors",
                      isDarkMode
                        ? "border-purple-800/50 bg-purple-950/30 hover:border-purple-700 focus:border-purple-600"
                        : "border-purple-200 bg-white hover:border-purple-300 focus:border-purple-500"
                    )}>
                      <SelectValue placeholder="اختر المخبر" />
                    </SelectTrigger>
                    <SelectContent>
                      {labs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.id}>
                          <div className="flex items-center gap-2">
                            <span>🏭</span>
                            <span>{lab.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className={cn(
                    "font-medium flex items-center gap-2",
                    isDarkMode ? "text-purple-200" : "text-purple-800"
                  )}>
                    💰 تكلفة المخبر ($)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={labCost || ''}
                    onChange={(e) => setLabCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={cn(
                      "border-2 transition-colors",
                      isDarkMode
                        ? "border-purple-800/50 bg-purple-950/30 hover:border-purple-700 focus:border-purple-600"
                        : "border-purple-200 bg-white hover:border-purple-300 focus:border-purple-500"
                    )}
                  />
                  {labCost > 0 && (
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-purple-300" : "text-purple-600"
                    )}>
                      🏭 سيتم إنشاء طلب مخبر تلقائياً
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className={cn(
                "font-medium",
                isDarkMode ? "text-blue-200" : "text-blue-800"
              )}>ملاحظات</Label>
              <Textarea
                value={newTreatment.notes || ''}
                onChange={(e) => setNewTreatment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className={cn(
                  "border-2 transition-colors resize-none",
                  isDarkMode
                    ? "border-blue-800/50 bg-blue-950/30 hover:border-blue-700 focus:border-blue-600"
                    : "border-blue-200 bg-white hover:border-blue-300 focus:border-blue-500"
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-blue-200/50 dark:border-blue-800/30">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingTreatment(false)
                  setSelectedCategory('')
                  setNewTreatment({
                    patient_id: patientId,
                    tooth_number: toothNumber,
                    tooth_name: toothName,
                    treatment_status: 'planned',
                    cost: 0,
                    start_date: new Date().toISOString().split('T')[0] // تحديد التاريخ المحلي تلقائياً
                    // priority will be auto-assigned by the database service
                  })
                }}
                className={cn(
                  "border-2 transition-all duration-200",
                  isDarkMode
                    ? "border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
              <Button
                onClick={handleAddTreatment}
                className={cn(
                  "transition-all duration-200 shadow-lg",
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
                )}
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ العلاج
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Edit Treatment Form Component
interface EditTreatmentFormProps {
  treatment: ToothTreatment
  onSave: (id: string, updates: Partial<ToothTreatment>) => Promise<void>
  onCancel: () => void
}

function EditTreatmentFormContent({ treatment, onSave, onCancel }: EditTreatmentFormProps) {
  const { isDarkMode } = useTheme()
  const { createPayment, updatePayment, getPaymentsByPatient } = usePaymentStore()
  const { patients } = usePatientStore()
  const { labs, loadLabs } = useLabStore()
  const { createLabOrder, getLabOrdersByTreatment, updateLabOrder, loadLabOrders } = useLabOrderStore()
  const [editData, setEditData] = useState<Partial<ToothTreatment>>({
    treatment_type: treatment.treatment_type,
    treatment_category: treatment.treatment_category,
    treatment_status: treatment.treatment_status,
    cost: treatment.cost,
    start_date: treatment.start_date,
    completion_date: treatment.completion_date,
    notes: treatment.notes
  })
  const [selectedCategory, setSelectedCategory] = useState(treatment.treatment_category || '')
  const [originalCost] = useState(treatment.cost || 0) // حفظ التكلفة الأصلية للمقارنة
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)

  // تحميل المخابر وطلبات المخابر عند فتح النموذج
  useEffect(() => {
    const loadData = async () => {
      try {
        // تحميل المخابر أولاً
        await loadLabs()

        // إذا كان العلاج من فئة التعويضات، حاول تحميل بيانات المخبر الموجودة
        if (treatment.treatment_category === 'التعويضات') {
          // تحميل طلبات المخابر للتأكد من وجود البيانات المحدثة
          await loadLabOrders()

          // الآن البحث عن طلبات المخبر المرتبطة بهذا العلاج
          const existingLabOrders = getLabOrdersByTreatment(treatment.id)
          console.log('🔍 [DEBUG] Looking for lab orders for treatment:', treatment.id)
          console.log('🔍 [DEBUG] Found lab orders:', existingLabOrders)

          if (existingLabOrders.length > 0) {
            const labOrder = existingLabOrders[0] // أخذ أول طلب مخبر
            console.log('✅ [DEBUG] Setting lab data:', {
              lab_id: labOrder.lab_id,
              cost: labOrder.cost,
              labOrder: labOrder
            })

            // تأكد من أن البيانات موجودة قبل التعبئة
            if (labOrder.lab_id) {
              setSelectedLab(labOrder.lab_id)
              console.log('✅ [DEBUG] Lab ID set to:', labOrder.lab_id)
            }

            if (labOrder.cost !== undefined && labOrder.cost !== null) {
              setLabCost(labOrder.cost)
              console.log('✅ [DEBUG] Lab cost set to:', labOrder.cost)
            }
          } else {
            console.log('⚠️ [DEBUG] No lab orders found for treatment:', treatment.id)
            // إعادة تعيين القيم إذا لم توجد طلبات مخبر
            setSelectedLab('')
            setLabCost(0)
          }
        }
      } catch (error) {
        console.error('❌ [DEBUG] Error loading lab data:', error)
      }
    }

    loadData()
  }, [loadLabs, treatment.id, treatment.treatment_category, getLabOrdersByTreatment, loadLabOrders])

  const filteredTreatmentTypes = selectedCategory
    ? getTreatmentsByCategory(selectedCategory as any)
    : []

  // دالة تحديث المدفوعات المرتبطة بالعلاج المُعدّل
  const updatePaymentsForEditedTreatment = async () => {
    try {
      // الحصول على بيانات المريض
      const patient = patients.find(p => p.id === treatment.patient_id)
      if (!patient) {
        notify.error('لم يتم العثور على بيانات المريض')
        return
      }

      // البحث عن جميع المدفوعات المرتبطة بهذا العلاج المحدد
      const patientPayments = getPaymentsByPatient(treatment.patient_id)
      const treatmentPayments = patientPayments.filter(payment =>
        payment.tooth_treatment_id === treatment.id
      )

      // إنشاء وصف للدفعة
      const treatmentTypeInfo = getTreatmentByValue(editData.treatment_type!)
      const description = `علاج ${treatmentTypeInfo?.label || editData.treatment_type} - سن ${treatment.tooth_name || treatment.tooth_number}`

      if (treatmentPayments.length > 0) {
        // حساب إجمالي المدفوع لهذا العلاج (من جميع المدفوعات)
        const totalPaidForTreatment = treatmentPayments.reduce((sum, p) => sum + p.amount, 0)
        const newCost = editData.cost || 0
        const remainingBalance = Math.max(0, newCost - totalPaidForTreatment)

        // تحديد الحالة الجديدة
        let newStatus: 'completed' | 'partial' | 'pending'
        if (newCost <= 0) {
          // إذا كانت التكلفة صفر أو أقل، اجعل الحالة مكتملة
          newStatus = 'completed'
        } else if (remainingBalance <= 0 && totalPaidForTreatment > 0) {
          newStatus = 'completed'
        } else if (totalPaidForTreatment > 0) {
          newStatus = 'partial'
        } else {
          newStatus = 'pending'
        }

        // تحديث جميع المدفوعات المرتبطة بالعلاج
        for (const payment of treatmentPayments) {
          const updatedPaymentData = {
            tooth_treatment_id: treatment.id,
            description: description,
            notes: `دفعة لعلاج سن ${treatment.tooth_name || treatment.tooth_number} (تم تعديل التكلفة)`,
            total_amount_due: newCost,
            remaining_balance: remainingBalance,
            treatment_total_cost: newCost,
            treatment_total_paid: totalPaidForTreatment,
            treatment_remaining_balance: remainingBalance,
            status: newStatus
          }

          await updatePayment(payment.id, updatedPaymentData)
        }
        notify.success('تم تحديث المدفوعات المرتبطة بالعلاج')
      } else if ((editData.cost || 0) > 0) {
        // إنشاء دفعة معلقة جديدة إذا لم توجد مدفوعات سابقة وكانت التكلفة أكبر من صفر
        const paymentData = {
          patient_id: treatment.patient_id,
          tooth_treatment_id: treatment.id,
          amount: 0,
          payment_method: 'cash' as const,
          payment_date: new Date().toISOString().split('T')[0],
          description: description,
          status: 'pending' as const,
          notes: `دفعة معلقة لعلاج سن ${treatment.tooth_name || treatment.tooth_number} (تم تعديل التكلفة)`,
          total_amount_due: editData.cost || 0,
          amount_paid: 0,
          remaining_balance: editData.cost || 0,
          treatment_total_cost: editData.cost || 0,
          treatment_total_paid: 0,
          treatment_remaining_balance: editData.cost || 0
        }

        await createPayment(paymentData)
        notify.success('تم إنشاء دفعة معلقة في جدول المدفوعات')
      }
    } catch (error) {
      console.error('خطأ في تحديث المدفوعات:', error)
      notify.error('فشل في تحديث المدفوعات')
    }
  }

  const handleSave = async () => {
    if (!editData.treatment_type) {
      notify.error('يرجى اختيار نوع العلاج')
      return
    }

    // التحقق من حقول المخبر للتعويضات
    if (selectedCategory === 'التعويضات' && labCost > 0 && !selectedLab) {
      notify.error('يرجى اختيار المخبر عند إدخال تكلفة المخبر')
      return
    }

    try {
      const updatedData = {
        ...editData,
        treatment_color: getTreatmentByValue(editData.treatment_type!)?.color || treatment.treatment_color
      }
      await onSave(treatment.id, updatedData)

      // تحديث المدفوعات المرتبطة بالعلاج إذا تم تعديل التكلفة
      const newCost = editData.cost || 0
      const originalCostValue = originalCost || 0
      if (newCost !== originalCostValue) {
        await updatePaymentsForEditedTreatment()
      }

      // إدارة طلبات المخبر للتعويضات
      const existingLabOrders = getLabOrdersByTreatment(treatment.id)

      if (selectedCategory === 'التعويضات') {
        if (labCost > 0 && selectedLab) {
          // إنشاء أو تحديث طلب المخبر
          const treatmentTypeInfo = getTreatmentByValue(editData.treatment_type!)
          const serviceName = treatmentTypeInfo?.label || editData.treatment_type || 'خدمة مخبر'

          if (existingLabOrders.length > 0) {
            // تحديث طلب المخبر الموجود
            const labOrder = existingLabOrders[0]
            await updateLabOrder(labOrder.id, {
              lab_id: selectedLab,
              cost: labCost,
              service_name: serviceName,
              notes: `طلب مخبر لعلاج سن ${treatment.tooth_name || treatment.tooth_number} (تم التحديث)`
            })
            notify.success('تم تحديث طلب المخبر')
          } else {
            // إنشاء طلب مخبر جديد
            const labOrderData = {
              lab_id: selectedLab,
              patient_id: treatment.patient_id,
              tooth_treatment_id: treatment.id,
              tooth_number: treatment.tooth_number,
              service_name: serviceName,
              cost: labCost,
              order_date: new Date().toISOString().split('T')[0],
              status: 'معلق' as const,
              notes: `طلب مخبر لعلاج سن ${treatment.tooth_name || treatment.tooth_number}`,
              paid_amount: 0
            }

            await createLabOrder(labOrderData)
            notify.success('تم إنشاء طلب المخبر')
          }
        } else if (existingLabOrders.length > 0) {
          // إذا لم يتم تحديد مخبر أو تكلفة، احذف طلبات المخبر الموجودة
          for (const labOrder of existingLabOrders) {
            await deleteLabOrder(labOrder.id)
          }
          notify.info('تم حذف طلبات المخبر لعدم تحديد مخبر أو تكلفة')
        }
      } else {
        // إذا تم تغيير التصنيف من التعويضات إلى شيء آخر، احذف طلبات المخبر
        if (existingLabOrders.length > 0) {
          for (const labOrder of existingLabOrders) {
            await deleteLabOrder(labOrder.id)
          }
          notify.info('تم حذف طلبات المخبر لتغيير تصنيف العلاج')
        }
      }

      onCancel() // إغلاق نموذج التعديل
    } catch (error) {
      console.error('Error updating treatment:', error)
      notify.error('فشل في حفظ التغييرات')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>تصنيف العلاج</Label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value)
              setEditData(prev => ({ ...prev, treatment_category: value }))
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>نوع العلاج</Label>
          <Select
            value={editData.treatment_type || ''}
            onValueChange={(value) => setEditData(prev => ({ ...prev, treatment_type: value }))}
            disabled={!selectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع العلاج" />
            </SelectTrigger>
            <SelectContent>
              {filteredTreatmentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>حالة العلاج</Label>
          <Select
            value={editData.treatment_status || 'planned'}
            onValueChange={(value) => {
              setEditData(prev => ({
                ...prev,
                treatment_status: value as any,
                // Set completion date to today if status is completed and no date is set
                completion_date: value === 'completed' && !prev.completion_date
                  ? new Date().toISOString().split('T')[0]
                  : prev.completion_date
              }))
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* حقل التكلفة */}
        <div className="space-y-2">
          <Label className={cn(
            "font-medium",
            isDarkMode ? "text-orange-200" : "text-orange-800"
          )}>التكلفة ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={editData.cost || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            className={cn(
              "border-2 transition-colors",
              isDarkMode
                ? "border-orange-800/50 bg-orange-950/30 hover:border-orange-700 focus:border-orange-600"
                : "border-orange-200 bg-white hover:border-orange-300 focus:border-orange-500"
            )}
          />
          {editData.cost && editData.cost > 0 && editData.cost !== originalCost && (
            <p className={cn(
              "text-xs",
              isDarkMode ? "text-orange-300" : "text-orange-600"
            )}>
              💡 سيتم إنشاء دفعة معلقة عند تعديل التكلفة
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>تاريخ العلاج</Label>
          <Input
            type="date"
            value={editData.start_date || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
      </div>

      {/* حقول المخبر - تظهر فقط لعلاجات التعويضات */}
      {(() => {
        console.log('🔍 [DEBUG] Lab card condition check:', {
          selectedCategory,
          treatmentCategory: treatment.treatment_category,
          shouldShow: selectedCategory === 'التعويضات' || treatment.treatment_category === 'التعويضات'
        })
        return (selectedCategory === 'التعويضات' || treatment.treatment_category === 'التعويضات')
      })() && (
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl border-2 shadow-sm transition-all duration-200",
          isDarkMode
            ? "bg-gradient-to-br from-purple-950/30 to-purple-900/20 border-purple-700/40 shadow-purple-900/10"
            : "bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-300/60 shadow-purple-200/20"
        )}>
          {/* عنوان الكارد */}
          <div className="md:col-span-2 mb-2">
            <div className={cn(
              "flex items-center gap-3 text-sm font-semibold",
              isDarkMode ? "text-purple-200" : "text-purple-800"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
                isDarkMode
                  ? "bg-purple-800/40 text-purple-200"
                  : "bg-purple-200/60 text-purple-700"
              )}>
                🏭
              </div>
              <span>معلومات المخبر</span>
              <div className={cn(
                "h-px flex-1 ml-2",
                isDarkMode ? "bg-purple-700/30" : "bg-purple-300/50"
              )}></div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className={cn(
              "font-medium flex items-center gap-2 text-sm",
              isDarkMode ? "text-purple-100" : "text-purple-900"
            )}>
              🏭 اختيار المخبر
            </Label>
            <Select
              value={selectedLab}
              onValueChange={setSelectedLab}
            >
              <SelectTrigger className={cn(
                "border-2 transition-all duration-200 h-11",
                isDarkMode
                  ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100"
                  : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900"
              )}>
                <SelectValue placeholder="اختر المخبر" />
              </SelectTrigger>
              <SelectContent className={cn(
                isDarkMode
                  ? "bg-purple-950 border-purple-700"
                  : "bg-white border-purple-200"
              )}>
                {labs.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    <div className="flex items-center gap-2">
                      <span>🏭</span>
                      <span>{lab.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className={cn(
              "font-medium flex items-center gap-2 text-sm",
              isDarkMode ? "text-purple-100" : "text-purple-900"
            )}>
              💰 تكلفة المخبر ($)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={labCost || ''}
              onChange={(e) => setLabCost(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={cn(
                "border-2 transition-all duration-200 h-11",
                isDarkMode
                  ? "border-purple-700/50 bg-purple-950/40 hover:border-purple-600 focus:border-purple-500 text-purple-100 placeholder:text-purple-400"
                  : "border-purple-300/70 bg-white hover:border-purple-400 focus:border-purple-500 text-purple-900 placeholder:text-purple-500"
              )}
            />
            {labCost > 0 && (
              <div className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-lg",
                isDarkMode
                  ? "bg-purple-800/30 text-purple-200 border border-purple-700/30"
                  : "bg-purple-100/70 text-purple-700 border border-purple-200/50"
              )}>
                <span className="text-sm">✨</span>
                <span>سيتم تحديث طلب المخبر تلقائياً</span>
              </div>
            )}
          </div>
        </div>
      )}

      {editData.treatment_status === 'completed' && (
        <div className="space-y-2">
          <Label>تاريخ الإنجاز</Label>
          <Input
            type="date"
            value={editData.completion_date || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, completion_date: e.target.value }))}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>ملاحظات</Label>
        <Textarea
          value={editData.notes || ''}
          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="أدخل أي ملاحظات إضافية..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 ml-2" />
          إلغاء
        </Button>
        <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 ml-2" />
          حفظ التغييرات
        </Button>
      </div>
    </div>
  )
}
