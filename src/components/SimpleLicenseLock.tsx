/**
 * Simple License Lock Screen Component
 * Minimal implementation without complex UI dependencies
 */

import React, { useState } from 'react'
import SimpleLicenseDialog from './SimpleLicenseDialog'

interface SimpleLicenseLockProps {
  error?: string
  onActivate: (licenseKey: string) => void
}

export default function SimpleLicenseLock({
  error,
  onActivate
}: SimpleLicenseLockProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
          {/* Lock Icon */}
          <div className="text-6xl mb-4">🔒</div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            نظام إدارة العيادة مقفل
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            يتطلب ترخيص صالح للوصول إلى النظام
          </p>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}
          
          {/* Status Message */}
          <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-lg mb-6 text-sm">
            الترخيص غير مفعل أو منتهي الصلاحية
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => setShowDialog(true)}
            className="w-full bg-sky-600 text-white py-3 px-6 rounded-lg hover:bg-sky-700 transition-colors font-medium"
          >
            🔑 تفعيل الترخيص
          </button>
          
          {/* Help Text */}
          <p className="text-sm text-gray-500 mt-4">
            إذا كنت تواجه مشاكل في الترخيص، يرجى التواصل مع الدعم الفني
          </p>
        </div>
      </div>
      
      {/* License Activation Dialog */}
      <SimpleLicenseDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onActivate={(licenseKey) => {
          setShowDialog(false)
          onActivate(licenseKey)
        }}
      />
    </div>
  )
}
