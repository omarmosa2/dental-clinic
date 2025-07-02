import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  FileText,
  Download,
  Users,
  Calendar,
  Building2,
  Package,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { useClinicNeedsStore } from '@/store/clinicNeedsStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { ComprehensiveProfitLossService } from '@/services/comprehensiveProfitLossService'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import CurrencyDisplay from '@/components/ui/currency-display'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import { ExportService } from '@/services/exportService'
import { PdfService } from '@/services/pdfService'
import { notify } from '@/services/notificationService'
import type { ComprehensiveProfitLossReport, ReportFilter } from '@/types'

export default function ComprehensiveProfitLossReport() {
  const { payments } = usePaymentStore()
  const { expenses: clinicExpenses } = useExpensesStore()
  const { labOrders } = useLabOrderStore()
  const { needs: clinicNeeds } = useClinicNeedsStore()
  const { items: inventoryItems } = useInventoryStore()
  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()
  const { currency, settings } = useSettingsStore()

  const [reportData, setReportData] = useState<ComprehensiveProfitLossReport | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>({
    preset: 'all',
    startDate: '',
    endDate: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // إنشاء التقرير
  const generateReport = async () => {
    setIsLoading(true)
    try {
      // تحويل TimeFilterOptions إلى ReportFilter
      const reportFilter = timeFilter.preset === 'all' ? undefined : {
        dateRange: {
          start: timeFilter.startDate || '',
          end: timeFilter.endDate || ''
        }
      }

      const report = ComprehensiveProfitLossService.generateComprehensiveProfitLossReport(
        payments,
        labOrders,
        clinicNeeds,
        inventoryItems,
        patients,
        appointments,
        reportFilter,
        clinicExpenses // تمرير مصروفات العيادة المباشرة
      )
      setReportData(report)
    } catch (error) {
      console.error('Error generating comprehensive profit/loss report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // تصدير Excel
  const handleExportExcel = async () => {
    if (!reportData) {
      notify.error('لا توجد بيانات للتصدير')
      return
    }

    setIsExporting(true)
    try {
      await ExportService.exportProfitLossToExcel({
        reportData,
        payments,
        labOrders,
        clinicNeeds,
        inventoryItems,
        clinicExpenses,
        patients,
        appointments,
        filter: timeFilter,
        currency
      })
      notify.success('تم تصدير تقرير الأرباح والخسائر إلى Excel بنجاح')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      notify.error('فشل في تصدير التقرير إلى Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // تصدير PDF
  const handleExportPDF = async () => {
    if (!reportData) {
      notify.error('لا توجد بيانات للتصدير')
      return
    }

    setIsExporting(true)
    try {
      await PdfService.exportProfitLossReport({
        reportData,
        payments,
        labOrders,
        clinicNeeds,
        inventoryItems,
        clinicExpenses,
        patients,
        appointments,
        filter: timeFilter,
        currency
      }, settings)
      notify.success('تم تصدير تقرير الأرباح والخسائر إلى PDF بنجاح')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      notify.error('فشل في تصدير التقرير إلى PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // إنشاء التقرير عند تحميل المكون أو تغيير الفلتر
  useEffect(() => {
    generateReport()
  }, [timeFilter, payments, clinicExpenses, labOrders, clinicNeeds, inventoryItems, patients, appointments])

  if (isLoading || !reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">جاري حساب التقرير الشامل...</p>
        </div>
      </div>
    )
  }

  const { revenue, expenses, calculations, details, filterInfo } = reportData

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            التقرير الشامل للأرباح والخسائر
          </h2>
          <p className="text-muted-foreground mt-1">
            تحليل مالي شامل يربط جميع جوانب العيادة - {filterInfo.dateRange}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || !reportData}
          >
            <Download className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || !reportData}
          >
            <FileText className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير اكسل'}
          </Button>
        </div>
      </div>

      {/* Time Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">فلترة التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeFilter
            value={timeFilter}
            onChange={setTimeFilter}
            title="اختر الفترة الزمنية للتقرير"
          />
        </CardContent>
      </Card>

      {/* النتيجة النهائية */}
      <Card className={calculations.isProfit ? getCardStyles("green") : getCardStyles("red")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            {calculations.isProfit ? (
              <>
                <TrendingUp className={`w-6 h-6 ${getIconStyles("green")}`} />
                <span>ربح</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {calculations.profitMargin.toFixed(1)}%
                </Badge>
              </>
            ) : (
              <>
                <TrendingDown className={`w-6 h-6 ${getIconStyles("red")}`} />
                <span>خسارة</span>
                <Badge variant="destructive">
                  خسارة
                </Badge>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {calculations.isProfit ? (
              <CurrencyDisplay amount={calculations.netProfit} currency={currency} />
            ) : (
              <CurrencyDisplay amount={calculations.lossAmount} currency={currency} />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {calculations.isProfit
              ? `صافي الربح بنسبة ${calculations.profitMargin.toFixed(1)}%`
              : `إجمالي الخسارة من العمليات`
            }
          </p>
        </CardContent>
      </Card>

      {/* الإيرادات والمصروفات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الإيرادات */}
        <Card className={getCardStyles("blue")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className={`w-5 h-5 ${getIconStyles("blue")}`} />
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={revenue.totalRevenue} currency={currency} />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المدفوعات المكتملة</span>
                <CurrencyDisplay amount={revenue.completedPayments} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المدفوعات الجزئية</span>
                <CurrencyDisplay amount={revenue.partialPayments} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">المبالغ المتبقية</span>
                <CurrencyDisplay amount={revenue.remainingBalances} currency={currency} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المصروفات */}
        <Card className={getCardStyles("red")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingDown className={`w-5 h-5 ${getIconStyles("red")}`} />
              إجمالي المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={calculations.totalExpenses} currency={currency} />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مدفوعات المخابر</span>
                <CurrencyDisplay amount={expenses.labOrdersTotal} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">متبقي المخابر</span>
                <CurrencyDisplay amount={expenses.labOrdersRemaining} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">احتياجات العيادة</span>
                <CurrencyDisplay amount={expenses.clinicNeedsTotal} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">متبقي الاحتياجات</span>
                <CurrencyDisplay amount={expenses.clinicNeedsRemaining} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">قيمة المخزون</span>
                <CurrencyDisplay amount={expenses.inventoryExpenses} currency={currency} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">مصروفات العيادة المباشرة</span>
                <CurrencyDisplay amount={expenses.clinicExpensesTotal || 0} currency={currency} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={getCardStyles("purple")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className={`w-8 h-8 ${getIconStyles("purple")}`} />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                <p className="text-xl font-bold">{details.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className={`w-8 h-8 ${getIconStyles("orange")}`} />
              <div>
                <p className="text-sm text-muted-foreground">المواعيد</p>
                <p className="text-xl font-bold">{details.totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("cyan")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className={`w-8 h-8 ${getIconStyles("cyan")}`} />
              <div>
                <p className="text-sm text-muted-foreground">طلبات المخابر</p>
                <p className="text-xl font-bold">{details.totalLabOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={getCardStyles("indigo")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className={`w-8 h-8 ${getIconStyles("indigo")}`} />
              <div>
                <p className="text-sm text-muted-foreground">احتياجات العيادة</p>
                <p className="text-xl font-bold">{details.totalClinicNeeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* متوسطات الإيرادات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">متوسط الإيرادات لكل مريض</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={details.averageRevenuePerPatient} currency={currency} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">متوسط الإيرادات لكل موعد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={details.averageRevenuePerAppointment} currency={currency} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* معلومات الفلترة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">الفترة الزمنية: </span>
              <span className="font-medium">{filterInfo.dateRange}</span>
            </div>
            <div>
              <span className="text-muted-foreground">إجمالي السجلات: </span>
              <span className="font-medium">{filterInfo.totalRecords}</span>
            </div>
            <div>
              <span className="text-muted-foreground">السجلات المفلترة: </span>
              <span className="font-medium">{filterInfo.filteredRecords}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
