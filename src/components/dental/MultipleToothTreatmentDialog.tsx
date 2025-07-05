import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { notify } from '@/services/notificationService'
import { cn } from '@/lib/utils'
import { 
  TREATMENT_TYPES, 
  TREATMENT_CATEGORIES, 
  getTreatmentsByCategory, 
  getTreatmentByValue 
} from '@/data/teethData'
import { ToothTreatment } from '@/types'
import { useLabStore } from '@/store/labStore'
import { Activity, Plus, X } from 'lucide-react'

interface MultipleToothTreatmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  selectedTeeth: number[]
  onAddTreatments: (treatments: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>
}

export default function MultipleToothTreatmentDialog({
  open,
  onOpenChange,
  patientId,
  selectedTeeth,
  onAddTreatments
}: MultipleToothTreatmentDialogProps) {
  const { isDarkMode } = useTheme()
  const { labs, loadLabs } = useLabStore()
  
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedLab, setSelectedLab] = useState<string>('')
  const [labCost, setLabCost] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [treatmentData, setTreatmentData] = useState<Partial<ToothTreatment>>({
    patient_id: patientId,
    treatment_status: 'planned',
    cost: 0,
    start_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (open) {
      loadLabs()
    }
  }, [open, loadLabs])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setTreatmentData(prev => ({
      ...prev,
      treatment_category: category,
      treatment_type: '' // Reset treatment type when category changes
    }))
  }

  const handleTreatmentTypeChange = (treatmentType: string) => {
    const treatment = getTreatmentByValue(treatmentType)
    setTreatmentData(prev => ({
      ...prev,
      treatment_type: treatmentType,
      treatment_color: treatment?.color || '#22c55e'
    }))
  }

  const handleSubmit = async () => {
    if (!treatmentData.treatment_type || !treatmentData.treatment_category) {
      notify.error('يرجى اختيار نوع العلاج والتصنيف')
      return
    }

    // التحقق من بيانات المختبر للتعويضات
    if (treatmentData.treatment_category === 'التعويضات' && labCost > 0 && !selectedLab) {
      notify.error('يرجى اختيار المختبر عند إدخال تكلفة المختبر للتعويضات')
      return
    }

    setIsSubmitting(true)

    try {
      // إنشاء قائمة العلاجات لجميع الأسنان المحددة
      const treatments: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>[] = selectedTeeth.map(toothNumber => ({
        ...treatmentData,
        patient_id: patientId,
        tooth_number: toothNumber,
        tooth_name: `السن ${toothNumber}`,
        treatment_type: treatmentData.treatment_type!,
        treatment_category: treatmentData.treatment_category!,
        treatment_color: treatmentData.treatment_color || '#22c55e',
        treatment_status: treatmentData.treatment_status || 'planned',
        cost: treatmentData.cost || 0,
        start_date: treatmentData.start_date,
        notes: treatmentData.notes,
        priority: 1 // سيتم تعيينه تلقائياً في قاعدة البيانات
      }))

      await onAddTreatments(treatments)
      
      notify.success(`تم إضافة العلاج بنجاح لـ ${selectedTeeth.length} سن`)
      
      // إعادة تعيين النموذج
      resetForm()
      onOpenChange(false)
      
    } catch (error) {
      console.error('Error adding multiple treatments:', error)
      notify.error('فشل في إضافة العلاجات')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTreatmentData({
      patient_id: patientId,
      treatment_status: 'planned',
      cost: 0,
      start_date: new Date().toISOString().split('T')[0]
    })
    setSelectedCategory('')
    setSelectedLab('')
    setLabCost(0)
  }

  const availableTreatments = selectedCategory 
    ? getTreatmentsByCategory(selectedCategory as any)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            إضافة علاج للأسنان المحددة
          </DialogTitle>
          <DialogDescription>
            إضافة نفس العلاج لجميع الأسنان المحددة ({selectedTeeth.length} سن)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Teeth Display */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">
                الأسنان المحددة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {selectedTeeth.sort((a, b) => a - b).map(toothNumber => (
                  <Badge 
                    key={toothNumber}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    السن {toothNumber}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Category */}
          <div className="space-y-2">
            <Label>تصنيف العلاج</Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر تصنيف العلاج" />
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

          {/* Treatment Type */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label>نوع العلاج</Label>
              <Select 
                value={treatmentData.treatment_type || ''} 
                onValueChange={handleTreatmentTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع العلاج" />
                </SelectTrigger>
                <SelectContent>
                  {availableTreatments.map((treatment) => (
                    <SelectItem key={treatment.value} value={treatment.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: treatment.color }}
                        />
                        <span>{treatment.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Treatment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التكلفة</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={treatmentData.cost || ''}
                onChange={(e) => setTreatmentData(prev => ({
                  ...prev,
                  cost: parseFloat(e.target.value) || 0
                }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ البدء</Label>
              <Input
                type="date"
                value={treatmentData.start_date || ''}
                onChange={(e) => setTreatmentData(prev => ({
                  ...prev,
                  start_date: e.target.value
                }))}
              />
            </div>
          </div>

          {/* Lab Information for Prosthetics */}
          {treatmentData.treatment_category === 'التعويضات' && (
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-purple-700 dark:text-purple-300">
                  معلومات المختبر
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المختبر</Label>
                    <Select value={selectedLab} onValueChange={setSelectedLab}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المختبر" />
                      </SelectTrigger>
                      <SelectContent>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>تكلفة المختبر</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={labCost || ''}
                      onChange={(e) => setLabCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={treatmentData.notes || ''}
              onChange={(e) => setTreatmentData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              placeholder="ملاحظات إضافية..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !treatmentData.treatment_type}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'جاري الإضافة...' : `إضافة العلاج لـ ${selectedTeeth.length} سن`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
