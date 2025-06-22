import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { usePatientStore } from '@/store/patientStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { getToothInfo, TREATMENT_TYPES, TREATMENT_STATUS_OPTIONS, IMAGE_TYPE_OPTIONS } from '@/data/teethData'
import { DentalTreatment, DentalTreatmentImage } from '@/types'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { notify } from '@/services/notificationService'
import {
  Save,
  X,
  Camera,
  FileText,
  Trash2,
  Plus,
  Eye,
  Download,
  Upload,
  Image as ImageIcon
} from 'lucide-react'

// دالة مساعدة لتنظيف قيم treatment_status
const cleanTreatmentStatus = (status: string): string => {
  const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']

  // تحويل القيم القديمة إلى الجديدة
  if (status === 'active') return 'in_progress'
  if (status === 'on_hold') return 'planned'

  // التأكد من أن القيمة صحيحة
  return validStatuses.includes(status) ? status : 'planned'
}

interface ToothDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  toothNumber: number | null
}

export default function ToothDetailsDialog({
  open,
  onOpenChange,
  patientId,
  toothNumber
}: ToothDetailsDialogProps) {
  const { toast } = useToast()
  const { patients } = usePatientStore()
  const { prescriptions } = usePrescriptionStore()
  const {
    treatments,
    images,
    loadTreatmentsByTooth,
    loadTreatmentsByPatient,
    loadImagesByTreatment,
    createTreatment,
    updateTreatment,
    createImage,
    deleteImage
  } = useDentalTreatmentStore()

  const [isLoading, setIsLoading] = useState(false)
  const [treatmentData, setTreatmentData] = useState<Partial<DentalTreatment>>({})
  const [selectedImages, setSelectedImages] = useState<File[]>([])

  const patient = patients.find(p => p.id === patientId)
  const toothInfo = toothNumber ? getToothInfo(toothNumber) : null
  const existingTreatment = treatments.find(t => t.tooth_number === toothNumber)

  useEffect(() => {
    if (open && patientId && toothNumber) {
      // Load all treatments for the patient first
      loadTreatmentsByTooth(patientId, toothNumber)
    }
  }, [open, patientId, toothNumber, loadTreatmentsByTooth])

  useEffect(() => {
    if (open && patientId && toothNumber) {
      if (existingTreatment) {
        loadImagesByTreatment(existingTreatment.id)
        setTreatmentData(existingTreatment)
      } else {
        // Initialize new treatment data
        setTreatmentData({
          patient_id: patientId,
          tooth_number: toothNumber,
          tooth_name: toothInfo?.arabicName || '',
          treatment_status: 'planned',
          treatment_color: TREATMENT_TYPES[0].color
        })
      }
    }
  }, [open, patientId, toothNumber, existingTreatment, loadImagesByTreatment, toothInfo])

  const handleSave = async () => {
    if (!toothNumber || !patientId) return

    setIsLoading(true)
    try {
      if (existingTreatment) {
        // تنظيف البيانات قبل الإرسال - إزالة الحقول التي ليست أعمدة في الجدول
        // وضمان أن treatment_status له قيمة صحيحة
        const validStatus = cleanTreatmentStatus(treatmentData.treatment_status || 'planned')

        const cleanTreatmentData = {
          patient_id: treatmentData.patient_id,
          appointment_id: treatmentData.appointment_id,
          tooth_number: treatmentData.tooth_number,
          tooth_name: treatmentData.tooth_name,
          current_treatment: treatmentData.current_treatment,
          next_treatment: treatmentData.next_treatment,
          treatment_details: treatmentData.treatment_details,
          treatment_status: validStatus,
          treatment_color: treatmentData.treatment_color,
          cost: treatmentData.cost,
          notes: treatmentData.notes
        }

        await updateTreatment(existingTreatment.id, cleanTreatmentData)
        // إعادة تحميل الصور إذا كان هناك علاج موجود
        if (existingTreatment.id) {
          await loadImagesByTreatment(existingTreatment.id)
        }
        notify.success('تم تحديث بيانات السن بنجاح')
      } else {
        // تنظيف البيانات للعلاج الجديد أيضاً
        const validStatus = cleanTreatmentStatus(treatmentData.treatment_status || 'planned')

        const newTreatment = await createTreatment({
          ...treatmentData,
          patient_id: patientId,
          tooth_number: toothNumber,
          tooth_name: toothInfo?.arabicName || '',
          treatment_status: validStatus
        } as Omit<DentalTreatment, 'id' | 'created_at' | 'updated_at'>)

        // Upload images if any
        if (selectedImages.length > 0) {
          for (const file of selectedImages) {
            const imagePath = await uploadImage(file)
            await createImage({
              dental_treatment_id: newTreatment.id,
              patient_id: patientId,
              tooth_number: toothNumber,
              image_path: imagePath,
              image_type: 'clinical',
              description: `صورة للسن رقم ${toothNumber}`
            })
          }
        }

        notify.success('تم حفظ بيانات السن بنجاح')
      }

      onOpenChange(false)
    } catch (error) {
      notify.error('حدث خطأ أثناء حفظ البيانات')
      console.error('Error saving tooth data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    // This would integrate with your file upload service
    // For now, we'll simulate the upload
    const formData = new FormData()
    formData.append('image', file)
    formData.append('patientId', patientId)
    formData.append('toothNumber', toothNumber?.toString() || '')

    // Simulate upload - replace with actual upload logic
    return `dental_images/${patientId}/${toothNumber}/${Date.now()}_${file.name}`
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteImage(imageId)
      notify.success('تم حذف الصورة بنجاح')
    } catch (error) {
      notify.error('حدث خطأ أثناء حذف الصورة')
    }
  }

  if (!toothInfo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <div
              className="w-6 h-6 rounded border-2"
              style={{
                backgroundColor: treatmentData.treatment_color || TREATMENT_TYPES[0].color,
                borderColor: '#ffffff'
              }}
            />
            تفاصيل السن رقم {toothNumber}
          </DialogTitle>
          <DialogDescription className="text-right">
            {toothInfo.arabicName} - المريض: {patient?.full_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="treatment" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="treatment">العلاج</TabsTrigger>
            <TabsTrigger value="images">الصور</TabsTrigger>
            <TabsTrigger value="prescriptions">الوصفات</TabsTrigger>
          </TabsList>

          {/* Treatment Tab */}
          <TabsContent value="treatment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_treatment">العلاج الحالي</Label>
                <Select
                  value={treatmentData.current_treatment || ''}
                  onValueChange={(value) => {
                    const selectedType = TREATMENT_TYPES.find(t => t.label === value)
                    setTreatmentData(prev => ({
                      ...prev,
                      current_treatment: value,
                      treatment_color: selectedType?.color || prev.treatment_color
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.label}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_treatment">العلاج القادم</Label>
                <Input
                  id="next_treatment"
                  value={treatmentData.next_treatment || ''}
                  onChange={(e) => setTreatmentData(prev => ({
                    ...prev,
                    next_treatment: e.target.value
                  }))}
                  placeholder="العلاج المخطط له"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment_status">حالة العلاج</Label>
                <Select
                  value={treatmentData.treatment_status || 'planned'}
                  onValueChange={(value) => setTreatmentData(prev => ({
                    ...prev,
                    treatment_status: value as any
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: status.color + '20', color: status.color }}
                        >
                          {status.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">التكلفة ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={treatmentData.cost || ''}
                  onChange={(e) => setTreatmentData(prev => ({
                    ...prev,
                    cost: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment_details">تفاصيل العلاج</Label>
              <Textarea
                id="treatment_details"
                value={treatmentData.treatment_details || ''}
                onChange={(e) => setTreatmentData(prev => ({
                  ...prev,
                  treatment_details: e.target.value
                }))}
                placeholder="اكتب تفاصيل العلاج والملاحظات..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                value={treatmentData.notes || ''}
                onChange={(e) => setTreatmentData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="ملاحظات أخرى..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4">
            <div className="space-y-4">
              {/* Upload new images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">إضافة صور جديدة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" asChild>
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Upload className="w-4 h-4 ml-2" />
                          اختر صور
                        </label>
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>

                    {/* Selected images preview */}
                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 p-0"
                              onClick={() => removeSelectedImage(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Existing images */}
              {images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">الصور المحفوظة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((image) => (
                        <div key={image.id} className="space-y-2">
                          <div className="relative">
                            <img
                              src={`file://${image.image_path}`}
                              alt={image.description || 'صورة السن'}
                              className="w-full h-32 object-cover rounded border"
                            />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => window.open(`file://${image.image_path}`, '_blank')}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => handleDeleteImage(image.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div>{IMAGE_TYPE_OPTIONS.find(t => t.value === image.image_type)?.label}</div>
                            <div>{formatDate(image.taken_date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">الوصفات المرتبطة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>سيتم إضافة إدارة الوصفات قريباً</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 ml-2" />
            {isLoading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
