import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMedicationStore } from '@/store/medicationStore'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Edit,
  Trash2,
  Pill,
  FileText,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Medication } from '@/types'

interface MedicationTableProps {
  medications: Medication[]
  onEdit: (medication: Medication) => void
  onDelete: (medication: Medication) => void
  searchQuery: string
}

export default function MedicationTable({ medications, onEdit, onDelete, searchQuery }: MedicationTableProps) {
  const { isLoading } = useMedicationStore()

  // Filter medications based on search query
  const filteredMedications = medications.filter(medication =>
    medication.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (medication.instructions && medication.instructions.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleEdit = (medication: Medication) => {
    onEdit(medication)
  }

  const handleDelete = (medication: Medication) => {
    onDelete(medication)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الأدوية...</p>
        </div>
      </div>
    )
  }

  if (filteredMedications.length === 0) {
    return (
      <div className="text-center py-8">
        <Pill className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">لا توجد أدوية</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery ? 'لم يتم العثور على أدوية تطابق البحث' : 'لم يتم إضافة أي أدوية بعد'}
        </p>
        {!searchQuery && (
          <Button onClick={() => onEdit({} as Medication)}>
            <Pill className="w-4 h-4 ml-2" />
            إضافة دواء جديد
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table className="table-center-all">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">الرقم التسلسلي</TableHead>
            <TableHead className="text-center">اسم الدواء</TableHead>
            <TableHead className="text-center">التعليمات</TableHead>
            <TableHead className="text-center">تاريخ الإضافة</TableHead>
            <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMedications.map((medication, index) => (
            <TableRow key={medication.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-center">
                {index + 1}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{medication.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="max-w-xs mx-auto">
                  {medication.instructions ? (
                    <div className="text-sm text-muted-foreground" title={medication.instructions}>
                      {medication.instructions}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">لا توجد تعليمات</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="text-sm">
                  {formatDate(medication.created_at)}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(medication)}
                    className="action-btn-edit action-btn-icon"
                    title="تعديل الدواء"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(medication)}
                    className="action-btn-delete action-btn-icon"
                    title="حذف الدواء"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Table Footer with Summary */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-4">
            <span>إجمالي الأدوية: {filteredMedications.length}</span>
            {searchQuery && (
              <span>نتائج البحث: {filteredMedications.length} من {medications.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            <span>قاعدة بيانات الأدوية</span>
          </div>
        </div>
      </div>
    </div>
  )
}
