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
import DentalChart from '@/components/dental/DentalChart'
import ToothDetailsDialog from '@/components/dental/ToothDetailsDialog'
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
  const { treatments, loadTreatments, loadTreatmentsByPatient } = useDentalTreatmentStore()
  const { prescriptions, loadPrescriptions } = usePrescriptionStore()
  const { settings, currency } = useSettingsStore()

  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedToothNumber, setSelectedToothNumber] = useState<number | null>(null)
  const [showToothDialog, setShowToothDialog] = useState(false)
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPrimaryTeeth, setIsPrimaryTeeth] = useState(false)

  // Enable real-time synchronization
  useRealTimeSync()

  useEffect(() => {
    loadPatients()
    loadTreatments()
    loadPrescriptions()
  }, [loadPatients, loadTreatments, loadPrescriptions])

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery) ||
    patient.serial_number.includes(searchQuery)
  )

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  // Get patient treatments
  const patientTreatments = treatments.filter(t => t.patient_id === selectedPatientId)

  // Get patient prescriptions
  const patientPrescriptions = prescriptions.filter(p => p.patient_id === selectedPatientId)

  // Calculate treatment counts for each patient
  const getPatientTreatmentCount = (patientId: string) => {
    return treatments.filter(t => t.patient_id === patientId).length
  }

  // Get last treatment date for patient
  const getLastTreatmentDate = (patientId: string) => {
    const patientTreatmentsList = treatments.filter(t => t.patient_id === patientId)
    if (patientTreatmentsList.length === 0) return null

    const sortedTreatments = patientTreatmentsList.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sortedTreatments[0].created_at
  }

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId)
    setSelectedToothNumber(null)
    // تحميل العلاجات للمريض المحدد
    if (patientId) {
      loadTreatmentsByPatient(patientId)
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
      loadTreatmentsByPatient(selectedPatientId)
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
        loadTreatments(),
        loadPrescriptions()
      ])
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
            isLoading={isLoading}
            isCompact={!!selectedPatient}
          />

          {/* Selected Patient Info */}
          {selectedPatient && (
            <Card className="bg-muted/30 dark:bg-muted/20 border-border">
              <CardContent className="pt-4 bg-muted/30 dark:bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Patient Treatments Summary */}
      {selectedPatient && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card dark:bg-card border-border">
            <CardHeader className="pb-2 bg-card dark:bg-card">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                العلاجات
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-card dark:bg-card">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {patientTreatments.length}
              </div>
              <p className="text-xs text-muted-foreground">إجمالي العلاجات</p>
            </CardContent>
          </Card>

          <Card className="bg-card dark:bg-card border-border">
            <CardHeader className="pb-2 bg-card dark:bg-card">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                الصور
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-card dark:bg-card">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {patientTreatments.reduce((acc, t) => acc + (t.images?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">صور العلاجات</p>
            </CardContent>
          </Card>

          <Card className="bg-card dark:bg-card border-border">
            <CardHeader className="pb-2 bg-card dark:bg-card">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                الوصفات
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-card dark:bg-card">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {patientPrescriptions.length}
              </div>
              <p className="text-xs text-muted-foreground">الوصفات الطبية</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dental Chart */}
      {selectedPatient && (
        <div id="dental-chart-section">
          <DentalChart
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
      {!selectedPatient && (
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
      <ToothDetailsDialog
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
