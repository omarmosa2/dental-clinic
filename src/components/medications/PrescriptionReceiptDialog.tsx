import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSettingsStore } from '@/store/settingsStore'
import { formatDate } from '@/lib/utils'
import { notify } from '@/services/notificationService'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import {
  Printer,
  Download,
  FileText,
  Settings,
  Eye,
  X,
  User,
  Calendar,
  Pill,
  Stethoscope
} from 'lucide-react'
import type { Prescription } from '@/types'

interface PrescriptionReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: Prescription
}

export default function PrescriptionReceiptDialog({
  open,
  onOpenChange,
  prescription
}: PrescriptionReceiptDialogProps) {
  const { settings } = useSettingsStore()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    printerType: '80mm', // 58mm, 80mm, a4
    includeQR: true,
    includeBarcode: true,
    includeLogo: true,
    colorMode: 'color', // color, bw
    qrType: 'text' // text, url
  })

  const [showPreview, setShowPreview] = useState(false)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('')
  const [barcodeDataURL, setBarcodeDataURL] = useState<string>('')

  // Generate QR Code data - Human readable format
  const generateQRData = () => {
    const prescriptionNumber = `PRX-${prescription.id.slice(-6)}`
    const patientName = prescription.patient?.full_name || 'غير محدد'
    const clinicName = settings?.clinic_name || 'عيادة الأسنان'
    const doctorName = settings?.doctor_name || ''
    const formattedDate = formatDate(prescription.prescription_date)
    const medicationsCount = prescription.medications?.length || 0

    return `🏥 ${clinicName}
${doctorName ? `👨‍⚕️ د. ${doctorName}` : ''}
📋 وصفة طبية رقم: ${prescriptionNumber}
👤 المريض: ${patientName}
📅 التاريخ: ${formattedDate}
💊 عدد الأدوية: ${medicationsCount}
${prescription.medications?.map((med, index) =>
  `${index + 1}. ${med.medication_name} - ${med.dose}`
).join('\n') || ''}
${prescription.notes ? `📝 ملاحظات: ${prescription.notes}` : ''}

شكراً لثقتكم بنا 🙏`
  }

  // Generate QR Code
  const generateQR = async () => {
    try {
      const qrData = generateQRData()
      const qrCodeURL = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeDataURL(qrCodeURL)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  // Generate Barcode
  const generateBarcodeSVG = () => {
    try {
      const canvas = document.createElement('canvas')
      const barcodeData = generateBarcode()

      JsBarcode(canvas, barcodeData, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false,
        margin: 0
      })

      setBarcodeDataURL(canvas.toDataURL())
    } catch (error) {
      console.error('Error generating barcode:', error)
    }
  }

  // Generate QR and Barcode when dialog opens
  useEffect(() => {
    if (open) {
      if (printSettings.includeQR) {
        generateQR()
      }
      if (printSettings.includeBarcode) {
        generateBarcodeSVG()
      }
    }
  }, [open, printSettings.includeQR, printSettings.includeBarcode, prescription, settings])

  // Generate unique barcode
  const generateBarcode = () => {
    const timestamp = new Date(prescription.prescription_date).getTime().toString().slice(-8)
    const patientId = prescription.patient_id.slice(-4)
    const medicationsCount = (prescription.medications?.length || 0).toString().padStart(2, '0')
    return `PRX${timestamp}${patientId}${medicationsCount}`
  }

  const handleThermalPrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>وصفة طبية - ${prescription.id.slice(-6)}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 2mm;
                  font-size: 11px;
                  line-height: 1.3;
                  color: #000;
                  background: white;
                  width: 76mm;
                }
                .receipt {
                  width: 100%;
                  font-size: 11px;
                }
                .header {
                  text-align: center;
                  margin-bottom: 6px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 4px;
                }
                .clinic-logo {
                  width: 50px;
                  height: 50px;
                  margin: 0 auto 4px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 2px solid #000;
                }
                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .clinic-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 2px;
                }
                .doctor-name {
                  font-size: 11px;
                  font-weight: bold;
                  margin-bottom: 1px;
                }
                .prescription-title {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 4px 0;
                  text-decoration: underline;
                }
                .section {
                  margin: 4px 0;
                  padding: 2px 0;
                }
                .patient-info {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                }
                .medications-list {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                }
                .medication-item {
                  margin: 2px 0;
                  padding: 2px 0;
                  border-bottom: 1px dotted #666;
                }
                .medication-item:last-child {
                  border-bottom: none;
                }
                .medication-name {
                  font-weight: bold;
                  font-size: 11px;
                }
                .medication-dose {
                  font-size: 10px;
                  color: #333;
                  margin-top: 1px;
                }
                .separator {
                  text-align: center;
                  margin: 4px 0;
                  font-size: 10px;
                }
                .footer {
                  text-align: center;
                  margin-top: 6px;
                  padding-top: 4px;
                  border-top: 1px solid #000;
                  font-size: 9px;
                }
                .qr-section, .barcode-section {
                  text-align: center;
                  margin: 4px 0;
                }
                .notes {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                  font-style: italic;
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

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const isColorMode = printSettings.colorMode === 'color'
        const printerWidth = printSettings.printerType === 'a4' ? '210mm' : printSettings.printerType

        printWindow.document.write(`
          <html>
            <head>
              <title>وصفة طبية - ${prescription.id.slice(-6)}</title>
              <style>
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 0;
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  line-height: 1.4;
                  color: #000;
                  background: white;
                }

                .receipt {
                  width: ${printerWidth === 'a4' ? '100%' : printerWidth};
                  max-width: ${printerWidth === 'a4' ? '210mm' : printerWidth};
                  margin: 0 auto;
                  background: white;
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '11px'};
                  padding: ${printSettings.printerType === 'a4' ? '20px' : '0'};
                }

                .header {
                  text-align: center;
                  margin-bottom: 15px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                }

                .clinic-logo {
                  width: ${printSettings.printerType === 'a4' ? '80px' : '60px'};
                  height: ${printSettings.printerType === 'a4' ? '80px' : '60px'};
                  margin: 0 auto 8px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 3px solid #e0e0e0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }

                .clinic-name {
                  font-size: ${printSettings.printerType === 'a4' ? '18px' : '16px'};
                  font-weight: bold;
                  margin-bottom: 5px;
                  color: ${isColorMode ? '#2563eb' : '#000'};
                }

                .doctor-name {
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  font-weight: bold;
                  margin-bottom: 3px;
                  color: ${isColorMode ? '#059669' : '#000'};
                }

                .prescription-title {
                  font-size: ${printSettings.printerType === 'a4' ? '16px' : '14px'};
                  font-weight: bold;
                  margin: 10px 0;
                  text-decoration: underline;
                  color: ${isColorMode ? '#dc2626' : '#000'};
                }

                .section {
                  margin: 10px 0;
                  padding: 5px 0;
                }

                .patient-info {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  background: ${isColorMode ? '#f8fafc' : 'white'};
                }

                .medications-list {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  background: ${isColorMode ? '#fefce8' : 'white'};
                }

                .medication-item {
                  margin: 8px 0;
                  padding: 5px 0;
                  border-bottom: 1px dotted #666;
                }

                .medication-item:last-child {
                  border-bottom: none;
                }

                .medication-name {
                  font-weight: bold;
                  font-size: ${printSettings.printerType === 'a4' ? '13px' : '11px'};
                  color: ${isColorMode ? '#1e40af' : '#000'};
                }

                .medication-dose {
                  font-size: ${printSettings.printerType === 'a4' ? '11px' : '10px'};
                  color: #333;
                  margin-top: 2px;
                }

                .separator {
                  text-align: center;
                  margin: 10px 0;
                  font-size: 12px;
                }

                .footer {
                  text-align: center;
                  margin-top: 15px;
                  padding-top: 10px;
                  border-top: 1px solid #000;
                  font-size: ${printSettings.printerType === 'a4' ? '10px' : '9px'};
                }

                .qr-section, .barcode-section {
                  text-align: center;
                  margin: 10px 0;
                }

                .notes {
                  border: 2px solid #000;
                  padding: 10px;
                  margin: 10px 0;
                  font-style: italic;
                  background: ${isColorMode ? '#fef3c7' : 'white'};
                }

                @media print {
                  body { margin: 0; }
                  .receipt { box-shadow: none; }
                }

                @media screen {
                  body {
                    padding: 20px;
                    background: #f5f5f5;
                  }

                  .receipt {
                    max-width: ${printSettings.printerType === 'a4' ? '600px' : '320px'};
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                    margin: 0 auto;
                  }
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
    // For now, we'll just trigger the print dialog
    handlePrint()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <FileText className="w-5 h-5 text-green-600" />
            طباعة الوصفة الطبية
          </DialogTitle>
          <DialogDescription className="text-right">
            معاينة وطباعة الوصفة الطبية للمريض {prescription.patient?.full_name}
          </DialogDescription>
        </DialogHeader>

        {/* Print Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" dir="rtl">
          <div>
            <label className="text-sm font-medium text-right block mb-2">نوع الطابعة</label>
            <select
              value={printSettings.printerType}
              onChange={(e) => setPrintSettings(prev => ({ ...prev, printerType: e.target.value }))}
              className="w-full p-2 border rounded text-right"
            >
              <option value="58mm">طابعة حرارية 58mm</option>
              <option value="80mm">طابعة حرارية 80mm</option>
              <option value="a4">طابعة A4 عادية</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-right block mb-2">نمط الألوان</label>
            <select
              value={printSettings.colorMode}
              onChange={(e) => setPrintSettings(prev => ({ ...prev, colorMode: e.target.value }))}
              className="w-full p-2 border rounded text-right"
            >
              <option value="color">ملون</option>
              <option value="bw">أبيض وأسود</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-right block">خيارات إضافية</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-right">
                <input
                  type="checkbox"
                  checked={printSettings.includeQR}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, includeQR: e.target.checked }))}
                />
                <span className="text-sm">تضمين رمز QR</span>
              </label>
              <label className="flex items-center gap-2 text-right">
                <input
                  type="checkbox"
                  checked={printSettings.includeBarcode}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, includeBarcode: e.target.checked }))}
                />
                <span className="text-sm">تضمين الباركود</span>
              </label>
              <label className="flex items-center gap-2 text-right">
                <input
                  type="checkbox"
                  checked={printSettings.includeLogo}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, includeLogo: e.target.checked }))}
                />
                <span className="text-sm">تضمين شعار العيادة</span>
              </label>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <div ref={receiptRef} className="receipt bg-white p-4 mx-auto" style={{
            maxWidth: printSettings.printerType === 'a4' ? '600px' : '320px',
            fontFamily: 'Arial, Tahoma, sans-serif',
            direction: 'rtl'
          }}>
            {/* Header */}
            <div className="header text-center mb-4 pb-3 border-b-2 border-black">
              {/* Clinic Logo */}
              {printSettings.includeLogo && settings?.clinic_logo && (
                <div className="clinic-logo mb-3">
                  <img
                    src={settings.clinic_logo}
                    alt="شعار العيادة"
                    style={{
                      width: printSettings.printerType === 'a4' ? '80px' : '60px',
                      height: printSettings.printerType === 'a4' ? '80px' : '60px',
                      objectFit: 'cover',
                      borderRadius: '50%',
                      margin: '0 auto',
                      border: '3px solid #e0e0e0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}

              {settings?.clinic_name && (
                <div className="clinic-name text-lg font-bold mb-2 text-blue-600">
                  {settings.clinic_name}
                </div>
              )}
              {settings?.doctor_name && (
                <div className="doctor-name text-sm font-bold mb-1 text-green-600">
                  د. {settings.doctor_name}
                </div>
              )}
              <div className="prescription-title text-base font-bold mt-3 text-red-600 underline">
                وصفة طبية
              </div>
            </div>

            {/* Prescription Info */}
            <div className="section mb-3">
              <div className="text-sm text-center">
                <strong>رقم الوصفة:</strong> PRX-{prescription.id.slice(-6)}
              </div>
              <div className="text-sm text-center">
                <strong>التاريخ:</strong> {formatDate(prescription.prescription_date)}
              </div>
            </div>

            {/* Patient Information */}
            <div className="patient-info border-2 border-black p-3 mb-3 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-bold">معلومات المريض</span>
              </div>
              <div className="text-sm">
                <strong>الاسم:</strong> {prescription.patient?.full_name || 'غير محدد'}
              </div>
              {prescription.appointment && (
                <div className="text-sm mt-1">
                  <strong>الموعد:</strong> {prescription.appointment.title}
                </div>
              )}
            </div>

            {/* Medications List */}
            <div className="medications-list border-2 border-black p-3 mb-3 bg-yellow-50">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-4 h-4 text-orange-600" />
                <span className="font-bold">الأدوية الموصوفة ({prescription.medications?.length || 0})</span>
              </div>

              {prescription.medications && prescription.medications.length > 0 ? (
                prescription.medications.map((med, index) => (
                  <div key={index} className="medication-item mb-2 pb-2 border-b border-dotted border-gray-400 last:border-b-0">
                    <div className="medication-name font-bold text-blue-800">
                      {index + 1}. {med.medication_name}
                    </div>
                    {med.dose && (
                      <div className="medication-dose text-sm text-gray-600 mt-1">
                        الجرعة: {med.dose}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic">
                  لا توجد أدوية موصوفة
                </div>
              )}
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="notes border-2 border-black p-3 mb-3 bg-yellow-100">
                <div className="font-bold mb-2">ملاحظات الطبيب:</div>
                <div className="text-sm italic">{prescription.notes}</div>
              </div>
            )}

            {/* QR Code Section */}
            {printSettings.includeQR && (
              <div className="qr-section text-center mb-3">
                {qrCodeDataURL ? (
                  <img
                    src={qrCodeDataURL}
                    alt="رمز QR للوصفة الطبية"
                    style={{
                      width: printSettings.printerType === 'a4' ? '120px' : '100px',
                      height: printSettings.printerType === 'a4' ? '120px' : '100px',
                      margin: '0 auto'
                    }}
                  />
                ) : (
                  <div className="qr-placeholder bg-gray-200 p-4 text-sm">
                    رمز QR
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1">
                  امسح الرمز لعرض تفاصيل الوصفة
                </div>
              </div>
            )}

            {/* Barcode Section */}
            {printSettings.includeBarcode && (
              <div className="barcode-section text-center mb-3">
                {barcodeDataURL ? (
                  <img
                    src={barcodeDataURL}
                    alt="باركود الوصفة الطبية"
                    style={{
                      width: printSettings.printerType === 'a4' ? '120px' : '100px',
                      height: printSettings.printerType === 'a4' ? '30px' : '20px',
                      margin: '0 auto'
                    }}
                  />
                ) : (
                  <div className="barcode-placeholder bg-gray-200 p-2 text-xs">
                    {generateBarcode()}
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1">
                  {generateBarcode()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="footer text-center mt-4 pt-3 border-t border-black text-xs">
              <div className="mb-1">شكراً لثقتكم بنا</div>
              <div>تاريخ الطباعة: {formatDate(new Date().toISOString())}</div>
              {settings?.clinic_name && (
                <div className="mt-1 font-bold">{settings.clinic_name}</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 ml-2" />
            إغلاق
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 ml-2" />
            {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 ml-2" />
            تحميل PDF
          </Button>
          <Button onClick={handleThermalPrint} className="bg-green-600 hover:bg-green-700 text-white">
            <Printer className="w-4 h-4 ml-2" />
            طباعة حرارية
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="w-4 h-4 ml-2" />
            طباعة عادية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
