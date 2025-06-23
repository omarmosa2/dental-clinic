import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'

interface SecuritySettingsProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
}

// Hash function for password (same as useAuth)
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'dental_clinic_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error hashing password:', error)
    throw error
  }
}

export default function SecuritySettings({ showNotification }: SecuritySettingsProps) {
  const { passwordEnabled, setPassword, removePassword, changePassword } = useAuth()

  const [showSetPassword, setShowSetPassword] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showRemovePassword, setShowRemovePassword] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [removePasswordInput, setRemovePasswordInput] = useState('')
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
    old: false,
    remove: false
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPassword.trim()) {
      showNotification('يرجى إدخال كلمة مرور', 'error')
      return
    }

    if (newPassword.length < 4) {
      showNotification('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('كلمة المرور وتأكيدها غير متطابقين', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Setting password...')
      const success = await setPassword(newPassword)
      console.log('🔐 SecuritySettings: Password set result:', success)

      if (success) {
        showNotification('تم تعيين كلمة المرور بنجاح', 'success')
        setShowSetPassword(false)
        setNewPassword('')
        setConfirmPassword('')
        // Reset password visibility
        setShowPasswords({ new: false, confirm: false, old: false })
      } else {
        showNotification('فشل في تعيين كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error setting password:', error)
      showNotification('حدث خطأ أثناء تعيين كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!oldPassword.trim() || !newPassword.trim()) {
      showNotification('يرجى ملء جميع الحقول', 'error')
      return
    }

    if (newPassword.length < 4) {
      showNotification('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Changing password...')
      const success = await changePassword(oldPassword, newPassword)
      console.log('🔐 SecuritySettings: Password change result:', success)

      if (success) {
        showNotification('تم تغيير كلمة المرور بنجاح', 'success')
        setShowChangePassword(false)
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        // Reset password visibility
        setShowPasswords({ new: false, confirm: false, old: false })
      } else {
        showNotification('كلمة المرور القديمة غير صحيحة', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error changing password:', error)
      showNotification('حدث خطأ أثناء تغيير كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePasswordWithVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!removePasswordInput.trim()) {
      showNotification('يرجى إدخال كلمة المرور الحالية', 'error')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Verifying password for removal...')

      // Get current settings to verify password
      const currentSettings = await window.electronAPI.settings.get()

      if (!currentSettings?.app_password) {
        showNotification('لا توجد كلمة مرور مُعيّنة', 'error')
        setIsLoading(false)
        return
      }

      // Hash the input password using the same method as useAuth
      const hashedInput = await hashPassword(removePasswordInput)

      if (hashedInput !== currentSettings.app_password) {
        showNotification('كلمة المرور غير صحيحة', 'error')
        setIsLoading(false)
        return
      }

      // If password is correct, proceed with removal
      console.log('🔐 SecuritySettings: Password verified, removing...')
      const success = await removePassword()
      console.log('🔐 SecuritySettings: Password removal result:', success)

      if (success) {
        showNotification('تم إزالة كلمة المرور بنجاح', 'success')
        setShowRemovePassword(false)
        setRemovePasswordInput('')
        setShowPasswords(prev => ({ ...prev, remove: false }))
      } else {
        showNotification('فشل في إزالة كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error removing password:', error)
      showNotification('حدث خطأ أثناء إزالة كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePassword = async () => {
    setIsLoading(true)
    try {
      console.log('🔐 SecuritySettings: Removing password...')
      const success = await removePassword()
      console.log('🔐 SecuritySettings: Password removal result:', success)

      if (success) {
        showNotification('تم إزالة كلمة المرور بنجاح', 'success')
        setShowRemoveConfirm(false)
      } else {
        showNotification('فشل في إزالة كلمة المرور', 'error')
      }
    } catch (error) {
      console.error('❌ SecuritySettings: Error removing password:', error)
      showNotification('حدث خطأ أثناء إزالة كلمة المرور', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm' | 'old' | 'remove') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Password Protection Status */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-medium text-foreground">حماية التطبيق بكلمة مرور</h3>
          <p className="text-sm text-muted-foreground mt-1">
            تأمين التطبيق بكلمة مرور لمنع الوصول غير المصرح به
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className={`p-2 rounded-lg ${passwordEnabled ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-900/20'}`}>
                {passwordEnabled ? (
                  <Lock className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Unlock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {passwordEnabled ? 'كلمة المرور مفعلة' : 'كلمة المرور معطلة'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {passwordEnabled
                    ? 'التطبيق محمي بكلمة مرور'
                    : 'التطبيق غير محمي بكلمة مرور'
                  }
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              passwordEnabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
            }`}>
              {passwordEnabled ? 'مفعل' : 'معطل'}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!passwordEnabled ? (
              <button
                onClick={() => setShowSetPassword(true)}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>تعيين كلمة مرور</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>تغيير كلمة المرور</span>
                </button>
                <button
                  onClick={() => setShowRemovePassword(true)}
                  className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  <span>إزالة كلمة المرور</span>
                </button>
              </>
            )}
          </div>

          {/* Security Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3 space-x-reverse">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  معلومات مهمة حول الأمان
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• عند تفعيل كلمة المرور، ستحتاج لإدخالها في كل مرة تفتح فيها التطبيق</li>
                  <li>• يُنصح باستخدام كلمة مرور قوية تحتوي على أرقام وحروف</li>
                  <li>• احتفظ بكلمة المرور في مكان آمن</li>
                  <li>• في حالة نسيان كلمة المرور، ستحتاج للتواصل مع فريق الدعم</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Password Dialog */}
      {showSetPassword && (
        <PasswordDialog
          title="تعيين كلمة مرور جديدة"
          onSubmit={handleSetPassword}
          onCancel={() => {
            setShowSetPassword(false)
            setNewPassword('')
            setConfirmPassword('')
          }}
          isLoading={isLoading}
        >
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={setNewPassword}
            show={showPasswords.new}
            onToggleShow={() => togglePasswordVisibility('new')}
            placeholder="أدخل كلمة مرور جديدة"
          />
          <PasswordInput
            label="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPasswords.confirm}
            onToggleShow={() => togglePasswordVisibility('confirm')}
            placeholder="أعد إدخال كلمة المرور"
          />
        </PasswordDialog>
      )}

      {/* Change Password Dialog */}
      {showChangePassword && (
        <PasswordDialog
          title="تغيير كلمة المرور"
          onSubmit={handleChangePassword}
          onCancel={() => {
            setShowChangePassword(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
          }}
          isLoading={isLoading}
        >
          <PasswordInput
            label="كلمة المرور الحالية"
            value={oldPassword}
            onChange={setOldPassword}
            show={showPasswords.old}
            onToggleShow={() => togglePasswordVisibility('old')}
            placeholder="أدخل كلمة المرور الحالية"
          />
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={setNewPassword}
            show={showPasswords.new}
            onToggleShow={() => togglePasswordVisibility('new')}
            placeholder="أدخل كلمة مرور جديدة"
          />
          <PasswordInput
            label="تأكيد كلمة المرور الجديدة"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPasswords.confirm}
            onToggleShow={() => togglePasswordVisibility('confirm')}
            placeholder="أعد إدخال كلمة المرور الجديدة"
          />
        </PasswordDialog>
      )}

      {/* Remove Password Dialog */}
      {showRemovePassword && (
        <PasswordDialog
          title="إزالة كلمة المرور"
          onSubmit={handleRemovePasswordWithVerification}
          onCancel={() => {
            setShowRemovePassword(false)
            setRemovePasswordInput('')
            setShowPasswords(prev => ({ ...prev, remove: false }))
          }}
          isLoading={isLoading}
        >
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-3 space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 dark:text-red-200">
                  تحذير: إزالة كلمة المرور ستجعل التطبيق غير محمي. يرجى إدخال كلمة المرور الحالية للتأكيد.
                </p>
              </div>
            </div>
          </div>
          <PasswordInput
            label="كلمة المرور الحالية"
            value={removePasswordInput}
            onChange={setRemovePasswordInput}
            show={showPasswords.remove}
            onToggleShow={() => togglePasswordVisibility('remove')}
            placeholder="أدخل كلمة المرور الحالية"
          />
        </PasswordDialog>
      )}

      {/* Remove Password Confirmation */}
      {showRemoveConfirm && (
        <ConfirmDialog
          title="إزالة كلمة المرور"
          message="هل أنت متأكد من إزالة كلمة المرور؟ سيصبح التطبيق غير محمي."
          onConfirm={handleRemovePassword}
          onCancel={() => setShowRemoveConfirm(false)}
          isLoading={isLoading}
          confirmText="إزالة"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  )
}

// Helper Components
interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder: string
}

function PasswordInput({ label, value, onChange, show, onToggleShow, placeholder }: PasswordInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pr-3 pl-10 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

interface PasswordDialogProps {
  title: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isLoading: boolean
}

function PasswordDialog({ title, children, onSubmit, onCancel, isLoading }: PasswordDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            {children}
            <div className="flex justify-end space-x-3 space-x-reverse pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  confirmText: string
  confirmClass: string
}

function ConfirmDialog({ title, message, onConfirm, onCancel, isLoading, confirmText, confirmClass }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center ml-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 space-x-reverse">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${confirmClass}`}
            >
              {isLoading ? 'جاري التنفيذ...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
