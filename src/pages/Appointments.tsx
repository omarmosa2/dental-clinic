import React, { useState, useCallback, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar'
import moment from 'moment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePatientStore } from '@/store/patientStore'
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, RefreshCw, Download } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

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
    loadAppointments
  } = useAppointmentStore()

  const { patients, loadPatients } = usePatientStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load appointments and patients on component mount
  useEffect(() => {
    loadAppointments()
    loadPatients()
  }, [loadAppointments, loadPatients])

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedAppointment(event.resource)
  }, [setSelectedAppointment])

  const handleSelectSlot = useCallback((slotInfo: any) => {
    console.log('Selected slot:', slotInfo)
    // Here you would open the add appointment dialog with the selected time
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
    <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold">{label}</h2>

      <div className="flex items-center space-x-2">
        <Button
          variant={calendarView === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('month')}
        >
          Month
        </Button>
        <Button
          variant={calendarView === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('week')}
        >
          Week
        </Button>
        <Button
          variant={calendarView === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('day')}
        >
          Day
        </Button>
        <Button
          variant={calendarView === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('agenda')}
        >
          Agenda
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
                alert('لا توجد بيانات مواعيد للتصدير')
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
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
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
        </div>

        {/* Appointment Details */}
        <div className="lg:col-span-1">
          {selectedAppointment ? (
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{selectedAppointment.title}</h4>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {selectedAppointment.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{formatDateTime(selectedAppointment.start_time)}</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}</span>
                  </div>
                </div>

                {selectedAppointment.description && (
                  <div>
                    <h5 className="font-medium mb-1">Description</h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.description}
                    </p>
                  </div>
                )}

                {selectedAppointment.treatment && (
                  <div>
                    <h5 className="font-medium mb-1">Treatment</h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.treatment.name}
                    </p>
                  </div>
                )}

                {selectedAppointment.cost && (
                  <div>
                    <h5 className="font-medium mb-1">Cost</h5>
                    <p className="text-sm text-muted-foreground">
                      ${selectedAppointment.cost}
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button className="w-full" size="sm">
                    Edit Appointment
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    Mark as Completed
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No appointment selected</h3>
                  <p className="text-muted-foreground">
                    Click on an appointment to view details
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Appointments Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                {formatDate(new Date(), 'long')}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        <p className="text-sm font-medium">{appointment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appointment.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getStatusColor(appointment.status)}
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}

                {appointments.filter(apt => {
                  const today = new Date().toDateString()
                  const aptDate = new Date(apt.start_time).toDateString()
                  return today === aptDate
                }).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No appointments today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
