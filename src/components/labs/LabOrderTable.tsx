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
import { useLabOrderStore } from '@/store/labOrderStore'
import { useLabStore } from '@/store/labStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Edit,
  Trash2,
  TestTube,
  Building2,
  User,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import type { LabOrder } from '@/types'

interface LabOrderTableProps {
  labOrders: LabOrder[]
  onEdit: (labOrder: LabOrder) => void
  onDelete: (labOrder: LabOrder) => void
  onView?: (labOrder: LabOrder) => void
}

export default function LabOrderTable({ labOrders, onEdit, onDelete, onView }: LabOrderTableProps) {
  const { isLoading } = useLabOrderStore()
  const { labs } = useLabStore()

  // Helper function to get lab name by ID
  const getLabName = (labId: string, labObject?: any) => {
    // First try to get from the lab object if available
    if (labObject?.name) {
      return labObject.name
    }

    // Then try to find in the labs list
    const lab = labs.find(l => l.id === labId)
    if (lab) {
      return lab.name
    }

    // Fallback to unknown lab with ID for debugging
    return `مختبر غير محدد (${labId.substring(0, 8)}...)`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'معلق':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            معلق
          </Badge>
        )
      case 'مكتمل':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            مكتمل
          </Badge>
        )
      case 'ملغي':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            ملغي
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (cost: number, paidAmount: number = 0) => {
    const remaining = cost - paidAmount

    if (remaining <= 0) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          مدفوع بالكامل
        </Badge>
      )
    } else if (paidAmount > 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          مدفوع جزئياً
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          غير مدفوع
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">جاري تحميل طلبات المختبرات...</p>
        </div>
      </div>
    )
  }

  if (labOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <TestTube className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          لا توجد طلبات مختبرات
        </h3>
        <p className="text-muted-foreground">
          لم يتم إضافة أي طلبات مختبرات بعد
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table className="table-center-all">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-[60px]">رقم</TableHead>
            <TableHead className="text-center">اسم المختبر</TableHead>
            <TableHead className="text-center">اسم الخدمة/التحليل</TableHead>
            <TableHead className="text-center">التكلفة</TableHead>
            <TableHead className="text-center">تاريخ الطلب</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center">حالة الدفع</TableHead>
            <TableHead className="text-center w-[120px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {labOrders.map((order, index) => (
            <TableRow key={order.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-center">
                {index + 1}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <div className="flex flex-col text-center">
                    <span className="font-medium">
                      {getLabName(order.lab_id, order.lab)}
                    </span>
                    {getLabName(order.lab_id, order.lab).includes('مختبر غير محدد') && (
                      <span className="text-xs text-muted-foreground">
                        المختبر قد يكون محذوفاً
                      </span>
                    )}
                  </div>
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <span>{order.service_name}</span>
                  <TestTube className="h-4 w-4 text-purple-600" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-semibold">{formatCurrency(order.cost)}</span>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-sm">{formatDate(order.order_date)}</span>
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(order.status)}
              </TableCell>
              <TableCell className="text-center">
                {getPaymentStatusBadge(order.cost, order.paid_amount)}
              </TableCell>
              <TableCell className="min-w-[180px] text-center">
                <div className="flex items-center justify-center space-x-1 space-x-reverse">
                  {onView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="action-btn-view"
                      onClick={() => onView(order)}
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      <span className="text-xs arabic-enhanced">عرض</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-edit"
                    onClick={() => onEdit(order)}
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    <span className="text-xs arabic-enhanced">تعديل</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-delete"
                    onClick={() => onDelete(order)}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    <span className="text-xs arabic-enhanced">حذف</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
