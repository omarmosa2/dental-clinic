import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Edit,
  Trash2,
  Clock,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Package,
  Check
} from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { ClinicNeed } from '../../types'

interface ClinicNeedsTableProps {
  needs: ClinicNeed[]
  onEdit: (need: ClinicNeed) => void
  onDelete: (need: ClinicNeed) => void
  onReceiveAndDelete: (need: ClinicNeed) => void
  isLoading?: boolean
}

const ClinicNeedsTable: React.FC<ClinicNeedsTableProps> = ({
  needs,
  onEdit,
  onDelete,
  onReceiveAndDelete,
  isLoading = false
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', variant: 'secondary' as const, icon: Clock },
      ordered: { label: 'مطلوب', variant: 'default' as const, icon: ShoppingCart },
      received: { label: 'مستلم', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'ملغي', variant: 'destructive' as const, icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'منخفض', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      medium: { label: 'متوسط', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      high: { label: 'عالي', variant: 'default' as const, color: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'عاجل', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig]
    if (!config) return null

    return (
      <Badge variant={config.variant} className={`${config.color} w-fit`}>
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
      </div>
    )
  }

  if (needs.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          لا توجد احتياجات
        </h3>
        <p className="text-muted-foreground">
          لم يتم العثور على أي احتياجات مطابقة للبحث
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الرقم التسلسلي</TableHead>
            <TableHead className="text-right">اسم الاحتياج</TableHead>
            <TableHead className="text-right">الكمية</TableHead>
            <TableHead className="text-right">السعر</TableHead>
            <TableHead className="text-right">الإجمالي</TableHead>
            <TableHead className="text-right">الفئة</TableHead>
            <TableHead className="text-right">الأولوية</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">المورد</TableHead>
            <TableHead className="text-right">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {needs.map((need) => (
            <TableRow key={need.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <span className="text-sm text-muted-foreground">
                  #{need.serial_number}
                </span>
              </TableCell>

              <TableCell>
                <div>
                  <div className="font-medium">{need.need_name}</div>
                  {need.description && (
                    <div className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                      {need.description}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <span className="font-medium">{need.quantity}</span>
              </TableCell>

              <TableCell>
                <span className="font-medium">{formatCurrency(need.price)}</span>
              </TableCell>

              <TableCell>
                <span className="font-bold text-primary">
                  {formatCurrency(need.price * need.quantity)}
                </span>
              </TableCell>

              <TableCell>
                {need.category && (
                  <Badge variant="outline" className="w-fit">
                    {need.category}
                  </Badge>
                )}
              </TableCell>

              <TableCell>
                {getPriorityBadge(need.priority)}
              </TableCell>

              <TableCell>
                {getStatusBadge(need.status)}
              </TableCell>

              <TableCell>
                {need.supplier && (
                  <span className="text-sm">{need.supplier}</span>
                )}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  {/* زر تأكيد الاستلام - يظهر فقط إذا لم يكن مستلماً بعد */}
                  {need.status !== 'received' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReceiveAndDelete(need)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="تأكيد الاستلام وتحديث الحالة إلى مستلم"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(need)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(need)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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

export default ClinicNeedsTable
