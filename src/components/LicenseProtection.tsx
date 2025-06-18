/**
 * License Protection Component
 * Blocks application access when license is invalid, expired, or missing
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  AlertTriangle,
  XCircle,
  Key,
  Clock,
  RefreshCw
} from 'lucide-react'
import { LicenseInfo, LicenseStatus } from '../types/license'
import LicenseActivationDialog from './LicenseActivationDialog'
import { licenseGuard } from '../services/licenseGuard'
import { LicenseActivationResponse } from '../types/license'
import { formatGregorianDate } from '../lib/utils'
import { useLicenseStore } from '../store/licenseStore'

interface LicenseProtectionProps {
  children: React.ReactNode
  licenseInfo: LicenseInfo | null
  onLicenseUpdate: () => void
  isLoading?: boolean
}

export default function LicenseProtection({
  children,
  licenseInfo,
  onLicenseUpdate,
  isLoading = false
}: LicenseProtectionProps) {
  const [showActivationDialog, setShowActivationDialog] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [realTimeRemaining, setRealTimeRemaining] = useState<string>('')

  // Get real-time license state from store
  const { canUseApp: storeCanUseApp, licenseInfo: storeLicenseInfo, checkLicenseStatus } = useLicenseStore()

  // Use store data if available, fallback to props
  const currentLicenseInfo = storeLicenseInfo || licenseInfo
  const currentCanUseApp = storeCanUseApp

  // Real-time license monitoring - check every 10 seconds (reduced frequency)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only check if dialog is not open to prevent interference
      if (!showActivationDialog) {
        await checkLicenseStatus()
      }
    }, 10000) // Changed from 1000ms to 10000ms

    return () => clearInterval(interval)
  }, [checkLicenseStatus, showActivationDialog])

  // Real-time countdown for expiring licenses
  useEffect(() => {
    if (!currentLicenseInfo?.expiresAt || currentLicenseInfo.status !== LicenseStatus.VALID) {
      setRealTimeRemaining('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const expiresAt = new Date(currentLicenseInfo.expiresAt)
      const timeDiff = expiresAt.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setRealTimeRemaining('انتهت الصلاحية')
        // Don't trigger automatic updates to prevent reload loops
        // onLicenseUpdate will be called manually when needed
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      if (days > 0) {
        setRealTimeRemaining(`${days} يوم، ${hours} ساعة، ${minutes} دقيقة`)
      } else if (hours > 0) {
        setRealTimeRemaining(`${hours} ساعة، ${minutes} دقيقة، ${seconds} ثانية`)
      } else if (minutes > 0) {
        setRealTimeRemaining(`${minutes} دقيقة، ${seconds} ثانية`)
      } else {
        setRealTimeRemaining(`${seconds} ثانية`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [currentLicenseInfo?.expiresAt, currentLicenseInfo?.status, onLicenseUpdate])

  const handleRefreshLicense = async () => {
    setIsChecking(true)
    try {
      await onLicenseUpdate()
    } finally {
      setIsChecking(false)
    }
  }

  const handleActivationSuccess = (response: LicenseActivationResponse) => {
    setShowActivationDialog(false)
    onLicenseUpdate()
  }

  const handleActivationError = (error: string) => {
    console.error('License activation error:', error)
  }

  // Show loading screen while checking license
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-foreground">جاري فحص الترخيص...</p>
            <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if license allows app usage - NO GRACE PERIOD
  // Use store state for real-time updates
  const canUseApp = currentCanUseApp && currentLicenseInfo && currentLicenseInfo.status === LicenseStatus.VALID

  // If license is valid, render the app
  if (canUseApp) {
    return <>{children}</>
  }

  // Get appropriate message and icon based on license status
  const getProtectionContent = () => {
    if (!currentLicenseInfo) {
      return {
        icon: <Shield className="w-16 h-16 text-red-500" />,
        title: 'الترخيص مطلوب',
        message: 'يجب تفعيل ترخيص صالح لاستخدام هذا التطبيق.',
        showActivation: true,
        variant: 'destructive' as const
      }
    }

    switch (currentLicenseInfo.status) {
      case LicenseStatus.NOT_ACTIVATED:
        return {
          icon: <Shield className="w-16 h-16 text-red-500" />,
          title: 'الترخيص غير مفعل',
          message: 'لا يوجد ترخيص مفعل حالياً. يجب تفعيل ترخيص صالح لاستخدام التطبيق.',
          showActivation: true,
          variant: 'destructive' as const
        }

      case LicenseStatus.EXPIRED:
        return {
          icon: <Clock className="w-16 h-16 text-red-500" />,
          title: 'انتهت صلاحية الترخيص',
          message: `انتهت صلاحية الترخيص في ${formatGregorianDate(currentLicenseInfo.expiresAt)}. يرجى تجديد الترخيص للمتابعة.`,
          showActivation: true,
          variant: 'destructive' as const
        }

      case LicenseStatus.INVALID:
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'ترخيص غير صالح',
          message: 'الترخيص الحالي غير صالح أو تالف. يرجى تفعيل ترخيص جديد.',
          showActivation: true,
          variant: 'destructive' as const
        }

      case LicenseStatus.DEVICE_MISMATCH:
        return {
          icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
          title: 'عدم تطابق الجهاز',
          message: 'هذا الترخيص مفعل على جهاز آخر. يرجى استخدام ترخيص مخصص لهذا الجهاز.',
          showActivation: true,
          variant: 'destructive' as const
        }

      case LicenseStatus.TAMPERED:
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'ترخيص معدل',
          message: 'تم اكتشاف تعديل في ملف الترخيص. يرجى تفعيل ترخيص جديد.',
          showActivation: true,
          variant: 'destructive' as const
        }

      default:
        return {
          icon: <Shield className="w-16 h-16 text-red-500" />,
          title: 'مشكلة في الترخيص',
          message: 'حدثت مشكلة في التحقق من الترخيص. يرجى المحاولة مرة أخرى.',
          showActivation: true,
          variant: 'destructive' as const
        }
    }
  }

  const content = getProtectionContent()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {content.icon}
          </div>
          <CardTitle className="text-xl text-foreground">{content.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={content.variant}>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{content.message}</AlertDescription>
          </Alert>

          {/* Real-time countdown for expired licenses */}
          {currentLicenseInfo?.status === LicenseStatus.EXPIRED && realTimeRemaining && (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                انتهت الصلاحية منذ: {realTimeRemaining}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            {content.showActivation && (
              <Button
                onClick={() => {
                  console.log('Activation button clicked, opening dialog')
                  setShowActivationDialog(true)
                }}
                className="w-full bg-sky-600 hover:bg-sky-700"
              >
                <Key className="w-4 h-4 ml-2" />
                تفعيل ترخيص جديد
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleRefreshLicense}
              disabled={isChecking}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'جاري التحقق...' : 'إعادة فحص الترخيص'}
            </Button>
          </div>

          {currentLicenseInfo && (
            <div className="text-center text-sm text-muted-foreground">
              <p>معرف الترخيص: {currentLicenseInfo.licenseId}</p>
              {currentLicenseInfo.expiresAt && (
                <p>تاريخ الانتهاء: {formatGregorianDate(currentLicenseInfo.expiresAt)}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LicenseActivationDialog
        isOpen={showActivationDialog}
        onClose={() => {
          console.log('Closing activation dialog')
          setShowActivationDialog(false)
        }}
        onActivationSuccess={handleActivationSuccess}
        onActivationError={handleActivationError}
      />
    </div>
  )
}
