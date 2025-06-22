import React, { useState, useEffect } from 'react'
import './dental-images.css'
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
import DentalImage from './DentalImage'

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
  const [selectedImages, setSelectedImages] = useState<Array<{file: File, type: string}>>([])

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
      // Debug: Check if Electron API is available
      console.log('ToothDetailsDialog: window.electronAPI available:', !!window.electronAPI)
      console.log('ToothDetailsDialog: files API available:', !!window.electronAPI?.files)
      console.log('ToothDetailsDialog: uploadDentalImage available:', !!window.electronAPI?.files?.uploadDentalImage)

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
      // Reset selected images when dialog opens
      setSelectedImages([])
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

        // Upload new images if any
        if (selectedImages.length > 0) {
          for (const item of selectedImages) {
            const imagePath = await uploadImage(item.file, item.type)
            await createImage({
              dental_treatment_id: existingTreatment.id,
              patient_id: patientId,
              tooth_number: toothNumber,
              image_path: imagePath,
              image_type: item.type,
              description: `${IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.label} - السن رقم ${toothNumber}`,
              taken_date: new Date().toISOString()
            })
          }
        }

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
          for (const item of selectedImages) {
            const imagePath = await uploadImage(item.file, item.type)
            await createImage({
              dental_treatment_id: newTreatment.id,
              patient_id: patientId,
              tooth_number: toothNumber,
              image_path: imagePath,
              image_type: item.type,
              description: `${IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.label} - السن رقم ${toothNumber}`,
              taken_date: new Date().toISOString()
            })
          }
        }

        notify.success('تم حفظ بيانات السن بنجاح')
      }

      // Clear selected images after successful save
      setSelectedImages([])
      onOpenChange(false)
    } catch (error) {
      notify.error('حدث خطأ أثناء حفظ البيانات')
      console.error('Error saving tooth data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadImage = async (file: File, imageType: string): Promise<string> => {
    try {
      // Check if Electron API is available
      if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.uploadDentalImage) {
        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()

        // Upload file using Electron API with new parameters
        const filePath = await window.electronAPI.files.uploadDentalImage(
          arrayBuffer,
          file.name,
          patientId,
          toothNumber || 0,
          imageType,
          patient?.full_name || 'Unknown_Patient',
          toothInfo?.arabicName || `Tooth_${toothNumber}`
        )

        console.log('Image uploaded successfully:', filePath)
        return filePath
      } else {
        // Fallback: Save to public/upload directory
        console.warn('Electron API not available, using public/upload fallback')

        return await saveImageToPublicUpload(file, imageType)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      throw new Error('فشل في رفع الصورة')
    }
  }

  const saveImageToPublicUpload = async (file: File, imageType: string): Promise<string> => {
    try {
      // Convert file to base64
      const reader = new FileReader()

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string

            // Try to use Electron API for saving to public/upload
            if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.saveDentalImage) {
              const relativePath = await window.electronAPI.files.saveDentalImage(
                base64Data,
                file.name,
                patientId,
                toothNumber || 0,
                imageType,
                patient?.full_name || 'Unknown_Patient',
                toothInfo?.arabicName || `Tooth_${toothNumber}`
              )
              console.log('Image saved via Electron API:', relativePath)
              resolve(relativePath)
            } else {
              // Fallback: create a simulated path with new structure
              const timestamp = Date.now()
              const extension = file.name.split('.').pop() || 'jpg'
              const cleanPatientName = (patient?.full_name || 'Unknown_Patient').replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const cleanToothName = (toothInfo?.arabicName || `Tooth_${toothNumber}`).replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const fileName = `${cleanPatientName}-${cleanToothName}-${timestamp}.${extension}`
              const relativePath = `dental_images/${imageType || 'other'}/${fileName}`

              console.log('Using fallback path (image not actually saved):', relativePath)
              console.log('File size:', file.size, 'bytes')
              console.log('Base64 length:', base64Data.length)

              resolve(relativePath)
            }
          } catch (error) {
            reject(error)
          }
        }

        reader.onerror = () => reject(new Error('فشل في قراءة الملف'))
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Error saving image to public/upload:', error)
      throw new Error('فشل في حفظ الصورة')
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const files = Array.from(event.target.files || [])
    const newImages = files.map(file => ({ file, type: imageType }))
    setSelectedImages(prev => [...prev, ...newImages])

    // Reset the input value to allow selecting the same file again
    event.target.value = ''
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

  const handleImagePreview = async (imagePath: string) => {
    try {
      // Get the image data using the Electron API
      if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.getDentalImage) {
        const dataUrl = await window.electronAPI.files.getDentalImage(imagePath)

        // Create a new window for image preview
        const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
        if (previewWindow) {
          previewWindow.document.write(`
            <html>
              <head>
                <title>معاينة الصورة</title>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    background: #000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 8px;
                  }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="معاينة الصورة" />
              </body>
            </html>
          `)
          previewWindow.document.close()
        }
      } else {
        notify.error('لا يمكن معاينة الصورة - API غير متوفر')
      }
    } catch (error) {
      console.error('Error previewing image:', error)
      notify.error('حدث خطأ أثناء معاينة الصورة')
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
              {/* Upload new images with type selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    إضافة صور جديدة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Image type selection buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {IMAGE_TYPE_OPTIONS.map((type) => (
                        <Button
                          key={type.value}
                          variant="outline"
                          className="image-type-button h-auto p-3 flex flex-col items-center gap-2"
                          asChild
                        >
                          <label htmlFor={`image-upload-${type.value}`} className="cursor-pointer">
                            <span className="text-lg">{type.icon}</span>
                            <span className="text-xs">{type.label}</span>
                            <input
                              id={`image-upload-${type.value}`}
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, type.value)}
                            />
                          </label>
                        </Button>
                      ))}
                    </div>

                    {/* Selected images preview */}
                    {selectedImages.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">الصور المحددة للرفع:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedImages.map((item, index) => (
                            <div key={index} className="selected-image-preview relative group">
                              <div className="relative">
                                <img
                                  src={URL.createObjectURL(item.file)}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border-2 border-dashed border-gray-300"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeSelectedImage(index)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="mt-1 text-xs text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span>{IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.icon}</span>
                                  <span>{IMAGE_TYPE_OPTIONS.find(t => t.value === item.type)?.label}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Existing images organized by type */}
              {images.length > 0 && (
                <div className="space-y-4">
                  {IMAGE_TYPE_OPTIONS.map((imageType) => {
                    const typeImages = images.filter(img => img.image_type === imageType.value)
                    if (typeImages.length === 0) return null

                    return (
                      <Card key={imageType.value} className="image-type-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <span className="image-type-icon">{imageType.icon}</span>
                            <span className="image-type-label">{imageType.label}</span>
                            <Badge variant="secondary" className="image-count-badge mr-auto">
                              {typeImages.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {typeImages.map((image) => (
                              <div key={image.id} className="saved-image-card group relative">
                                <div className="relative overflow-hidden rounded-lg border">
                                  <DentalImage
                                    imagePath={image.image_path}
                                    alt={image.description || imageType.label}
                                    className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />

                                  {/* Action buttons */}
                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="image-action-button w-7 h-7 p-0 bg-white/90 hover:bg-white"
                                      onClick={() => handleImagePreview(image.image_path)}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="image-action-button w-7 h-7 p-0 bg-red-500/90 hover:bg-red-500"
                                      onClick={() => handleDeleteImage(image.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Image info */}
                                <div className="image-info mt-1 text-xs text-muted-foreground text-center">
                                  {image.taken_date && (
                                    <div>{formatDate(image.taken_date)}</div>
                                  )}
                                  {image.description && (
                                    <div className="truncate" title={image.description}>
                                      {image.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Empty state */}
              {images.length === 0 && selectedImages.length === 0 && (
                <Card className="empty-state">
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">لا توجد صور محفوظة</h3>
                      <p className="text-sm">
                        اختر نوع الصورة أعلاه لبدء إضافة صور للسن
                      </p>
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
          <Button
            variant="outline"
            onClick={() => {
              setSelectedImages([])
              onOpenChange(false)
            }}
          >
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
