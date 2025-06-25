import React, { useState } from 'react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '../../lib/utils'
import type { ClinicNeed } from '../../types'

interface ExportClinicNeedsButtonProps {
  needs: ClinicNeed[]
  filteredNeeds: ClinicNeed[]
  title?: string
}

const ExportClinicNeedsButton: React.FC<ExportClinicNeedsButtonProps> = ({
  needs,
  filteredNeeds,
  title = 'احتياجات العيادة'
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const exportToCSV = (data: ClinicNeed[], filename: string) => {
    try {
      setIsExporting(true)

      // CSV Headers in Arabic
      const headers = [
        'الرقم التسلسلي',
        'اسم الاحتياج',
        'الكمية',
        'السعر',
        'الإجمالي',
        'الوصف',
        'الفئة',
        'الأولوية',
        'الحالة',
        'المورد',
        'الملاحظات',
        'تاريخ الإنشاء'
      ]

      // Convert data to CSV format
      const csvData = data.map(need => [
        need.serial_number,
        need.need_name,
        need.quantity.toString(),
        need.price.toString(),
        (need.price * need.quantity).toString(),
        need.description || '',
        need.category || '',
        getPriorityLabel(need.priority),
        getStatusLabel(need.status),
        need.supplier || '',
        need.notes || '',
        new Date(need.created_at).toLocaleDateString('ar-SA')
      ])

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n')

      // Add BOM for proper Arabic display in Excel
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // Create download link
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${data.length} احتياج إلى ملف CSV`,
      })
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = async (data: ClinicNeed[], filename: string) => {
    try {
      setIsExporting(true)

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              direction: rtl;
              text-align: right;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .date {
              font-size: 14px;
              color: #666;
            }
            .summary {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .summary-item {
              display: inline-block;
              margin: 5px 15px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: right;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .status-pending { color: #f59e0b; }
            .status-ordered { color: #3b82f6; }
            .status-received { color: #10b981; }
            .status-cancelled { color: #ef4444; }
            .priority-urgent { color: #ef4444; font-weight: bold; }
            .priority-high { color: #f59e0b; }
            .priority-medium { color: #3b82f6; }
            .priority-low { color: #6b7280; }
            .total-row {
              background-color: #f9f9f9;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}</div>
            <div class="date">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>

          <div class="summary">
            <div class="summary-item">إجمالي الاحتياجات: ${data.length}</div>
            <div class="summary-item">إجمالي القيمة: ${formatCurrency(data.reduce((sum, need) => sum + (need.price * need.quantity), 0))}</div>
            <div class="summary-item">المعلقة: ${data.filter(n => n.status === 'pending').length}</div>
            <div class="summary-item">العاجلة: ${data.filter(n => n.priority === 'urgent').length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>الرقم التسلسلي</th>
                <th>اسم الاحتياج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
                <th>الفئة</th>
                <th>الأولوية</th>
                <th>الحالة</th>
                <th>المورد</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(need => `
                <tr>
                  <td>${need.serial_number}</td>
                  <td>${need.need_name}</td>
                  <td>${need.quantity}</td>
                  <td>${formatCurrency(need.price)}</td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${need.category || '-'}</td>
                  <td class="priority-${need.priority}">${getPriorityLabel(need.priority)}</td>
                  <td class="status-${need.status}">${getStatusLabel(need.status)}</td>
                  <td>${need.supplier || '-'}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">الإجمالي</td>
                <td>${formatCurrency(data.reduce((sum, need) => sum + (need.price * need.quantity), 0))}</td>
                <td colspan="4"></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}.html`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${data.length} احتياج إلى ملف HTML`,
      })
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      urgent: 'عاجل'
    }
    return labels[priority as keyof typeof labels] || priority
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'معلق',
      ordered: 'مطلوب',
      received: 'مستلم',
      cancelled: 'ملغي'
    }
    return labels[status as keyof typeof labels] || status
  }

  const handleExportAll = (format: 'csv' | 'pdf') => {
    const filename = `احتياجات_العيادة_${new Date().toISOString().split('T')[0]}`
    if (format === 'csv') {
      exportToCSV(needs, filename)
    } else {
      exportToPDF(needs, filename)
    }
  }

  const handleExportFiltered = (format: 'csv' | 'pdf') => {
    const filename = `احتياجات_العيادة_مفلترة_${new Date().toISOString().split('T')[0]}`
    if (format === 'csv') {
      exportToCSV(filteredNeeds, filename)
    } else {
      exportToPDF(filteredNeeds, filename)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'جاري التصدير...' : 'تصدير'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleExportAll('csv')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          تصدير الكل (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportAll('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          تصدير الكل (HTML)
        </DropdownMenuItem>
        {filteredNeeds.length !== needs.length && (
          <>
            <DropdownMenuItem onClick={() => handleExportFiltered('csv')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              تصدير المفلتر ({filteredNeeds.length}) (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportFiltered('pdf')}>
              <FileText className="w-4 h-4 mr-2" />
              تصدير المفلتر ({filteredNeeds.length}) (HTML)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ExportClinicNeedsButton
