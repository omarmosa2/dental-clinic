import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useReportsStore } from '@/store/reportsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useRealTimeReports } from '@/hooks/useRealTimeReports'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import PatientReports from '@/components/reports/PatientReports'
import InventoryReports from '@/components/reports/InventoryReports'
import AppointmentReports from '@/components/reports/AppointmentReports'
import FinancialReports from '@/components/reports/FinancialReports'
import CalculationValidator from '@/components/admin/CalculationValidator'
import CurrencyDisplay from '@/components/ui/currency-display'
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
  FileSpreadsheet,
  FileDown
} from 'lucide-react'
import { notify } from '@/services/notificationService'

export default function Reports() {
  const { currency } = useSettingsStore()
  const { totalRevenue, pendingAmount, payments } = usePaymentStore()
  const { appointments } = useAppointmentStore()
  const { items: inventoryItems } = useInventoryStore()
  const {
    reportData,
    patientReports,
    appointmentReports,
    financialReports,
    inventoryReports,

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

  useEffect(() => {
    // Load initial reports with fresh data
    console.log('🔄 Loading initial reports...')
    clearError()
    generateAllReports()

    // Load data for filtering (excluding patients as they don't need filtering)
    const { loadAppointments } = useAppointmentStore.getState()
    const { loadPayments } = usePaymentStore.getState()
    const { loadItems } = useInventoryStore.getState()

    loadAppointments()
    loadPayments()
    loadItems()
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

  const handleTabChange = (value: string) => {
    setSelectedTab(value)
    setActiveReportType(value as any)

    // Generate specific report if not already loaded
    if (value !== 'overview') {
      generateReport(value as any)
    }
  }

  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing all reports...')
      clearError()
      await generateAllReports()
      console.log('✅ All reports refreshed successfully')
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
        <div className="flex items-center space-x-2 space-x-reverse">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isExporting}
                className="flex items-center space-x-2 space-x-reverse bg-sky-600 hover:bg-sky-700"
              >
                <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? 'جاري التصدير...' : 'تصدير التقرير'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
                اختر تنسيق التصدير
              </div>

              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 space-x-reverse py-3"
              >
                <FileDown className="w-4 h-4 ml-2 text-blue-500" />
                <div>
                  <div className="font-medium">تصدير CSV</div>
                  <div className="text-xs text-muted-foreground">ملف نصي مفصول بفواصل</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  // Export comprehensive reports data using filtered data
                  const { patientReports, inventoryReports, appointmentReports, financialReports } = useReportsStore.getState()

                  if (!patientReports && !inventoryReports && !appointmentReports && !financialReports) {
                    notify.noDataToExport('لا توجد بيانات تقارير للتصدير')
                    return
                  }

                  try {
                    // Add filter information
                    const appointmentFilterInfo = appointmentStats.timeFilter.startDate && appointmentStats.timeFilter.endDate
                      ? `المواعيد: من ${appointmentStats.timeFilter.startDate} إلى ${appointmentStats.timeFilter.endDate}`
                      : 'المواعيد: جميع البيانات'

                    const paymentFilterInfo = paymentStats.timeFilter.startDate && paymentStats.timeFilter.endDate
                      ? `المدفوعات: من ${paymentStats.timeFilter.startDate} إلى ${paymentStats.timeFilter.endDate}`
                      : 'المدفوعات: جميع البيانات'

                    const inventoryFilterInfo = inventoryStats.timeFilter.startDate && inventoryStats.timeFilter.endDate
                      ? `المخزون: من ${inventoryStats.timeFilter.startDate} إلى ${inventoryStats.timeFilter.endDate}`
                      : 'المخزون: جميع البيانات'

                    const comprehensiveData = {
                      // Filter Information
                      'نطاق بيانات المواعيد': appointmentFilterInfo,
                      'نطاق بيانات المدفوعات': paymentFilterInfo,
                      'نطاق بيانات المخزون': inventoryFilterInfo,

                      // Patient Reports (no filtering as per requirements)
                      'إجمالي المرضى': patientReports?.totalPatients || 0,
                      'المرضى الجدد هذا الشهر': patientReports?.newPatientsThisMonth || 0,
                      'المرضى النشطون': patientReports?.activePatients || 0,
                      'متوسط عمر المرضى': patientReports?.averageAge || 0,

                      // Filtered Appointment Reports
                      'المواعيد المفلترة': appointmentStats.filteredData.length,
                      'المواعيد المكتملة المفلترة': appointmentStats.filteredData.filter(apt => apt.status === 'completed').length,
                      'المواعيد الملغية المفلترة': appointmentStats.filteredData.filter(apt => apt.status === 'cancelled').length,

                      // Filtered Financial Reports
                      'الإيرادات المفلترة': paymentStats.financialStats.totalRevenue || 0,
                      'المدفوعات المعلقة المفلترة': paymentStats.financialStats.pendingAmount || 0,
                      'المدفوعات المتأخرة المفلترة': paymentStats.financialStats.overdueAmount || 0,

                      // Filtered Inventory Reports
                      'عناصر المخزون المفلترة': inventoryStats.filteredData.length,
                      'القيمة الإجمالية للمخزون المفلتر': inventoryStats.filteredData.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
                      'عناصر منخفضة المخزون المفلترة': inventoryStats.filteredData.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0).length,

                      'تاريخ التقرير الشامل': (() => {
                        const date = new Date()
                        const day = date.getDate().toString().padStart(2, '0')
                        const month = (date.getMonth() + 1).toString().padStart(2, '0')
                        const year = date.getFullYear()
                        return `${day}/${month}/${year}`
                      })()
                    }

                  // Create CSV with BOM for Arabic support
                  const csvContent = '\uFEFF' + [
                    'المؤشر,القيمة',
                    ...Object.entries(comprehensiveData).map(([key, value]) =>
                      `"${key}","${value}"`
                    )
                  ].join('\n')

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                  const link = document.createElement('a')
                  link.href = URL.createObjectURL(blob)

                  // Generate descriptive filename with date and time
                  const now = new Date()
                  const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
                  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
                  const fileName = `التقرير_الشامل_${dateStr}_${timeStr}.csv`

                    link.download = fileName
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)

                    const totalFilteredItems = appointmentStats.filteredData.length +
                                             paymentStats.filteredData.length +
                                             inventoryStats.filteredData.length
                    notify.exportSuccess(`تم تصدير التقرير الشامل بنجاح! (${totalFilteredItems} عنصر مفلتر)`)
                  } catch (error) {
                    console.error('Error exporting comprehensive report:', error)
                    notify.exportError('فشل في تصدير التقرير الشامل')
                  }
                }}
                className="flex items-center space-x-2 space-x-reverse py-3"
              >
                <Package className="w-4 h-4 ml-2 text-purple-500" />
                <div>
                  <div className="font-medium">تصدير شامل</div>
                  <div className="text-xs text-muted-foreground">جميع التقارير في ملف واحد</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="w-4 h-4" />
            <span>نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center space-x-2 space-x-reverse">
            <Users className="w-4 h-4" />
            <span>المرضى</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="w-4 h-4" />
            <span>المواعيد</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center space-x-2 space-x-reverse">
            <DollarSign className="w-4 h-4" />
            <span>المالية</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center space-x-2 space-x-reverse">
            <Package className="w-4 h-4" />
            <span>المخزون</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center space-x-2 space-x-reverse">
            <FileText className="w-4 h-4" />
            <span>التحقق من الدقة</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" dir="rtl">
          {/* Time Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
            <TimeFilter
              value={appointmentStats.timeFilter}
              onChange={appointmentStats.handleFilterChange}
              onClear={appointmentStats.resetFilter}
              title="فلترة المواعيد"
              defaultOpen={false}
            />
            <TimeFilter
              value={paymentStats.timeFilter}
              onChange={paymentStats.handleFilterChange}
              onClear={paymentStats.resetFilter}
              title="فلترة المدفوعات"
              defaultOpen={false}
            />
            <TimeFilter
              value={inventoryStats.timeFilter}
              onChange={inventoryStats.handleFilterChange}
              onClear={inventoryStats.resetFilter}
              title="فلترة المخزون"
              defaultOpen={false}
            />
          </div>

          {/* Stats Cards with Filtered Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
            <StatCard
              title="إجمالي المرضى"
              value={patientReports?.totalPatients || 0}
              icon={Users}
              color="blue"
              description="العدد الكلي للمرضى المسجلين"
            />
            <StatCard
              title="المواعيد المفلترة"
              value={appointmentStats.filteredData.length}
              icon={Calendar}
              color="purple"
              trend={appointmentStats.trend}
              description={`من إجمالي ${appointmentReports?.totalAppointments || 0} موعد`}
            />
            <StatCard
              title="الإيرادات المفلترة"
              value={<CurrencyDisplay amount={paymentStats.financialStats.totalRevenue || 0} currency={currency} />}
              icon={DollarSign}
              color="green"
              trend={paymentStats.trend}
              description={`من إجمالي ${formatCurrency(totalRevenue || 0, currency)}`}
            />
            <StatCard
              title="عناصر المخزون المفلترة"
              value={inventoryStats.filteredData.length}
              icon={Package}
              color="orange"
              trend={inventoryStats.trend}
              description={`من إجمالي ${inventoryReports?.totalItems || 0} عنصر`}
            />
          </div>

          {/* Quick Stats Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  ملخص البيانات المفلترة
                </CardTitle>
                <CardDescription>الإحصائيات المفلترة حسب الفترة الزمنية المحددة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden" dir="rtl">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right">
                          <span className="arabic-enhanced font-medium">البيان</span>
                        </TableHead>
                        <TableHead className="text-center">
                          <span className="arabic-enhanced font-medium">القيمة</span>
                        </TableHead>
                        <TableHead className="text-center">
                          <span className="arabic-enhanced font-medium">الحالة</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">إجمالي المرضى</span>
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {patientReports?.totalPatients || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="arabic-enhanced">
                            {(patientReports?.totalPatients || 0) > 0 ? 'نشط' : 'منخفض'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">المواعيد المفلترة</span>
                            <Calendar className="h-4 w-4 text-purple-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {appointmentStats.filteredData.length}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={appointmentStats.filteredData.length > 0 ? "default" : "secondary"}
                            className="arabic-enhanced"
                          >
                            {appointmentStats.filteredData.length > 0 ? 'نشط' : 'لا توجد مواعيد'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">الإيرادات المفلترة</span>
                            <DollarSign className="h-4 w-4 text-green-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold table-cell-wrap-truncate-sm">
                          <CurrencyDisplay amount={paymentStats.financialStats.totalRevenue || 0} currency={currency} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(paymentStats.financialStats.totalRevenue || 0) > 0 ? "default" : "secondary"}
                            className="arabic-enhanced"
                          >
                            {(paymentStats.financialStats.totalRevenue || 0) > 0 ? 'إيرادات متاحة' : 'لا توجد إيرادات'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">المدفوعات المعلقة المفلترة</span>
                            <DollarSign className="h-4 w-4 text-red-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold table-cell-wrap-truncate-sm">
                          <CurrencyDisplay amount={paymentStats.financialStats.pendingAmount || 0} currency={currency} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(paymentStats.financialStats.pendingAmount || 0) > 0 ? "destructive" : "default"}
                            className="arabic-enhanced"
                          >
                            {(paymentStats.financialStats.pendingAmount || 0) > 0 ? 'يتطلب متابعة' : 'مكتمل'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">عناصر المخزون المفلترة</span>
                            <Package className="h-4 w-4 text-orange-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {inventoryStats.filteredData.length}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={inventoryStats.filteredData.length > 0 ? "default" : "secondary"}
                            className="arabic-enhanced"
                          >
                            {inventoryStats.filteredData.length > 0 ? 'متوفر' : 'لا توجد عناصر'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

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

        <TabsContent value="inventory" dir="rtl">
          <InventoryReports />
        </TabsContent>



        <TabsContent value="validation" dir="rtl">
          <CalculationValidator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
