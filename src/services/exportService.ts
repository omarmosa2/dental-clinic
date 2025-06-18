import jsPDF from 'jspdf'
import ExcelJS from 'exceljs'
import type { Patient, Appointment, Payment, ReportExportOptions, PatientReportData, AppointmentReportData, FinancialReportData, InventoryReportData } from '../types'
import { formatCurrency, formatDate } from '../lib/utils'

export class ExportService {
  // Advanced Report Export Functions
  static async exportReport(
    type: 'patients' | 'appointments' | 'financial' | 'inventory' | 'analytics' | 'overview',
    data: any,
    options: ReportExportOptions
  ): Promise<string> {
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(type, data, options)
        case 'excel':
          return await this.exportToExcel(type, data, options)
        case 'csv':
          return await this.exportToCSV(type, data, options)
        default:
          throw new Error('Unsupported export format')
      }
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }

  // PDF Export Functions
  static async exportToPDF(type: string, data: any, options: ReportExportOptions): Promise<string> {
    const doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: options.pageSize || 'A4'
    })

    // Set Arabic font support
    doc.setLanguage('ar')

    // Header
    this.addPDFHeader(doc, type, options)

    let yPosition = 50

    switch (type) {
      case 'patients':
        yPosition = await this.addPatientReportToPDF(doc, data, yPosition, options)
        break
      case 'appointments':
        yPosition = await this.addAppointmentReportToPDF(doc, data, yPosition, options)
        break
      case 'financial':
        yPosition = await this.addFinancialReportToPDF(doc, data, yPosition, options)
        break
      case 'inventory':
        yPosition = await this.addInventoryReportToPDF(doc, data, yPosition, options)
        break
      case 'overview':
        yPosition = await this.addOverviewReportToPDF(doc, data, yPosition, options)
        break
    }

    // Footer
    this.addPDFFooter(doc, options)

    const fileName = `${type}_report_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    return fileName
  }

  static addPDFHeader(doc: jsPDF, type: string, options: ReportExportOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Clinic name
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('عيادة الأسنان الحديثة', pageWidth / 2, 20, { align: 'center' })

    // Report title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'normal')
    const titles = {
      patients: 'تقرير المرضى',
      appointments: 'تقرير المواعيد',
      financial: 'التقرير المالي',
      inventory: 'تقرير المخزون',
      analytics: 'تقرير التحليلات',
      overview: 'التقرير الشامل'
    }
    doc.text(titles[type as keyof typeof titles] || 'تقرير', pageWidth / 2, 35, { align: 'center' })

    // Date and time
    doc.setFontSize(12)
    doc.text(`تاريخ التقرير: ${new Date().toLocaleString('ar-SA')}`, pageWidth - 20, 45, { align: 'right' })

    // Line separator
    doc.setLineWidth(0.5)
    doc.line(20, 48, pageWidth - 20, 48)
  }

  static addPDFFooter(doc: jsPDF, options: ReportExportOptions): void {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة', pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  // Patient Report PDF
  static async addPatientReportToPDF(doc: jsPDF, data: PatientReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المرضى', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي المرضى: ${data.totalPatients || 0}`, 20, yPosition)
    doc.text(`المرضى الجدد هذا الشهر: ${data.newPatientsThisMonth || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`المرضى النشطون: ${data.activePatients || 0}`, 20, yPosition)
    doc.text(`متوسط العمر: ${data.averageAge || 0} سنة`, 150, yPosition)
    yPosition += 20

    // Age distribution chart (if includeCharts is true)
    if (options.includeCharts && data.ageDistribution) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع الأعمار', 20, yPosition)
      yPosition += 10

      data.ageDistribution.forEach((group: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${group.range}: ${group.count} مريض`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    // Patient details table (if includeDetails is true)
    if (options.includeDetails && data.patients) {
      doc.setFont('helvetica', 'bold')
      doc.text('تفاصيل المرضى', 20, yPosition)
      yPosition += 15

      // Table headers
      doc.setFontSize(10)
      doc.text('الاسم', 20, yPosition)
      doc.text('الهاتف', 80, yPosition)
      doc.text('العمر', 130, yPosition)
      doc.text('آخر زيارة', 170, yPosition)
      doc.text('الحالة', 220, yPosition)

      doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2)
      yPosition += 10

      // Patient rows
      doc.setFont('helvetica', 'normal')
      data.patients.slice(0, 20).forEach((patient: any) => {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 30
        }

        doc.text(`${patient.first_name} ${patient.last_name}`, 20, yPosition)
        doc.text(patient.phone || 'غير محدد', 80, yPosition)
        doc.text(patient.age?.toString() || 'غير محدد', 130, yPosition)
        doc.text(patient.last_visit || 'لا توجد زيارات', 170, yPosition)
        doc.text(patient.status || 'نشط', 220, yPosition)
        yPosition += 8
      })
    }

    return yPosition + 20
  }

  // Appointment Report PDF
  static async addAppointmentReportToPDF(doc: jsPDF, data: AppointmentReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المواعيد', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي المواعيد: ${data.totalAppointments || 0}`, 20, yPosition)
    doc.text(`المواعيد المكتملة: ${data.completedAppointments || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`المواعيد الملغية: ${data.cancelledAppointments || 0}`, 20, yPosition)
    doc.text(`معدل الحضور: ${data.attendanceRate || 0}%`, 150, yPosition)
    yPosition += 20

    // Status distribution
    if (options.includeCharts && data.appointmentsByStatus) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع حالات المواعيد', 20, yPosition)
      yPosition += 10

      data.appointmentsByStatus.forEach((status: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${status.status}: ${status.count} موعد`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Financial Report PDF
  static async addFinancialReportToPDF(doc: jsPDF, data: FinancialReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص الإحصائيات المالية', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي الإيرادات: ${formatCurrency(data.totalRevenue || 0)} ريال`, 20, yPosition)
    doc.text(`المدفوعات المكتملة: ${formatCurrency(data.completedPayments || 0)} ريال`, 150, yPosition)
    yPosition += 10
    doc.text(`المدفوعات المعلقة: ${formatCurrency(data.pendingPayments || 0)} ريال`, 20, yPosition)
    doc.text(`المدفوعات المتأخرة: ${formatCurrency(data.overduePayments || 0)} ريال`, 150, yPosition)
    yPosition += 20

    // Payment methods distribution
    if (options.includeCharts && data.paymentMethodStats) {
      doc.setFont('helvetica', 'bold')
      doc.text('توزيع طرق الدفع', 20, yPosition)
      yPosition += 10

      data.paymentMethodStats.forEach((method: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${method.method}: ${formatCurrency(method.amount)} ريال (${method.count} معاملة)`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    // Monthly revenue trend
    if (options.includeCharts && data.monthlyRevenue) {
      doc.setFont('helvetica', 'bold')
      doc.text('الإيرادات الشهرية', 20, yPosition)
      yPosition += 10

      data.monthlyRevenue.slice(-6).forEach((month: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${month.month}: ${formatCurrency(month.revenue)} ريال`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Inventory Report PDF
  static async addInventoryReportToPDF(doc: jsPDF, data: InventoryReportData, yPosition: number, options: ReportExportOptions): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Summary statistics
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ملخص إحصائيات المخزون', 20, yPosition)
    yPosition += 15

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`إجمالي العناصر: ${data.totalItems || 0}`, 20, yPosition)
    doc.text(`القيمة الإجمالية: ${formatCurrency(data.totalValue || 0)} ريال`, 150, yPosition)
    yPosition += 10
    doc.text(`عناصر منخفضة المخزون: ${data.lowStockItems || 0}`, 20, yPosition)
    doc.text(`عناصر منتهية الصلاحية: ${data.expiredItems || 0}`, 150, yPosition)
    yPosition += 10
    doc.text(`عناصر نفدت من المخزون: ${data.outOfStockItems || 0}`, 20, yPosition)
    doc.text(`معدل دوران المخزون: ${data.turnoverRate || 0}%`, 150, yPosition)
    yPosition += 20

    // Top categories
    if (options.includeCharts && data.topCategories) {
      doc.setFont('helvetica', 'bold')
      doc.text('أعلى الفئات استهلاكاً', 20, yPosition)
      yPosition += 10

      data.topCategories.slice(0, 5).forEach((category: any) => {
        doc.setFont('helvetica', 'normal')
        doc.text(`${category.name}: ${category.count} عنصر`, 30, yPosition)
        yPosition += 8
      })
      yPosition += 10
    }

    return yPosition + 20
  }

  // Overview Report PDF
  static async addOverviewReportToPDF(doc: jsPDF, data: any, yPosition: number, options: ReportExportOptions): Promise<number> {
    // Add each section
    if (data.patients) {
      yPosition = await this.addPatientReportToPDF(doc, data.patients, yPosition, options)
    }

    if (data.appointments) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addAppointmentReportToPDF(doc, data.appointments, yPosition, options)
    }

    if (data.financial) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addFinancialReportToPDF(doc, data.financial, yPosition, options)
    }

    if (data.inventory) {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 30
      }
      yPosition = await this.addInventoryReportToPDF(doc, data.inventory, yPosition, options)
    }

    return yPosition
  }

  // Excel Export Functions
  static async exportToExcel(type: string, data: any, options: ReportExportOptions): Promise<string> {
    const workbook = new ExcelJS.Workbook()

    // Set workbook properties
    workbook.creator = 'نظام إدارة العيادة'
    workbook.created = new Date()
    workbook.modified = new Date()

    switch (type) {
      case 'patients':
        await this.addPatientReportToExcel(workbook, data, options)
        break
      case 'appointments':
        await this.addAppointmentReportToExcel(workbook, data, options)
        break
      case 'financial':
        await this.addFinancialReportToExcel(workbook, data, options)
        break
      case 'inventory':
        await this.addInventoryReportToExcel(workbook, data, options)
        break
      case 'overview':
        await this.addOverviewReportToExcel(workbook, data, options)
        break
    }

    const fileName = `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`
    await workbook.xlsx.writeFile(fileName)
    return fileName
  }

  static async addPatientReportToExcel(workbook: ExcelJS.Workbook, data: PatientReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المرضى')

    // Header
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المرضى - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص الإحصائيات'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي المرضى:'
    worksheet.getCell('B4').value = data.totalPatients || 0
    worksheet.getCell('A5').value = 'المرضى الجدد هذا الشهر:'
    worksheet.getCell('B5').value = data.newPatientsThisMonth || 0
    worksheet.getCell('A6').value = 'المرضى النشطون:'
    worksheet.getCell('B6').value = data.activePatients || 0
    worksheet.getCell('A7').value = 'متوسط العمر:'
    worksheet.getCell('B7').value = `${data.averageAge || 0} سنة`

    // Patient details
    if (options.includeDetails && data.patients) {
      let row = 10
      worksheet.getCell(`A${row}`).value = 'تفاصيل المرضى'
      worksheet.getCell(`A${row}`).font = { bold: true }
      row += 2

      // Headers
      const headers = ['الاسم الأول', 'الاسم الأخير', 'الهاتف', 'البريد الإلكتروني', 'العمر', 'آخر زيارة']
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(row, index + 1)
        cell.value = header
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      })
      row++

      // Data rows
      data.patients.forEach((patient: any) => {
        worksheet.getCell(row, 1).value = patient.first_name || ''
        worksheet.getCell(row, 2).value = patient.last_name || ''
        worksheet.getCell(row, 3).value = patient.phone || ''
        worksheet.getCell(row, 4).value = patient.email || ''
        worksheet.getCell(row, 5).value = patient.age || ''
        worksheet.getCell(row, 6).value = patient.last_visit || ''
        row++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }

  static async addFinancialReportToExcel(workbook: ExcelJS.Workbook, data: FinancialReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('التقرير المالي')

    // Header
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'التقرير المالي - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص الإحصائيات المالية'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي الإيرادات:'
    worksheet.getCell('B4').value = `${formatCurrency(data.totalRevenue || 0)} ريال`
    worksheet.getCell('A5').value = 'المدفوعات المكتملة:'
    worksheet.getCell('B5').value = `${formatCurrency(data.completedPayments || 0)} ريال`
    worksheet.getCell('A6').value = 'المدفوعات المعلقة:'
    worksheet.getCell('B6').value = `${formatCurrency(data.pendingPayments || 0)} ريال`
    worksheet.getCell('A7').value = 'المدفوعات المتأخرة:'
    worksheet.getCell('B7').value = `${formatCurrency(data.overduePayments || 0)} ريال`

    // Payment methods
    if (data.paymentMethodStats) {
      let row = 10
      worksheet.getCell(`A${row}`).value = 'توزيع طرق الدفع'
      worksheet.getCell(`A${row}`).font = { bold: true }
      row += 2

      worksheet.getCell(row, 1).value = 'طريقة الدفع'
      worksheet.getCell(row, 2).value = 'المبلغ'
      worksheet.getCell(row, 3).value = 'عدد المعاملات'
      worksheet.getRow(row).font = { bold: true }
      row++

      data.paymentMethodStats.forEach((method: any) => {
        worksheet.getCell(row, 1).value = method.method
        worksheet.getCell(row, 2).value = `${formatCurrency(method.amount)} ريال`
        worksheet.getCell(row, 3).value = method.count
        row++
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addAppointmentReportToExcel(workbook: ExcelJS.Workbook, data: AppointmentReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المواعيد')

    // Header and summary similar to other reports
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المواعيد - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص إحصائيات المواعيد'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي المواعيد:'
    worksheet.getCell('B4').value = data.totalAppointments || 0
    worksheet.getCell('A5').value = 'المواعيد المكتملة:'
    worksheet.getCell('B5').value = data.completedAppointments || 0
    worksheet.getCell('A6').value = 'المواعيد الملغية:'
    worksheet.getCell('B6').value = data.cancelledAppointments || 0
    worksheet.getCell('A7').value = 'معدل الحضور:'
    worksheet.getCell('B7').value = `${data.attendanceRate || 0}%`

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addInventoryReportToExcel(workbook: ExcelJS.Workbook, data: InventoryReportData, options: ReportExportOptions): Promise<void> {
    const worksheet = workbook.addWorksheet('تقرير المخزون')

    // Header and summary
    worksheet.mergeCells('A1:F1')
    const headerCell = worksheet.getCell('A1')
    headerCell.value = 'تقرير المخزون - عيادة الأسنان الحديثة'
    headerCell.font = { size: 16, bold: true }
    headerCell.alignment = { horizontal: 'center' }

    // Summary statistics
    worksheet.getCell('A3').value = 'ملخص إحصائيات المخزون'
    worksheet.getCell('A3').font = { bold: true }

    worksheet.getCell('A4').value = 'إجمالي العناصر:'
    worksheet.getCell('B4').value = data.totalItems || 0
    worksheet.getCell('A5').value = 'القيمة الإجمالية:'
    worksheet.getCell('B5').value = `${formatCurrency(data.totalValue || 0)} ريال`
    worksheet.getCell('A6').value = 'عناصر منخفضة المخزون:'
    worksheet.getCell('B6').value = data.lowStockItems || 0
    worksheet.getCell('A7').value = 'عناصر منتهية الصلاحية:'
    worksheet.getCell('B7').value = data.expiredItems || 0

    worksheet.columns.forEach(column => {
      column.width = 20
    })
  }

  static async addOverviewReportToExcel(workbook: ExcelJS.Workbook, data: any, options: ReportExportOptions): Promise<void> {
    if (data.patients) {
      await this.addPatientReportToExcel(workbook, data.patients, options)
    }
    if (data.appointments) {
      await this.addAppointmentReportToExcel(workbook, data.appointments, options)
    }
    if (data.financial) {
      await this.addFinancialReportToExcel(workbook, data.financial, options)
    }
    if (data.inventory) {
      await this.addInventoryReportToExcel(workbook, data.inventory, options)
    }
  }

  // CSV Export Functions
  static async exportToCSV(type: string, data: any, options: ReportExportOptions): Promise<string> {
    let csvContent = '\uFEFF' // BOM for Arabic support

    switch (type) {
      case 'patients':
        csvContent += this.generatePatientCSV(data, options)
        break
      case 'appointments':
        csvContent += this.generateAppointmentCSV(data, options)
        break
      case 'financial':
        csvContent += this.generateFinancialCSV(data, options)
        break
      case 'inventory':
        csvContent += this.generateInventoryCSV(data, options)
        break
      case 'overview':
        csvContent += this.generateOverviewCSV(data, options)
        break
    }

    const fileName = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

    // Create download link
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return fileName
  }

  static generatePatientCSV(data: PatientReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المرضى - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص الإحصائيات\n'
    csv += `إجمالي المرضى,${data.totalPatients || 0}\n`
    csv += `المرضى الجدد هذا الشهر,${data.newPatientsThisMonth || 0}\n`
    csv += `المرضى النشطون,${data.activePatients || 0}\n`
    csv += `متوسط العمر,${data.averageAge || 0} سنة\n\n`

    if (options.includeDetails && data.patients) {
      csv += 'تفاصيل المرضى\n'
      csv += 'الاسم الأول,الاسم الأخير,الهاتف,البريد الإلكتروني,العمر,آخر زيارة\n'

      data.patients.forEach((patient: any) => {
        csv += `"${patient.first_name || ''}","${patient.last_name || ''}","${patient.phone || ''}","${patient.email || ''}","${patient.age || ''}","${patient.last_visit || ''}"\n`
      })
    }

    return csv
  }

  static generateFinancialCSV(data: FinancialReportData, options: ReportExportOptions): string {
    let csv = 'التقرير المالي - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص الإحصائيات المالية\n'
    csv += `إجمالي الإيرادات,${formatCurrency(data.totalRevenue || 0)} ريال\n`
    csv += `المدفوعات المكتملة,${formatCurrency(data.completedPayments || 0)} ريال\n`
    csv += `المدفوعات المعلقة,${formatCurrency(data.pendingPayments || 0)} ريال\n`
    csv += `المدفوعات المتأخرة,${formatCurrency(data.overduePayments || 0)} ريال\n\n`

    if (data.paymentMethodStats) {
      csv += 'توزيع طرق الدفع\n'
      csv += 'طريقة الدفع,المبلغ,عدد المعاملات\n'

      data.paymentMethodStats.forEach((method: any) => {
        csv += `"${method.method}","${formatCurrency(method.amount)} ريال","${method.count}"\n`
      })
    }

    return csv
  }

  static generateAppointmentCSV(data: AppointmentReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المواعيد - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص إحصائيات المواعيد\n'
    csv += `إجمالي المواعيد,${data.totalAppointments || 0}\n`
    csv += `المواعيد المكتملة,${data.completedAppointments || 0}\n`
    csv += `المواعيد الملغية,${data.cancelledAppointments || 0}\n`
    csv += `معدل الحضور,${data.attendanceRate || 0}%\n`

    return csv
  }

  static generateInventoryCSV(data: InventoryReportData, options: ReportExportOptions): string {
    let csv = 'تقرير المخزون - عيادة الأسنان الحديثة\n\n'
    csv += 'ملخص إحصائيات المخزون\n'
    csv += `إجمالي العناصر,${data.totalItems || 0}\n`
    csv += `القيمة الإجمالية,${formatCurrency(data.totalValue || 0)} ريال\n`
    csv += `عناصر منخفضة المخزون,${data.lowStockItems || 0}\n`
    csv += `عناصر منتهية الصلاحية,${data.expiredItems || 0}\n`

    return csv
  }

  static generateOverviewCSV(data: any, options: ReportExportOptions): string {
    let csv = 'التقرير الشامل - عيادة الأسنان الحديثة\n\n'

    if (data.patients) {
      csv += this.generatePatientCSV(data.patients, options) + '\n\n'
    }
    if (data.appointments) {
      csv += this.generateAppointmentCSV(data.appointments, options) + '\n\n'
    }
    if (data.financial) {
      csv += this.generateFinancialCSV(data.financial, options) + '\n\n'
    }
    if (data.inventory) {
      csv += this.generateInventoryCSV(data.inventory, options)
    }

    return csv
  }

  // Legacy export functions for backward compatibility
  static async exportPatientsToPDF(patients: Patient[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    const patientData: PatientReportData = {
      totalPatients: patients.length,
      newPatientsThisMonth: 0,
      activePatients: patients.length,
      averageAge: 0,
      patients: patients,
      ageDistribution: [],
      genderDistribution: [],
      registrationTrend: []
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('patients', patientData, options)
  }

  static async exportAppointmentsToPDF(appointments: Appointment[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    const appointmentData: AppointmentReportData = {
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === 'completed').length,
      cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
      noShowAppointments: appointments.filter(a => a.status === 'no-show').length,
      scheduledAppointments: appointments.filter(a => a.status === 'scheduled').length,
      attendanceRate: 0,
      cancellationRate: 0,
      appointmentsByStatus: [],
      appointmentsByTreatment: [],
      appointmentsByDay: [],
      appointmentsByHour: [],
      peakHours: [],
      appointmentTrend: []
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('appointments', appointmentData, options)
  }

  static async exportPaymentsToPDF(payments: Payment[], clinicName: string = 'عيادة الأسنان الحديثة'): Promise<void> {
    const financialData: FinancialReportData = {
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      completedPayments: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      overduePayments: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
      paymentMethodStats: [],
      monthlyRevenue: [],
      revenueTrend: [],
      topTreatments: [],
      outstandingBalance: 0
    }

    const options: ReportExportOptions = {
      format: 'pdf',
      includeCharts: false,
      includeDetails: true,
      language: 'ar',
      orientation: 'landscape',
      pageSize: 'A4'
    }

    await this.exportToPDF('financial', financialData, options)
  }

  // Legacy Excel export functions
  static async exportPatientsToExcel(patients: Patient[]): Promise<void> {
    const patientData: PatientReportData = {
      totalPatients: patients.length,
      newPatientsThisMonth: 0,
      activePatients: patients.length,
      averageAge: 0,
      patients: patients,
      ageDistribution: [],
      genderDistribution: [],
      registrationTrend: []
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('patients', patientData, options)
  }

  static async exportAppointmentsToExcel(appointments: Appointment[]): Promise<void> {
    const appointmentData: AppointmentReportData = {
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === 'completed').length,
      cancelledAppointments: appointments.filter(a => a.status === 'cancelled').length,
      noShowAppointments: appointments.filter(a => a.status === 'no-show').length,
      scheduledAppointments: appointments.filter(a => a.status === 'scheduled').length,
      attendanceRate: 0,
      cancellationRate: 0,
      appointmentsByStatus: [],
      appointmentsByTreatment: [],
      appointmentsByDay: [],
      appointmentsByHour: [],
      peakHours: [],
      appointmentTrend: []
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('appointments', appointmentData, options)
  }

  static async exportPaymentsToExcel(payments: Payment[]): Promise<void> {
    const financialData: FinancialReportData = {
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      completedPayments: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      overduePayments: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0),
      paymentMethodStats: [],
      monthlyRevenue: [],
      revenueTrend: [],
      topTreatments: [],
      outstandingBalance: 0
    }

    const options: ReportExportOptions = {
      format: 'excel',
      includeCharts: false,
      includeDetails: true,
      language: 'ar'
    }

    await this.exportToExcel('financial', financialData, options)
  }
}
