import React, { useState, useMemo } from 'react'
import { Payment, Patient } from '@/types'
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Edit,
  Trash2,
  Receipt,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,

  DollarSign
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

type SortField = 'payment_date' | 'amount' | 'patient_name' | 'payment_method' | 'status' | 'receipt_number'
type SortDirection = 'asc' | 'desc'

interface PaymentTableProps {
  payments: Payment[]
  patients: Patient[]
  isLoading: boolean
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onShowReceipt: (payment: Payment) => void
}

export default function PaymentTable({
  payments,
  patients,
  isLoading,
  onEdit,
  onDelete,
  onShowReceipt
}: PaymentTableProps) {
  const [sortField, setSortField] = useState<SortField>('payment_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Create a map of patient IDs to patient objects for quick lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>()
    patients.forEach(patient => {
      map.set(patient.id, patient)
    })
    return map
  }, [patients])

  // Get patient name for a payment
  const getPatientName = (payment: Payment) => {
    // First try to get patient from payment object (if loaded with JOIN)
    if (payment.patient?.full_name) {
      return payment.patient.full_name
    }
    if (payment.patient?.first_name || payment.patient?.last_name) {
      return `${payment.patient.first_name || ''} ${payment.patient.last_name || ''}`.trim()
    }

    // Fallback to patient map lookup
    const patient = patientMap.get(payment.patient_id)
    return patient?.full_name || 'مريض غير معروف'
  }

  // Sort payments (filtering is now handled by the store)
  const sortedPayments = useMemo(() => {
    let sorted = [...payments]

    // Sort payments
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'patient_name':
          aValue = getPatientName(a)
          bValue = getPatientName(b)
          break
        case 'payment_date':
          aValue = new Date(a.payment_date)
          bValue = new Date(b.payment_date)
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'payment_method':
          aValue = a.payment_method
          bValue = b.payment_method
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'receipt_number':
          aValue = a.receipt_number || ''
          bValue = b.receipt_number || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [payments, sortField, sortDirection, patientMap])

  // Pagination
  const totalPages = Math.ceil(sortedPayments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPayments = sortedPayments.slice(startIndex, startIndex + pageSize)

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 text-right"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end space-x-1 space-x-reverse">
        {children}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
        ) : (
          <ArrowUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  )

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقداً',
      card: 'بطاقة ائتمان',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      insurance: 'تأمين'
    }
    return methods[method as keyof typeof methods] || method
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'مكتمل', variant: 'default' as const },
      pending: { label: 'معلق', variant: 'secondary' as const },
      partial: { label: 'جزئي', variant: 'outline' as const },
      overdue: { label: 'متأخر', variant: 'destructive' as const },
      failed: { label: 'فاشل', variant: 'destructive' as const },
      refunded: { label: 'مسترد', variant: 'secondary' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الإيصال</TableHead>
              <TableHead>المريض</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(7)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (sortedPayments.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="receipt_number">رقم الإيصال</SortableHeader>
              <SortableHeader field="patient_name">المريض</SortableHeader>
              <SortableHeader field="amount">المبلغ</SortableHeader>
              <SortableHeader field="payment_method">طريقة الدفع</SortableHeader>
              <SortableHeader field="status">الحالة</SortableHeader>
              <SortableHeader field="payment_date">تاريخ الدفع</SortableHeader>
              <TableHead className="text-right">
                <span className="arabic-enhanced font-medium">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <DollarSign className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    لم يتم تسجيل أي مدفوعات بعد
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader field="receipt_number">
                  <span className="arabic-enhanced font-medium">رقم الإيصال</span>
                </SortableHeader>
                <SortableHeader field="patient_name">
                  <span className="arabic-enhanced font-medium">المريض</span>
                </SortableHeader>
                <SortableHeader field="amount">
                  <span className="arabic-enhanced font-medium">المبلغ</span>
                </SortableHeader>
                <SortableHeader field="payment_method">
                  <span className="arabic-enhanced font-medium">طريقة الدفع</span>
                </SortableHeader>
                <SortableHeader field="status">
                  <span className="arabic-enhanced font-medium">الحالة</span>
                </SortableHeader>
                <SortableHeader field="payment_date">
                  <span className="arabic-enhanced font-medium">تاريخ الدفع</span>
                </SortableHeader>
                <TableHead className="text-right">
                  <span className="arabic-enhanced font-medium">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-right">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="arabic-enhanced">
                        {payment.receipt_number || `#${payment.id.slice(-6)}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {getPatientName(payment).charAt(0)}
                      </div>
                      <div>
                        <span className="arabic-enhanced">{getPatientName(payment)}</span>
                        {patientMap.get(payment.patient_id)?.phone && (
                          <div className="text-sm text-muted-foreground">
                            {patientMap.get(payment.patient_id)?.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-medium text-lg">
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.total_amount_due && (
                        <div className="text-xs text-muted-foreground">
                          من أصل {formatCurrency(payment.total_amount_due)}
                        </div>
                      )}
                      {payment.remaining_balance && payment.remaining_balance > 0 && (
                        <div className="text-xs text-orange-600 dark:text-orange-400">
                          متبقي: {formatCurrency(payment.remaining_balance)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="arabic-enhanced">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm arabic-enhanced">
                      {formatDate(payment.payment_date)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShowReceipt(payment)}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="عرض الإيصال"
                      >
                        <Receipt className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(payment)}
                        className="h-8 w-8 p-0 hover:bg-blue-500/10"
                        title="تحرير"
                      >
                        <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(payment)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground">
              عرض {startIndex + 1} إلى {Math.min(startIndex + pageSize, sortedPayments.length)} من {sortedPayments.length} مدفوعة
            </p>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium">عدد الصفوف لكل صفحة</p>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-1 space-x-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-1 space-x-reverse">
                <span className="text-sm font-medium">صفحة</span>
                <span className="text-sm font-medium">{currentPage}</span>
                <span className="text-sm font-medium">من</span>
                <span className="text-sm font-medium">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
