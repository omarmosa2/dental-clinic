import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Patient, Appointment } from '../types'

// shadcn/ui imports
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  patient?: Patient | null
  appointment?: Appointment | null
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function ConfirmDeleteDialog({
  isOpen,
  patient,
  appointment,
  onClose,
  onConfirm,
  isLoading = false
}: ConfirmDeleteDialogProps) {
  if (!patient && !appointment) return null

  const isPatient = !!patient
  const item = patient || appointment

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>
                {isPatient ? 'هل أنت متأكد من حذف هذا المريض؟' : 'هل أنت متأكد من حذف هذا الموعد؟'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                هذا الإجراء لا يمكن التراجع عنه
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {isPatient
                    ? `${patient!.first_name.charAt(0)}${patient!.last_name.charAt(0)}`
                    : '📅'
                  }
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {isPatient
                    ? `${patient!.first_name} ${patient!.last_name}`
                    : appointment!.title
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPatient
                    ? (patient!.phone || 'لا يوجد رقم هاتف')
                    : new Date(appointment!.start_time).toLocaleString('ar-SA')
                  }
                </p>
              </div>
            </div>
          </div>

          {isPatient && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 ml-2" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">تحذير مهم</h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    سيتم حذف جميع البيانات المرتبطة بهذا المريض بما في ذلك:
                  </p>
                  <ul className="text-sm text-destructive/80 mt-2 list-disc list-inside">
                    <li>جميع المواعيد المجدولة</li>
                    <li>سجل المدفوعات</li>
                    <li>التاريخ الطبي والملاحظات</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex justify-end space-x-3 space-x-reverse">
          <AlertDialogCancel disabled={isLoading}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2 space-x-reverse">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>جاري الحذف...</span>
              </div>
            ) : (
              'تأكيد الحذف'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
