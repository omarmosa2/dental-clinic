import {
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  ClinicSettings
} from '../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { EnhancedPdfReports } from './enhancedPdfReports'
import { getTreatmentNameInArabic, getCategoryNameInArabic, getStatusLabelInArabic, getPaymentStatusInArabic, getPriorityLabelInArabic, getClinicNeedStatusInArabic } from '@/utils/arabicTranslations'

export class PdfService {
  // Enhanced color scheme optimized for print clarity
  private static readonly COLORS = {
    primary: '#1a365d',      // Dark blue for better print contrast
    secondary: '#2c5282',    // Medium blue
    accent: '#92400e',       // Dark amber for print clarity
    success: '#065f46',      // Dark green for better print visibility
    warning: '#92400e',      // Dark amber
    danger: '#991b1b',       // Dark red
    muted: '#374151',        // Darker gray for better readability
    light: '#f9fafb',        // Very light gray with better contrast
    white: '#ffffff',
    border: '#d1d5db',       // Darker border for print visibility
    text: {
      primary: '#111827',    // Almost black for maximum print contrast
      secondary: '#374151',  // Dark gray
      muted: '#4b5563'       // Medium gray for better readability
    }
  }

  // Enhanced typography settings
  private static readonly TYPOGRAPHY = {
    fonts: {
      primary: "'Tajawal', 'Cairo', Arial, sans-serif",
      secondary: "'Tajawal', Arial, sans-serif",
      monospace: "'Courier New', monospace"
    },
    sizes: {
      h1: '28px',
      h2: '24px',
      h3: '20px',
      h4: '18px',
      h5: '16px',
      body: '14px',
      small: '12px',
      tiny: '10px'
    },
    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  }

  // Enhanced layout settings
  private static readonly LAYOUT = {
    margins: {
      top: '40px',
      bottom: '40px',
      left: '30px',
      right: '30px'
    },
    spacing: {
      section: '30px',
      card: '20px',
      element: '15px',
      small: '10px'
    },
    borderRadius: '12px',
    shadows: {
      card: '0 4px 20px rgba(0,0,0,0.08)',
      header: '0 2px 10px rgba(0,0,0,0.05)'
    }
  }

  // Public methods to access private functions from external files
  static getEnhancedHeader(title: string, settings?: ClinicSettings | null, subtitle?: string): string {
    return this.createEnhancedHeader(title, settings, subtitle)
  }

  static getEnhancedStyles(): string {
    return this.createEnhancedStyles()
  }

  // Create enhanced header with clinic information
  private static createEnhancedHeader(
    title: string,
    settings?: ClinicSettings | null,
    subtitle?: string
  ): string {
    const clinicName = settings?.clinic_name || 'عيادة الأسنان الحديثة'
    const doctorName = settings?.doctor_name || 'د. محمد أحمد'
    const clinicAddress = settings?.clinic_address || ''
    const clinicPhone = settings?.clinic_phone || ''
    const clinicLogo = settings?.clinic_logo || ''



    // Format date as DD/MM/YYYY (Gregorian calendar)
    const currentDate = (() => {
      const date = new Date()
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    })()

    return `
      <div class="enhanced-header">
        <div class="header-content">
          <div class="clinic-info">
            ${clinicLogo && clinicLogo.trim() !== '' ? `
              <div class="clinic-logo">
                <img src="${clinicLogo}" alt="شعار العيادة" />
              </div>
            ` : ''}
            <div class="clinic-details">
              <h1 class="clinic-name">${clinicName}</h1>
              ${doctorName ? `<h2 class="doctor-name">${doctorName}</h2>` : ''}
              ${clinicAddress ? `<p class="clinic-address">${clinicAddress}</p>` : ''}
              ${clinicPhone ? `<p class="clinic-phone">📞 ${clinicPhone}</p>` : ''}
            </div>
          </div>

          <div class="report-info">
            <h3 class="report-title">${title}</h3>
            ${subtitle ? `<p class="report-subtitle">${subtitle}</p>` : ''}
            <p class="report-date">📅 ${this.formatGregorianDate(new Date())}</p>
            <p class="report-time">🕐 ${new Date().toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        <div class="header-decoration"></div>
      </div>
    `
  }

  // Create enhanced CSS styles for professional reports
  private static createEnhancedStyles(): string {
    return `
      <style>
        @import url('/fonts/Tajawal-Regular.ttf');
        @import url('/fonts/Tajawal-Bold.ttf');
        @import url('/fonts/Tajawal-Medium.ttf');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: ${this.TYPOGRAPHY.fonts.primary};
          direction: rtl;
          line-height: 1.6;
          color: ${this.COLORS.text.primary};
          background: ${this.COLORS.white};
          margin: ${this.LAYOUT.margins.top} ${this.LAYOUT.margins.right} ${this.LAYOUT.margins.bottom} ${this.LAYOUT.margins.left};
          font-size: ${this.TYPOGRAPHY.sizes.body};
        }

        /* Enhanced Header Styles */
        .enhanced-header {
          background: linear-gradient(135deg, ${this.COLORS.primary} 0%, ${this.COLORS.secondary} 100%);
          color: ${this.COLORS.white};
          padding: ${this.LAYOUT.spacing.card};
          border-radius: ${this.LAYOUT.borderRadius};
          margin-bottom: ${this.LAYOUT.spacing.section};
          box-shadow: ${this.LAYOUT.shadows.header};
          position: relative;
          overflow: hidden;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 2;
        }

        .clinic-info {
          display: flex;
          align-items: center;
          gap: ${this.LAYOUT.spacing.element};
        }

        .clinic-logo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          overflow: hidden;
          background: ${this.COLORS.white};
          padding: 4px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
          border: 2px solid rgba(255,255,255,0.8);
          flex-shrink: 0;
        }

        .clinic-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          max-width: 70px;
          max-height: 70px;
        }

        .clinic-details h1.clinic-name {
          font-size: ${this.TYPOGRAPHY.sizes.h2};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          margin-bottom: 5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .clinic-details h2.doctor-name {
          font-size: ${this.TYPOGRAPHY.sizes.h4};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          margin-bottom: 8px;
          opacity: 0.95;
        }

        .clinic-details p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          margin-bottom: 3px;
          opacity: 0.9;
        }

        .report-info {
          text-align: left;
          direction: ltr;
        }

        .report-info h3.report-title {
          font-size: ${this.TYPOGRAPHY.sizes.h3};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          margin-bottom: 8px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .report-info p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          margin-bottom: 3px;
          opacity: 0.9;
        }

        .header-decoration {
          position: absolute;
          top: -50%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        /* Enhanced Card Styles */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: ${this.LAYOUT.spacing.element};
          margin: ${this.LAYOUT.spacing.section} 0;
        }

        .summary-card {
          background: ${this.COLORS.white};
          border: 2px solid ${this.COLORS.border};
          border-radius: ${this.LAYOUT.borderRadius};
          padding: ${this.LAYOUT.spacing.card};
          box-shadow: ${this.LAYOUT.shadows.card};
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .summary-card.primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.primary};
        }

        .summary-card.success::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.success};
        }

        .summary-card.info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: #1e40af;
        }

        .summary-card.warning::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 6px;
          background: ${this.COLORS.warning};
        }

        .card-icon {
          font-size: 32px;
          min-width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${this.COLORS.light};
          border-radius: 50%;
          flex-shrink: 0;
        }

        .card-content {
          flex: 1;
          text-align: right;
        }

        .summary-card h3 {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.semibold};
          color: ${this.COLORS.text.secondary};
          margin-bottom: ${this.LAYOUT.spacing.small};
        }

        .summary-card .number {
          font-size: ${this.TYPOGRAPHY.sizes.h2};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
          margin-bottom: 5px;
        }

        .summary-card .currency {
          color: ${this.COLORS.success};
        }

        .summary-card .warning {
          color: ${this.COLORS.warning};
        }

        .summary-card .danger {
          color: ${this.COLORS.danger};
        }

        /* Enhanced Section Styles */
        .section {
          margin: ${this.LAYOUT.spacing.section} 0;
          background: ${this.COLORS.white};
          border-radius: ${this.LAYOUT.borderRadius};
          overflow: hidden;
          box-shadow: ${this.LAYOUT.shadows.card};
        }

        .section-title {
          font-size: ${this.TYPOGRAPHY.sizes.h4};
          font-weight: ${this.TYPOGRAPHY.weights.semibold};
          color: ${this.COLORS.primary};
          margin-bottom: ${this.LAYOUT.spacing.element};
          padding: ${this.LAYOUT.spacing.element} ${this.LAYOUT.spacing.card};
          background: linear-gradient(90deg, ${this.COLORS.light} 0%, ${this.COLORS.white} 100%);
          border-bottom: 2px solid ${this.COLORS.border};
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: ${this.COLORS.primary};
        }

        .section-icon {
          font-size: 20px;
        }

        .section-content {
          padding: ${this.LAYOUT.spacing.card};
        }

        /* Patient Cards Grid */
        .patients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .patient-card {
          background: ${this.COLORS.white};
          border: 2px solid ${this.COLORS.border};
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .patient-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          border-color: ${this.COLORS.primary};
        }

        .patient-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .patient-avatar {
          width: 50px;
          height: 50px;
          background: ${this.COLORS.primary};
          color: ${this.COLORS.white};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .patient-info {
          flex: 1;
        }

        .patient-name {
          font-size: 16px;
          font-weight: bold;
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
        }

        .patient-serial {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .patient-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .detail-label {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          font-weight: medium;
        }

        .detail-value {
          font-size: 12px;
          color: ${this.COLORS.text.primary};
          font-weight: bold;
        }

        .status-active {
          color: ${this.COLORS.success};
        }

        .pagination-info {
          text-align: center;
          padding: 20px;
          background: ${this.COLORS.light};
          border-radius: 8px;
          margin-top: 20px;
        }

        .pagination-info p {
          color: ${this.COLORS.text.muted};
          font-size: 14px;
          margin: 0;
        }

        /* Appointment Cards Grid */
        .appointments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .appointment-card {
          background: ${this.COLORS.white};
          border: 2px solid ${this.COLORS.border};
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .appointment-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          border-color: ${this.COLORS.accent};
        }

        .appointment-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .appointment-avatar {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, ${this.COLORS.accent}, ${this.COLORS.warning});
          color: ${this.COLORS.white};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .appointment-info {
          flex: 1;
        }

        .appointment-patient {
          font-size: 16px;
          font-weight: bold;
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
        }

        .appointment-serial {
          font-size: 12px;
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .appointment-details {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .status-completed {
          color: ${this.COLORS.success};
          background: rgba(6, 95, 70, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-cancelled {
          color: ${this.COLORS.warning};
          background: rgba(146, 64, 14, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-no-show {
          color: ${this.COLORS.danger};
          background: rgba(153, 27, 27, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-scheduled {
          color: ${this.COLORS.primary};
          background: rgba(26, 54, 93, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        .status-unknown {
          color: ${this.COLORS.text.muted};
          background: rgba(75, 85, 99, 0.1);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          display: inline-block;
        }

        /* Enhanced Table Styles */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: ${this.LAYOUT.spacing.element} 0;
          background: ${this.COLORS.white};
          border-radius: ${this.LAYOUT.borderRadius};
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        th {
          background: linear-gradient(135deg, ${this.COLORS.primary} 0%, ${this.COLORS.secondary} 100%);
          color: ${this.COLORS.white};
          font-weight: ${this.TYPOGRAPHY.weights.semibold};
          font-size: ${this.TYPOGRAPHY.sizes.small};
          padding: ${this.LAYOUT.spacing.element};
          text-align: center;
          border: none;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        td {
          padding: ${this.LAYOUT.spacing.small} ${this.LAYOUT.spacing.element};
          text-align: center;
          border-bottom: 1px solid ${this.COLORS.border};
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.primary};
        }

        tr:nth-child(even) {
          background: ${this.COLORS.light};
        }

        tr:hover {
          background: rgba(14, 165, 233, 0.05);
        }

        /* Enhanced Footer */
        .report-footer {
          margin-top: ${this.LAYOUT.spacing.section};
          padding: ${this.LAYOUT.spacing.card};
          background: ${this.COLORS.light};
          border-radius: ${this.LAYOUT.borderRadius};
          text-align: center;
          border-top: 3px solid ${this.COLORS.primary};
        }

        .report-footer p {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.secondary};
          margin-bottom: 5px;
        }

        .report-footer .generated-info {
          font-size: ${this.TYPOGRAPHY.sizes.tiny};
          color: ${this.COLORS.text.muted};
          font-style: italic;
        }

        /* Enhanced Data Table Styles */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: ${this.LAYOUT.spacing.element} 0;
          background: ${this.COLORS.white};
          border-radius: ${this.LAYOUT.borderRadius};
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .data-table th {
          background: ${this.COLORS.primary};
          color: ${this.COLORS.white};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          padding: ${this.LAYOUT.spacing.element};
          text-align: center;
          font-size: ${this.TYPOGRAPHY.sizes.body};
          border: 2px solid ${this.COLORS.border};
          border-bottom: 3px solid ${this.COLORS.secondary};
        }

        .data-table td {
          padding: ${this.LAYOUT.spacing.element};
          text-align: center;
          border: 1px solid ${this.COLORS.border};
          font-size: ${this.TYPOGRAPHY.sizes.body};
          color: ${this.COLORS.text.primary};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .data-table tr:nth-child(even) {
          background: ${this.COLORS.light};
        }

        .data-table tr:nth-child(odd) {
          background: ${this.COLORS.white};
        }

        .data-table tr:hover {
          background: #e2e8f0;
        }

        .category-cell {
          text-align: right !important;
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .number-cell {
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
        }

        .percentage-cell {
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          color: ${this.COLORS.text.secondary};
        }

        .chart-cell {
          width: 150px;
          padding: 8px !important;
        }

        .progress-bar {
          width: 100%;
          height: 20px;
          background: ${this.COLORS.light};
          border: 1px solid ${this.COLORS.border};
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: ${this.COLORS.primary};
          border-radius: 8px;
          transition: width 0.3s ease;
          position: relative;
          border: 1px solid ${this.COLORS.secondary};
        }

        .progress-fill.gender-male {
          background: #1e40af;
          border-color: #1e3a8a;
        }

        .progress-fill.gender-female {
          background: #be185d;
          border-color: #9d174d;
        }

        .progress-fill.trend {
          background: ${this.COLORS.success};
          border-color: #047857;
        }

        .no-data {
          text-align: center !important;
          color: ${this.COLORS.text.muted};
          font-style: italic;
          padding: 30px !important;
        }

        .chart-container {
          background: ${this.COLORS.white};
          border-radius: 8px;
          overflow: hidden;
        }

        /* Enhanced Footer Styles */
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .footer-left {
          flex: 1;
          text-align: right;
        }

        .footer-right {
          flex-shrink: 0;
        }

        .footer-title {
          margin: 0 0 5px 0;
          color: ${this.COLORS.text.primary};
          font-size: ${this.TYPOGRAPHY.sizes.body};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .footer-stats {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .stat-item {
          background: ${this.COLORS.white};
          padding: 8px 12px;
          border-radius: 20px;
          font-size: ${this.TYPOGRAPHY.sizes.small};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          color: ${this.COLORS.text.primary};
          border: 1px solid ${this.COLORS.border};
        }

        /* Page Break */
        .page-break {
          page-break-before: always;
          break-before: page;
          height: 0;
          margin: 0;
          padding: 0;
        }

        /* Page Header for New Pages */
        .page-header {
          text-align: center;
          margin: 40px 0 30px 0;
          padding: 30px 20px;
          background: linear-gradient(135deg, ${this.COLORS.light} 0%, ${this.COLORS.white} 100%);
          border-radius: ${this.LAYOUT.borderRadius};
          border: 2px solid ${this.COLORS.border};
          position: relative;
        }

        .page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
          border-radius: ${this.LAYOUT.borderRadius} ${this.LAYOUT.borderRadius} 0 0;
        }

        .page-title {
          font-size: ${this.TYPOGRAPHY.sizes.h2};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
          margin: 0 0 10px 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .page-subtitle {
          font-size: ${this.TYPOGRAPHY.sizes.body};
          color: ${this.COLORS.text.secondary};
          margin: 0;
          font-style: italic;
        }

        /* Analysis Cards */
        .analysis-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .analysis-card {
          background: ${this.COLORS.white};
          border: 1px solid ${this.COLORS.border};
          border-left: 4px solid ${this.COLORS.primary};
          border-radius: ${this.LAYOUT.borderRadius};
          padding: 25px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
        }

        .analysis-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        .analysis-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
        }

        .analysis-content {
          flex: 1;
        }

        .analysis-content h3 {
          font-size: ${this.TYPOGRAPHY.sizes.h4};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.text.primary};
          margin: 0 0 15px 0;
        }

        .analysis-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .stat-label {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.muted};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
        }

        .stat-value {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.primary};
        }

        /* Inventory Specific Styles */
        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .inventory-card {
          background: ${this.COLORS.white};
          border: 1px solid ${this.COLORS.border};
          border-radius: ${this.LAYOUT.borderRadius};
          padding: 20px;
          box-shadow: ${this.LAYOUT.shadows.card};
          transition: all 0.3s ease;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .inventory-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(0,0,0,0.12);
        }

        .inventory-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid ${this.COLORS.border};
        }

        .inventory-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
          color: ${this.COLORS.white};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .inventory-info {
          flex: 1;
          min-width: 0;
        }

        .inventory-name {
          font-size: ${this.TYPOGRAPHY.sizes.h5};
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          color: ${this.COLORS.text.primary};
          margin: 0 0 5px 0;
          line-height: 1.3;
          word-wrap: break-word;
        }

        .inventory-category {
          font-size: ${this.TYPOGRAPHY.sizes.small};
          color: ${this.COLORS.text.muted};
          background: ${this.COLORS.light};
          padding: 4px 8px;
          border-radius: 12px;
          display: inline-block;
        }

        .inventory-details {
          display: grid;
          gap: 10px;
        }

        .status-warning {
          color: #f59e0b !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-success {
          color: #10b981 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-danger {
          color: #ef4444 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .status-info {
          color: #3b82f6 !important;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        /* Alert Level Styles */
        .alert-level {
          font-weight: ${this.TYPOGRAPHY.weights.bold};
          text-align: center;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: ${this.TYPOGRAPHY.sizes.small};
          font-weight: ${this.TYPOGRAPHY.weights.medium};
          text-align: center;
          display: inline-block;
        }

        .status-badge.critical {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .status-badge.warning {
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fed7aa;
        }

        .status-badge.safe {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        /* Expiry Status Styles */
        .days-cell.expired {
          color: #dc2626;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .days-cell.expiring {
          color: #d97706;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .days-cell.safe {
          color: #16a34a;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .quantity-cell.critical {
          color: #dc2626;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .quantity-cell.warning {
          color: #d97706;
          font-weight: ${this.TYPOGRAPHY.weights.bold};
        }

        .progress-fill.critical {
          background: linear-gradient(90deg, #dc2626, #ef4444);
        }

        .progress-fill.warning {
          background: linear-gradient(90deg, #d97706, #f59e0b);
        }

        /* Print Optimizations */
        @media print {
          body {
            margin: 0;
            padding: 20px;
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .enhanced-header {
            background: ${this.COLORS.primary} !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .summary-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .summary-card::before {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .section {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .inventory-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .data-table {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .data-table th {
            background: ${this.COLORS.primary} !important;
            color: white !important;
            border: 2px solid ${this.COLORS.border} !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .data-table td {
            border: 1px solid ${this.COLORS.border} !important;
          }

          .progress-fill {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            border: 1px solid ${this.COLORS.text.primary} !important;
          }

          .patient-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .appointment-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          .analysis-card {
            border: 2px solid ${this.COLORS.border} !important;
            box-shadow: none !important;
          }

          table {
            break-inside: auto;
          }

          tr {
            break-inside: avoid;
            break-after: auto;
          }

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      </style>
    `
  }

  // Generate descriptive filename with date and time for PDF reports in DD-MM-YYYY format
  private static generatePDFFileName(reportType: string): string {
    const now = new Date()
    // Format date as DD-MM-YYYY for filename (Gregorian calendar)
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const year = now.getFullYear()
    const dateStr = `${day}-${month}-${year}`
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS

    // Arabic report names mapping
    const reportNames: { [key: string]: string } = {
      'patients': 'تقرير_المرضى',
      'appointments': 'تقرير_المواعيد',
      'financial': 'التقرير_المالي',
      'inventory': 'تقرير_المخزون',
      'treatments': 'تقرير_العلاجات',
      'comprehensive': 'التقرير_الشامل'
    }

    const reportName = reportNames[reportType] || `تقرير_${reportType}`
    return `${reportName}_${dateStr}_${timeStr}.pdf`
  }

  // Direct PDF export without opening print window
  static async exportPatientReport(data: PatientReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createEnhancedPatientReportHTML(data, settings)
      const fileName = this.generatePDFFileName('patients')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting patient report:', error)
      throw new Error('فشل في تصدير تقرير المرضى')
    }
  }

  static async exportAppointmentReport(data: AppointmentReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedAppointmentReportHTML(data, settings)
      const fileName = this.generatePDFFileName('appointments')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting appointment report:', error)
      throw new Error('فشل في تصدير تقرير المواعيد')
    }
  }

  static async exportFinancialReport(data: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedFinancialReportHTML(data, settings)
      const fileName = this.generatePDFFileName('financial')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي')
    }
  }

  static async exportInventoryReport(data: InventoryReportData, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedInventoryReportHTML(data, settings)
      const fileName = this.generatePDFFileName('inventory')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting inventory report:', error)
      throw new Error('فشل في تصدير تقرير المخزون')
    }
  }

  /**
   * تصدير فاتورة المدفوعات المعلقة الشاملة كـ PDF
   */
  static async exportComprehensivePendingInvoice(invoiceData: any): Promise<void> {
    try {
      const htmlContent = this.createComprehensivePendingInvoiceHTML(invoiceData)
      const fileName = this.generatePDFFileName(`pending-invoice-${invoiceData.patient.full_name}`)
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive pending invoice:', error)
      throw new Error('فشل في تصدير فاتورة المدفوعات المعلقة')
    }
  }

  /**
   * إنشاء HTML لفاتورة المدفوعات المعلقة الشاملة
   */
  private static createComprehensivePendingInvoiceHTML(invoiceData: any): string {
    const { patient, summary, settings: invoiceSettings, clinic_info } = invoiceData

    // دوال مساعدة لتنسيق التاريخ والعملة
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
          return 'غير محدد'
        }
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      } catch (error) {
        return 'غير محدد'
      }
    }

    const formatDateTime = (dateTimeString: string) => {
      try {
        const date = new Date(dateTimeString)
        if (isNaN(date.getTime())) {
          return 'غير محدد'
        }
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        const time = date.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return `${day}/${month}/${year} - ${time}`
      } catch (error) {
        return 'غير محدد'
      }
    }

    const formatCurrency = (amount: number) => {
      try {
        // استخدام إعدادات العملة من العيادة إذا كانت متوفرة
        if (clinic_info?.currency) {
          const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'SYP': 'ل.س',
            'TRY': '₺',
            'SAR': 'ر.س'
          }
          const symbol = currencySymbols[clinic_info.currency] || clinic_info.currency
          return `${amount.toLocaleString('ar-SA')} ${symbol}`
        }
        return `${amount.toLocaleString('ar-SA')} ل.س`
      } catch (error) {
        return `${amount} ل.س`
      }
    }

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة المدفوعات المعلقة - ${patient.full_name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', 'Tahoma', sans-serif;
          direction: rtl;
          background: white;
          color: #333;
          line-height: 1.6;
          font-size: 14px;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }

        .header h1 {
          color: #2563eb;
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .header .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          font-size: 12px;
          color: #666;
        }

        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .info-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: #f9fafb;
        }

        .info-card h3 {
          color: #2563eb;
          font-size: 16px;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }

        .info-card p {
          margin: 5px 0;
          font-size: 13px;
        }

        .items-section {
          margin-bottom: 30px;
        }

        .items-header {
          background: #2563eb;
          color: white;
          padding: 15px;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .items-header h3 {
          font-size: 18px;
        }

        .items-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .items-list {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }

        .item-row:last-child {
          border-bottom: none;
        }

        .item-row:hover {
          background: #f9fafb;
        }

        .item-details {
          flex: 1;
        }

        .item-title {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 5px;
        }

        .item-meta {
          font-size: 11px;
          color: #6b7280;
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .item-amount {
          text-align: left;
          font-weight: bold;
          font-size: 16px;
          color: #059669;
        }

        .summary-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .summary-title {
          color: #2563eb;
          font-size: 18px;
          margin-bottom: 15px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 5px 0;
        }

        .summary-row.discount {
          color: #dc2626;
        }

        .summary-row.tax {
          color: #2563eb;
        }

        .summary-row.total {
          border-top: 2px solid #2563eb;
          padding-top: 15px;
          margin-top: 15px;
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }

        .date-range {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 12px;
          color: #1e40af;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .invoice-container {
            max-width: none;
            margin: 0;
            padding: 15px;
          }

          .item-row:hover {
            background: transparent;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- رأس الفاتورة -->
        <div class="header">
          <h1>فاتورة المدفوعات المعلقة الشاملة</h1>
          <div class="invoice-info">
            <div>رقم الفاتورة: ${invoiceData.invoice_number}</div>
            <div>تاريخ الإصدار: ${formatDate(invoiceData.invoice_date)}</div>
            <div>وقت الإنشاء: ${formatDateTime(invoiceData.generated_at)}</div>
          </div>
        </div>

        <!-- نطاق التاريخ -->
        <div class="date-range">
          <strong>فترة الفاتورة:</strong> من ${formatDate(summary.date_range.from)} إلى ${formatDate(summary.date_range.to)}
        </div>

        <!-- معلومات المريض والعيادة -->
        <div class="info-section">
          <div class="info-card">
            <h3>معلومات المريض</h3>
            <p><strong>الاسم الكامل:</strong> ${patient.full_name}</p>
            <p><strong>رقم الهاتف:</strong> ${patient.phone || 'غير محدد'}</p>
            ${patient.email ? `<p><strong>البريد الإلكتروني:</strong> ${patient.email}</p>` : ''}
            ${patient.address ? `<p><strong>العنوان:</strong> ${patient.address}</p>` : ''}
            <p><strong>تاريخ الميلاد:</strong> ${patient.date_of_birth ? formatDate(patient.date_of_birth) : 'غير محدد'}</p>
          </div>

          <div class="info-card">
            <h3>معلومات العيادة</h3>
            <p><strong>اسم العيادة:</strong> ${clinic_info.clinic_name || 'عيادة الأسنان'}</p>
            ${clinic_info.clinic_phone ? `<p><strong>هاتف العيادة:</strong> ${clinic_info.clinic_phone}</p>` : ''}
            ${clinic_info.clinic_address ? `<p><strong>عنوان العيادة:</strong> ${clinic_info.clinic_address}</p>` : ''}
            ${clinic_info.clinic_email ? `<p><strong>إيميل العيادة:</strong> ${clinic_info.clinic_email}</p>` : ''}
          </div>
        </div>

        <!-- تفاصيل المدفوعات المعلقة -->
        <div class="items-section">
          <div class="items-header">
            <h3>تفاصيل المدفوعات المعلقة</h3>
            <div class="items-badge">${summary.total_items} عنصر</div>
          </div>

          <div class="items-list">
            ${summary.items.map((item: any, index: number) => `
              <div class="item-row">
                <div class="item-details">
                  <div class="item-title">
                    ${index + 1}. ${item.appointment_title || item.treatment_type || item.description || 'عنصر غير محدد'}
                  </div>
                  <div class="item-meta">
                    ${item.appointment_date ? `<span>📅 ${formatDate(item.appointment_date)}</span>` : ''}
                    ${item.tooth_name ? `<span>🦷 ${item.tooth_name} (${item.tooth_number})</span>` : ''}
                    ${item.treatment_type ? `<span>🔧 ${item.treatment_type}</span>` : ''}
                    ${item.notes ? `<span>📝 ${item.notes}</span>` : ''}
                  </div>
                </div>
                <div class="item-amount">
                  ${formatCurrency(item.amount)}
                  ${item.discount_amount && item.discount_amount > 0 ?
                    `<div style="font-size: 11px; color: #dc2626;">خصم: ${formatCurrency(item.discount_amount)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ملخص المبالغ -->
        <div class="summary-section">
          <h3 class="summary-title">ملخص المبالغ</h3>

          <div class="summary-row">
            <span>المجموع الفرعي:</span>
            <span>${formatCurrency(summary.subtotal)}</span>
          </div>

          ${summary.total_discount > 0 ? `
            <div class="summary-row discount">
              <span>الخصم (${invoiceSettings.discount_type === 'percentage' ? `${invoiceSettings.discount_value}%` : 'مبلغ ثابت'}):</span>
              <span>-${formatCurrency(summary.total_discount)}</span>
            </div>
            ${invoiceSettings.discount_reason ? `
              <div style="font-size: 11px; color: #6b7280; text-align: center; margin: 5px 0;">
                سبب الخصم: ${invoiceSettings.discount_reason}
              </div>
            ` : ''}
          ` : ''}

          ${summary.total_tax > 0 ? `
            <div class="summary-row tax">
              <span>الضريبة (${invoiceSettings.tax_rate}%):</span>
              <span>+${formatCurrency(summary.total_tax)}</span>
            </div>
          ` : ''}

          <div class="summary-row total">
            <span>المجموع النهائي:</span>
            <span>${formatCurrency(summary.final_total)}</span>
          </div>
        </div>

        <!-- شروط الدفع -->
        ${invoiceSettings.include_payment_terms && invoiceSettings.payment_terms_text ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #92400e; margin-bottom: 8px;">شروط الدفع:</h4>
            <p style="color: #92400e; font-size: 13px;">${invoiceSettings.payment_terms_text}</p>
          </div>
        ` : ''}

        <!-- الملاحظات -->
        ${invoiceSettings.footer_notes ? `
          <div class="footer">
            <p>${invoiceSettings.footer_notes}</p>
          </div>
        ` : ''}

        <!-- معلومات إضافية -->
        <div class="footer">
          <p>تم إنشاء هذه الفاتورة إلكترونياً في ${formatDateTime(invoiceData.generated_at)}</p>
          <p>للاستفسارات، يرجى التواصل مع العيادة</p>
        </div>
      </div>
    </body>
    </html>
    `
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

  static async exportComprehensiveFinancialReport(data: any, settings?: ClinicSettings | null): Promise<void> {
    try {
      const htmlContent = this.createComprehensiveFinancialReportHTML(data, settings)
      const fileName = this.generatePDFFileName('comprehensive_financial')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting comprehensive financial report:', error)
      throw new Error('فشل في تصدير التقرير المالي الشامل')
    }
  }

  // Create enhanced HTML report for patients
  private static createEnhancedPatientReportHTML(data: PatientReportData, settings?: ClinicSettings | null): string {
    const header = this.createEnhancedHeader('تقرير المرضى', settings, 'تقرير شامل عن إحصائيات المرضى والتوزيعات')
    const styles = this.createEnhancedStyles()

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المرضى - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        ${styles}
      </head>
      <body>
        ${header}

        <!-- Summary Cards with Enhanced Design -->
        <div class="summary-cards">
          <div class="summary-card primary">
            <div class="card-icon">👥</div>
            <div class="card-content">
              <h3>إجمالي المرضى</h3>
              <div class="number">${data.totalPatients.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card success">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3>المرضى الجدد</h3>
              <div class="number">${(data.newPatients || 0).toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card info">
            <div class="card-icon">💚</div>
            <div class="card-content">
              <h3>المرضى النشطون</h3>
              <div class="number">${data.activePatients.toLocaleString()}</div>
            </div>
          </div>
          <div class="summary-card warning">
            <div class="card-icon">⏸️</div>
            <div class="card-content">
              <h3>المرضى غير النشطين</h3>
              <div class="number">${(data.totalPatients - data.activePatients).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <!-- Patient List Section -->
        ${data.patientsList && data.patientsList.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📋</span>
            قائمة المرضى
          </div>
          <div class="section-content">
            <div class="patients-grid">
              ${data.patientsList.slice(0, 50).map((patient: any, index: number) => `
                <div class="patient-card">
                  <div class="patient-header">
                    <div class="patient-avatar">
                      ${(patient.full_name || patient.first_name || 'م').charAt(0)}
                    </div>
                    <div class="patient-info">
                      <h4 class="patient-name">${patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</h4>
                      <span class="patient-serial">#${patient.serial_number || (index + 1).toString().padStart(3, '0')}</span>
                    </div>
                  </div>
                  <div class="patient-details">
                    <div class="detail-item">
                      <span class="detail-label">الجنس:</span>
                      <span class="detail-value">${patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'غير محدد'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">العمر:</span>
                      <span class="detail-value">${patient.age || 'غير محدد'} سنة</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الهاتف:</span>
                      <span class="detail-value">${patient.phone || 'غير محدد'}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">الحالة:</span>
                      <span class="detail-value status-active">${patient.patient_condition || 'نشط'}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            ${data.patientsList.length > 50 ? `
            <div class="pagination-info">
              <p>عرض أول 50 مريض من إجمالي ${data.patientsList.length.toLocaleString()} مريض</p>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Age Distribution -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📊</span>
            توزيع الأعمار
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الفئة العمرية</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ageDistribution?.map(item => {
                    const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                    const barWidth = Math.max(5, parseFloat(percentage))
                    return `
                      <tr>
                        <td class="category-cell">${item.ageGroup}</td>
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

        <!-- Page Break Before Gender Distribution -->
        <div class="page-break"></div>

        <!-- Gender Distribution Page Header -->
        <div class="page-header">
          <h2 class="page-title">📊 تحليل توزيع الجنس</h2>
          <p class="page-subtitle">تقرير تفصيلي عن توزيع المرضى حسب الجنس</p>
        </div>

        <!-- Gender Distribution -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">👥</span>
            توزيع الجنس
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الجنس</th>
                    <th>العدد</th>
                    <th>النسبة المئوية</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.genderDistribution?.map(item => {
                    const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                    const barWidth = Math.max(5, parseFloat(percentage))
                    const genderIcon = item.gender === 'ذكر' ? '👨' : item.gender === 'أنثى' ? '👩' : '👤'
                    return `
                      <tr>
                        <td class="category-cell">${genderIcon} ${item.gender}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="percentage-cell">${percentage}%</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill gender-${item.gender === 'ذكر' ? 'male' : 'female'}" style="width: ${barWidth}%"></div>
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

        <!-- Gender Analysis Summary -->
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            تحليل إحصائي لتوزيع الجنس
          </div>
          <div class="section-content">
            <div class="analysis-cards">
              ${data.genderDistribution?.map(item => {
                const percentage = data.totalPatients > 0 ? ((item.count / data.totalPatients) * 100).toFixed(1) : '0.0'
                const genderIcon = item.gender === 'ذكر' ? '👨' : item.gender === 'أنثى' ? '👩' : '👤'
                const genderColor = item.gender === 'ذكر' ? '#1e40af' : item.gender === 'أنثى' ? '#be185d' : '#374151'
                const genderBgColor = item.gender === 'ذكر' ? '#dbeafe' : item.gender === 'أنثى' ? '#fce7f3' : '#f3f4f6'
                return `
                  <div class="analysis-card" style="border-left-color: ${genderColor}; border-left-width: 6px;">
                    <div class="analysis-icon" style="background: ${genderBgColor}; color: ${genderColor}; border: 2px solid ${genderColor};">
                      ${genderIcon}
                    </div>
                    <div class="analysis-content">
                      <h3 style="color: ${genderColor};">${item.gender}</h3>
                      <div class="analysis-stats">
                        <div class="stat">
                          <span class="stat-label">العدد:</span>
                          <span class="stat-value" style="color: ${genderColor};">${item.count.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">النسبة:</span>
                          <span class="stat-value" style="color: ${genderColor};">${percentage}%</span>
                        </div>
                        <div class="stat">
                          <span class="stat-label">من إجمالي:</span>
                          <span class="stat-value">${data.totalPatients.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `
              }).join('') || '<p class="no-data">لا توجد بيانات للتحليل</p>'}
            </div>
          </div>
        </div>

        <!-- Registration Trend -->
        ${data.registrationTrend && data.registrationTrend.length > 0 ? `
        <div class="section">
          <div class="section-title">
            <span class="section-icon">📈</span>
            اتجاه التسجيل الشهري
          </div>
          <div class="section-content">
            <div class="chart-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>عدد المرضى الجدد</th>
                    <th>المؤشر البصري</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.registrationTrend.map(item => {
                    const maxCount = Math.max(...data.registrationTrend.map(t => t.count))
                    const barWidth = maxCount > 0 ? Math.max(5, (item.count / maxCount) * 100) : 5
                    return `
                      <tr>
                        <td class="category-cell">${item.period}</td>
                        <td class="number-cell">${item.count.toLocaleString()}</td>
                        <td class="chart-cell">
                          <div class="progress-bar">
                            <div class="progress-fill trend" style="width: ${barWidth}%"></div>
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
            </div>
            <div class="footer-right">
              <div class="footer-stats">
                <span class="stat-item">📊 ${data.totalPatients.toLocaleString()} مريض</span>
                <span class="stat-item">✨ ${(data.newPatients || 0).toLocaleString()} جديد</span>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Create HTML report for patients (legacy - keeping for compatibility)
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
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
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
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
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
            // Format date as DD/MM/YYYY (Gregorian calendar)
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
                  <td>${item.amount?.toLocaleString() || 0} $</td>
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
            // Format date as DD/MM/YYYY (Gregorian calendar)
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
            <div class="number">${data.totalValue?.toLocaleString() || 0} $</div>
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
                  <td>${item.value?.toLocaleString() || 0} $</td>
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
          <div class="report-date">${(() => {
            // Format date as DD/MM/YYYY (Gregorian calendar)
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()}</div>
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
            <div class="summary-item">إجمالي: ${financialData.totalRevenue?.toLocaleString() || 0} $</div>
            <div class="summary-item">مكتملة: ${financialData.totalRevenue?.toLocaleString() || 0} $</div>
          </div>
          <div class="summary-group">
            <h3>المخزون</h3>
            <div class="summary-item">إجمالي الأصناف: ${inventoryData.totalItems}</div>
            <div class="summary-item">القيمة: ${inventoryData.totalValue?.toLocaleString() || 0} $</div>
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
                <td>${(() => {
                  try {
                    const { getCurrencyConfig, formatCurrencyWithConfig, getDefaultCurrency } = require('@/lib/utils')
                    const config = getCurrencyConfig(getDefaultCurrency())
                    return formatCurrencyWithConfig((financialData.totalRevenue || 0) / patientData.totalPatients, config)
                  } catch (error) {
                    return `$${((financialData.totalRevenue || 0) / patientData.totalPatients).toLocaleString()}`
                  }
                })()}</td>
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
        scale: 1.5, // Higher quality
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
      const imgData = canvas.toDataURL('image/jpeg',2)
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

  static async exportTreatmentReport(reportData: any, settings: any): Promise<void> {
    try {
      const htmlContent = EnhancedPdfReports.createEnhancedTreatmentReportHTML(reportData, settings)
      const fileName = this.generatePDFFileName('treatments')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting treatment report:', error)
      throw new Error('فشل في تصدير تقرير العلاجات')
    }
  }

  static async exportClinicNeedsReport(reportData: any, options: { title: string; currency: string; isDarkMode: boolean }): Promise<void> {
    try {
      const htmlContent = this.createClinicNeedsReportHTML(reportData, options)
      const fileName = this.generatePDFFileName('clinic-needs')
      await this.convertHTMLToPDF(htmlContent, fileName)
    } catch (error) {
      console.error('Error exporting clinic needs report:', error)
      throw new Error('فشل في تصدير تقرير احتياجات العيادة')
    }
  }

  static createClinicNeedsReportHTML(data: any, options: { title: string; currency: string; isDarkMode: boolean }): string {
    const { title, currency, isDarkMode } = options

    // Helper functions
    const formatCurrency = (amount: number) => {
      try {
        // Import currency utilities
        const { getCurrencyConfig, formatCurrencyWithConfig } = require('@/lib/utils')
        const config = getCurrencyConfig(currency || 'USD')
        return formatCurrencyWithConfig(amount || 0, config)
      } catch (error) {
        // Fallback formatting
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 2
          }).format(amount || 0)
        } catch (fallbackError) {
          // Ultimate fallback with dynamic currency
          try {
            const { getCurrencyConfig, getDefaultCurrency } = require('@/lib/utils')
            const config = getCurrencyConfig(currency || getDefaultCurrency())
            const fixedAmount = (amount || 0).toFixed(config.decimals)
            return config.position === 'before' ? `${config.symbol}${fixedAmount}` : `${fixedAmount} ${config.symbol}`
          } catch (ultimateError) {
            return `$${(amount || 0).toFixed(2)}`
          }
        }
      }
    }

    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
          return '--'
        }

        // Format as DD/MM/YYYY (Gregorian format)
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()

        return `${day}/${month}/${year}`
      } catch (error) {
        return '--'
      }
    }

    const getStatusLabel = (status: string) => {
      return getClinicNeedStatusInArabic(status)
    }

    const getPriorityLabel = (priority: string) => {
      return getPriorityLabelInArabic(priority)
    }

    const getStatusColor = (status: string) => {
      const colors = {
        pending: '#f59e0b',
        ordered: '#3b82f6',
        received: '#10b981',
        cancelled: '#ef4444'
      }
      return colors[status] || '#6b7280'
    }

    const getPriorityColor = (priority: string) => {
      const colors = {
        urgent: '#dc2626',
        high: '#f59e0b',
        medium: '#3b82f6',
        low: '#10b981'
      }
      return colors[priority] || '#6b7280'
    }



    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Noto Sans Arabic', Arial, sans-serif;
            line-height: 1.6;
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
            background-color: ${isDarkMode ? '#1f2937' : '#ffffff'};
            direction: rtl;
            padding: 20px;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }

          .header h1 {
            color: #3b82f6;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .header p {
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            font-size: 14px;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            background: ${isDarkMode ? '#374151' : '#f8fafc'};
            border: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }

          .stat-card h3 {
            color: #3b82f6;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .stat-card .value {
            font-size: 24px;
            font-weight: 700;
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
          }

          .section {
            margin-bottom: 30px;
          }

          .section h2 {
            color: #3b82f6;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: ${isDarkMode ? '#374151' : '#ffffff'};
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .table th,
          .table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
          }

          .table th {
            background: ${isDarkMode ? '#4b5563' : '#f1f5f9'};
            font-weight: 600;
            color: ${isDarkMode ? '#e5e7eb' : '#374151'};
          }

          .table tr:hover {
            background: ${isDarkMode ? '#4b5563' : '#f8fafc'};
          }

          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-ordered { background: #dbeafe; color: #1e40af; }
          .badge-received { background: #d1fae5; color: #065f46; }
          .badge-cancelled { background: #fee2e2; color: #991b1b; }
          .badge-urgent { background: #fee2e2; color: #991b1b; }
          .badge-high { background: #fef3c7; color: #92400e; }
          .badge-medium { background: #dbeafe; color: #1e40af; }
          .badge-low { background: #d1fae5; color: #065f46; }

          .footer {
            margin-top: 40px;
            text-align: center;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            font-size: 12px;
            border-top: 1px solid ${isDarkMode ? '#4b5563' : '#e2e8f0'};
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>تاريخ التقرير: ${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          })()} | ${data.filterInfo || 'جميع البيانات'}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>إجمالي الاحتياجات</h3>
            <div class="value">${data.totalNeeds || 0}</div>
          </div>
          <div class="stat-card">
            <h3>القيمة الإجمالية</h3>
            <div class="value">${formatCurrency(data.totalValue || 0)}</div>
          </div>
          <div class="stat-card">
            <h3>الاحتياجات المعلقة</h3>
            <div class="value">${data.pendingCount || 0}</div>
          </div>
          <div class="stat-card">
            <h3>الاحتياجات العاجلة</h3>
            <div class="value">${data.urgentCount || 0}</div>
          </div>
          <div class="stat-card">
            <h3>معدل الإنجاز</h3>
            <div class="value">${(data.completionRate || 0).toFixed(1)}%</div>
          </div>
          <div class="stat-card">
            <h3>متوسط قيمة الاحتياج</h3>
            <div class="value">${formatCurrency(data.averageNeedValue || 0)}</div>
          </div>
        </div>

        ${data.needsByStatus && data.needsByStatus.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الحالة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الحالة</th>
                <th>العدد</th>
                <th>النسبة المئوية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByStatus.map(item => `
                <tr>
                  <td><span class="badge badge-${item.status}">${getStatusLabel(item.status)}</span></td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.needsByPriority && data.needsByPriority.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الأولوية</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الأولوية</th>
                <th>العدد</th>
                <th>النسبة المئوية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByPriority.map(item => `
                <tr>
                  <td><span class="badge badge-${item.priority}">${getPriorityLabel(item.priority)}</span></td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.topExpensiveNeeds && data.topExpensiveNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات الأغلى سعراً (أعلى 10)</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الكمية</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.topExpensiveNeeds.map(need => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.quantity}</td>
                  <td>${formatCurrency(need.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.needsByCategory && data.needsByCategory.length > 0 ? `
        <div class="section">
          <h2>توزيع الاحتياجات حسب الفئة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>الفئة</th>
                <th>العدد</th>
                <th>القيمة الإجمالية</th>
              </tr>
            </thead>
            <tbody>
              ${data.needsByCategory.map(item => `
                <tr>
                  <td>${item.category || 'غير محدد'}</td>
                  <td>${item.count}</td>
                  <td>${formatCurrency(item.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.urgentNeeds && data.urgentNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات العاجلة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الحالة</th>
                <th>الفئة</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.urgentNeeds.slice(0, 10).map(need => `
                <tr>
                  <td>${need.need_name}</td>
                  <td><span class="badge badge-${need.status}">${getStatusLabel(need.status)}</span></td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.pendingNeeds && data.pendingNeeds.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات المعلقة</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الفئة</th>
                <th>الأولوية</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.pendingNeeds.slice(0, 10).map(need => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td><span class="badge badge-${need.priority}">${getPriorityLabel(need.priority)}</span></td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.recentlyReceived && data.recentlyReceived.length > 0 ? `
        <div class="section">
          <h2>الاحتياجات المستلمة حديثاً</h2>
          <table class="table">
            <thead>
              <tr>
                <th>اسم الاحتياج</th>
                <th>الفئة</th>
                <th>المورد</th>
                <th>القيمة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentlyReceived.slice(0, 10).map(need => `
                <tr>
                  <td>${need.need_name}</td>
                  <td>${need.category || 'غير محدد'}</td>
                  <td>${need.supplier || 'غير محدد'}</td>
                  <td>${formatCurrency(need.price * need.quantity)}</td>
                  <td>${formatDate(need.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة | ${(() => {
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
      </body>
      </html>
    `
  }

  // Create comprehensive financial report HTML
  private static createComprehensiveFinancialReportHTML(data: any, settings?: ClinicSettings | null): string {
    const formatCurrency = (amount: number) => {
      try {
        // Import currency utilities
        const { getCurrencyConfig, formatCurrencyWithConfig, getDefaultCurrency } = require('@/lib/utils')
        const config = getCurrencyConfig(settings?.currency || getDefaultCurrency())
        return formatCurrencyWithConfig(amount || 0, config)
      } catch (error) {
        // Fallback formatting with dynamic currency
        try {
          const { getCurrencyConfig, getDefaultCurrency } = require('@/lib/utils')
          const config = getCurrencyConfig(settings?.currency || getDefaultCurrency())
          const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })
          return config.position === 'before' ? `${config.symbol}${formattedAmount}` : `${formattedAmount} ${config.symbol}`
        } catch (fallbackError) {
          return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'غير محدد'
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 'غير محدد'
      return date.toLocaleDateString('ar-SA')
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>التقرير المالي الشامل - ${settings?.clinic_name || 'عيادة الأسنان'}</title>
        <style>
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 20px;
            line-height: 1.6;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name {
            font-size: 28px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .report-subtitle {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 10px;
          }
          .report-date {
            font-size: 14px;
            color: #64748b;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
          }
          .summary-card .number {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
          }
          .profit { color: #10b981 !important; }
          .loss { color: #ef4444 !important; }
          .warning { color: #f59e0b !important; }
          .section {
            margin: 40px 0;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #0ea5e9;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .subsection-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin: 20px 0 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td {
            padding: 12px 15px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: bold;
            color: #1e293b;
            font-size: 14px;
          }
          td {
            font-size: 13px;
          }
          .profit-loss-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #0ea5e9;
            margin: 30px 0;
          }
          .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
          }
          .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${settings?.clinic_name || 'عيادة الأسنان الحديثة'}</div>
          <div class="report-title">التقرير المالي الشامل</div>
          <div class="report-subtitle">تحليل شامل للأرباح والخسائر والإيرادات والمصروفات</div>
          <div class="report-date">${(() => {
            const date = new Date()
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            const time = date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return `${day}/${month}/${year} - ${time}`
          })()}</div>
          ${data.filterInfo ? `<div class="info-box">${data.filterInfo}</div>` : ''}
        </div>

        <!-- الإحصائيات المالية الرئيسية -->
        <div class="section">
          <div class="section-title">الإحصائيات المالية الرئيسية</div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>إجمالي الإيرادات</h3>
              <div class="number profit">${formatCurrency(data.totalRevenue || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>إجمالي المصروفات</h3>
              <div class="number">${formatCurrency(data.totalExpenses || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>صافي ${data.isProfit ? 'الربح' : 'الخسارة'}</h3>
              <div class="number ${data.isProfit ? 'profit' : 'loss'}">
                ${formatCurrency(data.isProfit ? (data.netProfit || 0) : (data.lossAmount || 0))}
              </div>
            </div>
            <div class="summary-card">
              <h3>هامش الربح</h3>
              <div class="number ${data.profitMargin >= 0 ? 'profit' : 'loss'}">
                ${(data.profitMargin || 0).toFixed(2)}%
              </div>
            </div>
            <div class="summary-card">
              <h3>المبالغ المعلقة</h3>
              <div class="number warning">${formatCurrency(data.totalPending || 0)}</div>
            </div>
            <div class="summary-card">
              <h3>المبالغ المتبقية</h3>
              <div class="number warning">${formatCurrency(data.totalOverdue || 0)}</div>
            </div>
          </div>
        </div>

        <!-- تحليل الأرباح والخسائر -->
        <div class="profit-loss-section">
          <div class="section-title">تحليل الأرباح والخسائر التفصيلي</div>
          <div class="two-column">
            <div>
              <div class="subsection-title">الإيرادات</div>
              <table>
                <tr><td>المدفوعات المكتملة</td><td>${formatCurrency(data.totalPaid || 0)}</td></tr>
                <tr><td>المدفوعات الجزئية</td><td>${formatCurrency((data.totalRevenue || 0) - (data.totalPaid || 0))}</td></tr>
                <tr><td><strong>إجمالي الإيرادات</strong></td><td><strong>${formatCurrency(data.totalRevenue || 0)}</strong></td></tr>
              </table>
            </div>
            <div>
              <div class="subsection-title">المصروفات</div>
              <table>
                <tr><td>مصروفات المخابر</td><td>${formatCurrency(data.labOrdersTotal || 0)}</td></tr>
                <tr><td>مصروفات الاحتياجات</td><td>${formatCurrency(data.clinicNeedsTotal || 0)}</td></tr>
                <tr><td>مصروفات المخزون</td><td>${formatCurrency(data.inventoryExpenses || 0)}</td></tr>
                <tr><td><strong>إجمالي المصروفات</strong></td><td><strong>${formatCurrency(data.totalExpenses || 0)}</strong></td></tr>
              </table>
            </div>
          </div>
        </div>

        <!-- إحصائيات المعاملات -->
        <div class="section">
          <div class="section-title">إحصائيات المعاملات</div>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>إجمالي المعاملات</h3>
              <div class="number">${data.totalTransactions || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات المكتملة</h3>
              <div class="number profit">${data.completedPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات الجزئية</h3>
              <div class="number warning">${data.partialPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>المعاملات المعلقة</h3>
              <div class="number">${data.pendingPayments || 0}</div>
            </div>
            <div class="summary-card">
              <h3>معدل النجاح</h3>
              <div class="number profit">${data.successRate || '0.0'}%</div>
            </div>
            <div class="summary-card">
              <h3>متوسط المعاملة</h3>
              <div class="number">${formatCurrency(parseFloat(data.averageTransaction || '0'))}</div>
            </div>
          </div>
        </div>

        <!-- توزيع طرق الدفع -->
        ${data.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? `
        <div class="section">
          <div class="section-title">توزيع الإيرادات حسب طريقة الدفع</div>
          <table>
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th>المبلغ</th>
                <th>النسبة المئوية</th>
              </tr>
            </thead>
            <tbody>
              ${data.revenueByPaymentMethod.map(method => `
                <tr>
                  <td>${method.method}</td>
                  <td>${formatCurrency(method.amount)}</td>
                  <td>${method.percentage.toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة العيادة | ${(() => {
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
      </body>
      </html>
    `
  }

  // Helper methods for translations
  private static translateStatus(status: string): string {
    return getStatusLabelInArabic(status)
  }

  private static translatePaymentMethod(method: string): string {
    return getPaymentStatusInArabic(method)
  }

  /**
   * تنسيق التاريخ بالتقويم الميلادي
   */
  private static formatGregorianDate(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      return 'غير محدد'
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }
}