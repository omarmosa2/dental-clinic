import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReportsStore } from '@/store/reportsStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSettingsStore } from '@/store/settingsStore'
import CurrencyDisplay from '@/components/ui/currency-display'
import { PdfService } from '@/services/pdfService'
import {
  Package,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search,
  Eye,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

interface StatCardProps {
  title: string
  value: number | string | React.ReactNode
  icon: React.ComponentType<any>
  color: string
  trend?: { value: number; isPositive: boolean }
  description?: string
}

export default function InventoryReports() {
  const { currency } = useSettingsStore()
  const { inventoryReports, isLoading, isExporting, generateReport, exportReport } = useReportsStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [alertFilter, setAlertFilter] = useState('all')

  const StatCard = ({ title, value, icon: Icon, color, trend, description }: StatCardProps) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend && (
                <div className={`flex items-center text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? (
                    <TrendingUp className="w-4 h-4 ml-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 ml-1" />
                  )}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )

  // Filter stock alerts based on search and filters
  const filteredStockAlerts = inventoryReports?.stockAlerts?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    const matchesAlert = alertFilter === 'all' || (() => {
      const today = new Date()
      const isExpired = item.expiry_date && new Date(item.expiry_date) < today
      const isExpiringSoon = item.expiry_date && (() => {
        const expiryDate = new Date(item.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      })()
      const isLowStock = item.quantity <= item.minimum_stock && item.quantity > 0
      const isOutOfStock = item.quantity === 0

      switch (alertFilter) {
        case 'low_stock': return isLowStock
        case 'out_of_stock': return isOutOfStock
        case 'expired': return isExpired
        case 'expiring_soon': return isExpiringSoon
        default: return true
      }
    })()

    return matchesSearch && matchesCategory && matchesAlert
  }) || []

  // Filter expiry alerts
  const filteredExpiryAlerts = inventoryReports?.expiryAlerts?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  }) || []

  // Get unique categories for filter
  const categories = Array.from(new Set([
    ...(inventoryReports?.stockAlerts?.map(item => item.category).filter(Boolean) || []),
    ...(inventoryReports?.expiryAlerts?.map(item => item.category).filter(Boolean) || [])
  ]))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-sky-600 mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل تقارير المخزون...</p>
        </div>
      </div>
    )
  }

  if (!inventoryReports) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات</h3>
        <p className="text-muted-foreground">لم يتم العثور على بيانات المخزون</p>
        <Button
          onClick={() => generateReport('inventory')}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          إعادة تحميل
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المخزون</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمخزون والتنبيهات
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await generateReport('inventory')
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث تقارير المخزون',
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export inventory reports data
              if (!inventoryReports || Object.keys(inventoryReports).length === 0) {
                alert('لا توجد بيانات تقارير مخزون للتصدير')
                return
              }

              const reportData = {
                'إجمالي العناصر': inventoryReports.totalItems || 0,
                'القيمة الإجمالية': inventoryReports.totalValue || 0,
                'عناصر منخفضة المخزون': inventoryReports.lowStockItems || 0,
                'عناصر منتهية الصلاحية': inventoryReports.expiredItems || 0,
                'عناصر قريبة الانتهاء': inventoryReports.expiringSoonItems || 0,
                'عناصر نفدت من المخزون': inventoryReports.outOfStockItems || 0,
                'أعلى الفئات استهلاكاً': inventoryReports.topCategories?.map(cat => `${cat.name}: ${cat.count}`).join('; ') || '',
                'أعلى الموردين': inventoryReports.topSuppliers?.map(sup => `${sup.name}: ${sup.count}`).join('; ') || '',
                'معدل دوران المخزون': inventoryReports.turnoverRate || 0,
                'تاريخ التقرير': new Date().toLocaleString('ar-SA')
              }

              // Create CSV with BOM for Arabic support
              const csvContent = '\uFEFF' + [
                'المؤشر,القيمة',
                ...Object.entries(reportData).map(([key, value]) =>
                  `"${key}","${value}"`
                )
              ].join('\n')

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `inventory_reports_${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              alert('تم تصدير تقرير المخزون بنجاح!')
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              try {
                if (!inventoryReports || Object.keys(inventoryReports).length === 0) {
                  alert('لا توجد بيانات تقارير مخزون للتصدير')
                  return
                }

                await PdfService.exportInventoryReport(inventoryReports)

                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التصدير بنجاح',
                    description: 'تم تصدير تقرير المخزون كملف PDF',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                console.error('Error exporting PDF:', error)
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'خطأ في التصدير',
                    description: 'فشل في تصدير التقرير كملف PDF',
                    type: 'error'
                  }
                })
                window.dispatchEvent(event)
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي العناصر"
          value={inventoryReports.totalItems}
          icon={Package}
          color="blue"
          description="العدد الكلي لعناصر المخزون"
        />
        <StatCard
          title="القيمة الإجمالية"
          value={<CurrencyDisplay amount={inventoryReports.totalValue} currency={currency} />}
          icon={TrendingUp}
          color="green"
          description="القيمة الإجمالية للمخزون"
        />
        <StatCard
          title="مخزون منخفض"
          value={inventoryReports.lowStockItems}
          icon={AlertTriangle}
          color="yellow"
          description="عناصر تحتاج إعادة تموين"
        />
        <StatCard
          title="منتهية الصلاحية"
          value={inventoryReports.expiredItems}
          icon={Calendar}
          color="red"
          description="عناصر منتهية الصلاحية"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>التوزيع حسب الفئة</span>
            </CardTitle>
            <CardDescription>توزيع عناصر المخزون حسب الفئات</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={inventoryReports.itemsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count }) => `${category}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {inventoryReports.itemsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Items by Supplier Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>التوزيع حسب المورد</span>
            </CardTitle>
            <CardDescription>توزيع عناصر المخزون حسب الموردين</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryReports.itemsBySupplier.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="supplier" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>اتجاه الاستخدام</span>
          </CardTitle>
          <CardDescription>معدل استخدام المخزون شهرياً</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={inventoryReports.usageTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="usage" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <AlertTriangle className="w-5 h-5" />
            <span>تنبيهات المخزون</span>
          </CardTitle>
          <CardDescription>العناصر التي تحتاج انتباهك</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم أو الفئة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category-filter">الفئة</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alert-filter">نوع التنبيه</Label>
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التنبيهات</SelectItem>
                  <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                  <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                  <SelectItem value="expiring_soon">ينتهي قريباً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock Alerts Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right p-3 font-medium">اسم العنصر</th>
                    <th className="text-right p-3 font-medium">الفئة</th>
                    <th className="text-right p-3 font-medium">الكمية الحالية</th>
                    <th className="text-right p-3 font-medium">الحد الأدنى</th>
                    <th className="text-right p-3 font-medium">تاريخ الانتهاء</th>
                    <th className="text-right p-3 font-medium">نوع التنبيه</th>
                    <th className="text-right p-3 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockAlerts.map((item, index) => {
                    const today = new Date()
                    const isExpired = item.expiry_date && new Date(item.expiry_date) < today
                    const isExpiringSoon = item.expiry_date && (() => {
                      const expiryDate = new Date(item.expiry_date)
                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
                    })()
                    const isLowStock = item.quantity <= item.minimum_stock && item.quantity > 0
                    const isOutOfStock = item.quantity === 0

                    let alertType = ''
                    let alertColor = ''

                    if (isOutOfStock) {
                      alertType = 'نفد المخزون'
                      alertColor = 'destructive'
                    } else if (isExpired) {
                      alertType = 'منتهي الصلاحية'
                      alertColor = 'destructive'
                    } else if (isLowStock) {
                      alertType = 'مخزون منخفض'
                      alertColor = 'warning'
                    } else if (isExpiringSoon) {
                      alertType = 'ينتهي قريباً'
                      alertColor = 'warning'
                    }

                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                        <td className="p-3 text-muted-foreground">
                          {item.quantity} {item.unit || 'قطعة'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.minimum_stock} {item.unit || 'قطعة'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.expiry_date ? formatDate(item.expiry_date) : '-'}
                        </td>
                        <td className="p-3">
                          <Badge variant={alertColor as any}>{alertType}</Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredStockAlerts.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {inventoryReports?.stockAlerts?.length === 0
                    ? "لا توجد تنبيهات للمخزون - جميع العناصر في حالة جيدة"
                    : "لا توجد تنبيهات مطابقة للبحث"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  إجمالي التنبيهات: {inventoryReports?.stockAlerts?.length || 0}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
