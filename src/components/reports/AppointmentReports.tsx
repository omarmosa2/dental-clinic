import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useReportsStore } from '@/store/reportsStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { PdfService } from '@/services/pdfService'
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  BarChart3,
  PieChart
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
  Cell
} from 'recharts'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function AppointmentReports() {
  const { appointmentReports, isLoading, isExporting, generateReport, clearCache } = useReportsStore()
  const { appointments, loadAppointments } = useAppointmentStore()

  useEffect(() => {
    generateReport('appointments')
    loadAppointments()
  }, [generateReport, loadAppointments])



  // Calculate appointment statistics
  const calculateStats = () => {
    const total = appointments.length
    const completed = appointments.filter(apt => apt.status === 'completed').length
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length
    const pending = appointments.filter(apt => apt.status === 'scheduled').length
    const noShow = appointments.filter(apt => apt.status === 'no_show').length

    const attendanceRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0'
    const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0'

    return {
      total,
      completed,
      cancelled,
      pending,
      noShow,
      attendanceRate,
      cancellationRate
    }
  }

  const stats = calculateStats()

  // Prepare chart data
  const statusData = [
    { name: 'مكتمل', value: stats.completed, color: '#10b981' },
    { name: 'ملغي', value: stats.cancelled, color: '#ef4444' },
    { name: 'مجدول', value: stats.pending, color: '#f59e0b' },
    { name: 'لم يحضر', value: stats.noShow, color: '#6b7280' }
  ]

  // Monthly appointments data
  const monthlyData = appointments.reduce((acc, apt) => {
    const month = new Date(apt.start_time).toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const monthlyChartData = Object.entries(monthlyData).map(([month, count]) => ({
    month,
    count
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تقارير المواعيد</h2>
          <p className="text-muted-foreground mt-1">
            إحصائيات وتحليلات شاملة للمواعيد
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
                await generateReport('appointments')
                await loadAppointments()
                // Show success message
                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التحديث بنجاح',
                    description: 'تم تحديث تقارير المواعيد',
                    type: 'success'
                  }
                })
                window.dispatchEvent(event)
              } catch (error) {
                console.error('Error refreshing appointment reports:', error)
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
              // Export appointment reports data
              if (appointments.length === 0) {
                alert('لا توجد بيانات مواعيد للتصدير')
                return
              }

              const reportData = {
                'إجمالي المواعيد': stats.total,
                'المواعيد المكتملة': stats.completed,
                'المواعيد الملغية': stats.cancelled,
                'المواعيد المجدولة': stats.pending,
                'عدم الحضور': stats.noShow,
                'معدل الحضور (%)': stats.attendanceRate,
                'معدل الإلغاء (%)': stats.cancellationRate,
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
              const fileName = `تقرير_إحصائيات_المواعيد_${dateStr}_${timeStr}.csv`

              link.download = fileName
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              alert('تم تصدير تقرير المواعيد بنجاح!')
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
                if (appointments.length === 0) {
                  alert('لا توجد بيانات مواعيد للتصدير')
                  return
                }

                // Create appointment report data structure
                const reportData = {
                  totalAppointments: stats.total,
                  completedAppointments: stats.completed,
                  cancelledAppointments: stats.cancelled,
                  noShowAppointments: stats.noShow,
                  attendanceRate: parseFloat(stats.attendanceRate),
                  cancellationRate: parseFloat(stats.cancellationRate),
                  appointmentsByStatus: statusData.map(item => ({
                    status: item.name,
                    count: item.value,
                    percentage: (item.value / stats.total) * 100
                  })),
                  peakHours: [],
                  monthlyTrend: monthlyChartData
                }

                await PdfService.exportAppointmentReport(reportData)

                const event = new CustomEvent('showToast', {
                  detail: {
                    title: 'تم التصدير بنجاح',
                    description: 'تم تصدير تقرير المواعيد كملف PDF',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" dir="rtl">
        <Card className={getCardStyles("purple")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المواعيد</CardTitle>
            <Calendar className={`h-4 w-4 ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              جميع المواعيد المسجلة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("emerald")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المواعيد المكتملة</CardTitle>
            <CheckCircle className={`h-4 w-4 ${getIconStyles("emerald")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              معدل الحضور: {stats.attendanceRate}%
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المواعيد الملغية</CardTitle>
            <XCircle className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">
              معدل الإلغاء: {stats.cancellationRate}%
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("blue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المواعيد المجدولة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              في انتظار التنفيذ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <PieChart className="w-5 h-5" />
              <span>توزيع حالات المواعيد</span>
            </CardTitle>
            <CardDescription>توزيع المواعيد حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Appointments Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-5 h-5" />
              <span>المواعيد الشهرية</span>
            </CardTitle>
            <CardDescription>عدد المواعيد حسب الشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ textAnchor: 'end', direction: 'rtl' }}
                  reversed={true}
                />
                <YAxis />
                <Tooltip
                  labelStyle={{ direction: 'rtl', textAlign: 'right' }}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
