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
  Eye,
  Package,
  Pill,
  UserCheck
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts'
import { SimpleRealTimeIndicator } from './RealTimeIndicator'
import type { SmartAlert } from '@/types'

// البيانات الحقيقية فقط - لا توجد بيانات تجريبية كما هو محدد في المتطلبات

interface SmartAlertsProps {
  maxVisible?: number
  showHeader?: boolean
  compact?: boolean
  onAlertClick?: (alert: SmartAlert) => void
  showReadAlerts?: boolean
}

// Helper function to format time distance
function formatTimeDistance(dateInput: string | Date): string {
  try {
    // Handle invalid input
    if (!dateInput) {
      return 'غير محدد'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صحيح'
    }

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
  } catch (error) {
    console.error('Error formatting time distance:', error)
    return 'خطأ في التاريخ'
  }
}

// Helper function to safely format date
function formatSafeDate(dateInput: string | Date): string {
  try {
    if (!dateInput) {
      return '--'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return '--'
  }
}

export default function SmartAlerts({
  maxVisible = 5,
  showHeader = true,
  compact = false,
  onAlertClick,
  showReadAlerts = false
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

  // إعداد التحديثات في الوقت الفعلي
  const { refreshAlerts } = useRealTimeAlerts()

  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [showRead, setShowRead] = useState(showReadAlerts)

  useEffect(() => {
    // Load alerts using the global store method
    loadAlerts()

    // Refresh alerts every 30 seconds for periodic updates (reduced frequency since we have real-time events)
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing alerts every 30 seconds...')
      loadAlerts()
    }, 30000) // 30 seconds - reduced since we have real-time updates

    // Listen for data change events to refresh alerts immediately
    const handleDataChange = () => {
      console.log('📡 Data changed, refreshing alerts...')
      loadAlerts()
    }

    // All data change events that should trigger alert refresh
    const dataChangeEvents = [
      'patient-added', 'patient-updated', 'patient-deleted', 'patient-changed',
      'appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed',
      'payment-added', 'payment-updated', 'payment-deleted', 'payment-changed',
      'treatment-added', 'treatment-updated', 'treatment-deleted', 'treatment-changed',
      'prescription-added', 'prescription-updated', 'prescription-deleted', 'prescription-changed',
      'inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed'
    ]

    // Add event listeners for all data change events
    dataChangeEvents.forEach(eventName => {
      window.addEventListener(eventName, handleDataChange)
    })

    return () => {
      clearInterval(interval)
      // Remove all event listeners
      dataChangeEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleDataChange)
      })
    }
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
    .filter(alert => {
      // Show read alerts only if showRead is true
      if (showRead) {
        return true // Show all alerts (read and unread)
      } else {
        return !alert.isRead // Show only unread alerts
      }
    })
    .slice(0, maxVisible)

  // Count read and unread alerts for display
  const readAlertsCount = alerts.filter(alert => alert.isRead && !alert.isDismissed).length
  const totalAlertsCount = alerts.filter(alert => !alert.isDismissed).length

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
        return <Pill className="w-4 h-4" />
      case 'follow_up':
        return <UserCheck className="w-4 h-4" />
      case 'lab_order':
        return <FileText className="w-4 h-4" />
      case 'inventory':
        return <Package className="w-4 h-4" />
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
      case 'inventory':
        actions.push(
          <Button key="restock" size="sm" variant="outline" className="h-6 text-xs">
            <Package className="w-3 h-3 mr-1" />
            تجديد المخزون
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
              {showRead && readAlertsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {readAlertsCount} مقروءة
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <SimpleRealTimeIndicator />
              <Button
                variant={showRead ? "default" : "outline"}
                size="sm"
                onClick={() => setShowRead(!showRead)}
                className="text-xs"
              >
                {showRead ? 'إخفاء المقروءة' : 'عرض المقروءة'}
              </Button>
              <Button variant="ghost" size="sm" onClick={loadAlerts}>
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* إحصائيات التنبيهات */}
          <div className="text-sm text-muted-foreground mt-2">
            المجموع: {totalAlertsCount} | غير مقروءة: {unreadAlertsCount} | مقروءة: {readAlertsCount}
          </div>
        </CardHeader>
      )}

      <CardContent className={showHeader ? '' : 'pt-6'}>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {showRead
                ? (totalAlertsCount === 0 ? 'لا توجد تنبيهات' : 'لا توجد تنبيهات في هذا العرض')
                : 'لا توجد تنبيهات غير مقروءة'
              }
            </p>
            {!showRead && readAlertsCount > 0 && (
              <p className="text-xs mt-1">
                يوجد {readAlertsCount} تنبيه مقروء - اضغط "عرض المقروءة" لرؤيتها
              </p>
            )}
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
                          {formatTimeDistance(alert.createdAt)}
                        </span>

                        {alert.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            📅 {formatSafeDate(alert.dueDate)}
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
