import React, { useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Printer, Download } from 'lucide-react'
import type { Payment } from '@/types'

interface PaymentReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment
}

export default function PaymentReceiptDialog({ open, onOpenChange, payment }: PaymentReceiptDialogProps) {
  const { settings } = useSettingsStore()
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>إيصال دفع - ${payment.receipt_number || payment.id.slice(-6)}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  direction: rtl;
                  margin: 20px;
                  font-size: 14px;
                }
                .receipt {
                  max-width: 400px;
                  margin: 0 auto;
                  border: 1px solid #ddd;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #333;
                  padding-bottom: 15px;
                  margin-bottom: 20px;
                }
                .clinic-name {
                  font-size: 20px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .receipt-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin: 15px 0;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 8px 0;
                  padding: 5px 0;
                }
                .label {
                  font-weight: bold;
                }
                .amount-section {
                  border-top: 1px solid #ddd;
                  margin-top: 20px;
                  padding-top: 15px;
                }
                .total-amount {
                  font-size: 18px;
                  font-weight: bold;
                  border-top: 2px solid #333;
                  padding-top: 10px;
                  margin-top: 10px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 15px;
                  border-top: 1px solid #ddd;
                  font-size: 12px;
                  color: #666;
                }
                @media print {
                  body { margin: 0; }
                  .receipt { border: none; }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    // This would typically use a library like jsPDF
    // For now, we'll just trigger the print dialog
    handlePrint()
  }

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

  const getStatusLabel = (status: string) => {
    const statuses = {
      completed: 'مكتمل',
      pending: 'معلق',
      partial: 'جزئي',
      overdue: 'متأخر',
      failed: 'فاشل',
      refunded: 'مسترد'
    }
    return statuses[status as keyof typeof statuses] || status
  }

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full" dir="rtl">
          {/* Header */}
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">إيصال الدفع</h2>
            <p className="text-gray-600 mt-2">
              إيصال رقم {payment.receipt_number || payment.id.slice(-6)}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">

        <div ref={receiptRef} className="receipt">
          {/* Header */}
          <div className="header">
            <div className="clinic-name">
              {settings?.clinic_name || 'عيادة الأسنان'}
            </div>
            {settings?.clinic_address && (
              <div className="text-sm text-muted-foreground">
                {settings.clinic_address}
              </div>
            )}
            {settings?.clinic_phone && (
              <div className="text-sm text-muted-foreground">
                هاتف: {settings.clinic_phone}
              </div>
            )}
            <div className="receipt-title">إيصال دفع</div>
          </div>

          {/* Receipt Details */}
          <div className="space-y-2">
            <div className="info-row">
              <span className="label">رقم الإيصال:</span>
              <span>{payment.receipt_number || `#${payment.id.slice(-6)}`}</span>
            </div>

            <div className="info-row">
              <span className="label">التاريخ:</span>
              <span>{formatDate(payment.payment_date)}</span>
            </div>

            <div className="info-row">
              <span className="label">المريض:</span>
              <span>
                {payment.patient
                  ? `${payment.patient.first_name} ${payment.patient.last_name}`
                  : 'غير محدد'}
              </span>
            </div>

            {payment.patient?.phone && (
              <div className="info-row">
                <span className="label">الهاتف:</span>
                <span>{payment.patient.phone}</span>
              </div>
            )}

            {payment.appointment && (
              <div className="info-row">
                <span className="label">الموعد:</span>
                <span>{payment.appointment.title}</span>
              </div>
            )}

            <div className="info-row">
              <span className="label">طريقة الدفع:</span>
              <span>{getPaymentMethodLabel(payment.payment_method)}</span>
            </div>

            <div className="info-row">
              <span className="label">الحالة:</span>
              <span>{getStatusLabel(payment.status)}</span>
            </div>

            {payment.description && (
              <div className="info-row">
                <span className="label">الوصف:</span>
                <span>{payment.description}</span>
              </div>
            )}
          </div>

          {/* Amount Section */}
          <div className="amount-section">
            <div className="info-row">
              <span className="label">المبلغ الأساسي:</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>

            {payment.discount_amount && payment.discount_amount > 0 && (
              <div className="info-row">
                <span className="label">الخصم:</span>
                <span>-{formatCurrency(payment.discount_amount)}</span>
              </div>
            )}

            {payment.tax_amount && payment.tax_amount > 0 && (
              <div className="info-row">
                <span className="label">الضريبة:</span>
                <span>+{formatCurrency(payment.tax_amount)}</span>
              </div>
            )}

            <div className="info-row total-amount">
              <span className="label">المبلغ الإجمالي:</span>
              <span>
                {formatCurrency(
                  payment.total_amount ||
                  (payment.amount + (payment.tax_amount || 0) - (payment.discount_amount || 0))
                )}
              </span>
            </div>
          </div>

          {payment.notes && (
            <div className="mt-4 p-3 bg-muted rounded">
              <div className="label">ملاحظات:</div>
              <div className="text-sm">{payment.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <div>شكراً لثقتكم بنا</div>
            <div className="text-xs mt-2">
              تم الإنشاء في: {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 space-x-reverse mt-6 pt-4 border-t">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent"
            >
              إغلاق
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 border border-input bg-background text-foreground rounded-md hover:bg-accent flex items-center"
            >
              <Download className="w-4 h-4 ml-2" />
              تحميل PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center"
            >
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
