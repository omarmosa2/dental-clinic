/**
 * License Activation Dialog Component
 * Arabic RTL interface for license activation
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Key,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Shield,
  Monitor
} from 'lucide-react'
import { licenseActivationService } from '../services/licenseActivationService'
import { LicenseActivationResponse } from '../types/license'

interface LicenseActivationDialogProps {
  isOpen: boolean
  onClose: () => void
  onActivationSuccess: (response: LicenseActivationResponse) => void
  onActivationError: (error: string) => void
}

export default function LicenseActivationDialog({
  isOpen,
  onClose,
  onActivationSuccess,
  onActivationError
}: LicenseActivationDialogProps) {
  const [activeTab, setActiveTab] = useState('key')
  const [licenseKey, setLicenseKey] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [licensePreview, setLicensePreview] = useState<any>(null)

  // Load device info on mount and reset state
  useEffect(() => {
    if (isOpen) {
      console.log('LicenseActivationDialog opened')
      loadDeviceInfo()
      // Reset state when dialog opens
      setError(null)
      setLicensePreview(null)
      setIsActivating(false)
    }
  }, [isOpen])

  // Preview license when key changes
  useEffect(() => {
    if (licenseKey.trim()) {
      const validation = licenseActivationService.validateLicenseKeyFormat(licenseKey)
      if (validation.isValid) {
        const info = licenseActivationService.getLicenseInfoFromKey(licenseKey)
        setLicensePreview(info)
        setError(null)
      } else {
        setLicensePreview(null)
        setError(validation.error || null)
      }
    } else {
      setLicensePreview(null)
      setError(null)
    }
  }, [licenseKey])

  const loadDeviceInfo = async () => {
    try {
      const info = await licenseActivationService.getCurrentDeviceInfo()
      setDeviceInfo(info)
    } catch (error) {
      console.error('Failed to load device info:', error)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      try {
        const content = await file.text()
        const trimmedContent = content.trim()
        setLicenseKey(trimmedContent)
        console.log('License file loaded:', trimmedContent.substring(0, 50) + '...')
        setActiveTab('key') // Switch to key tab to show preview
      } catch (error) {
        console.error('Error reading license file:', error)
        setError(`فشل في قراءة الملف: ${error}`)
      }
    }
  }

  const handleActivation = async () => {
    if (!licenseKey.trim()) {
      setError('يرجى إدخال مفتاح الترخيص')
      return
    }

    setIsActivating(true)
    setError(null)

    try {
      const response = await licenseActivationService.activateLicenseFromKey(licenseKey)

      if (response.success) {
        onActivationSuccess(response)
        onClose()
      } else {
        setError(response.error || 'فشل في تفعيل الترخيص')
        onActivationError(response.error || 'فشل في تفعيل الترخيص')
      }
    } catch (error) {
      const errorMessage = `خطأ في التفعيل: ${error}`
      setError(errorMessage)
      onActivationError(errorMessage)
    } finally {
      setIsActivating(false)
    }
  }

  const handleClose = () => {
    if (!isActivating) {
      setLicenseKey('')
      setSelectedFile(null)
      setError(null)
      setLicensePreview(null)
      onClose()
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-sky-600">
            <Shield className="w-6 h-6" />
            تفعيل ترخيص النظام
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            قم بتفعيل ترخيص نظام إدارة العيادة لبدء الاستخدام
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* License Input Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="key" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                مفتاح الترخيص
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                ملف الترخيص
              </TabsTrigger>
            </TabsList>

            <TabsContent value="key" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">مفتاح الترخيص</Label>
                <Textarea
                  id="license-key"
                  placeholder="الصق مفتاح الترخيص هنا..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                  disabled={isActivating}
                />
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-file">اختر ملف الترخيص</Label>
                <Input
                  id="license-file"
                  type="file"
                  accept=".key,.json,.txt"
                  onChange={handleFileSelect}
                  disabled={isActivating}
                />
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    الملف المحدد: {selectedFile.name}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* License Preview */}
          {licensePreview && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">معاينة الترخيص:</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>النوع:</strong> {formatLicenseType(licensePreview.licenseType)}
                    </div>
                    <div>
                      <strong>المدة:</strong> {licensePreview.validityDays} يوم
                    </div>
                    <div className="col-span-2">
                      <strong>معرف الترخيص:</strong> {licensePreview.licenseId}
                    </div>
                    {licensePreview.features && licensePreview.features.length > 0 && (
                      <div className="col-span-2">
                        <strong>الميزات:</strong> {licensePreview.features.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isActivating}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleActivation}
              disabled={!licenseKey.trim() || isActivating}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تفعيل الترخيص
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
