import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, Download, Upload, RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react'
import { useBackupStore } from '@/store/backupStore'

interface BackupInfo {
  name: string
  path: string
  size: number
  created_at: string
  formattedSize: string
  version?: string
  platform?: string
  database_type?: string
  backup_format?: string
}

export default function Backup() {
  const {
    backups,
    isLoading,
    error,
    isCreatingBackup,
    isRestoringBackup,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearError,
    formatBackupDate,
    getBackupStatus,
    runBackupTest
  } = useBackupStore()

  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [showTestResults, setShowTestResults] = useState(false)

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleCreateBackup = async () => {
    try {
      clearError()
      await createBackup()
      // Show success message or notification here
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  const handleRestoreBackup = async (backupPath: string) => {
    if (!window.confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
      return
    }

    try {
      clearError()
      const success = await restoreBackup(backupPath)
      if (success) {
        alert('تم استعادة النسخة الاحتياطية بنجاح!')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
    }
  }

  const handleDeleteBackup = async (backupName: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟')) {
      return
    }

    try {
      await deleteBackup(backupName)
      await loadBackups() // Refresh the list
    } catch (error) {
      console.error('Failed to delete backup:', error)
    }
  }

  const handleSelectBackupFile = async () => {
    try {
      const result = await window.electronAPI.dialog.showOpenDialog({
        title: 'اختر ملف النسخة الاحتياطية',
        filters: [
          { name: 'ملفات قاعدة البيانات', extensions: ['db', 'sqlite'] },
          { name: 'ملفات النسخ الاحتياطية القديمة', extensions: ['json'] },
          { name: 'جميع الملفات', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (!result.canceled && result.filePaths.length > 0) {
        await handleRestoreBackup(result.filePaths[0])
      }
    } catch (error) {
      console.error('Failed to select backup file:', error)
    }
  }

  const handleRunBackupTest = async () => {
    setShowTestResults(true)
    try {
      clearError()
      const result = await runBackupTest()

      if (result.success) {
        alert('✅ اختبار النسخ الاحتياطي نجح! تحقق من وحدة التحكم للحصول على التفاصيل.')
      } else {
        alert(`❌ اختبار النسخ الاحتياطي فشل: ${result.error || 'خطأ غير معروف'}`)
      }

      console.log('🧪 Backup test results:', result)
    } catch (error) {
      console.error('Backup test failed:', error)
      alert('❌ فشل في تشغيل اختبار النسخ الاحتياطي')
    } finally {
      setShowTestResults(false)
    }
  }

  const backupStatus = getBackupStatus()

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">النسخ الاحتياطي والاستعادة</h1>
          <p className="text-muted-foreground mt-2">
            احم بياناتك بالنسخ الاحتياطي الآمن
          </p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
            {isCreatingBackup ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            إنشاء نسخة احتياطية
          </Button>
          <Button variant="outline" onClick={handleSelectBackupFile} disabled={isRestoringBackup}>
            {isRestoringBackup ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            استعادة من ملف
          </Button>
          <Button variant="secondary" onClick={handleRunBackupTest} disabled={showTestResults}>
            {showTestResults ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            اختبار النظام
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Backup Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            حالة النسخ الاحتياطي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{backupStatus.totalBackups}</div>
              <div className="text-sm text-muted-foreground">إجمالي النسخ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {backupStatus.lastBackup ? formatBackupDate(backupStatus.lastBackup) : 'لا يوجد'}
              </div>
              <div className="text-sm text-muted-foreground">آخر نسخة احتياطية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {backupStatus.nextScheduledBackup || 'غير مجدول'}
              </div>
              <div className="text-sm text-muted-foreground">النسخة التالية</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              النسخ الاحتياطية المتاحة
            </span>
            <Button variant="outline" size="sm" onClick={loadBackups} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </CardTitle>
          <CardDescription>
            قائمة بجميع النسخ الاحتياطية المتاحة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">جاري تحميل النسخ الاحتياطية...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">لا توجد نسخ احتياطية</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم العثور على أي نسخ احتياطية. قم بإنشاء نسخة احتياطية أولاً.
              </p>
              <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                <Download className="w-4 h-4 mr-2" />
                إنشاء أول نسخة احتياطية
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup: BackupInfo) => (
                <div
                  key={backup.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{backup.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {backup.database_type === 'sqlite' ? 'SQLite' : 'قديم'}
                      </Badge>
                      {backup.backup_format === 'sqlite_only' && (
                        <Badge variant="outline" className="text-xs">
                          محسن
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatBackupDate(backup.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {backup.formattedSize}
                        </span>
                        {backup.version && (
                          <span className="text-xs">
                            الإصدار: {backup.version}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {backup.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.path)}
                      disabled={isRestoringBackup}
                    >
                      {isRestoringBackup ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      استعادة
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            تعليمات مهمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>إنشاء النسخ الاحتياطية:</strong> يتم حفظ النسخ الاحتياطية كملفات SQLite يمكن استعادتها في أي وقت.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>الاستعادة:</strong> عند استعادة نسخة احتياطية، سيتم استبدال جميع البيانات الحالية.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>تحذير:</strong> تأكد من إنشاء نسخة احتياطية حديثة قبل استعادة نسخة قديمة.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>اختبار النظام:</strong> استخدم زر "اختبار النظام" للتحقق من سلامة عملية النسخ والاستعادة.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
