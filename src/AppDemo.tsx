import React, { useState, useEffect } from 'react'
import { usePatientStoreDemo } from './store/patientStoreDemo'
import { useAppointmentStoreDemo } from './store/appointmentStoreDemo'
import { useSettingsStoreDemo } from './store/settingsStoreDemo'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { enhanceKeyboardEvent } from '@/utils/arabicKeyboardMapping'
import AddPatientDialog from './components/patients/AddPatientDialog'
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog'
import AppointmentCard from './components/AppointmentCard'
import AddAppointmentDialog from './components/AddAppointmentDialog'
import AddPaymentDialog from './components/payments/AddPaymentDialog'
import QuickShortcutHint from './components/help/QuickShortcutHint'
import PaymentsPage from './pages/Payments'
import SettingsPage from './pages/Settings'
import InventoryPage from './pages/Inventory'
import ReportsPage from './pages/Reports'
import Dashboard from './pages/Dashboard'
import EnhancedDashboard from './pages/EnhancedDashboard'
import PatientsPage from './pages/Patients'
import AppointmentsPage from './pages/Appointments'
import Labs from './pages/Labs'
import Medications from './pages/Medications'
import DentalTreatments from './pages/DentalTreatments'
import ClinicNeeds from './pages/ClinicNeeds'
import Expenses from './pages/Expenses'
import ThemeToggle from './components/ThemeToggle'
import { AppSidebar } from './components/AppSidebar'
import { AppSidebarTrigger } from './components/AppSidebarTrigger'
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

import { Plus, Filter, Search, Keyboard } from 'lucide-react'
import { Appointment } from './types'
import './App.css'
import './styles/globals.css'

function AppContent() {
  const { isDarkMode } = useTheme()
  const { toast } = useToast()

  // Setup keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان المستخدم يكتب في input أو textarea
      const target = event.target as HTMLElement
      const isTyping = (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('type') === 'number' ||
        target.closest('[data-prevent-shortcuts="true"]') ||
        target.closest('[data-no-global-shortcuts="true"]') ||
        target.hasAttribute('data-prevent-shortcuts') ||
        target.hasAttribute('data-no-global-shortcuts')
      )

      // تجاهل الاختصارات إذا كان Ctrl مضغوطاً (ما عدا F1)
      if (event.ctrlKey && event.key !== 'F1') {
        return
      }

      // السماح بالاختصارات المهمة حتى أثناء الكتابة
      const isImportantShortcut = event.altKey

      if (isTyping && !isImportantShortcut) {
        return
      }

      // استخدام الدالة المحسنة لمعالجة أحداث لوحة المفاتيح
      const enhanced = enhanceKeyboardEvent(event)

      // Navigation shortcuts (0-9) with Arabic numeral support
      if (enhanced.mappedKey === '0') {
        enhanced.preventDefault()
        setActiveTab('dashboard')
      } else if (enhanced.mappedKey === '1') {
        enhanced.preventDefault()
        setActiveTab('patients')
      } else if (enhanced.mappedKey === '2') {
        enhanced.preventDefault()
        setActiveTab('appointments')
      } else if (enhanced.mappedKey === '3') {
        enhanced.preventDefault()
        setActiveTab('payments')
      } else if (enhanced.mappedKey === '4') {
        enhanced.preventDefault()
        setActiveTab('inventory')
      } else if (enhanced.mappedKey === '5') {
        enhanced.preventDefault()
        setActiveTab('labs')
      } else if (enhanced.mappedKey === '6') {
        enhanced.preventDefault()
        setActiveTab('medications')
      } else if (enhanced.mappedKey === '7') {
        enhanced.preventDefault()
        setActiveTab('dental-treatments')
      } else if (enhanced.mappedKey === '8') {
        enhanced.preventDefault()
        setActiveTab('clinic-needs')
      } else if (enhanced.mappedKey === '9') {
        enhanced.preventDefault()
        setActiveTab('reports')
      }

      // Quick actions - اختصارات متجاورة ASD
      if (enhanced.mappedKey.toLowerCase() === 'a') {
        enhanced.preventDefault()
        setShowAddPatient(true)
      } else if (enhanced.mappedKey.toLowerCase() === 's') {
        enhanced.preventDefault()
        setShowAddAppointment(true)
      } else if (enhanced.mappedKey.toLowerCase() === 'd') {
        enhanced.preventDefault()
        setShowAddPayment(true)
      }

      // Refresh
      if (enhanced.mappedKey.toLowerCase() === 'r') {
        enhanced.preventDefault()
        window.location.reload()
      }

      // Open Settings (F1)
      if (event.key === 'F1') {
        event.preventDefault()
        setActiveTab('settings')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)

  // Appointment states
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)
  const [showDeleteAppointmentConfirm, setShowDeleteAppointmentConfirm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'نجح' : 'خطأ',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  const { loadPatients, patients } = usePatientStoreDemo()
  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointmentStoreDemo()

  const { loadSettings } = useSettingsStoreDemo()

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      console.log('🚀 Initializing demo app')
      await loadSettings()
      loadPatients()
      loadAppointments()
    }

    initializeApp()
  }, [loadPatients, loadAppointments, loadSettings])

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

  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientsPage onNavigateToTreatments={setActiveTab} onNavigateToPayments={setActiveTab} />;
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
      case 'clinic-needs':
        return <ClinicNeeds />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <EnhancedDashboard
          onNavigateToPatients={() => setActiveTab('patients')}
          onNavigateToAppointments={() => setActiveTab('appointments')}
          onNavigateToPayments={() => setActiveTab('payments')}
          onNavigateToTreatments={() => setActiveTab('dental-treatments')}
          onAddPatient={() => setShowAddPatient(true)}
          onAddAppointment={() => setShowAddAppointment(true)}
          onAddPayment={() => setShowAddPayment(true)}
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
      'clinic-needs': 'احتياجات العيادة',
      'expenses': 'مصروفات العيادة',
      reports: 'التقارير',
      settings: 'الإعدادات'
    }
    return pageMap[activeTab as keyof typeof pageMap] || 'لوحة التحكم'
  }

  return (
    <SidebarProvider>
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 rtl-layout">
            <div className="flex items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList className="flex-rtl">
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                      🦷 نظام إدارة العيادة السنية - نسخة تجريبية
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-sky-600 dark:text-sky-400">{getCurrentPageTitle()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ml-auto-rtl flex items-center gap-3 px-4 space-x-3-rtl">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mx-2 h-4" />
              <QuickShortcutHint />
              <ThemeToggle />
              <div className="text-sm text-muted-foreground bg-accent/30 px-3 py-1 rounded-full">
                <LiveDateTime />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-10 pt-4 max-w-full overflow-hidden relative rtl-layout">
            <div className="w-full max-w-none content-wrapper">
              {renderContent()}
            </div>
          </div>
        </SidebarInset>

      {/* Dialogs */}
      <AddPatientDialog
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
      />

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
        treatments={[]}
      />

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

      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />

      <Toaster />
    </SidebarProvider>
  );
}

function AppDemo() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default AppDemo;
