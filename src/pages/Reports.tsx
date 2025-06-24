import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useReportsStore } from '@/store/reportsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useRealTimeReports } from '@/hooks/useRealTimeReports'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import PatientReports from '@/components/reports/PatientReports'
import InventoryReports from '@/components/reports/InventoryReports'
import AppointmentReports from '@/components/reports/AppointmentReports'
import FinancialReports from '@/components/reports/FinancialReports'
import CalculationValidator from '@/components/admin/CalculationValidator'
import CurrencyDisplay from '@/components/ui/currency-display'
import RealTimeIndicator from '@/components/ui/real-time-indicator'
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

  useEffect(() => {
    // Load initial reports with fresh data
    console.log('🔄 Loading initial reports...')
    clearError()
    generateAllReports()
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
                  // Export comprehensive reports data
                  const { patientReports, inventoryReports, appointmentReports, financialReports } = useReportsStore.getState()

                  if (!patientReports && !inventoryReports && !appointmentReports && !financialReports) {
                    notify.noDataToExport('لا توجد بيانات تقارير للتصدير')
                    return
                  }

                  try {

                  const comprehensiveData = {
                    // Patient Reports
                    'إجمالي المرضى': patientReports?.totalPatients || 0,
                    'المرضى الجدد هذا الشهر': patientReports?.newPatientsThisMonth || 0,
                    'المرضى النشطون': patientReports?.activePatients || 0,
                    'متوسط عمر المرضى': patientReports?.averageAge || 0,

                    // Inventory Reports
                    'إجمالي عناصر المخزون': inventoryReports?.totalItems || 0,
                    'القيمة الإجمالية للمخزون': inventoryReports?.totalValue || 0,
                    'عناصر منخفضة المخزون': inventoryReports?.lowStockItems || 0,
                    'عناصر منتهية الصلاحية': inventoryReports?.expiredItems || 0,

                    // Appointment Reports
                    'إجمالي المواعيد': appointmentReports?.totalAppointments || 0,
                    'المواعيد المكتملة': appointmentReports?.completedAppointments || 0,
                    'المواعيد الملغية': appointmentReports?.cancelledAppointments || 0,
                    'معدل الحضور': appointmentReports?.attendanceRate || 0,

                    // Financial Reports
                    'إجمالي الإيرادات': financialReports?.totalRevenue || 0,
                    'المدفوعات المعلقة': financialReports?.pendingPayments || 0,
                    'المدفوعات المتأخرة': financialReports?.overduePayments || 0,

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

                    notify.exportSuccess('تم تصدير التقرير الشامل بنجاح!')
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
            <StatCard
              title="إجمالي المرضى"
              value={patientReports?.totalPatients || 0}
              icon={Users}
              color="blue"
              description="العدد الكلي للمرضى المسجلين"
            />
            <StatCard
              title="المواعيد هذا الشهر"
              value={appointmentReports?.totalAppointments || 0}
              icon={Calendar}
              color="purple"
              description="مواعيد الشهر الحالي"
            />
            <StatCard
              title="إجمالي الإيرادات"
              value={<CurrencyDisplay amount={financialReports?.totalRevenue || 0} currency={currency} />}
              icon={DollarSign}
              color="green"
              description="الإيرادات المحققة"
            />
            <StatCard
              title="عناصر المخزون"
              value={inventoryReports?.totalItems || 0}
              icon={Package}
              color="orange"
              description="إجمالي عناصر المخزون"
            />
          </div>

          {/* Quick Stats Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
            <Card dir="rtl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  ملخص سريع
                </CardTitle>
                <CardDescription>أهم الإحصائيات لهذا الشهر</CardDescription>
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
                            <span className="arabic-enhanced">المرضى الجدد</span>
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {patientReports?.newPatients || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="arabic-enhanced">
                            {(patientReports?.newPatients || 0) > 0 ? 'نشط' : 'منخفض'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">معدل الحضور</span>
                            <Calendar className="h-4 w-4 text-purple-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {appointmentReports?.attendanceRate?.toFixed(1) || 0}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(appointmentReports?.attendanceRate || 0) >= 80 ? "default" : "secondary"}
                            className="arabic-enhanced"
                          >
                            {(appointmentReports?.attendanceRate || 0) >= 80 ? 'ممتاز' : 'يحتاج تحسين'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">المدفوعات المعلقة</span>
                            <DollarSign className="h-4 w-4 text-red-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold table-cell-wrap-truncate-sm">
                          <CurrencyDisplay amount={financialReports?.totalPending || 0} currency={currency} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={(financialReports?.totalPending || 0) > 0 ? "destructive" : "default"}
                            className="arabic-enhanced"
                          >
                            {(financialReports?.totalPending || 0) > 0 ? 'يتطلب متابعة' : 'مكتمل'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="font-medium text-right table-cell-wrap-truncate-md">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="arabic-enhanced">تنبيهات المخزون</span>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {(inventoryReports?.lowStockItems || 0) + (inventoryReports?.expiredItems || 0) + (inventoryReports?.expiringSoonItems || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              ((inventoryReports?.lowStockItems || 0) + (inventoryReports?.expiredItems || 0) + (inventoryReports?.expiringSoonItems || 0)) > 0
                                ? "destructive"
                                : "default"
                            }
                            className="arabic-enhanced"
                          >
                            {((inventoryReports?.lowStockItems || 0) + (inventoryReports?.expiredItems || 0) + (inventoryReports?.expiringSoonItems || 0)) > 0
                              ? 'يحتاج انتباه'
                              : 'طبيعي'
                            }
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
