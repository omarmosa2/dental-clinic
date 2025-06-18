import { useState, useEffect } from 'react'
import { useBackupStore } from '@/store/backupStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Download,
  Upload,
  Settings as SettingsIcon,
  Trash2,
  Clock,
  Shield,
  Database,
  Calendar,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Palette,
  Moon,
  Sun,
  Key
} from 'lucide-react'
import LicenseInfoCard from '../components/LicenseInfoCard'
import LicenseActivationDialog from '../components/LicenseActivationDialog'
import { licenseGuard } from '../services/licenseGuard'
import { licenseActivationService } from '../services/licenseActivationService'
import { licenseManagerRenderer } from '../services/licenseServiceRenderer'
import { LicenseInfo, LicenseActivationResponse } from '../types/license'
import { useLicenseStore } from '../store/licenseStore'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('backup')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    show: boolean
  }>({ message: '', type: 'success', show: false })

  // License state
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [showLicenseActivation, setShowLicenseActivation] = useState(false)
  const [isLoadingLicense, setIsLoadingLicense] = useState(false)

  const {
    backups,
    isLoading,
    error,
    isCreatingBackup,
    isRestoringBackup,
    autoBackupEnabled,
    backupFrequency,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    setAutoBackupEnabled,
    setBackupFrequency,
    selectBackupFile,
    clearError,
    formatBackupSize,
    formatBackupDate,
    getBackupStatus
  } = useBackupStore()

  const { loadSettings } = useSettingsStore()
  const { isDarkMode, toggleDarkMode } = useTheme()

  useEffect(() => {
    loadBackups()
    loadSettings()
    loadLicenseInfo()
  }, [loadBackups, loadSettings])

  const loadLicenseInfo = async () => {
    setIsLoadingLicense(true)
    try {
      const detailedInfo = await licenseGuard.getDetailedLicenseInfo()
      setLicenseInfo(detailedInfo.licenseInfo)
      setDeviceInfo(detailedInfo.deviceInfo)

      // If no license info, ensure we clear the state
      if (!detailedInfo.licenseInfo) {
        setLicenseInfo(null)
      }
    } catch (error) {
      console.error('Failed to load license info:', error)
      setLicenseInfo(null)
      setDeviceInfo(null)
    } finally {
      setIsLoadingLicense(false)
    }
  }

  useEffect(() => {
    if (error) {
      showNotification(error, 'error')
      clearError()
    }
  }, [error, clearError])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type, show: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  const handleCreateBackup = async () => {
    try {
      await createBackup()
      showNotification('تم إنشاء النسخة الاحتياطية بنجاح', 'success')
    } catch (error) {
      showNotification('فشل في إنشاء النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      const filePath = await selectBackupFile()
      if (!filePath) return

      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(filePath)
        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreFromPath = async (backupPath: string) => {
    try {
      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(backupPath)
        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleDeleteBackup = async (backupName: string) => {
    try {
      await deleteBackup(backupName)
      showNotification('تم حذف النسخة الاحتياطية بنجاح', 'success')
      setShowDeleteConfirm(null)
    } catch (error) {
      showNotification('فشل في حذف النسخة الاحتياطية', 'error')
    }
  }

  const handleLicenseActivationSuccess = (response: LicenseActivationResponse) => {
    showNotification('تم تفعيل الترخيص بنجاح', 'success')
    // Wait a moment before reloading to ensure the activation is processed
    setTimeout(() => {
      loadLicenseInfo() // Reload license info
    }, 500)
  }

  const handleLicenseActivationError = (error: string) => {
    showNotification(`فشل في تفعيل الترخيص: ${error}`, 'error')
  }

  const { deactivateLicense } = useLicenseStore()

  const handleDeleteLicense = async () => {
    try {
      const confirmed = window.confirm(
        'هل أنت متأكد من حذف الترخيص الحالي؟ سيتم إلغاء تفعيل التطبيق ولن تتمكن من استخدامه حتى تقوم بتفعيل ترخيص جديد.'
      )

      if (confirmed) {
        // Use the store's deactivateLicense which handles immediate lockdown
        await deactivateLicense()
        showNotification('تم حذف الترخيص بنجاح - سيتم إعادة تحميل التطبيق', 'success')
      }
    } catch (error) {
      console.error('Error deleting license:', error)
      showNotification(`فشل في حذف الترخيص: ${error}`, 'error')
    }
  }

  const backupStatus = getBackupStatus()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">الإعدادات</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            إدارة إعدادات العيادة والنسخ الاحتياطية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => loadBackups()}
            disabled={isLoading}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={() => {
              // Export settings data
              const settingsData = {
                'الوضع المظلم': isDarkMode ? 'مفعل' : 'معطل',
                'النسخ التلقائية': autoBackupEnabled ? 'مفعلة' : 'معطلة',
                'تكرار النسخ': backupFrequency === 'daily' ? 'يومياً' : backupFrequency === 'weekly' ? 'أسبوعياً' : 'شهرياً',
                'إجمالي النسخ الاحتياطية': backupStatus.totalBackups,
                'آخر نسخة احتياطية': backupStatus.lastBackup || 'لا توجد',
                'معلومات الترخيص': licenseInfo ? 'متوفرة' : 'غير متوفرة',
                'تاريخ التصدير': new Date().toLocaleString('ar-SA')
              }

              const csvContent = [
                'الإعداد,القيمة',
                ...Object.entries(settingsData).map(([key, value]) => `${key},${value}`)
              ].join('\n')

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `settings_${new Date().toISOString().split('T')[0]}.csv`
              link.click()
            }}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
          >
            <Download className="w-4 h-4" />
            <span>تصدير الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          {[
            { id: 'license', name: 'الترخيص', icon: Shield },
            { id: 'backup', name: 'النسخ الاحتياطية', icon: Database },
            { id: 'appearance', name: 'المظهر', icon: Palette },
            { id: 'clinic', name: 'إعدادات العيادة', icon: SettingsIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 space-x-reverse py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {/* License Tab */}
      {activeTab === 'license' && (
        <div className="space-y-6">
          <LicenseInfoCard
            licenseInfo={licenseInfo}
            deviceInfo={deviceInfo}
            onEnterNewLicense={() => setShowLicenseActivation(true)}
            onRenewLicense={() => setShowLicenseActivation(true)}
            onContactSupport={() => {
              showNotification('يرجى التواصل مع الدعم الفني للمساعدة', 'info')
            }}
            className="w-full"
          />

          {/* License Management Actions */}
          {licenseInfo && (
            <div className="bg-card rounded-lg shadow border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">إدارة الترخيص</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  إجراءات إضافية لإدارة الترخيص الحالي
                </p>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setShowLicenseActivation(true)}
                    className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Key className="w-5 h-5" />
                    <span>تفعيل ترخيص جديد</span>
                  </button>

                  <button
                    onClick={handleDeleteLicense}
                    className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>حذف الترخيص</span>
                  </button>
                </div>

                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 ml-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">تحذير مهم</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        حذف الترخيص سيؤدي إلى إلغاء تفعيل التطبيق بالكامل. لن تتمكن من استخدام التطبيق حتى تقوم بتفعيل ترخيص جديد صالح.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoadingLicense && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">جاري تحميل معلومات الترخيص...</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Backup Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">إجمالي النسخ</p>
                  <p className="text-2xl font-bold text-foreground">{backupStatus.totalBackups}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">آخر نسخة احتياطية</p>
                  <p className="text-sm font-bold text-foreground">
                    {backupStatus.lastBackup || 'لا توجد نسخ'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">النسخة التالية</p>
                  <p className="text-sm font-bold text-foreground">
                    {backupStatus.nextScheduledBackup || 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Backup Actions */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية اليدوية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إنشاء واستعادة النسخ الاحتياطية يدوياً (تنسيق JSON)
              </p>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>{isCreatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}</span>
                </button>

                <button
                  onClick={handleRestoreBackup}
                  disabled={isRestoringBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isRestoringBackup ? 'جاري الاستعادة...' : 'استعادة نسخة احتياطية'}</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">تنبيه مهم</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      استعادة النسخة الاحتياطية ستستبدل جميع البيانات الحالية. تأكد من إنشاء نسخة احتياطية حديثة قبل الاستعادة.
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                      <strong>تنسيق الملف:</strong> يدعم النظام ملفات JSON فقط للاستعادة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Backup Settings */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية التلقائية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إعدادات النسخ الاحتياطية التلقائية
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">تفعيل النسخ التلقائية</label>
                  <p className="text-sm text-muted-foreground">إنشاء نسخ احتياطية تلقائياً حسب الجدولة المحددة</p>
                </div>
                <button
                  onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoBackupEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoBackupEnabled && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    تكرار النسخ الاحتياطية
                  </label>
                  <select
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="daily">يومياً</option>
                    <option value="weekly">أسبوعياً</option>
                    <option value="monthly">شهرياً</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Backup List */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية المحفوظة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                قائمة بجميع النسخ الاحتياطية المتاحة - اضغط على أي نسخة لاستعادتها
              </p>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">لا توجد نسخ احتياطية</h3>
                  <p className="mt-1 text-sm text-muted-foreground">ابدأ بإنشاء أول نسخة احتياطية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div
                      key={backup.name}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleRestoreFromPath(backup.path)}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{backup.name}</h4>
                          <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
                            <span>{formatBackupDate(backup.created_at)}</span>
                            <span>{formatBackupSize(backup.size)}</span>
                            {backup.version && <span>إصدار {backup.version}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreFromPath(backup.path)
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg"
                          title="استعادة"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteConfirm(backup.name)
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Settings Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">إعدادات المظهر</h3>
              <p className="text-sm text-muted-foreground mt-1">
                تخصيص مظهر التطبيق وفقاً لتفضيلاتك
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">الوضع المظلم</label>
                    <p className="text-sm text-muted-foreground">
                      تبديل بين الوضع الفاتح والمظلم للتطبيق
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Preview */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">معاينة المظهر</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Theme Preview */}
                  <div className="p-4 border border-border rounded-lg bg-background">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-foreground">
                          {isDarkMode ? 'الوضع المظلم' : 'الوضع الفاتح'}
                        </h5>
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="h-2 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <div className="w-8 h-6 bg-primary rounded text-xs"></div>
                        <div className="w-8 h-6 bg-secondary rounded text-xs"></div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h5 className="text-sm font-medium text-foreground mb-2">مميزات المظهر</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• تحسين قراءة النصوص العربية</li>
                      <li>• ألوان مناسبة للتطبيقات الطبية</li>
                      <li>• حفظ تلقائي للتفضيلات</li>
                      <li>• تباين عالي للوضوح</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">إعدادات إضافية</h4>
                <div className="text-sm text-muted-foreground">
                  <p>سيتم إضافة المزيد من خيارات التخصيص قريباً:</p>
                  <ul className="mt-2 space-y-1 mr-4">
                    <li>• اختيار الألوان الأساسية</li>
                    <li>• حجم الخط</li>
                    <li>• كثافة العناصر</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinic Settings Tab */}
      {activeTab === 'clinic' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">معلومات العيادة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إعدادات العيادة الأساسية
              </p>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2 text-foreground">إعدادات العيادة</h3>
                <p className="text-muted-foreground">
                  سيتم تطبيق إعدادات العيادة التفصيلية قريباً
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full" dir="rtl">
            <div className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-500 ml-3" />
                <div>
                  <h3 className="text-lg font-medium text-foreground">تأكيد الحذف</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDeleteBackup(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* License Activation Dialog */}
      <LicenseActivationDialog
        isOpen={showLicenseActivation}
        onClose={() => setShowLicenseActivation(false)}
        onActivationSuccess={handleLicenseActivationSuccess}
        onActivationError={handleLicenseActivationError}
      />

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}