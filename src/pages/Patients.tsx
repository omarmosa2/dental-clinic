import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Download
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
              if (filteredPatients.length === 0) {
                notify.noDataToExport('لا توجد بيانات مرضى للتصدير')
                return
              }

              try {
                // Match the table columns exactly
                const csvData = filteredPatients.map(patient => ({
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

                notify.exportSuccess(`تم تصدير ${filteredPatients.length} مريض بنجاح!`)
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
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline">
              تصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <div className="space-y-6">
        <PatientTable
          patients={filteredPatients}
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
