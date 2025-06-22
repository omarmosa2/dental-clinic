import React, { useState, useEffect } from 'react'
import { usePatientStore } from './store/patientStore'
import { useAppointmentStore } from './store/appointmentStore'
import { useSettingsStore } from './store/settingsStore'
import { useLicenseStore, useLicenseStatus, useLicenseUI } from './store/licenseStore'
import { licenseGuard } from './services/licenseGuard'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useRealTimeSync } from './hooks/useRealTimeSync'
import AddPatientDialog from './components/patients/AddPatientDialog'
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog'
import AppointmentCard from './components/AppointmentCard'
import AddAppointmentDialog from './components/AddAppointmentDialog'
import PaymentsPage from './pages/Payments'
import SettingsPage from './pages/Settings'
import InventoryPage from './pages/Inventory'
import ReportsPage from './pages/Reports'
import Dashboard from './pages/Dashboard'
import PatientsPage from './pages/Patients'
import AppointmentsPage from './pages/Appointments'
import Labs from './pages/Labs'
import Medications from './pages/Medications'
import DentalTreatments from './pages/DentalTreatments'
import ThemeToggle from './components/ThemeToggle'
import { AppSidebar } from './components/AppSidebar'
import { AppSidebarTrigger } from './components/AppSidebarTrigger'
import SimpleLicenseLock from './components/SimpleLicenseLock'
import LicenseProtection from './components/LicenseProtection'
import LiveDateTime from './components/LiveDateTime'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { Plus, Filter, Search } from 'lucide-react'
import { Appointment } from './types'
import './App.css'
import './styles/globals.css'

function AppContent() {
  const { isDarkMode } = useTheme()
  const { toast } = useToast()

  // Enable real-time synchronization for the entire application
  useRealTimeSync()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddPatient, setShowAddPatient] = useState(false)



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

  const { loadPatients, patients } = usePatientStore()

  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointmentStore()

  // Settings store
  const {
    loadSettings
  } = useSettingsStore()

  useEffect(() => {
    // Initialize license check first
    const initializeApp = async () => {
      await loadLicenseInfo()
      await checkLicenseStatus()

      // Load settings automatically when app starts
      await loadSettings()

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
  }, [loadPatients, loadAppointments, loadLicenseInfo, checkLicenseStatus, loadSettings])

  // License handlers
  const handleLicenseActivationSuccess = async () => {
    showNotification('تم تفعيل الترخيص بنجاح', 'success')
    await loadLicenseInfo()
    await checkLicenseStatus()

    // Load settings and app data after successful activation
    await loadSettings()
    loadPatients()
    loadAppointments()
  }

  const handleLicenseUpdate = async () => {
    await loadLicenseInfo()
    await checkLicenseStatus()
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    const dateObj = new Date(date)
    const day = dateObj.getDate()
    const month = dateObj.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = dateObj.getFullYear()

    // Format as DD/MM/YYYY
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year}`
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
        return <PatientsPage />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'labs':
        return <Labs />;
      case 'medications':
        return <Medications />;
      case 'dental-treatments':
        return <DentalTreatments />;
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
      labs: 'المختبرات',
      medications: 'الأدوية والوصفات',
      'dental-treatments': 'العلاجات السنية',
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
