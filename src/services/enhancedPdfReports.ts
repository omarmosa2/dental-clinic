import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  TreatmentReportData,
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

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">📅</div>
            <div class="card-content">
              <h3>إجمالي المواعيد</h3>
              <div class="number">${data.totalAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>المواعيد المكتملة</h3>
              <div class="number">${data.completedAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">❌</div>
            <div class="card-content">
              <h3>المواعيد الملغية</h3>
              <div class="number warning">${data.cancelledAppointments.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>عدم الحضور</h3>
              <div class="number danger">${data.noShowAppointments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h3>معدل الحضور</h3>
              <div class="number">${data.attendanceRate?.toFixed(1) || '0'}%</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">📉</div>
            <div class="card-content">
              <h3>معدل الإلغاء</h3>
              <div class="number warning">${data.cancellationRate?.toFixed(1) || '0'}%</div>
            </div>
          </div>
        </div>

        <!-- Appointments List Section -->
        ${data.appointmentsList && data.appointmentsList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة المواعيد
          </div>
          <div class="section-content">
            <div class="appointments-grid">
              ${data.appointmentsList.slice(0, 50).map((appointment: any, index: number) => {
                // Format appointment date and time
                const appointmentDate = appointment.start_time ? (() => {
                  try {
                    const date = new Date(appointment.start_time)
                    if (isNaN(date.getTime())) return 'غير محدد'
                    const day = date.getDate().toString().padStart(2, '0')
                    const month = (date.getMonth() + 1).toString().padStart(2, '0')
                    const year = date.getFullYear()
                    const time = date.toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })
                    return `${day}/${month}/${year} - ${time}`
                  } catch (error) {
                    return 'غير محدد'
                  }
                })() : 'غير محدد'

                // Get status display text and color
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'completed': return { text: 'مكتمل', class: 'status-completed' }
                    case 'cancelled': return { text: 'ملغي', class: 'status-cancelled' }
                    case 'no_show': return { text: 'لم يحضر', class: 'status-no-show' }
                    case 'scheduled': return { text: 'مجدول', class: 'status-scheduled' }
                    default: return { text: 'غير محدد', class: 'status-unknown' }
                  }
                }

                const statusInfo = getStatusInfo(appointment.status)

                return `
                  <div class="appointment-card">
                    <div class="appointment-header">
                      <div class="appointment-avatar">
                        ${(appointment.patient_name || 'م').charAt(0)}
                      </div>
                      <div class="appointment-info">
                        <h4 class="appointment-patient">${appointment.patient_name || 'غير محدد'}</h4>
                        <span class="appointment-serial">#${appointment.id || (index + 1).toString().padStart(3, '0')}</span>
                      </div>
                    </div>
                    <div class="appointment-details">
                      <div class="detail-item">
                        <span class="detail-label">التاريخ والوقت:</span>
                        <span class="detail-value">${appointmentDate}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">نوع العلاج:</span>
                        <span class="detail-value">${appointment.treatment_name || 'غير محدد'}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">المدة:</span>
                        <span class="detail-value">${appointment.duration || 30} دقيقة</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">الحالة:</span>
                        <span class="detail-value ${statusInfo.class}">${statusInfo.text}</span>
                      </div>
                      ${appointment.notes ? `
                      <div class="detail-item">
                        <span class="detail-label">ملاحظات:</span>
                        <span class="detail-value">${appointment.notes}</span>
                      </div>
                      ` : ''}
                    </div>
                  </div>
                `
              }).join('')}
            </div>
            ${data.appointmentsList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 موعد من إجمالي ${data.appointmentsList.length.toLocaleString()} موعد</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع المواعيد حسب الحالة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الحالة</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByStatus?.map(item => {
                    const percentage = parseFloat(item.percentage?.toFixed(1) || '0')
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.status}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="percentage-cell">${percentage}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('') || '<tr><td colspan="4" class="no-data">لا توجد بيانات</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        ${data.appointmentsByTreatment && data.appointmentsByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            توزيع المواعيد حسب نوع العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByTreatment.slice(0, 10).map(item => {
                    const maxCount = Math.max(...data.appointmentsByTreatment.map((t: any) => t.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.treatment}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        ${data.appointmentsByDay && data.appointmentsByDay.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📅</span>
            توزيع المواعيد حسب أيام الأسبوع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>اليوم</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.appointmentsByDay.map(item => {
                    const maxCount = Math.max(...data.appointmentsByDay.map((d: any) => d.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.day}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        ${data.peakHours && data.peakHours.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏰</span>
            أوقات الذروة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>عدد المواعيد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.peakHours.map(item => {
                    const maxCount = Math.max(...data.peakHours.map((h: any) => h.count))
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    const barWidth = Math.max(5, percentage)
                    return `
                      <tr>
                        <td class="category-cell">${item.hour}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
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

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>إجمالي الإيرادات</h3>
              <div class="number">$${data.totalRevenue?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <h3>المدفوعات المكتملة</h3>
              <div class="number">${data.completedPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">🔄</div>
            <div class="card-content">
              <h3>المدفوعات الجزئية</h3>
              <div class="number">${data.partialPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏳</div>
            <div class="card-content">
              <h3>المدفوعات المعلقة</h3>
              <div class="number">${data.pendingPayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>المدفوعات المتأخرة</h3>
              <div class="number">${data.overduePayments?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </div>

        <!-- Payment Methods Analysis -->
        ${data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">💳</span>
            الإيرادات حسب طريقة الدفع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>طريقة الدفع</th>
                    <th>المبلغ</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByPaymentMethod.map((item: any) => {
                    const percentage = item.percentage || 0
                    const barWidth = Math.max(5, percentage)
                    const methodIcon = item.method === 'نقدي' ? '💵' : item.method === 'بطاقة' ? '💳' : item.method === 'تحويل بنكي' ? '🏦' : '💰'
                    return `
                      <tr>
                        <td class="category-cell">${methodIcon} ${item.method}</td>
                        <td class="number-cell">$${item.amount?.toLocaleString() || '0'}</td>
                        <td class="percentage-cell">${percentage.toFixed(1)}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}



        ${data.revenueByTreatment && data.revenueByTreatment.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            الإيرادات حسب نوع العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
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
                      <td class="category-cell">${item.treatment}</td>
                      <td class="number-cell">$${item.amount?.toLocaleString() || '0'}</td>
                      <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                      <td class="number-cell">$${item.avgAmount?.toLocaleString() || '0'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Payment Status Analysis -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            تحليل حالات المدفوعات
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>حالة الدفع</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const totalPayments = data.dataCount || 0
                    const statusData = [
                      { status: 'مكتمل', count: data.completedPayments || 0, icon: '✅', color: 'success' },
                      { status: 'جزئي', count: data.partialPayments || 0, icon: '🔄', color: 'info' },
                      { status: 'معلق', count: data.pendingPayments || 0, icon: '⏳', color: 'warning' },
                      { status: 'متأخر', count: data.overduePayments || 0, icon: '⚠️', color: 'danger' },
                      { status: 'فاشل', count: data.failedPayments || 0, icon: '❌', color: 'danger' }
                    ]

                    return statusData.map(item => {
                      const percentage = totalPayments > 0 ? ((item.count / totalPayments) * 100) : 0
                      const barWidth = Math.max(5, percentage)
                      return `
                        <tr>
                          <td class="category-cell">${item.icon} ${item.status}</td>
                          <td class="number-cell">${item.count.toLocaleString()}</td>
                          <td class="percentage-cell">${percentage.toFixed(1)}%</td>
                          <td class="chart-cell">
                            <div class="progress-bar">
                              <div class="progress-fill ${item.color}" style="width: ${barWidth}%"></div>
                            </div>
                          </td>
                        </tr>
                      `
                    }).join('')
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Payment Status Analysis Summary -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            تحليل إحصائي لحالات المدفوعات
          </div>
          <div class="section-content">
            <div class="analysis-cards">
              ${(() => {
                const totalPayments = data.dataCount || 0
                const statusData = [
                  { status: 'مكتمل', count: data.completedPayments || 0, icon: '✅', color: '#065f46', bgColor: '#d1fae5' },
                  { status: 'جزئي', count: data.partialPayments || 0, icon: '🔄', color: '#1e40af', bgColor: '#dbeafe' },
                  { status: 'معلق', count: data.pendingPayments || 0, icon: '⏳', color: '#92400e', bgColor: '#fef3c7' },
                  { status: 'متأخر', count: data.overduePayments || 0, icon: '⚠️', color: '#991b1b', bgColor: '#fee2e2' }
                ]

                return statusData.map(item => {
                  const percentage = totalPayments > 0 ? ((item.count / totalPayments) * 100) : 0
                  return `
                    <div class="analysis-card" style="border-left-color: ${item.color}; border-left-width: 6px;">
                      <div class="analysis-icon" style="background: ${item.bgColor}; color: ${item.color}; border: 2px solid ${item.color};">
                        ${item.icon}
                      </div>
                      <div class="analysis-content">
                        <h3 style="color: ${item.color};">${item.status}</h3>
                        <div class="analysis-stats">
                          <div class="stat">
                            <span class="stat-label">العدد:</span>
                            <span class="stat-value" style="color: ${item.color};">${item.count.toLocaleString()}</span>
                          </div>
                          <div class="stat">
                            <span class="stat-label">النسبة:</span>
                            <span class="stat-value" style="color: ${item.color};">${percentage.toFixed(1)}%</span>
                          </div>
                          <div class="stat">
                            <span class="stat-label">من إجمالي:</span>
                            <span class="stat-value">${totalPayments.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  `
                }).join('')
              })()}
            </div>
          </div>
        </div>

        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
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
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">💰 ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalRevenue || 0)} إجمالي</span>
                <span class="stat-item">✅ ${data.completedPayments?.toLocaleString() || '0'} مكتمل</span>
                <span class="stat-item">🔄 ${data.partialPayments?.toLocaleString() || '0'} جزئي</span>
                <span class="stat-item">📊 ${data.dataCount?.toLocaleString() || '0'} معاملة</span>
              </div>
            </div>
          </div>
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

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">📦</div>
            <div class="card-content">
              <h3>إجمالي الأصناف</h3>
              <div class="number">${data.totalItems.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>القيمة الإجمالية</h3>
              <div class="number">$${data.totalValue?.toLocaleString() || '0'}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⚠️</div>
            <div class="card-content">
              <h3>أصناف منخفضة المخزون</h3>
              <div class="number">${data.lowStockItems || 0}</div>
            </div>
          </div>
          <div class="summary-card danger">
            <div class="card-icon">⏰</div>
            <div class="card-content">
              <h3>أصناف منتهية الصلاحية</h3>
              <div class="number">${data.expiredItems || 0}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">❌</div>
            <div class="card-content">
              <h3>أصناف نفد مخزونها</h3>
              <div class="number">${data.outOfStockItems || 0}</div>
            </div>
          </div>
        </div>

        <!-- Inventory Items List Section -->
        ${data.inventoryItems && data.inventoryItems.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة أصناف المخزون
          </div>
          <div class="section-content">
            <div class="inventory-grid">
              ${data.inventoryItems.slice(0, 50).map((item: any, index: number) => `
                <div class="inventory-card">
                  <div class="inventory-header">
                    <div class="inventory-avatar">
                      ${(item.name || 'ص').charAt(0)}
                    </div>
                    <div class="inventory-info">
                      <h4 class="inventory-name">${item.name || 'غير محدد'}</h4>
                      <span class="inventory-category">${item.category || 'غير مصنف'}</span>
                    </div>
                  </div>
                  <div class="inventory-details">
                    <div class="detail-item">
                      <span class="detail-label">الكمية:</span>
                      <span class="detail-value ${item.quantity <= item.minimum_stock ? 'status-warning' : 'status-success'}">${item.quantity.toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">سعر الوحدة:</span>
                      <span class="detail-value">$${(item.unit_price || item.cost_per_unit || 0).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">القيمة الإجمالية:</span>
                      <span class="detail-value">$${((item.unit_price || item.cost_per_unit || 0) * item.quantity).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الحد الأدنى:</span>
                      <span class="detail-value">${item.minimum_stock || 0}</span>
                    </div>
                    ${item.expiry_date ? `
                    <div class="detail-item">
                      <span class="detail-label">تاريخ الانتهاء:</span>
                      <span class="detail-value ${new Date(item.expiry_date) < new Date() ? 'status-danger' : 'status-info'}">${new Date(item.expiry_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                      <span class="detail-label">الحالة:</span>
                      <span class="detail-value ${
                        item.quantity === 0 ? 'status-danger' :
                        item.quantity <= item.minimum_stock ? 'status-warning' :
                        'status-success'
                      }">
                        ${item.quantity === 0 ? 'نفد المخزون' :
                          item.quantity <= item.minimum_stock ? 'مخزون منخفض' :
                          'متوفر'}
                      </span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            ${data.inventoryItems.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 صنف من إجمالي ${data.inventoryItems.length.toLocaleString()} صنف</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Category Distribution -->
        ${data.itemsByCategory && data.itemsByCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع الأصناف حسب الفئة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الفئة</th>
                    <th>عدد الأصناف</th>
                    <th>القيمة الإجمالية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.itemsByCategory.map((item: any) => {
                    const percentage = data.totalItems > 0 ? Math.round((item.count / data.totalItems) * 100) : 0
                    return `
                    <tr>
                      <td class="category-name">${item.category}</td>
                      <td class="count-cell">${item.count.toLocaleString()}</td>
                      <td class="value-cell">$${item.value?.toLocaleString() || '0'}</td>
                      <td class="progress-cell">
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="percentage">${percentage}%</span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Stock Alerts Section -->
        ${data.stockAlerts && data.stockAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⚠️</span>
            تنبيهات المخزون
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>الكمية الحالية</th>
                    <th>الحد الأدنى</th>
                    <th>الحالة</th>
                    <th>مستوى التنبيه</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.stockAlerts.slice(0, 20).map((item: any) => {
                    const alertLevel = item.quantity === 0 ? 'critical' : 'warning'
                    const percentage = item.minimum_stock > 0 ? Math.min(100, Math.round((item.quantity / item.minimum_stock) * 100)) : 0
                    return `
                    <tr>
                      <td class="item-name">${item.name}</td>
                      <td class="quantity-cell ${alertLevel}">${item.quantity.toLocaleString()}</td>
                      <td class="minimum-cell">${item.minimum_stock || 0}</td>
                      <td class="status-cell">
                        <span class="status-badge ${alertLevel}">
                          ${item.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                        </span>
                      </td>
                      <td class="alert-level">
                        ${item.quantity === 0 ? '🔴 عاجل' : '🟡 تحذير'}
                      </td>
                      <td class="progress-cell">
                        <div class="progress-bar">
                          <div class="progress-fill ${alertLevel}" style="width: ${percentage}%"></div>
                        </div>
                        <span class="percentage">${percentage}%</span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.stockAlerts.length > 20 ? `
            <div class="pagination-info">
              <p>عرض أول 20 تنبيه من إجمالي ${data.stockAlerts.length.toLocaleString()} تنبيه</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Expiry Alerts Section -->
        ${data.expiryAlerts && data.expiryAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏰</span>
            تنبيهات انتهاء الصلاحية
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>تاريخ الانتهاء</th>
                    <th>الأيام المتبقية</th>
                    <th>الكمية</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.expiryAlerts.slice(0, 15).map((item: any) => {
                    const expiryDate = new Date(item.expiry_date)
                    const today = new Date()
                    const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    const isExpired = daysRemaining < 0
                    const isExpiringSoon = daysRemaining <= 30 && daysRemaining >= 0

                    return `
                    <tr>
                      <td class="item-name">${item.name}</td>
                      <td class="date-cell">${expiryDate.toLocaleDateString('ar-SA')}</td>
                      <td class="days-cell ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'safe'}">
                        ${isExpired ? 'منتهي الصلاحية' : `${daysRemaining} يوم`}
                      </td>
                      <td class="quantity-cell">${item.quantity.toLocaleString()}</td>
                      <td class="status-cell">
                        <span class="status-badge ${isExpired ? 'critical' : isExpiringSoon ? 'warning' : 'safe'}">
                          ${isExpired ? 'منتهي' : isExpiringSoon ? 'ينتهي قريباً' : 'آمن'}
                        </span>
                      </td>
                    </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.expiryAlerts.length > 15 ? `
            <div class="pagination-info">
              <p>عرض أول 15 تنبيه من إجمالي ${data.expiryAlerts.length.toLocaleString()} تنبيه</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Enhanced Footer -->
        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
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
              ${data.filterInfo ? `<p class="filter-info">📊 ${data.filterInfo}</p>` : ''}
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">📦 ${data.totalItems?.toLocaleString() || '0'} صنف</span>
                <span class="stat-item">💰 $${data.totalValue?.toLocaleString() || '0'} قيمة</span>
                <span class="stat-item">⚠️ ${data.lowStockItems?.toLocaleString() || '0'} منخفض</span>
                <span class="stat-item">📊 ${data.dataCount?.toLocaleString() || '0'} مفلتر</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create enhanced HTML report for treatments
  static createEnhancedTreatmentReportHTML(data: TreatmentReportData, settings?: ClinicSettings | null): string {
    const header = PdfService.getEnhancedHeader('تقرير العلاجات السنية', settings, 'تقرير شامل عن إحصائيات العلاجات والإيرادات')
    const styles = PdfService.getEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العلاجات - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Statistics -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            ملخص الإحصائيات
          </div>
          <div class="section-content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${data.totalTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">إجمالي العلاجات</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.completedTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات المكتملة</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.plannedTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات المخططة</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.inProgressTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">قيد التنفيذ</div>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalRevenue || 0)}</div>
                <div class="stat-label">إجمالي الإيرادات</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.averageTreatmentCost || 0)}</div>
                <div class="stat-label">متوسط تكلفة العلاج</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.completionRate || '0'}%</div>
                <div class="stat-label">معدل الإنجاز</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.cancelledTreatments?.toLocaleString() || '0'}</div>
                <div class="stat-label">العلاجات الملغية</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Treatment Status Distribution -->
        ${data.treatmentsByStatus && data.treatmentsByStatus.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            توزيع العلاجات حسب الحالة
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الحالة</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.treatmentsByStatus.map(item => {
                    const barWidth = Math.max(5, item.percentage || 0)
                    return `
                      <tr>
                        <td class="category-cell">${item.status}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="percentage-cell">${item.percentage?.toFixed(1) || '0'}%</td>
                        <td class="progress-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Treatment Types Distribution -->
        ${data.treatmentsByType && data.treatmentsByType.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">🦷</span>
            توزيع العلاجات حسب النوع
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.treatmentsByType.slice(0, 15).map(item => {
                    const barWidth = Math.max(5, item.percentage || 0)
                    return `
                      <tr>
                        <td class="category-cell">${item.type}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="percentage-cell">${item.percentage?.toFixed(1) || '0'}%</td>
                        <td class="progress-cell">
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${barWidth}%"></div>
                          </div>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${data.treatmentsByType.length > 15 ? `
            <div class="pagination-info">
              <p>عرض أول 15 نوع من إجمالي ${data.treatmentsByType.length.toLocaleString()} نوع</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Revenue by Category -->
        ${data.revenueByCategory && data.revenueByCategory.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">💰</span>
            الإيرادات حسب فئة العلاج
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>فئة العلاج</th>
                    <th>إجمالي الإيرادات</th>
                    <th>عدد العلاجات</th>
                    <th>متوسط التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByCategory.slice(0, 10).map(item => {
                    const avgCost = item.count > 0 ? (item.revenue / item.count) : 0
                    return `
                      <tr>
                        <td class="category-cell">${item.category}</td>
                        <td class="number-cell">${item.revenue?.toLocaleString() || '0'} ${settings?.currency || '$'}</td>
                        <td class="number-cell">${item.count?.toLocaleString() || '0'}</td>
                        <td class="number-cell">${avgCost.toLocaleString()} ${settings?.currency || '$'}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Pending Treatments -->
        ${data.pendingTreatments && data.pendingTreatments.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">⏳</span>
            العلاجات المعلقة (${data.pendingTreatments.length})
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>نوع العلاج</th>
                    <th>اسم المريض</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.pendingTreatments.slice(0, 20).map(treatment => `
                    <tr>
                      <td class="category-cell">${treatment.treatment_type || 'غير محدد'}</td>
                      <td class="patient-cell">${treatment.patient_name || 'غير محدد'}</td>
                      <td class="status-cell">
                        <span class="status-badge warning">${treatment.status || 'معلق'}</span>
                      </td>
                      <td class="date-cell">${treatment.created_at ? (() => {
                        const date = new Date(treatment.created_at)
                        const day = date.getDate().toString().padStart(2, '0')
                        const month = (date.getMonth() + 1).toString().padStart(2, '0')
                        const year = date.getFullYear()
                        return `${day}/${month}/${year}`
                      })() : 'غير محدد'}</td>
                      <td class="number-cell">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(treatment.cost || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ${data.pendingTreatments.length > 20 ? `
            <div class="pagination-info">
              <p>عرض أول 20 علاج من إجمالي ${data.pendingTreatments.length.toLocaleString()} علاج معلق</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Enhanced Footer -->
        <div class="report-footer">
          <div class="footer-content">
            <div class="footer-left">
              <p class="footer-title">تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة</p>
              <p class="generated-info">تاريخ الإنشاء: ${(() => {
                const date = new Date()
                const day = date.getDate().toString().padStart(2, '0')
                const month = (date.getMonth() + 1).toString().padStart(2, '0')
                const year = date.getFullYear()
                const time = date.toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                return `${day}/${month}/${year} - ${time}`
              })()}</p>
            </div>
            <div class="footer-right">
              <p class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان الحديثة'}</p>
              ${settings?.clinic_address ? `<p class="clinic-address">${settings.clinic_address}</p>` : ''}
              ${settings?.clinic_phone ? `<p class="clinic-phone">📞 ${settings.clinic_phone}</p>` : ''}
            </div>
          </div>
        </div>

      </body>
      </html>
    `
  }
}
