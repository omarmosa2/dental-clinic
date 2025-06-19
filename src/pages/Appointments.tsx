import React, { useState, useCallback, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar'
import moment from 'moment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, RefreshCw, Download, Table } from 'lucide-react'
import AppointmentTable from '@/components/appointments/AppointmentTable'
import AddAppointmentDialog from '@/components/AddAppointmentDialog'
import DeleteAppointmentDialog from '@/components/appointments/DeleteAppointmentDialog'
import PatientDetailsModal from '@/components/patients/PatientDetailsModal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

// Function to translate appointment status to Arabic
const getStatusInArabic = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'مجدول'
    case 'completed':
      return 'مكتمل'
    case 'cancelled':
      return 'ملغي'
    case 'no_show':
      return 'لم يحضر'
    default:
      return status
  }
}

export default function Appointments() {
  const {
    appointments,
    calendarEvents,
    selectedAppointment,
    calendarView,
    selectedDate,
    setSelectedAppointment,
    setCalendarView,
    setSelectedDate,
    loadAppointments,
    deleteAppointment,
    updateAppointment,
    createAppointment
  } = useAppointmentStore()

  const { patients, loadPatients } = usePatientStore()
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<any>(null)

  // Load appointments and patients on component mount
  useEffect(() => {
    loadAppointments()
    loadPatients()
  }, [loadAppointments, loadPatients])

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return

    setIsLoading(true)
    try {
      await deleteAppointment(appointmentToDelete)
      toast({
        title: 'نجح',
        description: 'تم حذف الموعد بنجاح',
        variant: 'default',
      })
      setShowDeleteDialog(false)
      setAppointmentToDelete(null)
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الموعد',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedAppointment(event.resource)
  }, [setSelectedAppointment])

  const handleSelectSlot = useCallback((slotInfo: any) => {
    console.log('Selected slot:', slotInfo)
    // Clear selection for new appointment and open dialog with selected time
    setSelectedAppointment(null)
    setShowAddDialog(true)
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setSelectedDate(newDate)
  }, [setSelectedDate])

  const handleViewChange = useCallback((view: View) => {
    setCalendarView(view as 'month' | 'week' | 'day' | 'agenda')
  }, [setCalendarView])

  const eventStyleGetter = (event: any) => {
    const appointment = event.resource
    let backgroundColor = '#3174ad'

    switch (appointment?.status) {
      case 'completed':
        backgroundColor = '#10b981'
        break
      case 'cancelled':
        backgroundColor = '#ef4444'
        break
      case 'no_show':
        backgroundColor = '#6b7280'
        break
      default:
        backgroundColor = '#3b82f6'
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  const CustomToolbar = ({ label, onNavigate, onView }: any) => (
    <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border" dir="rtl">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
          className="arabic-enhanced"
        >
          اليوم
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold arabic-enhanced">{label}</h2>

      <div className="flex items-center gap-2">
        <Button
          variant={calendarView === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('month')}
          className="arabic-enhanced"
        >
          شهر
        </Button>
        <Button
          variant={calendarView === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('week')}
          className="arabic-enhanced"
        >
          أسبوع
        </Button>
        <Button
          variant={calendarView === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('day')}
          className="arabic-enhanced"
        >
          يوم
        </Button>
        <Button
          variant={calendarView === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('agenda')}
          className="arabic-enhanced"
        >
          جدول أعمال
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">إدارة المواعيد</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            جدولة ومتابعة مواعيد المرضى
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
              // Export appointments data
              if (appointments.length === 0) {
                toast({
                  title: 'تنبيه',
                  description: 'لا توجد بيانات مواعيد للتصدير',
                  variant: 'destructive',
                })
                return
              }

              const csvData = appointments.map(appointment => ({
                'العنوان': appointment.title || '',
                'المريض': appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : '',
                'تاريخ البداية': new Date(appointment.start_time).toLocaleString('ar-SA'),
                'تاريخ النهاية': new Date(appointment.end_time).toLocaleString('ar-SA'),
                'الحالة': appointment.status || '',
                'الوصف': appointment.description || '',
                'العلاج': appointment.treatment?.name || '',
                'التكلفة': appointment.cost || 0,
                'الملاحظات': appointment.notes || ''
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
              const fileName = `تقرير_المواعيد_${dateStr}_${timeStr}.csv`

              link.download = fileName
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              alert(`تم تصدير ${appointments.length} موعد بنجاح!`)
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => {
            setSelectedAppointment(null) // Clear selection for new appointment
            setShowAddDialog(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            موعد جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span className="arabic-enhanced">عرض التقويم</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center space-x-2 space-x-reverse">
                <Table className="w-4 h-4" />
                <span className="arabic-enhanced">عرض الجدول</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div style={{ height: '600px' }}>
                    <BigCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      view={calendarView}
                      onView={handleViewChange}
                      date={selectedDate}
                      onNavigate={handleNavigate}
                      onSelectEvent={handleSelectEvent}
                      onSelectSlot={handleSelectSlot}
                      selectable
                      eventPropGetter={eventStyleGetter}
                      components={{
                        toolbar: CustomToolbar
                      }}
                      step={30}
                      timeslots={2}
                      min={new Date(2024, 0, 1, 8, 0)}
                      max={new Date(2024, 0, 1, 18, 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <AppointmentTable
                appointments={appointments}
                patients={patients}
                isLoading={isLoading}
                onEdit={(appointment) => {
                  setSelectedAppointment(appointment)
                  setShowAddDialog(true)
                }}
                onDelete={(appointmentId) => {
                  setAppointmentToDelete(appointmentId)
                  setShowDeleteDialog(true)
                }}
                onViewPatient={(patient) => {
                  console.log('View patient:', patient)
                  setSelectedPatientForDetails(patient)
                  setShowPatientDetails(true)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Appointment Details */}
        <div className="lg:col-span-1">
          {selectedAppointment ? (
            <Card>
              <CardHeader>
                <CardTitle className="arabic-enhanced">تفاصيل الموعد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4" dir="rtl">
                <div>
                  <h4 className="font-medium mb-2 arabic-enhanced">{selectedAppointment.title}</h4>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {getStatusInArabic(selectedAppointment.status)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDateTime(selectedAppointment.start_time)}</span>
                  </div>

                  <div className="flex items-center text-sm gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="arabic-enhanced">{selectedAppointment.patient?.full_name}</span>
                  </div>
                </div>

                {selectedAppointment.description && (
                  <div>
                    <h5 className="font-medium mb-1 arabic-enhanced">الوصف</h5>
                    <p className="text-sm text-muted-foreground arabic-enhanced">
                      {selectedAppointment.description}
                    </p>
                  </div>
                )}

                {selectedAppointment.treatment && (
                  <div>
                    <h5 className="font-medium mb-1 arabic-enhanced">العلاج</h5>
                    <p className="text-sm text-muted-foreground arabic-enhanced">
                      {selectedAppointment.treatment.name}
                    </p>
                  </div>
                )}

                {selectedAppointment.cost && (
                  <div>
                    <h5 className="font-medium mb-1 arabic-enhanced">التكلفة</h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.cost} ريال
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full arabic-enhanced"
                    size="sm"
                    onClick={() => {
                      // Keep the selected appointment when opening edit dialog
                      setShowAddDialog(true)
                    }}
                  >
                    تعديل الموعد
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full arabic-enhanced"
                    size="sm"
                    disabled={isLoading || selectedAppointment?.status === 'completed'}
                    onClick={async () => {
                      if (!selectedAppointment) return

                      setIsLoading(true)
                      try {
                        await updateAppointment(selectedAppointment.id, { status: 'completed' })

                        // Update the selected appointment in the UI
                        const updatedAppointment = { ...selectedAppointment, status: 'completed' as const }
                        setSelectedAppointment(updatedAppointment)

                        toast({
                          title: 'نجح',
                          description: 'تم تحديد الموعد كمكتمل',
                          variant: 'default',
                        })
                      } catch (error) {
                        console.error('Error updating appointment:', error)
                        toast({
                          title: 'خطأ',
                          description: 'حدث خطأ أثناء تحديث الموعد',
                          variant: 'destructive',
                        })
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                  >
                    {isLoading ? 'جاري التحديث...' :
                     selectedAppointment?.status === 'completed' ? 'مكتمل ✓' : 'تحديد كمكتمل'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6" dir="rtl">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2 arabic-enhanced">لم يتم اختيار موعد</h3>
                  <p className="text-muted-foreground arabic-enhanced">
                    انقر على موعد لعرض التفاصيل
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Appointments Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="arabic-enhanced">جدول اليوم</CardTitle>
              <CardDescription className="arabic-enhanced">
                {formatDate(new Date(), 'long')}
              </CardDescription>
            </CardHeader>
            <CardContent dir="rtl">
              <div className="space-y-2">
                {appointments
                  .filter(apt => {
                    const today = new Date().toDateString()
                    const aptDate = new Date(apt.start_time).toDateString()
                    return today === aptDate
                  })
                  .slice(0, 5)
                  .map(appointment => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <div>
                        <p className="text-sm font-medium arabic-enhanced">{appointment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusColor(appointment.status)}
                      >
                        {getStatusInArabic(appointment.status)}
                      </Badge>
                    </div>
                  ))}

                {appointments.filter(apt => {
                  const today = new Date().toDateString()
                  const aptDate = new Date(apt.start_time).toDateString()
                  return today === aptDate
                }).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 arabic-enhanced">
                    لا توجد مواعيد اليوم
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Appointment Dialog */}
      <AddAppointmentDialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false)
          // Don't clear selectedAppointment when closing dialog
          // Only clear it when explicitly needed (like after successful save)
        }}
        onSave={async (appointmentData) => {
          try {
            if (selectedAppointment) {
              // Edit existing appointment
              console.log('🔄 Updating appointment:', {
                id: selectedAppointment.id,
                data: appointmentData
              })
              await updateAppointment(selectedAppointment.id, appointmentData)
              console.log('✅ Appointment updated successfully')
              toast({
                title: 'نجح',
                description: 'تم تحديث الموعد بنجاح',
                variant: 'default',
              })
            } else {
              // Create new appointment
              console.log('➕ Creating new appointment:', appointmentData)
              await createAppointment(appointmentData)
              console.log('✅ Appointment created successfully')
              toast({
                title: 'نجح',
                description: 'تم إضافة الموعد بنجاح',
                variant: 'default',
              })
            }
            setShowAddDialog(false)
            setSelectedAppointment(null)
          } catch (error) {
            console.error('❌ Error saving appointment:', error)
            toast({
              title: 'خطأ',
              description: 'حدث خطأ أثناء حفظ الموعد',
              variant: 'destructive',
            })
          }
        }}
        patients={patients}
        treatments={[]} // You can add treatments here if needed
        initialData={selectedAppointment}
      />

      {/* Delete Appointment Dialog */}
      <DeleteAppointmentDialog
        isOpen={showDeleteDialog}
        appointment={appointmentToDelete ? appointments.find(apt => apt.id === appointmentToDelete) || null : null}
        patient={appointmentToDelete ? patients.find(p => p.id === appointments.find(apt => apt.id === appointmentToDelete)?.patient_id) || null : null}
        onClose={() => {
          setShowDeleteDialog(false)
          setAppointmentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />

      {/* Patient Details Modal */}
      <PatientDetailsModal
        open={showPatientDetails}
        patient={selectedPatientForDetails}
        onOpenChange={(open) => {
          setShowPatientDetails(open)
          if (!open) {
            setSelectedPatientForDetails(null)
          }
        }}
      />
    </div>
  )
}
