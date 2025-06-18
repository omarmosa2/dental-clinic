/**
 * License Lock Screen Component
 * Prevents app access when license is invalid/expired
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  Lock,
  AlertTriangle,
  Key,
  RefreshCw,
  XCircle,
  Clock,
  Monitor
} from 'lucide-react'
import { LicenseStatus, LicenseInfo } from '../types/license'
import LicenseActivationDialog from './LicenseActivationDialog'
import { licenseGuard } from '../services/licenseGuard'
import { licenseActivationService } from '../services/licenseActivationService'
import { formatGregorianDate } from '../lib/utils'

interface LicenseLockScreenProps {
  licenseStatus: LicenseStatus
  licenseInfo?: LicenseInfo | null
  error?: string
  onLicenseActivated?: () => void
  onRetry?: () => void
}

export default function LicenseLockScreen({
  licenseStatus,
  licenseInfo,
  error,
  onLicenseActivated,
  onRetry
}: LicenseLockScreenProps) {
  const [showActivationDialog, setShowActivationDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  useEffect(() => {
    loadDeviceInfo()
  }, [])

  const loadDeviceInfo = async () => {
    try {
      const info = await licenseActivationService.getCurrentDeviceInfo()
      setDeviceInfo(info)
    } catch (error) {
      console.error('Failed to load device info:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await licenseGuard.refreshValidation()
      if (onRetry) {
        onRetry()
      }
    } catch (error) {
      console.error('Failed to refresh license:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleActivationSuccess = () => {
    setShowActivationDialog(false)
    if (onLicenseActivated) {
      onLicenseActivated()
    }
  }

  const handleActivationError = (error: string) => {
    console.error('License activation failed:', error)
  }

  const getStatusIcon = () => {
    switch (licenseStatus) {
      case LicenseStatus.EXPIRED:
        return <Clock className="w-16 h-16 text-red-500" />
      case LicenseStatus.NOT_ACTIVATED:
        return <Key className="w-16 h-16 text-gray-500" />
      case LicenseStatus.DEVICE_MISMATCH:
        return <Monitor className="w-16 h-16 text-red-500" />
      case LicenseStatus.TAMPERED:
        return <AlertTriangle className="w-16 h-16 text-red-500" />
      default:
        return <XCircle className="w-16 h-16 text-red-500" />
    }
  }

  const getStatusTitle = () => {
    switch (licenseStatus) {
      case LicenseStatus.EXPIRED:
        return 'انتهت صلاحية الترخيص'
      case LicenseStatus.NOT_ACTIVATED:
        return 'الترخيص غير مفعل'
      case LicenseStatus.DEVICE_MISMATCH:
        return 'الترخيص مرتبط بجهاز آخر'
      case LicenseStatus.TAMPERED:
        return 'تم اكتشاف عبث في الترخيص'
      default:
        return 'الترخيص غير صالح'
    }
  }

  const getStatusMessage = () => {
    switch (licenseStatus) {
      case LicenseStatus.EXPIRED:
        return 'انتهت صلاحية ترخيص نظام إدارة العيادة. يرجى تجديد الترخيص للمتابعة.'
      case LicenseStatus.NOT_ACTIVATED:
        return 'يتطلب تفعيل ترخيص النظام قبل البدء في الاستخدام.'
      case LicenseStatus.DEVICE_MISMATCH:
        return 'هذا الترخيص مرتبط بجهاز آخر ولا يمكن استخدامه على هذا الجهاز.'
      case LicenseStatus.TAMPERED:
        return 'تم اكتشاف عبث في ملف الترخيص. يرجى الحصول على ترخيص جديد.'
      default:
        return 'الترخيص غير صالح أو تالف. يرجى التحقق من صحة الترخيص.'
    }
  }

  const canActivateNewLicense = () => {
    return licenseStatus === LicenseStatus.NOT_ACTIVATED ||
           licenseStatus === LicenseStatus.EXPIRED ||
           licenseStatus === LicenseStatus.INVALID
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-50 rounded-full">
                <Lock className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              نظام إدارة العيادة مقفل
            </CardTitle>
            <p className="text-muted-foreground">
              يتطلب ترخيص صالح للوصول إلى النظام
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Display */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {getStatusTitle()}
                </h3>
                <p className="text-muted-foreground">
                  {getStatusMessage()}
                </p>
              </div>
            </div>

            {/* License Information */}
            {licenseInfo && (
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2 text-sm">
                    <div><strong>معرف الترخيص:</strong> {licenseInfo.licenseId}</div>
                    <div><strong>نوع الترخيص:</strong> {licenseInfo.licenseType}</div>
                    {licenseInfo.expiresAt && (
                      <div><strong>تاريخ الانتهاء:</strong> {formatGregorianDate(licenseInfo.expiresAt)}</div>
                    )}
                    {licenseInfo.remainingDays !== undefined && licenseInfo.remainingDays < 0 && (
                      <div><strong>انتهى منذ:</strong> {Math.abs(licenseInfo.remainingDays)} يوم</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Device Information */}
            {deviceInfo && (
              <Alert>
                <Monitor className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div><strong>معرف الجهاز:</strong> {deviceInfo.deviceId}</div>
                    <div><strong>النظام:</strong> {deviceInfo.platform}</div>
                    <div><strong>اسم الجهاز:</strong> {deviceInfo.hostname}</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {canActivateNewLicense() && (
                <Button
                  onClick={() => setShowActivationDialog(true)}
                  className="flex-1 bg-sky-600 hover:bg-sky-700"
                  size="lg"
                >
                  <Key className="w-5 h-5 ml-2" />
                  {licenseStatus === LicenseStatus.NOT_ACTIVATED ? 'تفعيل الترخيص' : 'إدخال ترخيص جديد'}
                </Button>
              )}

              <Button
                onClick={handleRefresh}
                variant="outline"
                size="lg"
                disabled={isRefreshing}
                className="flex-1"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-5 h-5 ml-2 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 ml-2" />
                    إعادة التحقق
                  </>
                )}
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p>
                إذا كنت تواجه مشاكل في الترخيص، يرجى التواصل مع الدعم الفني
              </p>
            </div>
          </CardContent>
        </Card>

        {/* License Activation Dialog */}
        <LicenseActivationDialog
          isOpen={showActivationDialog}
          onClose={() => setShowActivationDialog(false)}
          onActivationSuccess={handleActivationSuccess}
          onActivationError={handleActivationError}
        />
      </div>
    </div>
  )
}
