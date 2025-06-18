import React, { useState, useEffect } from 'react'
import { usePatientStore } from './store/patientStore'
import { useAppointmentStore } from './store/appointmentStore'
import { useSettingsStore } from './store/settingsStore'
import { useLicenseStore, useLicenseStatus, useLicenseUI } from './store/licenseStore'
import { licenseGuard } from './services/licenseGuard'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import PatientCard from './components/PatientCard'
import AddPatientDialog from './components/patients/AddPatientDialog'
import EditPatientDialog from './components/EditPatientDialog'
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog'
import AppointmentCard from './components/AppointmentCard'
import AddAppointmentDialog from './components/AddAppointmentDialog'
import PaymentsPage from './pages/Payments'
import SettingsPage from './pages/Settings'
import InventoryPage from './pages/Inventory'
import ReportsPage from './pages/Reports'
import Dashboard from './pages/Dashboard'
import ThemeToggle from './components/ThemeToggle'
import { AppSidebar } from './components/AppSidebar'
import { AppSidebarTrigger } from './components/AppSidebarTrigger'
import SimpleLicenseLock from './components/SimpleLicenseLock'
import LicenseProtection from './components/LicenseProtection'
import LiveDateTime from './components/LiveDateTime'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Search, Plus, Filter } from 'lucide-react'
import { Patient, Appointment } from './types'
import { useRealTimeSync } from './hooks/useRealTimeSync'
import './App.css'
import './styles/globals.css'

function AppContent() {
  const { isDarkMode } = useTheme()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize real-time data synchronization
  const { syncAfterPatientDeletion } = useRealTimeSync()

  // Appointment states
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)
  const [showDeleteAppointmentConfirm, setShowDeleteAppointmentConfirm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // License state
  const {
    licenseInfo,
    canUseApp,
    showLockScreen,
    loadLicenseInfo,
    checkLicenseStatus,
    activateLicense,
    isLoading: licenseLoading
  } = useLicenseStore()

  // Real-time license monitoring - disabled to prevent constant reloading
  // License state changes are handled by the store and components automatically
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const currentState = useLicenseStore.getState()
  //     if (!currentState.canUseApp && !currentState.isLoading) {
  //       // Force immediate UI update when license becomes invalid
  //       window.location.reload()
  //     }
  //   }, 1000) // Check every second

  //   return () => clearInterval(interval)
  // }, [])

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'نجح' : 'خطأ',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  const {
    patients,
    filteredPatients,
    isLoading,
    error,
    loadPatients,
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients
  } = usePatientStore()

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointmentStore()

  useEffect(() => {
    // Initialize license check first
    const initializeApp = async () => {
      await loadLicenseInfo()
      await checkLicenseStatus()

      // Set up real-time license validation callbacks
      licenseGuard.setOnLicenseExpiredCallback(() => {
        showNotification('انتهت صلاحية الترخيص - سيتم إغلاق التطبيق', 'error')
        // Force reload to show license screen
        window.location.reload()
      })

      licenseGuard.setOnLicenseInvalidCallback(() => {
        showNotification('الترخيص غير صالح - سيتم إغلاق التطبيق', 'error')
        // Force reload to show license screen
        window.location.reload()
      })

      // Only load app data if license is valid
      const currentState = useLicenseStore.getState()
      if (currentState.canUseApp) {
        loadPatients()
        loadAppointments()
      }
    }

    initializeApp()

    // Cleanup on unmount
    return () => {
      licenseGuard.stopRealTimeValidation()
    }
  }, [loadPatients, loadAppointments, loadLicenseInfo, checkLicenseStatus])

  // License handlers
  const handleLicenseActivationSuccess = async () => {
    showNotification('تم تفعيل الترخيص بنجاح', 'success')
    await loadLicenseInfo()
    await checkLicenseStatus()

    // Load app data after successful activation
    loadPatients()
    loadAppointments()
  }

  const handleLicenseUpdate = async () => {
    await loadLicenseInfo()
    await checkLicenseStatus()
  }



  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowEditPatient(true)
  }

  const handleDeletePatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedPatient) {
      try {
        // Show immediate loading feedback
        const patientName = `${selectedPatient.first_name} ${selectedPatient.last_name}`

        // Call the enhanced delete function that returns patient info
        const result = await deletePatient(selectedPatient.id)

        // Close dialog and clear selection immediately
        setShowDeleteConfirm(false)
        setSelectedPatient(null)

        // Trigger real-time synchronization across all stores
        syncAfterPatientDeletion(selectedPatient.id, patientName)

        // Show enhanced success notification with details
        showNotification(
          `✅ تم حذف المريض "${result.patientName}" وجميع بياناته المرتبطة بنجاح - تم تحديث جميع الشاشات تلقائياً`,
          "success"
        )

        console.log(`🎉 Patient deletion completed successfully: ${patientName}`)

      } catch (error) {
        console.error('Error deleting patient:', error)
        setShowDeleteConfirm(false)
        showNotification(
          `❌ فشل في حذف المريض "${selectedPatient.first_name} ${selectedPatient.last_name}". يرجى المحاولة مرة أخرى`,
          "error"
        )
      }
    }
  }

  const handleUpdatePatient = async (id: string, patientData: Partial<Patient>) => {
    try {
      await updatePatient(id, patientData)
      setShowEditPatient(false)
      setSelectedPatient(null)
      showNotification("تم تحديث بيانات المريض بنجاح", "success")
    } catch (error) {
      console.error('Error updating patient:', error)
      showNotification("فشل في تحديث بيانات المريض. يرجى المحاولة مرة أخرى", "error")
    }
  }

  // Appointment handlers
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowEditAppointment(true)
  }

  const handleDeleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeleteAppointmentConfirm(true)
  }

  const handleConfirmDeleteAppointment = async () => {
    if (selectedAppointment) {
      try {
        await deleteAppointment(selectedAppointment.id)
        setShowDeleteAppointmentConfirm(false)
        setSelectedAppointment(null)
        showNotification("تم حذف الموعد بنجاح", "success")
      } catch (error) {
        console.error('Error deleting appointment:', error)
        showNotification("فشل في حذف الموعد. يرجى المحاولة مرة أخرى", "error")
      }
    }
  }

  const handleUpdateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
    try {
      await updateAppointment(id, appointmentData)
      setShowEditAppointment(false)
      setSelectedAppointment(null)
      showNotification("تم تحديث الموعد بنجاح", "success")
    } catch (error) {
      console.error('Error updating appointment:', error)
      showNotification("فشل في تحديث الموعد. يرجى المحاولة مرة أخرى", "error")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date)
    const day = dateObj.getDate()
    const month = dateObj.getMonth()
    const year = dateObj.getFullYear()

    // Gregorian months in Arabic
    const gregorianMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]

    // Arabic-Indic numerals
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    const toArabicNumerals = (num: number): string => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('')
    }

    const arabicDay = toArabicNumerals(day)
    const arabicYear = toArabicNumerals(year)
    const monthName = gregorianMonths[month]

    return `${arabicDay} ${monthName} ${arabicYear}م`
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };







  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-foreground">إدارة المرضى</h2>
              <Button
                onClick={() => setShowAddPatient(true)}
                className="flex items-center space-x-2 space-x-reverse shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مريض جديد</span>
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="البحث عن مريض..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value) {
                    searchPatients(e.target.value)
                  } else {
                    loadPatients()
                  }
                }}
                className="w-full pr-10"
              />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive">خطأ: {error}</p>
              </div>
            )}

            {/* Patients Grid */}
            {!isLoading && !error && (
              <div className="grid gap-4">
                {(searchQuery ? filteredPatients : patients).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">لا توجد مرضى مسجلين</p>
                  </div>
                ) : (
                  (searchQuery ? filteredPatients : patients).map(patient => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onEdit={handleEditPatient}
                      onDelete={handleDeletePatient}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      case 'appointments':
        const filteredAppointments = appointments.filter(appointment => {
          const matchesSearch = appointmentSearchQuery === '' ||
            appointment.title.toLowerCase().includes(appointmentSearchQuery.toLowerCase()) ||
            appointment.patient?.first_name?.toLowerCase().includes(appointmentSearchQuery.toLowerCase()) ||
            appointment.patient?.last_name?.toLowerCase().includes(appointmentSearchQuery.toLowerCase())

          const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter

          return matchesSearch && matchesStatus
        })

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-foreground">المواعيد</h2>
              <Button
                onClick={() => setShowAddAppointment(true)}
                className="flex items-center space-x-2 space-x-reverse shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>موعد جديد</span>
              </Button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="البحث في المواعيد..."
                  value={appointmentSearchQuery}
                  onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                  className="w-full pr-10"
                />
              </div>

              <div className="relative shrink-0">
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pr-10 pl-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="scheduled">مجدول</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="no_show">لم يحضر</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {appointmentsLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
              </div>
            )}

            {/* Error State */}
            {appointmentsError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive">خطأ: {appointmentsError}</p>
              </div>
            )}

            {/* Appointments Grid */}
            {!appointmentsLoading && !appointmentsError && (
              <div className="grid gap-4">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-muted-foreground">
                      {appointmentSearchQuery || statusFilter !== 'all'
                        ? 'لا توجد مواعيد تطابق البحث'
                        : 'لا توجد مواعيد مجدولة'
                      }
                    </p>
                  </div>
                ) : (
                  filteredAppointments.map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onEdit={handleEditAppointment}
                      onDelete={handleDeleteAppointment}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      case 'payments':
        return <PaymentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard
          onAddPatient={() => setShowAddPatient(true)}
          onAddAppointment={() => setShowAddAppointment(true)}
        />;
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const pageMap = {
      dashboard: 'لوحة التحكم',
      patients: 'المرضى',
      appointments: 'المواعيد',
      payments: 'المدفوعات',
      inventory: 'المخزون',
      reports: 'التقارير',
      settings: 'الإعدادات'
    }
    return pageMap[activeTab as keyof typeof pageMap] || 'لوحة التحكم'
  }

  return (
    <LicenseProtection
      licenseInfo={licenseInfo}
      onLicenseUpdate={handleLicenseUpdate}
      isLoading={licenseLoading}
    >
      <SidebarProvider>
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <div className="flex items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                      🦷 نظام إدارة العيادة السنية
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-sky-600 dark:text-sky-400">{getCurrentPageTitle()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="mr-auto flex items-center gap-3 px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mx-2 h-4" />
              <ThemeToggle />
              <div className="text-sm text-muted-foreground bg-accent/30 px-3 py-1 rounded-full">
                <LiveDateTime />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-10 pt-4 max-w-full overflow-hidden">
            <div className="w-full max-w-none content-wrapper">
              {renderContent()}
            </div>
          </div>
        </SidebarInset>

      {/* Dialogs */}

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
      />

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        isOpen={showEditPatient}
        patient={selectedPatient}
        onClose={() => {
          setShowEditPatient(false)
          setSelectedPatient(null)
        }}
        onSave={handleUpdatePatient}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={showDeleteConfirm}
        patient={selectedPatient}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSelectedPatient(null)
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
      />

      {/* Add Appointment Dialog */}
      <AddAppointmentDialog
        isOpen={showAddAppointment}
        onClose={() => setShowAddAppointment(false)}
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData)
            setShowAddAppointment(false)
            showNotification("تم إضافة الموعد الجديد بنجاح", "success")
          } catch (error) {
            console.error('Error creating appointment:', error)
            showNotification("فشل في إضافة الموعد. يرجى المحاولة مرة أخرى", "error")
          }
        }}
        patients={patients}
        treatments={[]} // Will be loaded from treatments store later
      />

      {/* Edit Appointment Dialog */}
      {showEditAppointment && selectedAppointment && (
        <AddAppointmentDialog
          isOpen={showEditAppointment}
          onClose={() => {
            setShowEditAppointment(false)
            setSelectedAppointment(null)
          }}
          onSave={async (appointmentData) => {
            try {
              await updateAppointment(selectedAppointment.id, appointmentData)
              setShowEditAppointment(false)
              setSelectedAppointment(null)
              showNotification("تم تحديث الموعد بنجاح", "success")
            } catch (error) {
              console.error('Error updating appointment:', error)
              showNotification("فشل في تحديث الموعد. يرجى المحاولة مرة أخرى", "error")
            }
          }}
          patients={patients}
          treatments={[]}
          initialData={selectedAppointment}
        />
      )}

      {/* Delete Appointment Confirmation Dialog */}
      {showDeleteAppointmentConfirm && selectedAppointment && (
        <ConfirmDeleteDialog
          isOpen={showDeleteAppointmentConfirm}
          patient={null}
          appointment={selectedAppointment}
          onClose={() => {
            setShowDeleteAppointmentConfirm(false)
            setSelectedAppointment(null)
          }}
          onConfirm={handleConfirmDeleteAppointment}
          isLoading={appointmentsLoading}
        />
      )}

        <Toaster />
      </SidebarProvider>
    </LicenseProtection>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
