import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReportsStore } from '@/store/reportsStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { PdfService } from '@/services/pdfService'
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function PatientReports() {
  const { patientReports, isLoading, isExporting, generateReport, exportReport, currentFilter, setFilter, clearCache } = useReportsStore()
  const { currency } = useSettingsStore()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [ageFilter, setAgeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    generateReport('patients')
  }, [generateReport])



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
    <Card className={getCardStyles(color)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${getIconStyles(color)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className={`text-xs flex items-center mt-1 ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
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

  const filteredPatients = patientReports?.patientsList?.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         patient.phone?.includes(searchTerm) ||
                         patient.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAge = ageFilter === 'all' || (() => {
      if (!patient.date_of_birth) return ageFilter === 'unknown'
      const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
      switch (ageFilter) {
        case 'child': return age < 18
        case 'adult': return age >= 18 && age < 60
        case 'senior': return age >= 60
        default: return true
      }
    })()

    // For status filter, we'd need appointment data to determine active/inactive
    const matchesStatus = statusFilter === 'all'

    return matchesSearch && matchesAge && matchesStatus
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Users className="h-12 w-12 animate-pulse text-sky-600 mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل تقارير المرضى...</p>
        </div>
      </div>
    )
  }

  if (!patientReports) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات</h3>
        <p className="text-muted-foreground">لم يتم العثور على بيانات المرضى</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المرضى</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمرضى
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // Clear cache to force fresh data
                clearCache()
                await generateReport('patients')

                toast({
                  title: "تم التحديث بنجاح",
                  description: "تم تحديث تقارير المرضى بأحدث البيانات",
                })
              } catch (error) {
                console.error('Error refreshing patient reports:', error)
                toast({
                  title: "خطأ في التحديث",
                  description: "فشل في تحديث التقارير. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
              }
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'جاري التحديث...' : 'تحديث'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Export patient reports data
              if (!patientReports || Object.keys(patientReports).length === 0) {
                toast({
                  title: "لا توجد بيانات",
                  description: "لا توجد بيانات تقارير مرضى للتصدير",
                  variant: "destructive",
                })
                return
              }

              try {
                const reportData = {
                  'إجمالي المرضى': patientReports.totalPatients || 0,
                  'المرضى الجدد هذا الشهر': patientReports.newPatientsThisMonth || 0,
                  'المرضى النشطون': patientReports.activePatientsThisMonth || 0,
                  'متوسط العمر': patientReports.averageAge || 0,
                  'توزيع الأعمار - أطفال (0-12)': patientReports.ageDistribution?.children || 0,
                  'توزيع الأعمار - مراهقون (13-19)': patientReports.ageDistribution?.teens || 0,
                  'توزيع الأعمار - بالغون (20-59)': patientReports.ageDistribution?.adults || 0,
                  'توزيع الأعمار - كبار السن (60+)': patientReports.ageDistribution?.seniors || 0,
                  'توزيع الجنس - ذكور': patientReports.genderDistribution?.male || 0,
                  'توزيع الجنس - إناث': patientReports.genderDistribution?.female || 0,
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

                // Generate descriptive filename with date and time
                const now = new Date()
                const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
                const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
                const fileName = `تقرير_إحصائيات_المرضى_${dateStr}_${timeStr}.csv`

                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                toast({
                  title: "تم التصدير بنجاح",
                  description: "تم تصدير تقرير المرضى كملف CSV",
                })
              } catch (error) {
                console.error('Error exporting CSV:', error)
                toast({
                  title: "خطأ في التصدير",
                  description: "فشل في تصدير التقرير. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
              }
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
                if (!patientReports || Object.keys(patientReports).length === 0) {
                  toast({
                    title: "لا توجد بيانات",
                    description: "لا توجد بيانات تقارير مرضى للتصدير",
                    variant: "destructive",
                  })
                  return
                }

                await PdfService.exportPatientReport(patientReports)

                toast({
                  title: "تم التصدير بنجاح",
                  description: "تم تصدير تقرير المرضى كملف PDF",
                })
              } catch (error) {
                console.error('Error exporting PDF:', error)
                toast({
                  title: "خطأ في التصدير",
                  description: "فشل في تصدير التقرير كملف PDF. يرجى المحاولة مرة أخرى.",
                  variant: "destructive",
                })
              }
            }}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 ml-2" />
            {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المرضى"
          value={patientReports.totalPatients}
          icon={Users}
          color="blue"
          description="العدد الكلي للمرضى المسجلين"
        />
        <StatCard
          title="المرضى الجدد"
          value={patientReports.newPatients}
          icon={UserPlus}
          color="green"
          trend={
            patientReports.totalPatients > 0
              ? {
                  value: Math.round((patientReports.newPatients / patientReports.totalPatients) * 100),
                  isPositive: patientReports.newPatients > 0
                }
              : undefined
          }
          description="المرضى المسجلين في الفترة المحددة"
        />
        <StatCard
          title="المرضى النشطين"
          value={patientReports.activePatients}
          icon={UserCheck}
          color="emerald"
          description="المرضى الذين لديهم مواعيد حديثة"
        />
        <StatCard
          title="المرضى غير النشطين"
          value={patientReports.inactivePatients}
          icon={UserX}
          color="red"
          description="المرضى بدون مواعيد حديثة"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>التوزيع العمري</span>
            </CardTitle>
            <CardDescription>توزيع المرضى حسب الفئات العمرية</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={patientReports.ageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ ageGroup, count }) => `${ageGroup}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {patientReports.ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>التوزيع حسب الجنس</span>
            </CardTitle>
            <CardDescription>توزيع المرضى حسب الجنس</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={patientReports.genderDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="gender" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Registration Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>اتجاه التسجيل</span>
          </CardTitle>
          <CardDescription>عدد المرضى المسجلين شهرياً</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={patientReports.registrationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>قائمة المرضى</span>
          </CardTitle>
          <CardDescription>قائمة تفصيلية بجميع المرضى</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6" dir="rtl">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  dir="rtl"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="age-filter">الفئة العمرية</Label>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-40" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأعمار</SelectItem>
                  <SelectItem value="child">أطفال (أقل من 18)</SelectItem>
                  <SelectItem value="adult">بالغين (18-59)</SelectItem>
                  <SelectItem value="senior">كبار السن (60+)</SelectItem>
                  <SelectItem value="unknown">غير محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Patients Table */}
          <div className="border rounded-lg overflow-hidden" dir="rtl">
            <div className="overflow-x-auto">
              <table className="w-full" dir="rtl">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-center p-3 font-medium arabic-enhanced">الاسم</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">الهاتف</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">البريد الإلكتروني</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">تاريخ التسجيل</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">العمر</th>
                    <th className="text-center p-3 font-medium arabic-enhanced">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient, index) => (
                    <tr key={patient.id} className={`hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                      <td className="p-3 font-medium text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {patient.full_name ? patient.full_name.charAt(0) : (patient.first_name || '').charAt(0)}
                          </div>
                          <span className="arabic-enhanced">
                            {patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">{patient.phone || '-'}</td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">{patient.email || '-'}</td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">
                        {formatDate(patient.created_at)}
                      </td>
                      <td className="p-3 text-muted-foreground text-center arabic-enhanced">
                        {patient.age || (patient.date_of_birth
                          ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
                          : '-'
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="arabic-enhanced">نشط</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
