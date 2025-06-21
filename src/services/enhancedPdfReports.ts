import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  ClinicSettings
} from '../types'
import { PdfService } from './pdfService'

export class EnhancedPdfReports {
  // Create enhanced HTML report for appointments
  static createEnhancedAppointmentReportHTML(data: AppointmentReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير المواعيد', settings, 'تقرير شامل عن إحصائيات المواعيد والحضور')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المواعيد - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي المواعيد</h3>
            <div class="number">${data.totalAppointments.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>المواعيد المكتملة</h3>
            <div class="number">${data.completedAppointments.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>المواعيد الملغية</h3>
            <div class="number warning">${data.cancelledAppointments.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>عدم الحضور</h3>
            <div class="number danger">${data.noShowAppointments?.toLocaleString() || '0'}</div>
          </div>
          <div class="summary-card">
            <h3>معدل الحضور</h3>
            <div class="number">${data.attendanceRate?.toFixed(1) || '0'}%</div>
          </div>
          <div class="summary-card">
            <h3>معدل الإلغاء</h3>
            <div class="number warning">${data.cancellationRate?.toFixed(1) || '0'}%</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📊 توزيع المواعيد حسب الحالة</div>
          <div class="section-content">
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
                    <td>${item.status}</td>
                    <td>${item.count.toLocaleString()}</td>
                    <td>${item.percentage?.toFixed(1) || '0'}%</td>
                  </tr>
                `).join('') || '<tr><td colspan="3">لا توجد بيانات</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        ${data.appointmentsByTreatment && data.appointmentsByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">🦷 توزيع المواعيد حسب نوع العلاج</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>نوع العلاج</th>
                  <th>عدد المواعيد</th>
                </tr>
              </thead>
              <tbody>
                ${data.appointmentsByTreatment.slice(0, 10).map(item => `
                  <tr>
                    <td>${item.treatment}</td>
                    <td>${item.count.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${data.appointmentsByDay && data.appointmentsByDay.length > 0 ? `
        <div class="section">
          <div class="section-title">📅 توزيع المواعيد حسب أيام الأسبوع</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>اليوم</th>
                  <th>عدد المواعيد</th>
                </tr>
              </thead>
              <tbody>
                ${data.appointmentsByDay.map(item => `
                  <tr>
                    <td>${item.day}</td>
                    <td>${item.count.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${data.peakHours && data.peakHours.length > 0 ? `
        <div class="section">
          <div class="section-title">⏰ أوقات الذروة</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>عدد المواعيد</th>
                </tr>
              </thead>
              <tbody>
                ${data.peakHours.map(item => `
                  <tr>
                    <td>${item.hour}</td>
                    <td>${item.count.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
          <p class="generated-info">تاريخ الإنشاء: ${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for financial data
  static createEnhancedFinancialReportHTML(data: any, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('التقرير المالي', settings, 'تقرير شامل عن الإيرادات والمدفوعات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الإيرادات</h3>
            <div class="number currency">$${data.totalRevenue?.toLocaleString() || '0'}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المكتملة</h3>
            <div class="number currency">$${data.totalPaid?.toLocaleString() || '0'}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المعلقة</h3>
            <div class="number warning">$${data.totalPending?.toLocaleString() || '0'}</div>
          </div>
          <div class="summary-card">
            <h3>المدفوعات المتأخرة</h3>
            <div class="number danger">$${data.totalOverdue?.toLocaleString() || '0'}</div>
          </div>
        </div>

        ${data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? `
        <div class="section">
          <div class="section-title">💳 الإيرادات حسب طريقة الدفع</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>طريقة الدفع</th>
                  <th>المبلغ</th>
                  <th>النسبة المئوية</th>
                </tr>
              </thead>
              <tbody>
                ${data.revenueByPaymentMethod.map((item: any) => `
                  <tr>
                    <td>${item.method}</td>
                    <td>$${item.amount?.toLocaleString() || '0'}</td>
                    <td>${item.percentage?.toFixed(1) || '0'}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${data.revenueByTreatment && data.revenueByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">🦷 الإيرادات حسب نوع العلاج</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>نوع العلاج</th>
                  <th>إجمالي الإيرادات</th>
                  <th>عدد المعاملات</th>
                  <th>متوسط المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${data.revenueByTreatment.slice(0, 10).map((item: any) => `
                  <tr>
                    <td>${item.treatment}</td>
                    <td>$${item.amount?.toLocaleString() || '0'}</td>
                    <td>${item.count?.toLocaleString() || '0'}</td>
                    <td>$${item.avgAmount?.toLocaleString() || '0'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
          <p class="generated-info">تاريخ الإنشاء: ${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for inventory
  static createEnhancedInventoryReportHTML(data: InventoryReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير المخزون', settings, 'تقرير شامل عن حالة المخزون والتنبيهات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المخزون - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <div class="summary-cards">
          <div class="summary-card">
            <h3>إجمالي الأصناف</h3>
            <div class="number">${data.totalItems.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <h3>القيمة الإجمالية</h3>
            <div class="number currency">$${data.totalValue?.toLocaleString() || '0'}</div>
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

        ${data.itemsByCategory && data.itemsByCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">📦 توزيع الأصناف حسب الفئة</div>
          <div class="section-content">
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
                    <td>${item.count.toLocaleString()}</td>
                    <td>$${item.value?.toLocaleString() || '0'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${data.stockAlerts && data.stockAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">⚠️ تنبيهات المخزون</div>
          <div class="section-content">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الكمية الحالية</th>
                  <th>الحالة</th>
                  <th>مستوى التنبيه</th>
                </tr>
              </thead>
              <tbody>
                ${data.stockAlerts.slice(0, 15).map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td class="${item.quantity === 0 ? 'danger' : 'warning'}">
                      ${item.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                    </td>
                    <td>
                      ${item.quantity === 0 ? '🔴 عاجل' : '🟡 تحذير'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <div class="report-footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
          <p class="generated-info">تاريخ الإنشاء: ${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()} | ${settings?.clinic_name || 'عيادة الأسنان'}</p>
        </div>
      </body>
      </html>
    `
  }
}
