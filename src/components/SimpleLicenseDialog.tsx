/**
 * Simple License Dialog Component
 * Minimal implementation without complex UI dependencies
 */

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, Key, FileText } from 'lucide-react'

interface SimpleLicenseDialogProps {
  isOpen: boolean
  onClose: () => void
  onActivate: (licenseKey: string) => void
}

export default function SimpleLicenseDialog({
  isOpen,
  onClose,
  onActivate
}: SimpleLicenseDialogProps) {
  const [licenseKey, setLicenseKey] = useState('')
  const [error, setError] = useState('')
  const [activationMethod, setActivationMethod] = useState<'key' | 'file'>('key')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [licensePreview, setLicensePreview] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setSelectedFile(file)

      // محاولة تحليل ومعاينة الترخيص
      try {
        let licenseData

        if (text.startsWith('{')) {
          // JSON مباشر
          licenseData = JSON.parse(text)
        } else {
          // محاولة فك تشفير base64
          const decoded = atob(text)
          const parsedDecoded = JSON.parse(decoded)

          // التحقق من التنسيق الجديد المشفر
          if (parsedDecoded.version === '2.0' && parsedDecoded.type === 'encrypted') {
            licenseData = {
              licenseId: 'مشفر',
              licenseType: 'مشفر',
              maxDays: 'مشفر',
              features: ['مشفر'],
              encrypted: true
            }
          } else {
            licenseData = parsedDecoded
          }
        }

        setLicensePreview({
          licenseId: licenseData.licenseId || 'غير محدد',
          licenseType: licenseData.licenseType || 'قياسي',
          maxDays: licenseData.maxDays || 0,
          features: licenseData.features || [],
          encrypted: licenseData.encrypted || false
        })

        setLicenseKey(text)
        setError('')
      } catch (parseError) {
        setError('ملف الترخيص غير صالح أو تالف')
        setLicensePreview(null)
      }
    } catch (fileError) {
      setError('فشل في قراءة الملف')
      setSelectedFile(null)
      setLicensePreview(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim()) {
      setError('يرجى إدخال مفتاح الترخيص أو اختيار ملف')
      return
    }
    onActivate(licenseKey)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-bold">
            <Key className="w-5 h-5 ml-2" />
            تفعيل الترخيص
          </DialogTitle>
          <DialogDescription>
            اختر طريقة التفعيل المناسبة لك
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activationMethod} onValueChange={(value: 'key' | 'file') => {
          setActivationMethod(value)
          setError('')
          if (value === 'key') {
            setLicensePreview(null)
            setSelectedFile(null)
          } else {
            setLicenseKey('')
          }
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="key" className="flex items-center">
              <FileText className="w-4 h-4 ml-1" />
              مفتاح الترخيص
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center">
              <Upload className="w-4 h-4 ml-1" />
              ملف الترخيص
            </TabsTrigger>
          </TabsList>

          <TabsContent value="key" className="space-y-4">
            <div className="space-y-2">
              <Label>مفتاح الترخيص</Label>
              <Textarea
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value)
                  setError('')
                }}
                placeholder="الصق مفتاح الترخيص هنا..."
                className="resize-none h-32 font-mono text-sm"
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label>اختيار ملف الترخيص</Label>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".key,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-auto p-4 border-2 border-dashed"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm">
                      {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف الترخيص'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      يدعم ملفات .key, .json, .txt
                    </div>
                  </div>
                </Button>

                {/* معاينة الترخيص */}
                {licensePreview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">معاينة الترخيص</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المعرف:</span>
                        <span>{licensePreview.licenseId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">النوع:</span>
                        <span>{licensePreview.licenseType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المدة:</span>
                        <span>{licensePreview.maxDays} يوم</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">مشفر:</span>
                        <Badge variant={licensePreview.encrypted ? "default" : "secondary"}>
                          {licensePreview.encrypted ? 'نعم' : 'لا'}
                        </Badge>
                      </div>
                      {licensePreview.features && licensePreview.features.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">الميزات:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {licensePreview.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={!licenseKey.trim()}
            onClick={handleSubmit}
          >
            <Key className="w-4 h-4 ml-1" />
            تفعيل الترخيص
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
