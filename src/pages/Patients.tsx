import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePatientStore } from '@/store/patientStore'
import { formatDate, getInitials, calculateAge } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import AddPatientDialog from '@/components/patients/AddPatientDialog'
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
  const {
    filteredPatients,
    selectedPatient,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    setSelectedPatient,
    deletePatient,
    clearError,
    loadPatients
  } = usePatientStore()

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Load patients on component mount
  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  const handleDeletePatient = async (patientId: string) => {
    if (window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      try {
        await deletePatient(patientId)
        toast({
          title: "Success",
          description: "Patient deleted successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete patient",
          variant: "destructive",
        })
      }
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
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Export patients data
              if (filteredPatients.length === 0) {
                alert('لا توجد بيانات مرضى للتصدير')
                return
              }

              const csvData = filteredPatients.map(patient => ({
                'الاسم الأول': patient.first_name || '',
                'الاسم الأخير': patient.last_name || '',
                'تاريخ الميلاد': patient.date_of_birth || '',
                'الهاتف': patient.phone || '',
                'البريد الإلكتروني': patient.email || '',
                'العنوان': patient.address || '',
                'جهة الاتصال الطارئ': patient.emergency_contact_name || '',
                'هاتف الطوارئ': patient.emergency_contact_phone || '',
                'التاريخ الطبي': patient.medical_history || '',
                'الحساسية': patient.allergies || '',
                'الملاحظات': patient.notes || ''
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

              alert(`تم تصدير ${filteredPatients.length} مريض بنجاح!`)
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

      {/* Patient List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Cards */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="loading-spinner"></div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد مرضى</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'جرب تعديل معايير البحث' : 'ابدأ بإضافة أول مريض'}
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة مريض
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <Card
                  key={patient.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPatient?.id === patient.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                          {getInitials(patient.first_name, patient.last_name)}
                        </div>

                        {/* Patient Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            {patient.date_of_birth && (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Age {calculateAge(patient.date_of_birth)}
                              </div>
                            )}
                            {patient.phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-1" />
                                {patient.phone}
                              </div>
                            )}
                            {patient.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {patient.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4 ml-1" />
                          <span className="text-xs">تعديل</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePatient(patient.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          <span className="text-xs">حذف</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Patient Details Panel */}
        <div className="lg:col-span-1">
          {selectedPatient ? (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>تفاصيل المريض</CardTitle>
                <CardDescription>
                  معلومات تفصيلية عن {selectedPatient.first_name} {selectedPatient.last_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium mb-2">المعلومات الأساسية</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الاسم:</span>
                      <span>{selectedPatient.first_name} {selectedPatient.last_name}</span>
                    </div>
                    {selectedPatient.date_of_birth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">العمر:</span>
                        <span>{calculateAge(selectedPatient.date_of_birth)} سنة</span>
                      </div>
                    )}
                    {selectedPatient.phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الهاتف:</span>
                        <span>{selectedPatient.phone}</span>
                      </div>
                    )}
                    {selectedPatient.email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">البريد الإلكتروني:</span>
                        <span>{selectedPatient.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                {selectedPatient.address && (
                  <div>
                    <h4 className="font-medium mb-2">Address</h4>
                    <p className="text-sm text-muted-foreground">{selectedPatient.address}</p>
                  </div>
                )}

                {/* Emergency Contact */}
                {(selectedPatient.emergency_contact_name || selectedPatient.emergency_contact_phone) && (
                  <div>
                    <h4 className="font-medium mb-2">Emergency Contact</h4>
                    <div className="space-y-1 text-sm">
                      {selectedPatient.emergency_contact_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{selectedPatient.emergency_contact_name}</span>
                        </div>
                      )}
                      {selectedPatient.emergency_contact_phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span>{selectedPatient.emergency_contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical History */}
                {selectedPatient.medical_history && (
                  <div>
                    <h4 className="font-medium mb-2">Medical History</h4>
                    <p className="text-sm text-muted-foreground">{selectedPatient.medical_history}</p>
                  </div>
                )}

                {/* Allergies */}
                {selectedPatient.allergies && (
                  <div>
                    <h4 className="font-medium mb-2">Allergies</h4>
                    <p className="text-sm text-muted-foreground">{selectedPatient.allergies}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedPatient.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedPatient.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <Button className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Patient
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No patient selected</h3>
                  <p className="text-muted-foreground">
                    Select a patient from the list to view their details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  )
}
