import React, { useState, useEffect } from 'react'
import { Key, Shield, AlertCircle, CheckCircle, Moon, Sun, Loader2, Info } from 'lucide-react'
import { useTheme, useThemeClasses } from '../../contexts/ThemeContext'

interface LicenseEntryScreenProps {
  onActivate: (licenseKey: string) => Promise<{ success: boolean; error?: string }>
  isLoading?: boolean
  machineInfo?: {
    hwid: string
    platform: string
    arch: string
  }
}

export default function LicenseEntryScreen({
  onActivate,
  isLoading = false,
  machineInfo
}: LicenseEntryScreenProps) {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const themeClasses = useThemeClasses()

  const [licenseKey, setLicenseKey] = useState('')
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [showMachineInfo, setShowMachineInfo] = useState(false)

  // Format license key as user types (XXXXX-XXXXX-XXXXX-XXXXX)
  const formatLicenseKey = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()

    // Split into groups of 5 characters
    const groups = []
    for (let i = 0; i < cleaned.length; i += 5) {
      groups.push(cleaned.slice(i, i + 5))
    }

    // Join with hyphens, limit to 4 groups (20 characters total)
    return groups.slice(0, 4).join('-')
  }

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value)
    setLicenseKey(formatted)
    setError('') // Clear error when user types
  }

  const validateLicenseFormat = (key: string) => {
    const regex = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
    return regex.test(key)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!licenseKey.trim()) {
      setError('يرجى إدخال مفتاح الترخيص')
      return
    }

    if (!validateLicenseFormat(licenseKey)) {
      setError('تنسيق مفتاح الترخيص غير صحيح. يجب أن يكون بالشكل: XXXXX-XXXXX-XXXXX-XXXXX')
      return
    }

    setError('')
    setIsValidating(true)

    try {
      const result = await onActivate(licenseKey)

      if (!result.success) {
        setError(result.error || 'فشل في تفعيل الترخيص')
      }
    } catch (error) {
      setError('حدث خطأ أثناء تفعيل الترخيص')
      console.error('License activation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const isFormValid = validateLicenseFormat(licenseKey)
  const isSubmitDisabled = isLoading || isValidating || !isFormValid

  return (
    <div className="min-h-screen login-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-accent/5 via-transparent to-primary/3"></div>

      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/8 to-secondary/4 rounded-full login-floating-orb"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-secondary/8 to-accent/4 rounded-full login-floating-orb" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-accent/8 to-primary/4 rounded-full login-floating-orb" style={{animationDelay: '4s'}}></div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-6 right-6 p-4 rounded-full ${themeClasses.card} backdrop-blur-md hover:scale-110 hover:rotate-12 transition-all duration-300 z-20 shadow-lg hover:shadow-xl border border-border/30`}
        title={isDarkMode ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع المظلم'}
      >
        {isDarkMode ? (
          <Sun className="w-6 h-6 text-yellow-400 drop-shadow-sm transition-transform duration-300" />
        ) : (
          <Moon className="w-6 h-6 text-primary drop-shadow-sm transition-transform duration-300" />
        )}
      </button>

      {/* Machine Info Toggle */}
      {machineInfo && (
        <button
          onClick={() => setShowMachineInfo(!showMachineInfo)}
          className={`absolute top-6 left-6 p-4 rounded-full ${themeClasses.card} backdrop-blur-md hover:scale-110 transition-all duration-300 z-20 shadow-lg hover:shadow-xl border border-border/30`}
          title="معلومات الجهاز"
        >
          <Info className="w-6 h-6 text-primary drop-shadow-sm transition-transform duration-300" />
        </button>
      )}

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary/20 via-primary/15 to-secondary/20 rounded-full flex items-center justify-center mb-8 shadow-2xl backdrop-blur-sm border border-primary/20 hover:scale-105 hover:shadow-3xl transition-all duration-500 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-full animate-pulse"></div>
            <Key className="w-16 h-16 text-primary drop-shadow-lg relative z-10" />
          </div>
          <h1 className={`text-5xl font-bold ${themeClasses.textPrimary} arabic-enhanced mb-4 drop-shadow-lg`}>
            تفعيل الترخيص
          </h1>
          <p className={`${themeClasses.textSecondary} arabic-enhanced text-xl font-medium opacity-90 mb-2`}>
            يرجى إدخال مفتاح الترخيص لتفعيل النظام
          </p>
          <p className={`${themeClasses.textSecondary} arabic-enhanced text-base opacity-75`}>
            التنسيق المطلوب: XXXXX-XXXXX-XXXXX-XXXXX
          </p>
        </div>

        {/* License Entry Form */}
        <div className={`${themeClasses.card} backdrop-blur-xl rounded-3xl p-10 login-card-glow hover:scale-[1.02] transition-all duration-500 border border-border/50 relative overflow-hidden`}>
          {/* Card Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-3xl"></div>
          <div className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
              {/* License Key Input */}
              <div className="space-y-3">
                <label htmlFor="licenseKey" className={`block text-lg font-semibold ${themeClasses.textPrimary} arabic-enhanced`}>
                  مفتاح الترخيص
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <Key className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    id="licenseKey"
                    value={licenseKey}
                    onChange={handleLicenseKeyChange}
                    disabled={isLoading || isValidating}
                    className={`w-full pr-14 pl-4 py-4 border-2 ${themeClasses.input} rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg backdrop-blur-sm font-mono tracking-wider text-center`}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                    maxLength={23} // 20 characters + 3 hyphens
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {isFormValid && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                </div>
                <p className={`text-sm ${themeClasses.textSecondary} arabic-enhanced`}>
                  أدخل مفتاح الترخيص المكون من 20 حرف وأرقام مقسمة إلى 4 مجموعات
                </p>
              </div>

              {/* Device ID Display */}
              {machineInfo && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-medium ${themeClasses.textSecondary} arabic-enhanced`}>
                      معرف الجهاز (أرسله للمطور)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (machineInfo.hwid) {
                          navigator.clipboard.writeText(machineInfo.hwid)
                          // يمكن إضافة toast notification هنا
                        }
                      }}
                      className={`text-xs px-3 py-1 rounded-md ${themeClasses.button} hover:opacity-80 transition-opacity`}
                      title="انقر للنسخ"
                    >
                      📋 نسخ
                    </button>
                  </div>
                  <div className={`p-4 ${themeClasses.cardSecondary} rounded-lg border border-border/50 bg-muted/30`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-primary arabic-enhanced">معرف جهازك الفريد</span>
                    </div>
                    <code className="text-sm font-mono text-foreground break-all bg-background/50 p-2 rounded block">
                      {machineInfo.hwid}
                    </code>
                    <p className="text-xs text-muted-foreground mt-3 arabic-enhanced leading-relaxed">
                      💡 أرسل هذا المعرف للمطور عبر الواتساب أو الإيميل للحصول على مفتاح ترخيص مخصص لجهازك فقط
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className={`flex items-center space-x-3 space-x-reverse p-4 ${themeClasses.alertError} rounded-xl backdrop-blur-sm`}>
                  <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                  <span className="text-base font-medium text-destructive arabic-enhanced">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`w-full py-4 px-6 ${themeClasses.buttonPrimary} rounded-xl font-bold text-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 arabic-enhanced`}
              >
                {isLoading || isValidating ? (
                  <div className="flex items-center justify-center space-x-3 space-x-reverse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="arabic-enhanced">جاري التفعيل...</span>
                  </div>
                ) : (
                  <span className="arabic-enhanced">تفعيل الترخيص</span>
                )}
              </button>

              {/* Format Indicator */}
              <div className="text-center">
                <p className={`text-sm ${themeClasses.textSecondary} font-medium arabic-enhanced`}>
                  {licenseKey.length > 0 && (
                    <span className={isFormValid ? 'text-green-500' : 'text-orange-500'}>
                      {licenseKey.length}/23 حرف {isFormValid ? '✓' : ''}
                    </span>
                  )}
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Machine Info Panel */}
        {showMachineInfo && machineInfo && (
          <div className={`mt-6 ${themeClasses.card} backdrop-blur-xl rounded-2xl p-6 border border-border/50 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-secondary/3 rounded-2xl"></div>
            <div className="relative z-10">
              <h3 className={`text-lg font-semibold ${themeClasses.textPrimary} arabic-enhanced mb-4 flex items-center`}>
                <Shield className="w-5 h-5 ml-2" />
                معلومات الجهاز
              </h3>
              <div className="space-y-2 text-sm">
                <div className={`${themeClasses.textSecondary} arabic-enhanced`}>
                  <span className="font-medium">معرف الجهاز:</span>
                  <span className="font-mono ml-2 bg-muted px-2 py-1 rounded">
                    {machineInfo.hwid.substring(0, 8)}...
                  </span>
                </div>
                <div className={`${themeClasses.textSecondary} arabic-enhanced`}>
                  <span className="font-medium">النظام:</span>
                  <span className="ml-2">{machineInfo.platform}</span>
                </div>
                <div className={`${themeClasses.textSecondary} arabic-enhanced`}>
                  <span className="font-medium">المعمارية:</span>
                  <span className="ml-2">{machineInfo.arch}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <div className={`inline-flex items-center space-x-3 space-x-reverse px-8 py-4 ${themeClasses.card} backdrop-blur-md rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-border/30`}>
            <Shield className="w-5 h-5 text-primary" />
            <p className={`text-base ${themeClasses.textSecondary} font-semibold arabic-enhanced`}>
              نظام إدارة العيادة - تفعيل الترخيص
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
