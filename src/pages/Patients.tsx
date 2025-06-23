import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { formatDate, getInitials, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { notify } from '@/services/notificationService'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AddPatientDialog from '@/components/patients/AddPatientDialog'
import PatientTable from '@/components/patients/PatientTable'
import PatientDetailsModal from '@/components/patients/PatientDetailsModal'
import EditPatientDialog from '@/components/EditPatientDialog'
import { Patient } from '@/types'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  User,
  RefreshCw,
  Download,
  Filter,
  X
} from 'lucide-react'

export default function Patients() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  const {
    filteredPatients,
    selectedPatient,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    setSelectedPatient,
    deletePatient,
    updatePatient,
    clearError,
    loadPatients
  } = usePatientStore()

  const { loadAppointments } = useAppointmentStore()
  const { loadPayments } = usePaymentStore()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<Patient | null>(null)
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<Patient | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null)

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [genderFilter, setGenderFilter] = useState('all')
  const [ageRangeFilter, setAgeRangeFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')

  // Load patients on component mount
  useEffect(() => {
    loadPatients()
    loadAppointments()
    loadPayments()
  }, [loadPatients, loadAppointments, loadPayments])

  const handleDeletePatient = async (patientId: string) => {
    setPatientToDelete(patientId)
    setShowDeleteDialog(true)
  }

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return

    try {
      await deletePatient(patientToDelete)
      notify.deleteSuccess('تم حذف المريض بنجاح')
    } catch (error) {
      notify.deleteError('فشل في حذف المريض')
    } finally {
      setShowDeleteDialog(false)
      setPatientToDelete(null)
    }
  }

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatientForDetails(patient)
    setShowDetailsModal(true)
  }

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatientForEdit(patient)
    setShowEditDialog(true)
  }

  const handleUpdatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
      await updatePatient(id, patientData)
      setShowEditDialog(false)
      setSelectedPatientForEdit(null)
      toast({
        title: "نجح",
        description: "تم تحديث بيانات المريض بنجاح",
      })
    } catch (error) {
      console.error('Error updating patient:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث بيانات المريض. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      })
    }
  }

  // Apply advanced filters to patients
  const filteredPatientsWithAdvancedFilters = React.useMemo(() => {
    let filtered = [...filteredPatients]

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(patient => patient.gender === genderFilter)
    }

    // Age range filter
    if (ageRangeFilter !== 'all') {
      filtered = filtered.filter(patient => {
        if (!patient.date_of_birth) return ageRangeFilter === 'unknown'

        const age = calculateAge(patient.date_of_birth)
        switch (ageRangeFilter) {
          case 'child': return age < 18
          case 'adult': return age >= 18 && age < 60
          case 'senior': return age >= 60
          case 'unknown': return false
          default: return true
        }
      })
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter(patient => patient.patient_condition === conditionFilter)
    }

    return filtered
  }, [filteredPatients, genderFilter, ageRangeFilter, conditionFilter])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setGenderFilter('all')
    setAgeRangeFilter('all')
    setConditionFilter('all')
    setShowFilters(false)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={clearError}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة المرضى</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            إدارة معلومات المرضى وسجلاتهم الطبية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={() => {
              // Export patients data
              if (filteredPatientsWithAdvancedFilters.length === 0) {
                notify.noDataToExport('لا توجد بيانات مرضى للتصدير')
                return
              }

              try {
                // Match the table columns exactly
                const csvData = filteredPatientsWithAdvancedFilters.map(patient => ({
                  'الاسم الكامل للمريض': patient.full_name || '',
                  'الجنس': patient.gender === 'male' ? 'ذكر' : 'أنثى',
                  'العمر': patient.age || '',
                  'رقم الهاتف': patient.phone || '',
                  'حالة المريض': patient.patient_condition || '',
                  'ملاحظات': patient.notes || ''
                }))

                // Create CSV with BOM for Arabic support
                const headers = Object.keys(csvData[0]).join(',')
                const rows = csvData.map(row =>
                  Object.values(row).map(value =>
                    `"${String(value).replace(/"/g, '""')}"`
                  ).join(',')
                )
                const csvContent = '\uFEFF' + [headers, ...rows].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)

                // Generate descriptive filename with date and time
                const now = new Date()
                const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
                const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
                const fileName = `تقرير_المرضى_${dateStr}_${timeStr}.csv`

                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                notify.exportSuccess(`تم تصدير ${filteredPatientsWithAdvancedFilters.length} مريض بنجاح!`)
              } catch (error) {
                console.error('Error exporting patients:', error)
                notify.exportError('فشل في تصدير بيانات المرضى')
              }
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة مريض جديد
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center gap-4" dir="rtl">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    تصفية
                    {(genderFilter !== 'all' || ageRangeFilter !== 'all' || conditionFilter !== 'all') && (
                      <span className="mr-2 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              {(searchQuery || genderFilter !== 'all' || ageRangeFilter !== 'all' || conditionFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4 mr-2" />
                  مسح الكل
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
                  {/* Gender Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الجنس</label>
                    <Select value={genderFilter} onValueChange={setGenderFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الأجناس" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأجناس</SelectItem>
                        <SelectItem value="male">ذكر</SelectItem>
                        <SelectItem value="female">أنثى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age Range Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الفئة العمرية</label>
                    <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الأعمار" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأعمار</SelectItem>
                        <SelectItem value="child">أطفال (أقل من 18)</SelectItem>
                        <SelectItem value="adult">بالغين (18-59)</SelectItem>
                        <SelectItem value="senior">كبار السن (60+)</SelectItem>
                        <SelectItem value="unknown">غير محدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">حالة المريض</label>
                    <Select value={conditionFilter} onValueChange={setConditionFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="جديد">جديد</SelectItem>
                        <SelectItem value="متابعة">متابعة</SelectItem>
                        <SelectItem value="مكتمل">مكتمل</SelectItem>
                        <SelectItem value="معلق">معلق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <div className="space-y-6">
        <PatientTable
          patients={filteredPatientsWithAdvancedFilters}
          isLoading={isLoading}
          onEdit={handleEditPatient}
          onDelete={handleDeletePatient}
          onViewDetails={handleViewDetails}
        />
      </div>



      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* Patient Details Modal */}
      <PatientDetailsModal
        patient={selectedPatientForDetails}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        onEdit={handleEditPatient}
      />

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        isOpen={showEditDialog}
        patient={selectedPatientForEdit}
        onClose={() => {
          setShowEditDialog(false)
          setSelectedPatientForEdit(null)
        }}
        onSave={handleUpdatePatient}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              تأكيد حذف المريض
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المريض؟ سيتم حذف جميع البيانات المرتبطة به بما في ذلك المواعيد والمدفوعات.
              <br />
              <strong className="text-destructive">تحذير: لا يمكن التراجع عن هذا الإجراء!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={confirmDeletePatient}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
