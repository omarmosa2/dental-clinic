import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  Package
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalPatients: number
  totalAppointments: number
  totalRevenue: number
  pendingPayments: number
  todayAppointments: number
  thisMonthRevenue: number
  lowStockItems: number
}

interface DashboardProps {
  onAddPatient?: () => void
  onAddAppointment?: () => void
}

export default function Dashboard({ onAddPatient, onAddAppointment }: DashboardProps) {
  const { patients, loadPatients } = usePatientStore()
  const { appointments, getAppointmentsForDate, loadAppointments } = useAppointmentStore()
  const { payments, totalRevenue, pendingAmount, monthlyRevenue, loadPayments } = usePaymentStore()
  const { settings, currency } = useSettingsStore()
  const {
    items: inventoryItems,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems: loadInventoryItems
  } = useInventoryStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    todayAppointments: 0,
    thisMonthRevenue: 0,
    lowStockItems: 0
  })

  useEffect(() => {
    // Load all required data when component mounts
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadPayments(),
          loadInventoryItems()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    loadAllData()
  }, [loadPatients, loadAppointments, loadPayments, loadInventoryItems])

  useEffect(() => {
    // Calculate dashboard statistics
    const today = new Date()
    const todayAppointments = getAppointmentsForDate(today)
    const thisMonth = today.toISOString().slice(0, 7)
    const thisMonthRevenue = monthlyRevenue[thisMonth] || 0

    setStats({
      totalPatients: patients.length,
      totalAppointments: appointments.length,
      totalRevenue,
      pendingPayments: pendingAmount,
      todayAppointments: todayAppointments.length,
      thisMonthRevenue,
      lowStockItems: lowStockCount + expiredCount + expiringSoonCount
    })
  }, [patients, appointments, totalRevenue, pendingAmount, monthlyRevenue, getAppointmentsForDate, lowStockCount, expiredCount, expiringSoonCount])

  // Prepare chart data
  const revenueData = Object.entries(monthlyRevenue)
    .slice(-6)
    .map(([month, revenue]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue
    }))

  const appointmentStatusData = [
    { name: 'مجدول', value: appointments.filter(a => a.status === 'scheduled').length, color: '#3b82f6' },
    { name: 'مكتمل', value: appointments.filter(a => a.status === 'completed').length, color: '#10b981' },
    { name: 'ملغي', value: appointments.filter(a => a.status === 'cancelled').length, color: '#ef4444' },
    { name: 'لم يحضر', value: appointments.filter(a => a.status === 'no_show').length, color: '#6b7280' }
  ]

  const todayAppointments = getAppointmentsForDate(new Date())

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            مرحباً بك في {settings?.clinic_name || 'العيادة السنية'}
          </h1>
          <p className="text-muted-foreground mt-2">
            إليك ما يحدث في عيادتك اليوم
          </p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <Button onClick={onAddAppointment}>
            <Plus className="w-4 h-4 ml-2" />
            موعد جديد
          </Button>
          <Button variant="outline" onClick={onAddPatient}>
            <Plus className="w-4 h-4 ml-2" />
            مريض جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={getCardStyles("blue")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المرضى</CardTitle>
            <Users className={`h-4 w-4 ${getIconStyles("blue")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              سجلات المرضى النشطة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("purple")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">مواعيد اليوم</CardTitle>
            <Calendar className={`h-4 w-4 ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              مجدولة لليوم
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("emerald")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المواعيد المكتملة</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getIconStyles("emerald")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {appointments.filter(a => a.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي المواعيد المكتملة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إيرادات الشهر</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.thisMonthRevenue, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              أرباح هذا الشهر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className={getCardStyles("green")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
            <DollarSign className={`h-4 w-4 ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalRevenue, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي الإيرادات المحققة
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("yellow")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">المدفوعات المعلقة</CardTitle>
            <Clock className={`h-4 w-4 ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.pendingPayments, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              مدفوعات في انتظار التحصيل
            </p>
          </CardContent>
        </Card>

        <Card className={getCardStyles("orange")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تنبيهات المخزون</CardTitle>
            <Package className={`h-4 w-4 ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              عناصر تحتاج انتباه
            </p>
            {stats.lowStockItems > 0 && (
              <div className="mt-2 text-xs">
                <div className="flex justify-between">
                  <span>مخزون منخفض:</span>
                  <span className={getIconStyles("yellow").replace('h-4 w-4', '')}>{lowStockCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>منتهي الصلاحية:</span>
                  <span className={getIconStyles("red").replace('h-4 w-4', '')}>{expiredCount + expiringSoonCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>اتجاه الإيرادات</CardTitle>
            <CardDescription>الإيرادات الشهرية خلال آخر 6 أشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointment Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>حالة المواعيد</CardTitle>
            <CardDescription>توزيع حالات المواعيد</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>مواعيد اليوم</CardTitle>
          <CardDescription>
            {todayAppointments.length} موعد مجدول لتاريخ {formatDate(new Date(), 'long')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مواعيد مجدولة لليوم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <p className="font-medium">{appointment.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.start_time).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(appointment.end_time).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status === 'scheduled' ? 'مجدول' :
                       appointment.status === 'completed' ? 'مكتمل' :
                       appointment.status === 'cancelled' ? 'ملغي' :
                       appointment.status === 'no_show' ? 'لم يحضر' : appointment.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {todayAppointments.length > 5 && (
                <div className="text-center">
                  <Button variant="outline">
                    عرض جميع المواعيد ({todayAppointments.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
