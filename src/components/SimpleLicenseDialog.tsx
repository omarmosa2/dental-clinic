/**
 * Simple License Dialog Component
 * Minimal implementation without complex UI dependencies
 */

import React, { useState, useRef } from 'react'

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      dir="rtl"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-sky-600">🔑 تفعيل الترخيص</h2>

        {/* طرق التفعيل */}
        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setActivationMethod('key')
                setError('')
                setLicensePreview(null)
                setSelectedFile(null)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activationMethod === 'key'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 مفتاح الترخيص
            </button>
            <button
              type="button"
              onClick={() => {
                setActivationMethod('file')
                setError('')
                setLicenseKey('')
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activationMethod === 'file'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📁 ملف الترخيص
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activationMethod === 'key' ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                مفتاح الترخيص
              </label>
              <textarea
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value)
                  setError('')
                }}
                placeholder="الصق مفتاح الترخيص هنا..."
                className="w-full p-3 border rounded-lg resize-none h-32 font-mono text-sm"
                rows={6}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                اختيار ملف الترخيص
              </label>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".key,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-sky-400 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📁</div>
                  <div className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف الترخيص'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    يدعم ملفات .key, .json, .txt
                  </div>
                </button>

                {/* معاينة الترخيص */}
                {licensePreview && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <h4 className="font-medium mb-2">معاينة الترخيص:</h4>
                    <div className="space-y-1 text-xs">
                      <div><strong>المعرف:</strong> {licensePreview.licenseId}</div>
                      <div><strong>النوع:</strong> {licensePreview.licenseType}</div>
                      <div><strong>المدة:</strong> {licensePreview.maxDays} يوم</div>
                      <div><strong>مشفر:</strong> {licensePreview.encrypted ? '✅ نعم' : '❌ لا'}</div>
                      {licensePreview.features && licensePreview.features.length > 0 && (
                        <div><strong>الميزات:</strong> {licensePreview.features.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
              ❌ {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!licenseKey.trim()}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              🔓 تفعيل الترخيص
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
