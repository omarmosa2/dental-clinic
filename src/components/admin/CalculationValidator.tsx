import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePaymentStore } from '@/store/paymentStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePatientStore } from '@/store/patientStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { CalculationValidator } from '@/utils/calculationValidator'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Calculator,
  TrendingUp,
  Users,
  Calendar,
  Package
} from 'lucide-react'

export default function CalculationValidatorComponent() {
  const { payments } = usePaymentStore()
  const { appointments } = useAppointmentStore()
  const { patients } = usePatientStore()
  const { items: inventory } = useInventoryStore()
  
  const [validationResults, setValidationResults] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)

  const runValidation = async () => {
    setIsValidating(true)
    try {
      // تشغيل التحقق من الحسابات
      const results = CalculationValidator.validateAllCalculations({
        payments,
        appointments,
        patients,
        inventory
      })
      
      setValidationResults(results)
      
      // عرض النتائج في وحدة التحكم للمطورين
      console.log('🔍 Calculation Validation Results:', results)
      
    } catch (error) {
      console.error('Error running validation:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  }

  const getStatusBadge = (isValid: boolean) => {
    return (
      <Badge variant={isValid ? "default" : "destructive"}>
        {isValid ? "صحيح" : "خطأ"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">التحقق من دقة الحسابات</h2>
          <p className="text-muted-foreground mt-1">
            فحص شامل لدقة جميع الحسابات والإحصائيات في النظام
          </p>
        </div>
        <Button 
          onClick={runValidation}
          disabled={isValidating}
          className="flex items-center space-x-2 space-x-reverse"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
          <span>{isValidating ? 'جاري الفحص...' : 'تشغيل الفحص'}</span>
        </Button>
      </div>

      {/* Overall Status */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Calculator className="w-5 h-5" />
              <span>النتيجة العامة</span>
              {getStatusIcon(validationResults.overall.isValid)}
            </CardTitle>
            <CardDescription>
              ملخص نتائج فحص دقة الحسابات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {getStatusBadge(validationResults.overall.isValid)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">الحالة العامة</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {validationResults.overall.totalErrors}
                </div>
                <p className="text-sm text-muted-foreground mt-1">أخطاء</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {validationResults.overall.totalWarnings}
                </div>
                <p className="text-sm text-muted-foreground mt-1">تحذيرات</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {validationResults && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Calculations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <TrendingUp className="w-5 h-5" />
                <span>حسابات المدفوعات</span>
                {getStatusIcon(validationResults.payments.isValid)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationResults.payments.calculations && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">إجمالي الإيرادات:</span>
                    <span className="font-medium">${validationResults.payments.calculations.totalRevenue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">المبالغ المعلقة:</span>
                    <span className="font-medium">${validationResults.payments.calculations.pendingAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">المبالغ المتأخرة:</span>
                    <span className="font-medium">${validationResults.payments.calculations.overdueAmount}</span>
                  </div>
                </div>
              )}
              
              {validationResults.payments.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validationResults.payments.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Appointment Calculations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="w-5 h-5" />
                <span>حسابات المواعيد</span>
                {getStatusIcon(validationResults.appointments.isValid)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationResults.appointments.calculations && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">إجمالي المواعيد:</span>
                    <span className="font-medium">{validationResults.appointments.calculations.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">معدل الحضور:</span>
                    <span className="font-medium">{validationResults.appointments.calculations.attendanceRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">معدل الإلغاء:</span>
                    <span className="font-medium">{validationResults.appointments.calculations.cancellationRate}%</span>
                  </div>
                </div>
              )}
              
              {validationResults.appointments.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validationResults.appointments.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Inventory Calculations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <Package className="w-5 h-5" />
                <span>حسابات المخزون</span>
                {getStatusIcon(validationResults.inventory.isValid)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationResults.inventory.calculations && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">إجمالي العناصر:</span>
                    <span className="font-medium">{validationResults.inventory.calculations.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">القيمة الإجمالية:</span>
                    <span className="font-medium">${validationResults.inventory.calculations.totalValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">مخزون منخفض:</span>
                    <span className="font-medium">{validationResults.inventory.calculations.lowStockCount}</span>
                  </div>
                </div>
              )}
              
              {validationResults.inventory.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validationResults.inventory.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      {!validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>كيفية استخدام أداة التحقق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• اضغط على "تشغيل الفحص" لبدء التحقق من دقة جميع الحسابات</p>
              <p>• ستظهر النتائج مع تفاصيل أي أخطاء أو تحذيرات</p>
              <p>• الأخطاء تتطلب إصلاح فوري، التحذيرات للمراجعة</p>
              <p>• يمكن مراجعة التفاصيل الكاملة في وحدة تحكم المطور (F12)</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
