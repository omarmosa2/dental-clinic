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
  UserCheck,
  CreditCard,
  User,
  RefreshCw
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts'
import { useTheme } from '@/contexts/ThemeContext'
import { SimpleRealTimeIndicator } from './RealTimeIndicator'
import { useToast } from '@/hooks/use-toast'
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

  // إعداد الثيم
  const { isDarkMode } = useTheme()

  // إعداد Toast notifications
  const { toast } = useToast()

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

  // Get priority color with dark mode support
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return isDarkMode
          ? 'text-red-400 bg-red-900/20 border-red-800/50'
          : 'text-red-500 bg-red-50 border-red-200'
      case 'medium':
        return isDarkMode
          ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50'
          : 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'low':
        return isDarkMode
          ? 'text-blue-400 bg-blue-900/20 border-blue-800/50'
          : 'text-blue-500 bg-blue-50 border-blue-200'
      default:
        return isDarkMode
          ? 'text-gray-400 bg-gray-900/20 border-gray-800/50'
          : 'text-gray-500 bg-gray-50 border-gray-200'
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

      toast({
        title: "🗑️ تم إخفاء الإشعار",
        description: "تم إخفاء الإشعار بنجاح",
        duration: 2000,
      })
    } catch (error) {
      console.error('❌ Error dismissing alert:', error)
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ أثناء إخفاء الإشعار",
        variant: "destructive",
      })
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

      const timeText = hours === 1 ? 'ساعة واحدة' : `${hours} ساعة`
      toast({
        title: "⏰ تم تأجيل الإشعار",
        description: `تم تأجيل الإشعار لمدة ${timeText}`,
        duration: 2000,
      })
    } catch (error) {
      console.error('❌ Error snoozing alert:', error)
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ أثناء تأجيل الإشعار",
        variant: "destructive",
      })
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

  // Handle action button clicks
  const handleActionClick = async (action: string, alert: SmartAlert, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(`🔧 Action clicked: ${action} for alert:`, alert.id)

    try {
      switch (action) {
        case 'call':
        case 'call-patient':
          if (alert.patientId) {
            // فتح ملف المريض وعرض معلومات الاتصال
            const patients = await window.electronAPI?.patients?.getAll?.() || []
            const patient = patients.find(p => p.id === alert.patientId)
            if (patient?.phone) {
              // إظهار رقم الهاتف للمستخدم
              toast({
                title: "📞 معلومات الاتصال",
                description: `رقم هاتف ${patient.full_name}: ${patient.phone}`,
                duration: 5000,
              })
              // تحديث الإشعار كمقروء
              await markAlertAsRead(alert.id)
            } else {
              toast({
                title: "❌ خطأ",
                description: "لا يوجد رقم هاتف مسجل لهذا المريض",
                variant: "destructive",
              })
            }
          }
          break

        case 'reschedule':
          if (alert.relatedData?.appointmentId) {
            // فتح نافذة إعادة جدولة الموعد
            const appointments = await window.electronAPI?.appointments?.getAll?.() || []
            const appointment = appointments.find(a => a.id === alert.relatedData?.appointmentId)
            if (appointment) {
              // إظهار خيارات للموعد
              const action = confirm(`موعد ${appointment.title}\n\nاختر:\nOK = تأكيد الموعد\nCancel = إعادة جدولة`)
              if (action) {
                try {
                  // تأكيد الموعد
                  await window.electronAPI?.appointments?.update?.(appointment.id, {
                    ...appointment,
                    status: 'confirmed'
                  })

                  toast({
                    title: "✅ تم تأكيد الموعد",
                    description: `تم تأكيد موعد ${appointment.title}`,
                    duration: 3000,
                  })

                  await markAlertAsRead(alert.id)
                  window.dispatchEvent(new CustomEvent('appointment-updated'))
                } catch (error) {
                  toast({
                    title: "❌ خطأ",
                    description: "حدث خطأ أثناء تحديث الموعد",
                    variant: "destructive",
                  })
                }
              } else {
                toast({
                  title: "📅 إعادة جدولة الموعد",
                  description: `موعد ${appointment.title} - يرجى استخدام صفحة المواعيد لإعادة الجدولة`,
                  duration: 4000,
                })
                await markAlertAsRead(alert.id)
              }
            }
          }
          break

        case 'collect':
          if (alert.relatedData?.paymentId) {
            // فتح نافذة تحصيل الدفعة
            const payments = await window.electronAPI?.payments?.getAll?.() || []
            const payment = payments.find(p => p.id === alert.relatedData?.paymentId)
            if (payment) {
              // إظهار تأكيد للتحصيل
              const confirmed = confirm(`هل تريد تأكيد تحصيل دفعة بقيمة $${payment.remaining_balance}؟`)
              if (confirmed) {
                try {
                  // تحديث حالة الدفعة إلى مكتملة
                  await window.electronAPI?.payments?.update?.(payment.id, {
                    ...payment,
                    status: 'completed',
                    remaining_balance: 0,
                    paid_amount: payment.total_amount
                  })

                  toast({
                    title: "✅ تم التحصيل",
                    description: `تم تحصيل دفعة بقيمة $${payment.remaining_balance} بنجاح`,
                    duration: 3000,
                  })

                  // حذف الإشعار لأن الدفعة اكتملت
                  await dismissAlert(alert.id)

                  // إرسال حدث تحديث الدفعات
                  window.dispatchEvent(new CustomEvent('payment-updated'))
                } catch (error) {
                  toast({
                    title: "❌ خطأ",
                    description: "حدث خطأ أثناء تحديث الدفعة",
                    variant: "destructive",
                  })
                }
              } else {
                toast({
                  title: "💰 تحصيل الدفعة",
                  description: `دفعة بقيمة $${payment.remaining_balance} - يرجى استخدام صفحة المدفوعات للتحصيل`,
                  duration: 4000,
                })
                await markAlertAsRead(alert.id)
              }
            }
          }
          break

        case 'installment':
          if (alert.relatedData?.paymentId) {
            // فتح نافذة تقسيط الدفعة
            toast({
              title: "💳 تقسيط الدفعة",
              description: "يرجى استخدام صفحة المدفوعات لإعداد التقسيط",
              duration: 3000,
            })
            await markAlertAsRead(alert.id)
          }
          break

        case 'schedule':
          if (alert.patientId) {
            // فتح نافذة جدولة موعد جديد
            toast({
              title: "📅 جدولة موعد جديد",
              description: "يرجى استخدام صفحة المواعيد لإضافة موعد جديد",
              duration: 3000,
            })
            await markAlertAsRead(alert.id)
          }
          break

        case 'view-patient':
          if (alert.patientId) {
            // فتح ملف المريض
            const patients = await window.electronAPI?.patients?.getAll?.() || []
            const patient = patients.find(p => p.id === alert.patientId)
            if (patient) {
              toast({
                title: "👤 ملف المريض",
                description: `${patient.full_name} - يرجى استخدام صفحة المرضى لعرض التفاصيل`,
                duration: 3000,
              })
              await markAlertAsRead(alert.id)
            }
          }
          break

        case 'restock':
          if (alert.relatedData?.inventoryId) {
            // فتح نافذة تجديد المخزون
            toast({
              title: "📦 تجديد المخزون",
              description: "يرجى استخدام صفحة المخزون لتجديد العناصر",
              duration: 3000,
            })
            await markAlertAsRead(alert.id)
          }
          break

        case 'view-item':
          if (alert.relatedData?.inventoryId) {
            // عرض تفاصيل العنصر
            toast({
              title: "👁️ عرض العنصر",
              description: "يرجى استخدام صفحة المخزون لعرض التفاصيل",
              duration: 3000,
            })
            await markAlertAsRead(alert.id)
          }
          break

        case 'contact-lab':
          // اتصال بالمختبر
          toast({
            title: "🔬 اتصال بالمختبر",
            description: "يرجى استخدام معلومات الاتصال المحفوظة",
            duration: 3000,
          })
          await markAlertAsRead(alert.id)
          break

        case 'update-status':
          if (alert.relatedData?.labOrderId) {
            // تحديث حالة طلب المختبر
            const labOrders = await window.electronAPI?.labOrders?.getAll?.() || []
            const labOrder = labOrders.find(l => l.id === alert.relatedData?.labOrderId)
            if (labOrder) {
              const statusOptions = ['pending', 'in_progress', 'completed', 'cancelled']
              const currentStatus = labOrder.status || 'pending'
              const nextStatus = statusOptions[(statusOptions.indexOf(currentStatus) + 1) % statusOptions.length]

              const confirmed = confirm(`تحديث حالة طلب المختبر من "${currentStatus}" إلى "${nextStatus}"؟`)
              if (confirmed) {
                try {
                  await window.electronAPI?.labOrders?.update?.(labOrder.id, {
                    ...labOrder,
                    status: nextStatus
                  })

                  toast({
                    title: "✅ تم تحديث الحالة",
                    description: `تم تحديث حالة طلب المختبر إلى "${nextStatus}"`,
                    duration: 3000,
                  })

                  await markAlertAsRead(alert.id)
                  window.dispatchEvent(new CustomEvent('lab-order-updated'))
                } catch (error) {
                  toast({
                    title: "❌ خطأ",
                    description: "حدث خطأ أثناء تحديث حالة المختبر",
                    variant: "destructive",
                  })
                }
              } else {
                await markAlertAsRead(alert.id)
              }
            } else {
              toast({
                title: "🔄 تحديث حالة المختبر",
                description: "يرجى استخدام صفحة طلبات المختبر",
                duration: 3000,
              })
              await markAlertAsRead(alert.id)
            }
          }
          break

        case 'view-prescription':
          if (alert.relatedData?.prescriptionId) {
            // عرض الوصفة
            const prescriptions = await window.electronAPI?.prescriptions?.getAll?.() || []
            const prescription = prescriptions.find(p => p.id === alert.relatedData?.prescriptionId)
            if (prescription) {
              toast({
                title: "💊 عرض الوصفة",
                description: `${prescription.notes || 'وصفة طبية'} - يرجى استخدام صفحة الوصفات لعرض التفاصيل`,
                duration: 4000,
              })
              await markAlertAsRead(alert.id)
            }
          }
          break

        case 'schedule-appointment':
          if (alert.patientId) {
            // حجز موعد جديد
            const patients = await window.electronAPI?.patients?.getAll?.() || []
            const patient = patients.find(p => p.id === alert.patientId)
            if (patient) {
              const confirmed = confirm(`حجز موعد جديد للمريض ${patient.full_name}؟`)
              if (confirmed) {
                try {
                  // إنشاء موعد جديد بتاريخ غداً
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  tomorrow.setHours(9, 0, 0, 0) // 9 صباحاً

                  const newAppointment = {
                    id: `appointment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    patient_id: alert.patientId,
                    title: 'موعد متابعة',
                    description: 'موعد متابعة تم إنشاؤه من الإشعارات',
                    start_time: tomorrow.toISOString(),
                    end_time: new Date(tomorrow.getTime() + 30 * 60000).toISOString(), // 30 دقيقة
                    status: 'scheduled',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }

                  await window.electronAPI?.appointments?.create?.(newAppointment)

                  toast({
                    title: "✅ تم حجز الموعد",
                    description: `تم حجز موعد للمريض ${patient.full_name} غداً في 9:00 صباحاً`,
                    duration: 4000,
                  })

                  await markAlertAsRead(alert.id)
                  window.dispatchEvent(new CustomEvent('appointment-added'))
                } catch (error) {
                  toast({
                    title: "❌ خطأ",
                    description: "حدث خطأ أثناء حجز الموعد",
                    variant: "destructive",
                  })
                }
              } else {
                toast({
                  title: "📅 حجز موعد جديد",
                  description: "يرجى استخدام صفحة المواعيد لحجز موعد",
                  duration: 3000,
                })
                await markAlertAsRead(alert.id)
              }
            }
          }
          break

        default:
          console.log('Unknown action:', action)
      }
    } catch (error) {
      console.error('Error handling action:', error)
      toast({
        title: "❌ خطأ",
        description: "حدث خطأ أثناء تنفيذ العملية",
        variant: "destructive",
      })
    }
  }

  // Render alert actions
  const renderAlertActions = (alert: SmartAlert) => {
    const actions = []

    // Quick actions based on alert type
    switch (alert.type) {
      case 'appointment':
        actions.push(
          <Button
            key="call"
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={(e) => handleActionClick('call', alert, e)}
          >
            <Phone className="w-3 h-3 mr-1" />
            اتصال
          </Button>
        )
        if (alert.relatedData?.appointmentId) {
          actions.push(
            <Button
              key="reschedule"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('reschedule', alert, e)}
            >
              <Calendar className="w-3 h-3 mr-1" />
              إعادة جدولة
            </Button>
          )
        }
        break
      case 'payment':
        actions.push(
          <Button
            key="collect"
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={(e) => handleActionClick('collect', alert, e)}
          >
            <DollarSign className="w-3 h-3 mr-1" />
            تحصيل
          </Button>
        )
        if (alert.relatedData?.paymentId) {
          actions.push(
            <Button
              key="installment"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('installment', alert, e)}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              تقسيط
            </Button>
          )
        }
        break
      case 'treatment':
        actions.push(
          <Button
            key="schedule"
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={(e) => handleActionClick('schedule', alert, e)}
          >
            <Calendar className="w-3 h-3 mr-1" />
            جدولة
          </Button>
        )
        if (alert.patientId) {
          actions.push(
            <Button
              key="view-patient"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('view-patient', alert, e)}
            >
              <User className="w-3 h-3 mr-1" />
              ملف المريض
            </Button>
          )
        }
        break
      case 'inventory':
        actions.push(
          <Button
            key="restock"
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={(e) => handleActionClick('restock', alert, e)}
          >
            <Package className="w-3 h-3 mr-1" />
            تجديد المخزون
          </Button>
        )
        if (alert.relatedData?.inventoryId) {
          actions.push(
            <Button
              key="view-item"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('view-item', alert, e)}
            >
              <Eye className="w-3 h-3 mr-1" />
              عرض العنصر
            </Button>
          )
        }
        break
      case 'lab_order':
        actions.push(
          <Button
            key="contact-lab"
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={(e) => handleActionClick('contact-lab', alert, e)}
          >
            <Phone className="w-3 h-3 mr-1" />
            اتصال بالمختبر
          </Button>
        )
        if (alert.relatedData?.labOrderId) {
          actions.push(
            <Button
              key="update-status"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('update-status', alert, e)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              تحديث الحالة
            </Button>
          )
        }
        break
      case 'prescription':
        if (alert.patientId) {
          actions.push(
            <Button
              key="call-patient"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('call-patient', alert, e)}
            >
              <Phone className="w-3 h-3 mr-1" />
              اتصال بالمريض
            </Button>
          )
        }
        if (alert.relatedData?.prescriptionId) {
          actions.push(
            <Button
              key="view-prescription"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('view-prescription', alert, e)}
            >
              <FileText className="w-3 h-3 mr-1" />
              عرض الوصفة
            </Button>
          )
        }
        break
      case 'follow_up':
        if (alert.patientId) {
          actions.push(
            <Button
              key="schedule-appointment"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('schedule-appointment', alert, e)}
            >
              <Calendar className="w-3 h-3 mr-1" />
              حجز موعد
            </Button>
          )
          actions.push(
            <Button
              key="call-patient"
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={(e) => handleActionClick('call-patient', alert, e)}
            >
              <Phone className="w-3 h-3 mr-1" />
              اتصال
            </Button>
          )
        }
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
                      ? isDarkMode
                        ? 'bg-muted/20 border-muted/50 hover:bg-muted/30'
                        : 'bg-muted/30 border-muted hover:bg-muted/40'
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

                      {/* Quick action buttons - always visible for important alerts */}
                      {alert.actionRequired && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {renderAlertActions(alert).slice(0, 2).map((action, idx) => (
                              <div key={idx}>{action}</div>
                            ))}
                            {renderAlertActions(alert).length > 2 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => toggleExpanded(alert.id)}
                              >
                                <MoreVertical className="w-3 h-3 mr-1" />
                                المزيد ({renderAlertActions(alert).length - 2})
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expanded content */}
                      {expandedAlerts.has(alert.id) && alert.actionRequired && renderAlertActions(alert).length > 2 && (
                        <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-muted/50' : 'border-muted'}`}>
                          <div className="flex flex-wrap gap-2">
                            {renderAlertActions(alert).slice(2)}
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

                {index < visibleAlerts.length - 1 && (
                  <Separator className={`my-2 ${isDarkMode ? 'bg-muted/30' : ''}`} />
                )}
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
