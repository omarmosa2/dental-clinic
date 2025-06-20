import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface RealTimeIndicatorProps {
  isActive?: boolean
  lastUpdate?: Date
  className?: string
}

export default function RealTimeIndicator({ 
  isActive = true, 
  lastUpdate,
  className = '' 
}: RealTimeIndicatorProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Listen for data change events to show updating indicator
    const handleDataChange = () => {
      setIsUpdating(true)
      setTimeout(() => setIsUpdating(false), 1000) // Show for 1 second
    }

    const events = [
      'patient-added', 'patient-updated', 'patient-deleted', 'patient-changed',
      'appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed',
      'payment-added', 'payment-updated', 'payment-deleted', 'payment-changed',
      'inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed'
    ]

    events.forEach(event => {
      window.addEventListener(event, handleDataChange)
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDataChange)
      })
    }
  }, [])

  const formatLastUpdate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) {
      return 'الآن'
    } else if (minutes < 60) {
      return `منذ ${minutes} دقيقة`
    } else if (hours < 24) {
      return `منذ ${hours} ساعة`
    } else {
      return date.toLocaleDateString('ar-SA')
    }
  }

  if (!isActive) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <WifiOff className="w-3 h-3" />
        <span className="text-xs">غير متصل</span>
      </Badge>
    )
  }

  return (
    <Badge 
      variant={isUpdating ? "default" : "secondary"} 
      className={`flex items-center gap-1 ${className} ${
        isUpdating ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800'
      }`}
    >
      {isUpdating ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="text-xs">يتم التحديث...</span>
        </>
      ) : (
        <>
          <Wifi className="w-3 h-3" />
          <span className="text-xs">
            {lastUpdate ? formatLastUpdate(lastUpdate) : 'متصل'}
          </span>
        </>
      )}
    </Badge>
  )
}
