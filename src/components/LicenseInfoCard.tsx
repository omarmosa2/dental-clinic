/**
 * License Information Card Component
 * Displays license details in Arabic RTL layout
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  Calendar,
  Monitor,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react'
import { LicenseInfo, LicenseStatus } from '../types/license'

interface LicenseInfoCardProps {
  licenseInfo: LicenseInfo | null
  deviceInfo?: {
    deviceId: string
    platform: string
    hostname: string
  }
  onRenewLicense?: () => void
  onContactSupport?: () => void
  onEnterNewLicense?: () => void
  className?: string
}

export default function LicenseInfoCard({
  licenseInfo,
  deviceInfo,
  onRenewLicense,
  onContactSupport,
  onEnterNewLicense,
  className = ''
}: LicenseInfoCardProps) {
  const [realTimeRemaining, setRealTimeRemaining] = useState<string>('')

  // Update real-time countdown every second
  useEffect(() => {
    if (!licenseInfo?.expiresAt) return

    const updateCountdown = () => {
      const now = new Date()
      const expiresAt = new Date(licenseInfo.expiresAt)
      const timeDiff = expiresAt.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setRealTimeRemaining('انتهت الصلاحية')
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      let timeString = ''
      if (days > 0) {
        timeString = `${days} يوم، ${hours} ساعة، ${minutes} دقيقة`
      } else if (hours > 0) {
        timeString = `${hours} ساعة، ${minutes} دقيقة، ${seconds} ثانية`
      } else if (minutes > 0) {
        timeString = `${minutes} دقيقة، ${seconds} ثانية`
      } else {
        timeString = `${seconds} ثانية`
      }

      setRealTimeRemaining(timeString)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [licenseInfo?.expiresAt])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.getMonth()
      const year = date.getFullYear()

      // Gregorian months in Arabic
      const gregorianMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ]

      // Arabic-Indic numerals
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
      const toArabicNumerals = (num: number): string => {
        return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('')
      }

      const arabicDay = toArabicNumerals(day)
      const arabicYear = toArabicNumerals(year)
      const monthName = gregorianMonths[month]

      return `${arabicDay} ${monthName} ${arabicYear}م`
    } catch {
      return dateString
    }
  }

  const formatLicenseType = (type: string) => {
    const types: { [key: string]: string } = {
      trial: 'تجريبي',
      standard: 'قياسي',
      premium: 'مميز',
      enterprise: 'مؤسسي'
    }
    return types[type] || type
  }

  const getStatusIcon = (status: LicenseStatus) => {
    switch (status) {
      case LicenseStatus.VALID:
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case LicenseStatus.EXPIRED:
        return <XCircle className="w-5 h-5 text-red-500" />
      case LicenseStatus.NOT_ACTIVATED:
        return <Clock className="w-5 h-5 text-gray-500" />
      case LicenseStatus.DEVICE_MISMATCH:
        return <Monitor className="w-5 h-5 text-red-500" />
      case LicenseStatus.TAMPERED:
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case LicenseStatus.VALID:
        return 'bg-green-100 text-green-800 border-green-200'
      case LicenseStatus.EXPIRED:
        return 'bg-red-100 text-red-800 border-red-200'
      case LicenseStatus.NOT_ACTIVATED:
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case LicenseStatus.DEVICE_MISMATCH:
        return 'bg-red-100 text-red-800 border-red-200'
      case LicenseStatus.TAMPERED:
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getStatusText = (status: LicenseStatus) => {
    switch (status) {
      case LicenseStatus.VALID:
        return 'صالح'
      case LicenseStatus.EXPIRED:
        return 'منتهي الصلاحية'
      case LicenseStatus.NOT_ACTIVATED:
        return 'غير مفعل'
      case LicenseStatus.DEVICE_MISMATCH:
        return 'جهاز غير مطابق'
      case LicenseStatus.TAMPERED:
        return 'تم العبث'
      default:
        return 'غير صالح'
    }
  }

  if (!licenseInfo) {
    return (
      <Card className={`${className}`} dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sky-600">
            <Shield className="w-5 h-5" />
            معلومات الترخيص
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              لا توجد معلومات ترخيص متاحة. يرجى تفعيل الترخيص أولاً.
            </AlertDescription>
          </Alert>
          {onEnterNewLicense && (
            <div className="mt-4">
              <Button onClick={onEnterNewLicense} className="bg-sky-600 hover:bg-sky-700">
                <Key className="w-4 h-4 ml-2" />
                إدخال ترخيص جديد
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className}`} dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sky-600">
          <Shield className="w-5 h-5" />
          معلومات الترخيص
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(licenseInfo.status)}
            <span className="font-medium">حالة الترخيص</span>
          </div>
          <Badge className={getStatusColor(licenseInfo.status)}>
            {getStatusText(licenseInfo.status)}
          </Badge>
        </div>

        {/* License Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">نوع الترخيص</div>
            <div className="font-medium">{formatLicenseType(licenseInfo.licenseType)}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">معرف الترخيص</div>
            <div className="font-mono text-sm">{licenseInfo.licenseId}</div>
          </div>

          {licenseInfo.activatedAt && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">تاريخ التفعيل</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(licenseInfo.activatedAt)}</span>
              </div>
            </div>
          )}

          {licenseInfo.expiresAt && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">تاريخ الانتهاء</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formatDate(licenseInfo.expiresAt)}</span>
              </div>
            </div>
          )}

          {licenseInfo.remainingDays !== undefined && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">الأيام المتبقية</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={licenseInfo.remainingDays <= 7 ? 'text-orange-600 font-medium' : ''}>
                  {licenseInfo.remainingDays > 0 ? `${licenseInfo.remainingDays} يوم` : 'منتهي'}
                </span>
              </div>
            </div>
          )}

          {/* Real-time countdown */}
          {realTimeRemaining && licenseInfo.status === LicenseStatus.VALID && (
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm text-muted-foreground">الوقت المتبقي (مباشر)</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary animate-pulse" />
                <span className={`font-mono text-lg ${
                  realTimeRemaining === 'انتهت الصلاحية'
                    ? 'text-red-600 font-bold'
                    : realTimeRemaining.includes('دقيقة') && !realTimeRemaining.includes('يوم') && !realTimeRemaining.includes('ساعة')
                    ? 'text-orange-600 font-medium'
                    : 'text-primary'
                }`}>
                  {realTimeRemaining}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">معرف الجهاز</div>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm">{licenseInfo.deviceId}</span>
            </div>
          </div>
        </div>

        {/* Features */}
        {licenseInfo.features && licenseInfo.features.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">الميزات المتاحة</div>
            <div className="flex flex-wrap gap-2">
              {licenseInfo.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning for expiring license */}
        {licenseInfo.isExpiringSoon && licenseInfo.status === LicenseStatus.VALID && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              تحذير: ينتهي الترخيص خلال {licenseInfo.remainingDays} أيام.
              يرجى تجديد الترخيص لتجنب انقطاع الخدمة.
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {licenseInfo.errorMessage && licenseInfo.status !== LicenseStatus.VALID && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>{licenseInfo.errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          {licenseInfo.status === LicenseStatus.EXPIRED && onRenewLicense && (
            <Button onClick={onRenewLicense} className="bg-sky-600 hover:bg-sky-700">
              <Key className="w-4 h-4 ml-2" />
              تجديد الترخيص
            </Button>
          )}

          {licenseInfo.status === LicenseStatus.NOT_ACTIVATED && onEnterNewLicense && (
            <Button onClick={onEnterNewLicense} className="bg-sky-600 hover:bg-sky-700">
              <Key className="w-4 h-4 ml-2" />
              تفعيل الترخيص
            </Button>
          )}

          {(licenseInfo.status === LicenseStatus.DEVICE_MISMATCH ||
            licenseInfo.status === LicenseStatus.TAMPERED) && onContactSupport && (
            <Button onClick={onContactSupport} variant="outline">
              اتصل بالدعم الفني
            </Button>
          )}

          {licenseInfo.isExpiringSoon && onRenewLicense && (
            <Button onClick={onRenewLicense} variant="outline">
              تجديد الترخيص
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
