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
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import {
  Edit,
  Trash2,
  Building2,
  Phone,
  MapPin,
  TestTube,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Lab } from '@/types'

interface LabTableProps {
  labs: Lab[]
  onEdit: (lab: Lab) => void
  onDelete: (lab: Lab) => void
  searchQuery: string
}

export default function LabTable({ labs, onEdit, onDelete, searchQuery }: LabTableProps) {
  const { isLoading } = useLabStore()
  const { getOrdersByLab } = useLabOrderStore()

  // Filter labs based on search query
  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lab.contact_info && lab.contact_info.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (lab.address && lab.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleEdit = (lab: Lab) => {
    onEdit(lab)
  }

  const handleDelete = (lab: Lab) => {
    // Check if lab has any orders
    const labOrders = getOrdersByLab(lab.id)
    if (labOrders.length > 0) {
      notify.warning(`لا يمكن حذف المختبر "${lab.name}" لأنه يحتوي على ${labOrders.length} طلب`)
      return
    }
    onDelete(lab)
  }

  const getLabOrdersCount = (labId: string) => {
    return getOrdersByLab(labId).length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">جاري تحميل المختبرات...</p>
        </div>
      </div>
    )
  }

  if (filteredLabs.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {searchQuery ? 'لا توجد نتائج' : 'لا توجد مختبرات'}
        </h3>
        <p className="text-muted-foreground">
          {searchQuery
            ? `لم يتم العثور على مختبرات تطابق "${searchQuery}"`
            : 'لم يتم إضافة أي مختبرات بعد'
          }
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">اسم المختبر</TableHead>
            <TableHead className="text-right">معلومات الاتصال</TableHead>
            <TableHead className="text-right">العنوان</TableHead>
            <TableHead className="text-right">عدد الطلبات</TableHead>
            <TableHead className="text-right">تاريخ الإضافة</TableHead>
            <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLabs.map((lab) => (
            <TableRow key={lab.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-right">
                <div className="flex items-center gap-2 justify-end">
                  {lab.name}
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </TableCell>
              <TableCell className="text-right">
                {lab.contact_info ? (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm">{lab.contact_info}</span>
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">غير محدد</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {lab.address ? (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm">{lab.address}</span>
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">غير محدد</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                    {getLabOrdersCount(lab.id)}
                    <TestTube className="h-3 w-3" />
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground text-right">
                {formatDate(lab.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(lab)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(lab)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
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
