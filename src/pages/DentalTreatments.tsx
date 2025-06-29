import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePatientStore } from '@/store/patientStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { useSettingsStore } from '@/store/settingsStore'
import EnhancedDentalChart from '@/components/dental/EnhancedDentalChart'
import EnhancedToothDetailsDialog from '@/components/dental/EnhancedToothDetailsDialog'

import PrescriptionReceiptDialog from '@/components/medications/PrescriptionReceiptDialog'
import PatientSelectionTable from '@/components/dental/PatientSelectionTable'
import { formatDate, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { notify } from '@/services/notificationService'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import {
  Search,
  User,
  Phone,
  Calendar,
  FileText,
  Printer,
  RefreshCw,
  Stethoscope,
  Camera,
  Activity
} from 'lucide-react'

export default function DentalTreatments() {
  const { toast } = useToast()
  const { patients, loadPatients } = usePatientStore()
  const {
    toothTreatments,
    toothTreatmentImages,
    loadToothTreatments,
    loadAllToothTreatmentImages,
    loadToothTreatmentsByPatient,
    loadAllToothTreatmentImagesByPatient
  } = useDentalTreatmentStore()
  const { prescriptions, loadPrescriptions } = usePrescriptionStore()
  const { settings, currency } = useSettingsStore()

  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedToothNumber, setSelectedToothNumber] = useState<number | null>(null)
  const [showToothDialog, setShowToothDialog] = useState(false)
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [isPrimaryTeeth, setIsPrimaryTeeth] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showTestMode, setShowTestMode] = useState(false)


  // Enable real-time synchronization
  useRealTimeSync()

  useEffect(() => {
    loadPatients()
    loadPrescriptions()
    loadToothTreatments() // تحميل جميع العلاجات لحساب العدد لكل مريض
    loadAllToothTreatmentImages() // تحميل جميع الصور لحساب العدد لكل مريض
  }, [loadPatients, loadPrescriptions, loadToothTreatments, loadAllToothTreatmentImages])

  // Check for pre-selected patient from localStorage
  useEffect(() => {
    const checkPreSelectedPatient = () => {
      try {
        const stored = localStorage.getItem('selectedPatientForTreatment')
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log('Found pre-selected patient for treatment:', parsed)

          const preSelectedPatientId = parsed.selectedPatientId
          const preSelectedPatientName = parsed.patientName
          const showAddTreatmentGuidance = parsed.showAddTreatmentGuidance

          // Clear localStorage immediately to avoid re-processing
          localStorage.removeItem('selectedPatientForTreatment')

          // Wait for patients to load, then select the patient
          const selectPatient = () => {
            console.log('Attempting to select patient:', preSelectedPatientId)
            console.log('Available patients:', patients.length)

            // Set search query to patient name for easy identification
            if (preSelectedPatientName) {
              setSearchQuery(preSelectedPatientName)
              // Show notification that patient was pre-selected
              notify.success(`تم تحديد المريض: ${preSelectedPatientName}`)

              // Check if we should show add treatment guidance
              if (showAddTreatmentGuidance) {
                setTimeout(() => {
                  notify.info('اختر السن المراد علاجه من الرسم البياني أدناه لإضافة علاج جديد', undefined, { duration: 5000 })
                }, 1000)
              }
            }

            // Actually select the patient
            setSelectedPatientId(preSelectedPatientId)
            console.log('Patient selected:', preSelectedPatientId)

            // Load treatments for the pre-selected patient
            loadToothTreatmentsByPatient(preSelectedPatientId)
            loadImages()

            // Scroll to dental chart after a short delay
            setTimeout(() => {
              const dentalChartElement = document.getElementById('dental-chart-section')
              if (dentalChartElement) {
                dentalChartElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }, 500)
          }

          // If patients are already loaded, select immediately
          if (patients.length > 0) {
            selectPatient()
          } else {
            // Otherwise wait a bit for patients to load
            setTimeout(selectPatient, 200)
          }
        }
      } catch (error) {
        console.error('Error reading pre-selected patient for treatment:', error)
      }
    }

    checkPreSelectedPatient()
  }, [patients.length])

  // Check for search result navigation
  useEffect(() => {
    const searchResultData = localStorage.getItem('selectedTreatmentForDetails')
    if (searchResultData) {
      try {
        const { treatment, patientId, openDetailsModal } = JSON.parse(searchResultData)
        if (openDetailsModal && treatment && patientId) {
          // Select the patient first
          setSelectedPatientId(patientId)
          loadToothTreatmentsByPatient(patientId)

          // Set the tooth number and open dialog
          setSelectedToothNumber(treatment.tooth_number)
          setShowToothDialog(true)

          localStorage.removeItem('selectedTreatmentForDetails')
        }
      } catch (error) {
        console.error('Error parsing search result data:', error)
        localStorage.removeItem('selectedTreatmentForDetails')
      }
    }

    const prescriptionResultData = localStorage.getItem('selectedPrescriptionForDetails')
    if (prescriptionResultData) {
      try {
        const { prescription, openDetailsModal } = JSON.parse(prescriptionResultData)
        if (openDetailsModal && prescription) {
          setSelectedPrescription(prescription)
          setShowPrescriptionDialog(true)
          localStorage.removeItem('selectedPrescriptionForDetails')
        }
      } catch (error) {
        console.error('Error parsing prescription search result data:', error)
        localStorage.removeItem('selectedPrescriptionForDetails')
      }
    }
  }, [])

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery) ||
    patient.serial_number.includes(searchQuery)
  )

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  // Get patient prescriptions
  const patientPrescriptions = prescriptions.filter(p => p.patient_id === selectedPatientId)

  // Calculate treatment counts for each patient
  const getPatientTreatmentCount = (patientId: string) => {
    const newSystemCount = toothTreatments.filter(t => t.patient_id === patientId).length
    return newSystemCount
  }

  // Get detailed treatment stats for patient
  const getPatientTreatmentStats = (patientId: string) => {
    const patientTreatments = toothTreatments.filter(t => t.patient_id === patientId)
    return {
      total: patientTreatments.length,
      completed: patientTreatments.filter(t => t.treatment_status === 'completed').length,
      inProgress: patientTreatments.filter(t => t.treatment_status === 'in_progress').length,
      planned: patientTreatments.filter(t => t.treatment_status === 'planned').length
    }
  }

  // Get last treatment date for patient
  const getLastTreatmentDate = (patientId: string) => {
    const newSystemTreatments = toothTreatments.filter(t => t.patient_id === patientId)

    if (newSystemTreatments.length === 0) return null

    const sortedTreatments = newSystemTreatments.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sortedTreatments[0].created_at
  }

  // Calculate total images count for patient (using new system)
  const getPatientImagesCount = (patientId: string) => {
    return toothTreatmentImages.filter(img => img.patient_id === patientId).length
  }

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId)
    setSelectedToothNumber(null)
    // تحميل العلاجات والصور للمريض المحدد
    if (patientId) {
      loadToothTreatmentsByPatient(patientId) // النظام الجديد
      loadAllToothTreatmentImagesByPatient(patientId) // تحميل الصور بالنظام الجديد
      // Scroll to dental chart after selection
      setTimeout(() => {
        const dentalChartElement = document.getElementById('dental-chart-section')
        if (dentalChartElement) {
          dentalChartElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const handleToothClick = (toothNumber: number) => {
    if (!selectedPatientId) {
      notify.warning('يرجى اختيار مريض أولاً')
      return
    }
    setSelectedToothNumber(toothNumber)
    setShowToothDialog(true)
  }

  const handleToothDialogClose = (open: boolean) => {
    setShowToothDialog(open)
    // إعادة تحميل البيانات عند إغلاق الحوار
    if (!open && selectedPatientId) {
      loadToothTreatmentsByPatient(selectedPatientId) // النظام الجديد
      loadAllToothTreatmentImagesByPatient(selectedPatientId) // إعادة تحميل الصور بالنظام الجديد
    }
  }

  const handlePrintPrescription = (prescription: any) => {
    setSelectedPrescription(prescription)
    setShowPrescriptionDialog(true)
  }

  const refreshData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadPatients(),
        loadPrescriptions(),
        loadToothTreatments(), // تحديث جميع العلاجات
        loadAllToothTreatmentImages() // تحديث جميع الصور بالنظام الجديد
      ])
      // تحديث العلاجات والصور للمريض المحدد
      if (selectedPatientId) {
        await Promise.all([
          loadToothTreatmentsByPatient(selectedPatientId),
          loadAllToothTreatmentImagesByPatient(selectedPatientId)
        ])
      }
      notify.success('تم تحديث البيانات بنجاح')
    } catch (error) {
      notify.error('حدث خطأ أثناء تحديث البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            العلاجات السنية
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة شاملة للعلاجات السنية مع مخطط الأسنان التفاعلي
          </p>
        </div>
        <Button onClick={refreshData} disabled={isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </Button>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                <p className="text-2xl font-bold text-foreground">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العلاجات</p>
                <p className="text-2xl font-bold text-foreground">{toothTreatments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Camera className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الصور</p>
                <p className="text-2xl font-bold text-foreground">{toothTreatmentImages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الوصفات الطبية</p>
                <p className="text-2xl font-bold text-foreground">{prescriptions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            اختيار المريض
          </CardTitle>
          <CardDescription>
            ابحث واختر المريض لعرض مخطط الأسنان والعلاجات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث السريع: اسم المريض، رقم الهاتف، أو الرقم التسلسلي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              autoComplete="off"
            />
            {searchQuery && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Badge variant="secondary" className="text-xs">
                  {filteredPatients.length} نتيجة
                </Badge>
              </div>
            )}
          </div>

          {/* Patients Table */}
          <PatientSelectionTable
            patients={filteredPatients}
            selectedPatientId={selectedPatientId}
            onPatientSelect={handlePatientSelect}
            getPatientTreatmentCount={getPatientTreatmentCount}
            getLastTreatmentDate={getLastTreatmentDate}
            getPatientImagesCount={getPatientImagesCount}
            isLoading={isLoading}
            isCompact={!!selectedPatient}
          />

          {/* Selected Patient Info */}
          {selectedPatient && (
            <Card className="bg-muted/30 dark:bg-muted/20 border-border">
              <CardContent className="pt-4 bg-muted/30 dark:bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-foreground">{selectedPatient.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">الجنس:</span>
                    <Badge variant="secondary">
                      {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-foreground">{selectedPatient.age} سنة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <a
                      href={`https://wa.me/${selectedPatient.phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      {selectedPatient.phone}
                    </a>
                  </div>
                </div>

                {/* Treatment Statistics */}
                {(() => {
                  const stats = getPatientTreatmentStats(selectedPatientId)
                  const imagesCount = getPatientImagesCount(selectedPatientId)

                  return (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-medium text-foreground mb-3">إحصائيات العلاجات</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            <Activity className="w-3 h-3 ml-1" />
                            {stats.total} إجمالي
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
                            ✓ {stats.completed} مكتمل
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                            ⏳ {stats.inProgress} قيد التنفيذ
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                            📋 {stats.planned} مخطط
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            <Camera className="w-3 h-3 ml-1" />
                            {imagesCount} صورة
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>



      {/* Enhanced Mode Toggle */}
      {selectedPatient && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">نظام العلاجات المتعددة</h3>
                <p className="text-sm text-muted-foreground">
                  النظام المحسن: يدعم عدة علاجات للسن الواحد مع الألوان العالمية
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Dental Chart */}
      {selectedPatient && (
        <div id="dental-chart-section">
          <EnhancedDentalChart
            patientId={selectedPatientId}
            onToothClick={handleToothClick}
            selectedTooth={selectedToothNumber}
            isPrimaryTeeth={isPrimaryTeeth}
            onPrimaryTeethChange={setIsPrimaryTeeth}
          />
        </div>
      )}

      {/* Prescriptions List */}
      {selectedPatient && patientPrescriptions.length > 0 && (
        <Card className="bg-card dark:bg-card border-border">
          <CardHeader className="bg-card dark:bg-card">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5" />
              الوصفات الطبية
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-card dark:bg-card">
            <div className="space-y-2">
              {patientPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      وصفة طبية - {formatDate(prescription.prescription_date)}
                    </div>
                    {prescription.notes && (
                      <div className="text-sm text-muted-foreground">
                        {prescription.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintPrescription(prescription)}
                  >
                    <Printer className="w-4 h-4 ml-2" />
                    طباعة
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedPatient && !showTestMode && (
        <Card>
          <CardContent className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">اختر مريض لبدء العلاج</h3>
            <p className="text-muted-foreground">
              استخدم البحث أعلاه لاختيار مريض وعرض مخطط الأسنان التفاعلي
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <EnhancedToothDetailsDialog
        open={showToothDialog}
        onOpenChange={handleToothDialogClose}
        patientId={selectedPatientId}
        toothNumber={selectedToothNumber}
        isPrimaryTeeth={isPrimaryTeeth}
      />

      {selectedPrescription && (
        <PrescriptionReceiptDialog
          open={showPrescriptionDialog}
          onOpenChange={setShowPrescriptionDialog}
          prescription={selectedPrescription}
        />
      )}
    </div>
  )
}
