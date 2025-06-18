import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useReportsStore } from '@/store/reportsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import PatientReports from '@/components/reports/PatientReports'
import InventoryReports from '@/components/reports/InventoryReports'
import AppointmentReports from '@/components/reports/AppointmentReports'
import FinancialReports from '@/components/reports/FinancialReports'
import CurrencyDisplay from '@/components/ui/currency-display'
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
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  FileDown
} from 'lucide-react'

export default function Reports() {
  const { currency } = useSettingsStore()
  const {
    reportData,
    patientReports,
    appointmentReports,
    financialReports,
    inventoryReports,
    analyticsReports,
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
    // Load initial reports
    generateAllReports()
  }, [generateAllReports])

  useEffect(() => {
    if (error) {
      console.error('Reports error:', error)
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

  const handleRefresh = async () => {
    try {
      if (selectedTab === 'overview') {
        await generateAllReports()
      } else {
        await generateReport(selectedTab as any)
      }
      console.log('تم تحديث التقارير بنجاح')
    } catch (error) {
      console.error('خطأ في تحديث التقارير:', error)
    }
  }

  // Use the store's auto-refresh functionality
  useEffect(() => {
    const { startAutoRefresh, stopAutoRefresh } = useReportsStore.getState()

    // Start auto-refresh when component mounts
    startAutoRefresh(5) // 5 minutes interval

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
    value: string | number
    icon: any
    color?: string
    trend?: { value: number; isPositive: boolean }
    description?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center mt-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${
              trend.isPositive ? '' : 'rotate-180'
            }`} />
            {Math.abs(trend.value)}%
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير والتحليلات</h1>
          <p className="text-muted-foreground mt-2">
            تقارير شاملة ومفصلة لجميع جوانب العيادة
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await handleRefresh()
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث جميع التقارير',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'خطأ في التحديث',
                    description: 'فشل في تحديث التقارير',
                    type: 'error'
                  }
                })
                window.dispatchEvent(event)
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
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
                onClick={() => handleExport('pdf')}
                className="flex items-center space-x-2 space-x-reverse py-3"
              >
                <FileText className="w-4 h-4 ml-2 text-red-500" />
                <div>
                  <div className="font-medium">تصدير PDF</div>
                  <div className="text-xs text-muted-foreground">ملف PDF مع الرسوم البيانية</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="flex items-center space-x-2 space-x-reverse py-3"
              >
                <FileSpreadsheet className="w-4 h-4 ml-2 text-green-500" />
                <div>
                  <div className="font-medium">تصدير Excel</div>
                  <div className="text-xs text-muted-foreground">جدول بيانات قابل للتعديل</div>
                </div>
              </DropdownMenuItem>
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
                    alert('لا توجد بيانات تقارير للتصدير')
                    return
                  }

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

                    'تاريخ التقرير الشامل': new Date().toLocaleString('ar-SA')
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

                  alert('تم تصدير التقرير الشامل بنجاح!')
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
          <TabsTrigger value="analytics" className="flex items-center space-x-2 space-x-reverse">
            <Activity className="w-4 h-4" />
            <span>التحليلات</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              color="green"
              description="مواعيد الشهر الحالي"
            />
            <StatCard
              title="إجمالي الإيرادات"
              value={<CurrencyDisplay amount={financialReports?.totalRevenue || 0} currency={currency} />}
              icon={DollarSign}
              color="yellow"
              description="الإيرادات المحققة"
            />
            <StatCard
              title="عناصر المخزون"
              value={inventoryReports?.totalItems || 0}
              icon={Package}
              color="purple"
              description="إجمالي عناصر المخزون"
            />
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ملخص سريع</CardTitle>
                <CardDescription>أهم الإحصائيات لهذا الشهر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">المرضى الجدد</span>
                  <Badge variant="secondary">{patientReports?.newPatients || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">معدل الحضور</span>
                  <Badge variant="secondary">
                    {appointmentReports?.attendanceRate?.toFixed(1) || 0}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">المدفوعات المعلقة</span>
                  <Badge variant="destructive">
                    <CurrencyDisplay amount={financialReports?.totalPending || 0} currency={currency} />
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تنبيهات المخزون</span>
                  <Badge variant="destructive">
                    {(inventoryReports?.lowStockItems || 0) + (inventoryReports?.expiredItems || 0) + (inventoryReports?.expiringSoonItems || 0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Patient Reports Tab */}
        <TabsContent value="patients">
          <PatientReports />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentReports />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryReports />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">التحليلات المتقدمة</h3>
            <p className="text-muted-foreground">سيتم تطوير هذا القسم قريباً</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
