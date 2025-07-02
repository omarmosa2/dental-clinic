import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

import { useReportsStore } from '@/store/reportsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { usePatientStore } from '@/store/patientStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { useRealTimeReports } from '@/hooks/useRealTimeReports'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import PatientReports from '@/components/reports/PatientReports'
import InventoryReports from '@/components/reports/InventoryReports'
import AppointmentReports from '@/components/reports/AppointmentReports'
import FinancialReports from '@/components/reports/FinancialReports'
import TreatmentReports from '@/components/reports/TreatmentReports'
import ClinicNeedsReports from '@/components/reports/ClinicNeedsReports'
import ComprehensiveProfitLossReport from '@/components/reports/ComprehensiveProfitLossReport'
import CurrencyDisplay from '@/components/ui/currency-display'
import { ComprehensiveExportService, TIME_PERIODS, TimePeriod } from '@/services/comprehensiveExportService'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RealTimeIndicator from '@/components/ui/real-time-indicator'
import TimeFilter from '@/components/ui/time-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  Clock,
  CheckCircle,
  Calculator,
  Activity,
  Building2

} from 'lucide-react'
import { notify } from '@/services/notificationService'

export default function Reports() {
  const { currency } = useSettingsStore()
  const { totalRevenue, pendingAmount, overdueAmount, payments } = usePaymentStore()
  const { expenses } = useExpensesStore()
  const { appointments } = useAppointmentStore()
  const { items: inventoryItems } = useInventoryStore()
  const { patients } = usePatientStore()
  const { needs: clinicNeeds, totalValue: clinicNeedsTotalValue } = useClinicNeedsStore()
  const { labOrders } = useLabOrderStore()
  const { toothTreatments } = useDentalTreatmentStore()
  const { prescriptions } = usePrescriptionStore()
  const {
    reportData,
    patientReports,
    appointmentReports,
    financialReports,
    inventoryReports,
    clinicNeedsReports,
    isLoading,
    isExporting,
    error,
    activeReportType,
    currentFilter,
    generateReport,
    generateAllReports,
    setActiveReportType,
    setFilter,
    exportReport,
    clearError
  } = useReportsStore()

  const [selectedTab, setSelectedTab] = useState('overview')

  // Comprehensive report state
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isComprehensiveExporting, setIsComprehensiveExporting] = useState(false)

  // Time filtering for different data types in overview (excluding patients)
  const appointmentStats = useTimeFilteredStats({
    data: appointments,
    dateField: 'start_time',
    initialFilter: { preset: 'all', startDate: '', endDate: '' }
  })

  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' }
  })

  const inventoryStats = useTimeFilteredStats({
    data: inventoryItems,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' }
  })

  // Time filtering for clinic needs
  const clinicNeedsStats = useTimeFilteredStats({
    data: clinicNeeds,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' }
  })

  useEffect(() => {
    // Load initial reports with fresh data
    console.log('🔄 Loading initial reports...')
    clearError()
    generateAllReports()

    // Load ALL data for comprehensive reporting
    const loadAllData = async () => {
      try {
        const { loadAppointments } = useAppointmentStore.getState()
        const { loadPayments } = usePaymentStore.getState()
        const { loadItems } = useInventoryStore.getState()
        const { loadPatients } = usePatientStore.getState()
        const { loadNeeds } = useClinicNeedsStore.getState()
        const { loadLabOrders } = useLabOrderStore.getState()
        const { loadToothTreatments } = useDentalTreatmentStore.getState()
        const { loadPrescriptions } = usePrescriptionStore.getState()

        console.log('🔄 Loading all data for comprehensive reports...')
        await Promise.all([
          loadAppointments(),
          loadPayments(),
          loadItems(),
          loadPatients(),
          loadNeeds(),
          loadLabOrders(),
          loadToothTreatments(),
          loadPrescriptions()
        ])
        console.log('✅ All data loaded successfully for reports')
      } catch (error) {
        console.error('❌ Error loading data for reports:', error)
      }
    }

    loadAllData()
  }, [generateAllReports, clearError])

  useEffect(() => {
    if (error) {
      console.error('❌ Reports error:', error)
      // Show error notification
      const event = new CustomEvent('showToast', {
        detail: {
          title: 'خطأ في التقارير',
          description: error,
          type: 'error'
        }
      })
      window.dispatchEvent(event)
    }
  }, [error])

  const handleTabChange = async (value: string) => {
    setSelectedTab(value)
    setActiveReportType(value as any)

    // Load specific data based on tab and generate report
    try {
      if (value === 'treatments') {
        const { loadToothTreatments } = useDentalTreatmentStore.getState()
        const { loadPatients } = usePatientStore.getState()
        await Promise.all([loadToothTreatments(), loadPatients()])
      } else if (value === 'clinicNeeds') {
        const { loadNeeds } = useClinicNeedsStore.getState()
        await loadNeeds()
      } else if (value === 'inventory') {
        const { loadItems } = useInventoryStore.getState()
        await loadItems()
      } else if (value === 'financial') {
        const { loadPayments } = usePaymentStore.getState()
        const { loadLabOrders } = useLabOrderStore.getState()
        await Promise.all([loadPayments(), loadLabOrders()])
      } else if (value === 'profitLoss') {
        // Load all financial data for comprehensive profit/loss analysis
        const { loadPayments } = usePaymentStore.getState()
        const { loadExpenses } = useExpensesStore.getState()
        const { loadLabOrders } = useLabOrderStore.getState()
        const { loadNeeds } = useClinicNeedsStore.getState()
        const { loadItems } = useInventoryStore.getState()
        await Promise.all([loadPayments(), loadExpenses(), loadLabOrders(), loadNeeds(), loadItems()])
      } else if (value === 'patients') {
        const { loadPatients } = usePatientStore.getState()
        await loadPatients()
      } else if (value === 'appointments') {
        const { loadAppointments } = useAppointmentStore.getState()
        await loadAppointments()
      }

      // Generate specific report if not already loaded
      if (value !== 'overview') {
        await generateReport(value as any)
      }
    } catch (error) {
      console.error(`❌ Error loading data for ${value} tab:`, error)
    }
  }

  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing all reports and data...')
      clearError()

      // Refresh all data first
      const { loadAppointments } = useAppointmentStore.getState()
      const { loadPayments } = usePaymentStore.getState()
      const { loadItems } = useInventoryStore.getState()
      const { loadPatients } = usePatientStore.getState()
      const { loadNeeds } = useClinicNeedsStore.getState()
      const { loadLabOrders } = useLabOrderStore.getState()
      const { loadToothTreatments } = useDentalTreatmentStore.getState()
      const { loadPrescriptions } = usePrescriptionStore.getState()

      await Promise.all([
        loadAppointments(),
        loadPayments(),
        loadItems(),
        loadPatients(),
        loadNeeds(),
        loadLabOrders(),
        loadToothTreatments(),
        loadPrescriptions()
      ])

      // Then regenerate reports
      await generateAllReports()
      console.log('✅ All reports and data refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing reports:', error)
      throw error
    }
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      // Show loading message
      const loadingEvent = new CustomEvent('showToast', {
        detail: {
          title: 'جاري التصدير... ⏳',
          description: `يتم تحضير ملف ${format.toUpperCase()}`,
          type: 'info'
        }
      })
      window.dispatchEvent(loadingEvent)

      const result = await exportReport(activeReportType, {
        format,
        includeCharts: true,
        includeDetails: true,
        language: 'ar',
        orientation: 'landscape',
        pageSize: 'A4'
      })

      if (result?.success) {
        // Show success message with toast notification
        const event = new CustomEvent('showToast', {
          detail: {
            title: 'تم التصدير بنجاح! 🎉',
            description: `${result.message}\nتم فتح الملف تلقائياً`,
            type: 'success'
          }
        })
        window.dispatchEvent(event)
        console.log('تم تصدير التقرير بنجاح:', result.filePath)
      } else {
        // Show error message
        const event = new CustomEvent('showToast', {
          detail: {
            title: 'خطأ في التصدير ❌',
            description: result?.message || 'فشل في تصدير التقرير',
            type: 'error'
          }
        })
        window.dispatchEvent(event)
        console.error('فشل في تصدير التقرير:', result?.message)
      }
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error)
    }
  }

  // Handle comprehensive export
  const handleComprehensiveExport = async () => {
    setIsComprehensiveExporting(true)
    try {
      // Ensure all data is loaded before export
      console.log('🔄 Loading fresh data for comprehensive export...')
      const { loadAppointments } = useAppointmentStore.getState()
      const { loadPayments } = usePaymentStore.getState()
      const { loadExpenses } = useExpensesStore.getState()
      const { loadItems } = useInventoryStore.getState()
      const { loadPatients } = usePatientStore.getState()
      const { loadNeeds } = useClinicNeedsStore.getState()
      const { loadLabOrders } = useLabOrderStore.getState()
      const { loadToothTreatments } = useDentalTreatmentStore.getState()
      const { loadPrescriptions } = usePrescriptionStore.getState()

      await Promise.all([
        loadAppointments(),
        loadPayments(),
        loadExpenses(),
        loadItems(),
        loadPatients(),
        loadNeeds(),
        loadLabOrders(),
        loadToothTreatments(),
        loadPrescriptions()
      ])

      console.log('✅ All data loaded, starting export...')
      await ComprehensiveExportService.exportComprehensiveReport({
        patients,
        appointments,
        payments,
        inventory: inventoryItems,
        treatments: toothTreatments || [],
        prescriptions: prescriptions || [],
        labOrders: labOrders || [],
        clinicNeeds: clinicNeeds || [],
        expenses: expenses || [], // إضافة المصروفات
        timePeriod: selectedPeriod,
        customStartDate: selectedPeriod === 'custom' ? customStartDate : undefined,
        customEndDate: selectedPeriod === 'custom' ? customEndDate : undefined
      })

      // Success message
      const periodText = TIME_PERIODS[selectedPeriod]
      let successMessage = `تم تصدير التقرير الشامل المفصل بنجاح!`
      successMessage += ` (${periodText})`

      const totalRecords = appointments.length + payments.length + (toothTreatments?.length || 0) +
                          (prescriptions?.length || 0) + (labOrders?.length || 0) + (clinicNeeds?.length || 0)

      successMessage += ` - ${totalRecords} سجل إجمالي`

      notify.exportSuccess(successMessage)
    } catch (error) {
      console.error('Error exporting comprehensive report:', error)
      notify.exportError('فشل في تصدير التقرير الشامل')
    } finally {
      setIsComprehensiveExporting(false)
    }
  }

  // Use real-time reports hook for automatic updates
  const { refreshReports } = useRealTimeReports(['overview'])

  // Use the store's auto-refresh functionality with shorter interval as backup
  useEffect(() => {
    const { startAutoRefresh, stopAutoRefresh } = useReportsStore.getState()

    // Start auto-refresh when component mounts with 1 minute interval as backup
    startAutoRefresh(1) // 1 minute interval as backup

    // Cleanup on unmount
    return () => {
      stopAutoRefresh()
    }
  }, [])

  // Update active report type when tab changes
  useEffect(() => {
    setActiveReportType(selectedTab as any)
  }, [selectedTab, setActiveReportType])



  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    description
  }: {
    title: string
    value: string | number | React.ReactElement
    icon: any
    color?: string
    trend?: { value: number; isPositive: boolean }
    description?: string
  }) => (
    <Card className={getCardStyles(color)} dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground text-right">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${getIconStyles(color)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground text-right">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center justify-end mt-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <span className="ml-1">{Math.abs(trend.value)}%</span>
            <TrendingUp className={`h-3 w-3 ${
              trend.isPositive ? '' : 'rotate-180'
            }`} />
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">التقارير والتحليلات</h1>
            <RealTimeIndicator isActive={true} />
          </div>
          <p className="text-muted-foreground">
            تقارير شاملة ومفصلة لجميع جوانب العيادة - تحديث تلقائي في الوقت الفعلي
          </p>
        </div>

      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 ml-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">خطأ في تحميل التقارير</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="mr-auto"
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-600 mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تحميل التقارير...</p>
          </div>
        </div>
      )}

      {/* Reports Tabs */}
      <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center space-x-2 space-x-reverse">
            <Calculator className="w-4 h-4" />
            <span>التقرير الشامل المفصل</span>
          </TabsTrigger>
           <TabsTrigger value="profitLoss" className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-4 h-4" />
            <span>المالية</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center space-x-2 space-x-reverse">
            <Users className="w-4 h-4" />
            <span>المرضى</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="w-4 h-4" />
            <span>المواعيد</span>
          </TabsTrigger>
          {/* <TabsTrigger value="financial" className="flex items-center space-x-2 space-x-reverse">
            <DollarSign className="w-4 h-4" />
            <span>المالية</span>
          </TabsTrigger> */}
          <TabsTrigger value="treatments" className="flex items-center space-x-2 space-x-reverse">
            <Stethoscope className="w-4 h-4" />
            <span>العلاجات</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2 space-x-reverse">
            <Package className="w-4 h-4" />
            <span>المخزون</span>
          </TabsTrigger>
          <TabsTrigger value="clinicNeeds" className="flex items-center space-x-2 space-x-reverse">
            <ClipboardList className="w-4 h-4" />
            <span>احتياجات العيادة</span>
          </TabsTrigger>
         
        </TabsList>

        {/* Comprehensive Report Tab */}
        <TabsContent value="overview" className="space-y-6" dir="rtl">
          <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <BarChart3 className="w-6 h-6" />
                  التقرير الشامل المفصل
                </h2>
                <p className="text-muted-foreground mt-1">
                  نظرة شاملة على أداء العيادة
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleComprehensiveExport}
                disabled={isComprehensiveExporting}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isComprehensiveExporting ? 'جاري التصدير...' : 'تصدير التقرير'}
              </Button>
            </div>

            {/* Filter Section */}
            <Card className={getCardStyles("blue")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Filter className={`w-5 h-5 ${getIconStyles("blue")}`} />
                  فلترة التقرير
                </CardTitle>
                <CardDescription>
                  اختر الفترة الزمنية للتقرير الشامل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Period Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="period">الفترة الزمنية</Label>
                    <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفترة الزمنية" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIME_PERIODS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {selectedPeriod === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="startDate">تاريخ البداية</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">تاريخ النهاية</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
              <Card className={getCardStyles("blue")}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getCardStyles("blue")}`}>
                      <Users className={`w-6 h-6 ${getIconStyles("blue")}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                      <p className="text-2xl font-bold">{patients.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("purple")}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getCardStyles("purple")}`}>
                      <Calendar className={`w-6 h-6 ${getIconStyles("purple")}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي المواعيد</p>
                      <p className="text-2xl font-bold">{appointments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("green")}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getCardStyles("green")}`}>
                      <DollarSign className={`w-6 h-6 ${getIconStyles("green")}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                      <p className="text-xl font-bold">
                        <CurrencyDisplay amount={totalRevenue || 0} currency={currency} />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("orange")}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getCardStyles("orange")}`}>
                      <Package className={`w-6 h-6 ${getIconStyles("orange")}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">عناصر المخزون</p>
                      <p className="text-2xl font-bold">{inventoryItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    الملخص المالي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50/80 dark:bg-green-950/50 border border-green-200/50 dark:border-green-700/50 rounded-lg backdrop-blur-sm">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">إجمالي الإيرادات</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-100">
                      <CurrencyDisplay amount={totalRevenue || 0} currency={currency} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-yellow-50/80 dark:bg-yellow-950/50 border border-yellow-200/50 dark:border-yellow-700/50 rounded-lg backdrop-blur-sm">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">المبالغ المعلقة</span>
                    <span className="text-lg font-bold text-yellow-700 dark:text-yellow-100">
                      <CurrencyDisplay amount={pendingAmount || 0} currency={currency} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50/80 dark:bg-red-950/50 border border-red-200/50 dark:border-red-700/50 rounded-lg backdrop-blur-sm">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">المبالغ المتأخرة</span>
                    <span className="text-lg font-bold text-red-700 dark:text-red-100">
                      <CurrencyDisplay amount={overdueAmount || 0} currency={currency} />
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    إحصائيات سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-700/50 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-100">
                        {appointmentReports?.completedAppointments || 0}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-200 mt-1 font-medium">مواعيد مكتملة</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-700/50 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-100">
                        {appointmentReports?.pendingAppointments || 0}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-200 mt-1 font-medium">مواعيد معلقة</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-700/50 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-100">
                        {patientReports?.activePatients || 0}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-200 mt-1 font-medium">مرضى نشطون</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50/80 dark:bg-orange-950/50 border border-orange-200/50 dark:border-orange-700/50 rounded-lg backdrop-blur-sm">
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-100">
                        {inventoryReports?.lowStockItems || 0}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-200 mt-1 font-medium">مخزون منخفض</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className={getCardStyles("cyan")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className={`w-6 h-6 ${getIconStyles("cyan")}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">العلاجات</p>
                      <p className="text-xl font-bold">{toothTreatments?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("indigo")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className={`w-6 h-6 ${getIconStyles("indigo")}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">الوصفات</p>
                      <p className="text-xl font-bold">{prescriptions?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("purple")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-6 h-6 ${getIconStyles("purple")}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">طلبات المخابر</p>
                      <p className="text-xl font-bold">{labOrders?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={getCardStyles("gray")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className={`w-6 h-6 ${getIconStyles("gray")}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">احتياجات العيادة</p>
                      <p className="text-xl font-bold">{clinicNeeds?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>





        </TabsContent>

        {/* Patient Reports Tab */}
        <TabsContent value="patients" dir="rtl">
          <PatientReports />
        </TabsContent>

        <TabsContent value="appointments" dir="rtl">
          <AppointmentReports />
        </TabsContent>

        <TabsContent value="financial" dir="rtl">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="treatments" dir="rtl">
          <TreatmentReports />
        </TabsContent>

        <TabsContent value="inventory" dir="rtl">
          <InventoryReports />
        </TabsContent>

        <TabsContent value="clinicNeeds" dir="rtl">
          <ClinicNeedsReports />
        </TabsContent>

        <TabsContent value="profitLoss" dir="rtl">
          <ComprehensiveProfitLossReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
