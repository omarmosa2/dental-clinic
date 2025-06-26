import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  MoreVertical,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Phone,
  Eye
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { SmartAlertsService } from '@/services/smartAlertsService'
import type { SmartAlert } from '@/types'

// Create demo alerts for testing
const createDemoAlerts = (): SmartAlert[] => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return [
    {
      id: 'demo_appointment_today_1',
      type: 'appointment',
      priority: 'high',
      title: 'موعد اليوم - أحمد محمد',
      description: 'موعد مجدول اليوم في 2:00 PM - فحص دوري',
      patientId: 'demo_patient_1',
      patientName: 'أحمد محمد',
      relatedData: {
        appointmentId: 'demo_apt_1'
      },
      actionRequired: true,
      dueDate: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM today
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false,
      context: 'upcoming today'
    },
    {
      id: 'demo_payment_overdue_1',
      type: 'payment',
      priority: 'high',
      title: 'دفعة معلقة - فاطمة أحمد',
      description: 'دفعة معلقة منذ 5 أيام - المبلغ: 500 ريال',
      patientId: 'demo_patient_2',
      patientName: 'فاطمة أحمد',
      relatedData: {
        paymentId: 'demo_pay_1',
        appointmentId: 'demo_apt_2'
      },
      actionRequired: true,
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false,
      context: 'overdue pending'
    },
    {
      id: 'demo_appointment_upcoming_1',
      type: 'appointment',
      priority: 'medium',
      title: 'موعد غداً - سارة علي',
      description: 'موعد مجدول غداً في 10:00 AM - تنظيف أسنان',
      patientId: 'demo_patient_3',
      patientName: 'سارة علي',
      relatedData: {
        appointmentId: 'demo_apt_3'
      },
      actionRequired: false,
      dueDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(), // 10 AM tomorrow
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false,
      context: 'upcoming tomorrow'
    },
    {
      id: 'demo_follow_up_1',
      type: 'follow_up',
      priority: 'low',
      title: 'متابعة مطلوبة - محمد خالد',
      description: 'لم يزر المريض العيادة منذ 95 يوم - قد يحتاج متابعة',
      patientId: 'demo_patient_4',
      patientName: 'محمد خالد',
      relatedData: {},
      actionRequired: false,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false
    },
    {
      id: 'demo_treatment_reminder_1',
      type: 'treatment',
      priority: 'medium',
      title: 'تذكير علاج - نور الدين',
      description: 'موعد المتابعة للعلاج مستحق خلال 3 أيام',
      patientId: 'demo_patient_5',
      patientName: 'نور الدين',
      relatedData: {
        treatmentId: 'demo_treatment_1'
      },
      actionRequired: true,
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      createdAt: new Date().toISOString(),
      isRead: false,
      isDismissed: false
    }
  ]
}

interface SmartAlertsProps {
  maxVisible?: number
  showHeader?: boolean
  compact?: boolean
  onAlertClick?: (alert: SmartAlert) => void
}

// Helper function to format time distance
function formatTimeDistance(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'منذ لحظات'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `منذ ${minutes} دقيقة`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `منذ ${hours} ساعة`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `منذ ${days} يوم`
  } else {
    const months = Math.floor(diffInSeconds / 2592000)
    return `منذ ${months} شهر`
  }
}

export default function SmartAlerts({
  maxVisible = 5,
  showHeader = true,
  compact = false,
  onAlertClick
}: SmartAlertsProps) {
  const {
    alerts,
    unreadAlertsCount,
    isLoadingAlerts,
    loadAlerts,
    markAlertAsRead,
    dismissAlert,
    snoozeAlert
  } = useGlobalStore()

  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAlerts()

    // Load real alerts from SmartAlertsService
    const loadRealAlerts = async () => {
      try {
        const { SmartAlertsService } = await import('@/services/smartAlertsService')
        const realAlerts = await SmartAlertsService.getAllAlerts()
        console.log('🔔 Loaded smart alerts:', realAlerts.length)

        // Update the global store with real alerts
        const { useGlobalStore } = await import('@/store/globalStore')
        const store = useGlobalStore.getState()

        if (realAlerts && realAlerts.length > 0) {
          store.alerts = realAlerts
          store.unreadAlertsCount = realAlerts.filter(alert => !alert.isRead && !alert.isDismissed).length
          console.log('📊 Updated store with real alerts:', realAlerts.length, 'unread:', store.unreadAlertsCount)
        } else {
          // Create demo alerts if no real data exists (for development)
          const demoAlerts = createDemoAlerts()
          store.alerts = demoAlerts
          store.unreadAlertsCount = demoAlerts.filter(alert => !alert.isRead && !alert.isDismissed).length
          console.log('🎭 Using demo alerts:', demoAlerts.length)
        }
      } catch (error) {
        console.error('❌ Error loading smart alerts:', error)
        // Fallback to demo alerts on error
        const demoAlerts = createDemoAlerts()
        const { useGlobalStore } = await import('@/store/globalStore')
        const store = useGlobalStore.getState()
        store.alerts = demoAlerts
        store.unreadAlertsCount = demoAlerts.filter(alert => !alert.isRead && !alert.isDismissed).length
      }
    }

    loadRealAlerts()

    // Refresh alerts every 60 seconds (reduced frequency for better performance)
    const interval = setInterval(loadRealAlerts, 60000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  // Filter and sort alerts
  const visibleAlerts = alerts
    .filter(alert => !alert.isDismissed)
    .filter(alert => {
      // Hide snoozed alerts
      if (alert.snoozeUntil) {
        const snoozeDate = new Date(alert.snoozeUntil)
        return snoozeDate <= new Date()
      }
      return true
    })
    .slice(0, maxVisible)

  // Get alert icon
  const getAlertIcon = (alert: SmartAlert) => {
    switch (alert.type) {
      case 'appointment':
        return <Calendar className="w-4 h-4" />
      case 'payment':
        return <DollarSign className="w-4 h-4" />
      case 'treatment':
        return <Activity className="w-4 h-4" />
      case 'prescription':
        return <FileText className="w-4 h-4" />
      case 'follow_up':
        return <Clock className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-500 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل'
      case 'medium': return 'متوسط'
      case 'low': return 'منخفض'
      default: return priority
    }
  }

  // Handle alert click
  const handleAlertClick = async (alert: SmartAlert) => {
    if (!alert.isRead) {
      await markAlertAsRead(alert.id)
    }

    if (!expandedAlerts.has(alert.id)) {
      setExpandedAlerts(prev => new Set([...prev, alert.id]))
    }

    // Show alert details in console for debugging
    console.log('🔔 Alert clicked:', {
      title: alert.title,
      description: alert.description,
      type: alert.type,
      priority: alert.priority,
      patientName: alert.patientName,
      relatedData: alert.relatedData
    })

    // Show a visual feedback toast (disabled for cleaner UI)
    // showAlertToast(alert)

    onAlertClick?.(alert)
  }



  // Handle dismiss
  const handleDismiss = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('🚫 Dismissing alert:', alertId)
    try {
      await dismissAlert(alertId)
      console.log('✅ Alert dismissed successfully:', alertId)
    } catch (error) {
      console.error('❌ Error dismissing alert:', error)
    }
  }

  // Handle snooze
  const handleSnooze = async (alertId: string, hours: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const snoozeUntil = new Date()
    snoozeUntil.setHours(snoozeUntil.getHours() + hours)
    console.log(`⏰ Snoozing alert for ${hours} hours:`, alertId, 'until:', snoozeUntil.toISOString())
    try {
      await snoozeAlert(alertId, snoozeUntil.toISOString())
      console.log('✅ Alert snoozed successfully:', alertId)
    } catch (error) {
      console.error('❌ Error snoozing alert:', error)
    }
  }

  // Toggle expanded
  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertId)) {
        newSet.delete(alertId)
      } else {
        newSet.add(alertId)
      }
      return newSet
    })
  }

  // Render alert actions
  const renderAlertActions = (alert: SmartAlert) => {
    const actions = []

    // Quick actions based on alert type
    switch (alert.type) {
      case 'appointment':
        actions.push(
          <Button key="call" size="sm" variant="outline" className="h-6 text-xs">
            <Phone className="w-3 h-3 mr-1" />
            اتصال
          </Button>
        )
        break
      case 'payment':
        actions.push(
          <Button key="collect" size="sm" variant="outline" className="h-6 text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            تحصيل
          </Button>
        )
        break
      case 'treatment':
        actions.push(
          <Button key="schedule" size="sm" variant="outline" className="h-6 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            جدولة
          </Button>
        )
        break
    }

    // Common actions
    actions.push(
      <Button
        key="view"
        size="sm"
        variant="outline"
        className="h-6 text-xs"
        onClick={() => onAlertClick?.(alert)}
      >
        <Eye className="w-3 h-3 mr-1" />
        عرض
      </Button>
    )

    return actions
  }

  if (isLoadingAlerts) {
    return (
      <Card className={compact ? 'shadow-sm' : ''}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              التنبيهات الذكية
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? 'shadow-sm' : ''}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              التنبيهات الذكية
              {unreadAlertsCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadAlertsCount}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadAlerts}>
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className={showHeader ? '' : 'pt-6'}>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد تنبيهات جديدة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert, index) => (
              <div key={alert.id}>
                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    alert.isRead
                      ? 'bg-muted/30 border-muted'
                      : `${getPriorityColor(alert.priority)} hover:opacity-80`
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-3" dir="rtl">
                    <div className={`p-1 rounded ${getPriorityColor(alert.priority)}`}>
                      {getAlertIcon(alert)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getPriorityLabel(alert.priority)}
                        </Badge>
                        {!alert.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {alert.description}
                      </p>

                      {alert.patientName && (
                        <p className="text-xs font-medium text-primary mb-2">
                          👤 {alert.patientName}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeDistance(new Date(alert.createdAt))}
                        </span>

                        {alert.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            📅 {new Date(alert.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>

                      {/* Expanded content */}
                      {expandedAlerts.has(alert.id) && alert.actionRequired && (
                        <div className="mt-3 pt-3 border-t border-muted">
                          <div className="flex flex-wrap gap-2">
                            {renderAlertActions(alert)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Snooze and dismiss menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleSnooze(alert.id, 1, e)}>
                            <Clock className="w-4 h-4 mr-2" />
                            تأجيل ساعة
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleSnooze(alert.id, 24, e)}>
                            <Clock className="w-4 h-4 mr-2" />
                            تأجيل يوم
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDismiss(alert.id, e)}>
                            <X className="w-4 h-4 mr-2" />
                            إخفاء
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {index < visibleAlerts.length - 1 && <Separator className="my-2" />}
              </div>
            ))}

            {alerts.length > maxVisible && (
              <div className="text-center pt-3">
                <Button variant="outline" size="sm">
                  عرض جميع التنبيهات ({alerts.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
