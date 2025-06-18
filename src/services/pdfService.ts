import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData
} from '../types'

export class PdfService {
  // Simple PDF export using HTML and print functionality
  static async exportPatientReport(data: PatientReportData): Promise<void> {
    try {
      const htmlContent = this.createPatientReportHTML(data)
      this.downloadHTML(htmlContent, 'تقرير_المرضى')
    } catch (error) {
      console.error('Error exporting patient report:', error)
      throw new Error('فشل في تصدير تقرير المرضى')
    }
  }

  static async exportAppointmentReport(data: AppointmentReportData): Promise<void> {
    try {
      const htmlContent = this.createAppointmentReportHTML(data)
      this.downloadHTML(htmlContent, 'تقرير_المواعيد')
    } catch (error) {
      console.error('Error exporting appointment report:', error)
      throw new Error('فشل في تصدير تقرير المواعيد')
    }
  }

  static async exportFinancialReport(data: any): Promise<void> {
    try {
      const htmlContent = this.createFinancialReportHTML(data)
      this.downloadHTML(htmlContent, 'التقرير_المالي')
    } catch (error) {
      console.error('Error exporting financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي')
    }
  }

  static async exportInventoryReport(data: InventoryReportData): Promise<void> {
    try {
      const htmlContent = this.createInventoryReportHTML(data)
      this.downloadHTML(htmlContent, 'تقرير_المخزون')
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
      this.downloadHTML(htmlContent, 'التقرير_الشامل')
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
            <div class="number">${data.newPatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى النشطون</h3>
            <div class="number">${data.activePatients}</div>
          </div>
          <div class="summary-card">
            <h3>المرضى غير النشطين</h3>
            <div class="number">${data.inactivePatients}</div>
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
              ${data.ageDistribution.map(item => `
                <tr>
                  <td>${item.ageGroup}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('')}
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
              ${data.genderDistribution.map(item => `
                <tr>
                  <td>${item.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                  <td>${item.count}</td>
                </tr>
              `).join('')}
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
          <div class="report-date">${new Date().toLocaleDateString('ar-SA')}</div>
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
            <div class="number">${data.noShowAppointments}</div>
          </div>
          <div class="summary-card">
            <h3>معدل الحضور</h3>
            <div class="number">${data.attendanceRate.toFixed(1)}%</div>
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
              ${data.appointmentsByStatus.map(item => `
                <tr>
                  <td>${this.translateStatus(item.status)}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                </tr>
              `).join('')}
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
          <div class="report-date">${new Date().toLocaleDateString('ar-SA')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الإيرادات</h3>
            <div class="number">${data.totalRevenue?.toLocaleString() || 0} ريال</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المكتملة</h3>
            <div class="number">${data.totalRevenue?.toLocaleString() || 0} ريال</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المعلقة</h3>
            <div class="number">${data.pendingPayments?.toLocaleString() || 0} ريال</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المتأخرة</h3>
            <div class="number">${data.overduePayments?.toLocaleString() || 0} ريال</div>
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
          <div class="report-date">${new Date().toLocaleDateString('ar-SA')}</div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الأصناف</h3>
            <div class="number">${data.totalItems}</div>
          </div>
          <div class="summary-card">
            <h3>القيمة الإجمالية</h3>
            <div class="number">${data.totalValue.toLocaleString()} ريال</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منخفضة المخزون</h3>
            <div class="number warning">${data.lowStockItems}</div>
          </div>
          <div class="summary-card">
            <h3>أصناف منتهية الصلاحية</h3>
            <div class="number danger">${data.expiredItems}</div>
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
              ${data.itemsByCategory.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.count}</td>
                  <td>${item.value.toLocaleString()} ريال</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${data.stockAlerts.length > 0 ? `
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
          <div class="report-date">${new Date().toLocaleDateString('ar-SA')}</div>
        </div>

        <div class="summary-section">
          <div class="summary-group">
            <h3>المرضى</h3>
            <div class="summary-item">إجمالي: ${patientData.totalPatients}</div>
            <div class="summary-item">جدد: ${patientData.newPatients}</div>
            <div class="summary-item">نشطون: ${patientData.activePatients}</div>
          </div>
          <div class="summary-group">
            <h3>المواعيد</h3>
            <div class="summary-item">إجمالي: ${appointmentData.totalAppointments}</div>
            <div class="summary-item">مكتملة: ${appointmentData.completedAppointments}</div>
            <div class="summary-item">معدل الحضور: ${appointmentData.attendanceRate.toFixed(1)}%</div>
          </div>
          <div class="summary-group">
            <h3>الإيرادات</h3>
            <div class="summary-item">إجمالي: ${financialData.totalRevenue.toLocaleString()} ريال</div>
            <div class="summary-item">مكتملة: ${financialData.totalRevenue.toLocaleString()} ريال</div>
          </div>
          <div class="summary-group">
            <h3>المخزون</h3>
            <div class="summary-item">إجمالي الأصناف: ${inventoryData.totalItems}</div>
            <div class="summary-item">القيمة: ${inventoryData.totalValue.toLocaleString()} ريال</div>
            <div class="summary-item">تنبيهات: ${inventoryData.lowStockItems + inventoryData.expiredItems}</div>
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
                <td>${((patientData.newPatients / patientData.totalPatients) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>معدل حضور المواعيد</td>
                <td>${appointmentData.attendanceRate.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>معدل الإلغاء</td>
                <td>${appointmentData.cancellationRate.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>متوسط الإيراد لكل مريض</td>
                <td>${(financialData.totalRevenue / patientData.totalPatients).toLocaleString()} ريال</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `
  }

  // Helper method to download HTML as file
  private static downloadHTML(htmlContent: string, filename: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Also open in new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
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