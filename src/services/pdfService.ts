import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData
} from '../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export class PdfService {
  // Generate descriptive filename with date and time for PDF reports
  private static generatePDFFileName(reportType: string): string {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS

    // Arabic report names mapping
    const reportNames: { [key: string]: string } = {
      'patients': 'تقرير_المرضى',
      'appointments': 'تقرير_المواعيد',
      'financial': 'التقرير_المالي',
      'inventory': 'تقرير_المخزون',
      'comprehensive': 'التقرير_الشامل'
    }

    const reportName = reportNames[reportType] || `تقرير_${reportType}`
    return `${reportName}_${dateStr}_${timeStr}.pdf`
  }

  // Direct PDF export without opening print window
  static async exportPatientReport(data: PatientReportData): Promise<void> {
    try {
      const htmlContent = this.createPatientReportHTML(data)
      const fileName = this.generatePDFFileName('patients')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient report:', error)
      throw new Error('فشل في تصدير تقرير المرضى')
    }
  }

  static async exportAppointmentReport(data: AppointmentReportData): Promise<void> {
    try {
      const htmlContent = this.createAppointmentReportHTML(data)
      const fileName = this.generatePDFFileName('appointments')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting appointment report:', error)
      throw new Error('فشل في تصدير تقرير المواعيد')
    }
  }

  static async exportFinancialReport(data: any): Promise<void> {
    try {
      const htmlContent = this.createFinancialReportHTML(data)
      const fileName = this.generatePDFFileName('financial')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي')
    }
  }

  static async exportInventoryReport(data: InventoryReportData): Promise<void> {
    try {
      const htmlContent = this.createInventoryReportHTML(data)
      const fileName = this.generatePDFFileName('inventory')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting inventory report:', error)
      throw new Error('فشل في تصدير تقرير المخزون')
    }
  }

  static async exportComprehensiveReport(
    patientData: PatientReportData,
    appointmentData: AppointmentReportData,
    financialData: FinancialReportData,
    inventoryData: InventoryReportData
  ): Promise<void> {
    try {
      const htmlContent = this.createComprehensiveReportHTML(patientData, appointmentData, financialData, inventoryData)
      const fileName = this.generatePDFFileName('comprehensive')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive report:', error)
      throw new Error('فشل في تصدير التقرير الشامل')
    }
  }

  // Create HTML report for patients
  private static createPatientReportHTML(data: PatientReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المرضى</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 16px; color: #1e293b; }
          .summary-card .number { font-size: 24px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المرضى</div>
          <div class="report-date">${new Date().toLocaleDateString('ar-SA')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المرضى</h3>
            <div class="number">${data.totalPatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى الجدد</h3>
            <div class="number">${data.newPatients || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى النشطون</h3>
            <div class="number">${data.activePatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى غير النشطين</h3>
            <div class="number">${(data.totalPatients - data.activePatients) || 0}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">توزيع الأعمار</div>
          <table>
            <thead>
              <tr>
                <th>الفئة العمرية</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              ${data.ageDistribution?.map(item => `
                <tr>
                  <td>${item.ageGroup}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">توزيع الجنس</div>
          <table>
            <thead>
              <tr>
                <th>الجنس</th>
                <th>العدد</th>
              </tr>
            </thead>
            <tbody>
              ${data.genderDistribution?.map(item => `
                <tr>
                  <td>${item.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('') || '<tr><td colspan="2">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for appointments
  private static createAppointmentReportHTML(data: AppointmentReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المواعيد</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 120px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 20px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المواعيد</div>
          <div class="report-date">${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المواعيد</h3>
            <div class="number">${data.totalAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>المكتملة</h3>
            <div class="number">${data.completedAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>الملغية</h3>
            <div class="number">${data.cancelledAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>عدم الحضور</h3>
            <div class="number">${data.noShowAppointments || 0}</div>
          </div>
          <div class="summary-card">
            <h3>معدل الحضور</h3>
            <div class="number">${data.attendanceRate?.toFixed(1) || 0}%</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">توزيع المواعيد حسب الحالة</div>
          <table>
            <thead>
              <tr>
                <th>الحالة</th>
                <th>العدد</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              ${data.appointmentsByStatus?.map(item => `
                <tr>
                  <td>${this.translateStatus(item.status)}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage?.toFixed(1) || 0}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for financial data
  private static createFinancialReportHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 18px; font-weight: bold; color: #0ea5e9; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">التقرير المالي</div>
          <div class="report-date">${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الإيرادات</h3>
            <div class="number">$${data.totalRevenue?.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المكتملة</h3>
            <div class="number">$${data.totalRevenue?.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المعلقة</h3>
            <div class="number">$${data.pendingPayments?.toLocaleString() || 0}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المتأخرة</h3>
            <div class="number">$${data.overduePayments?.toLocaleString() || 0}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">إحصائيات طرق الدفع</div>
          <table>
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th>المبلغ</th>
                <th>عدد المعاملات</th>
              </tr>
            </thead>
            <tbody>
              ${data.paymentMethodStats?.map((item: any) => `
                <tr>
                  <td>${this.translatePaymentMethod(item.method)}</td>
                  <td>${item.amount?.toLocaleString() || 0} ريال</td>
                  <td>${item.count || 0}</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for inventory
  private static createInventoryReportHTML(data: InventoryReportData): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المخزون</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-cards { display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; margin: 5px; }
          .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #1e293b; }
          .summary-card .number { font-size: 18px; font-weight: bold; color: #0ea5e9; }
          .warning { color: #f59e0b !important; }
          .danger { color: #ef4444 !important; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">تقرير المخزون</div>
          <div class="report-date">${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الأصناف</h3>
            <div class="number">${data.totalItems}</div>
          </div>
          <div class="summary-card">
            <h3>القيمة الإجمالية</h3>
            <div class="number">${data.totalValue?.toLocaleString() || 0} ريال</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منخفضة المخزون</h3>
            <div class="number warning">${data.lowStockItems || 0}</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منتهية الصلاحية</h3>
            <div class="number danger">${data.expiredItems || 0}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">توزيع الأصناف حسب الفئة</div>
          <table>
            <thead>
              <tr>
                <th>الفئة</th>
                <th>عدد الأصناف</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              ${data.itemsByCategory?.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.count}</td>
                  <td>${item.value?.toLocaleString() || 0} ريال</td>
                </tr>
              `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>

        ${data.stockAlerts && data.stockAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">تنبيهات المخزون</div>
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية الحالية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${data.stockAlerts.slice(0, 10).map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td class="${item.quantity === 0 ? 'danger' : 'warning'}">
                    ${item.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `
  }

  // Create comprehensive HTML report
  private static createComprehensiveReportHTML(
    patientData: PatientReportData,
    appointmentData: AppointmentReportData,
    financialData: FinancialReportData,
    inventoryData: InventoryReportData
  ): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير الشامل</title>
        <style>
          body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .report-date { font-size: 14px; color: #64748b; }
          .summary-section { display: flex; justify-content: space-between; margin: 30px 0; flex-wrap: wrap; }
          .summary-group { background: #f8fafc; padding: 20px; border-radius: 8px; min-width: 200px; margin: 10px; }
          .summary-group h3 { margin: 0 0 15px 0; font-size: 16px; color: #0ea5e9; text-align: center; }
          .summary-item { margin: 8px 0; font-size: 14px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: bold; color: #1e293b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">عيادة الأسنان الحديثة</div>
          <div class="report-title">التقرير الشامل</div>
          <div class="report-date">${new Date().toLocaleDateString('en-GB')}</div>
        </div>

        <div class="summary-section">
          <div class="summary-group">
            <h3>المرضى</h3>
            <div class="summary-item">إجمالي: ${patientData.totalPatients}</div>
            <div class="summary-item">جدد: ${patientData.newPatients || 0}</div>
            <div class="summary-item">نشطون: ${patientData.activePatients}</div>
          </div>
          <div class="summary-group">
            <h3>المواعيد</h3>
            <div class="summary-item">إجمالي: ${appointmentData.totalAppointments}</div>
            <div class="summary-item">مكتملة: ${appointmentData.completedAppointments}</div>
            <div class="summary-item">معدل الحضور: ${appointmentData.attendanceRate?.toFixed(1) || 0}%</div>
          </div>
          <div class="summary-group">
            <h3>الإيرادات</h3>
            <div class="summary-item">إجمالي: ${financialData.totalRevenue?.toLocaleString() || 0} ريال</div>
            <div class="summary-item">مكتملة: ${financialData.totalRevenue?.toLocaleString() || 0} ريال</div>
          </div>
          <div class="summary-group">
            <h3>المخزون</h3>
            <div class="summary-item">إجمالي الأصناف: ${inventoryData.totalItems}</div>
            <div class="summary-item">القيمة: ${inventoryData.totalValue?.toLocaleString() || 0} ريال</div>
            <div class="summary-item">تنبيهات: ${(inventoryData.lowStockItems || 0) + (inventoryData.expiredItems || 0)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">مؤشرات الأداء الرئيسية</div>
          <table>
            <thead>
              <tr>
                <th>المؤشر</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>معدل نمو المرضى</td>
                <td>${(((patientData.newPatients || 0) / patientData.totalPatients) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>معدل حضور المواعيد</td>
                <td>${appointmentData.attendanceRate?.toFixed(1) || 0}%</td>
              </tr>
              <tr>
                <td>معدل الإلغاء</td>
                <td>${appointmentData.cancellationRate?.toFixed(1) || 0}%</td>
              </tr>
              <tr>
                <td>متوسط الإيراد لكل مريض</td>
                <td>$${((financialData.totalRevenue || 0) / patientData.totalPatients).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Convert HTML to PDF using html2canvas + jsPDF
  private static async convertHTMLToPDF(htmlContent: string, filename: string): Promise<void> {
    try {
      // Create a temporary div to render HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px' // Fixed width for consistent rendering
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.direction = 'rtl'
      tempDiv.style.fontSize = '14px'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.color = '#000'
      tempDiv.style.background = '#fff'
      tempDiv.style.padding = '20px'

      document.body.appendChild(tempDiv)

      // Wait a bit for fonts to load
      await new Promise(resolve => setTimeout(resolve, 100))

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempDiv.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })

      // Remove temporary div
      document.body.removeChild(tempDiv)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 10 // 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20) // Subtract page height minus margins

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      // Save the PDF
      pdf.save(filename)

    } catch (error) {
      console.error('Error converting HTML to PDF:', error)
      throw new Error('فشل في تحويل التقرير إلى PDF')
    }
  }

  // Helper methods for translations
  private static translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'عدم حضور',
      'in-progress': 'قيد التنفيذ'
    }
    return statusMap[status] || status
  }

  private static translatePaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'نقدي',
      'card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي',
      'insurance': 'تأمين',
      'installment': 'تقسيط'
    }
    return methodMap[method] || method
  }
}