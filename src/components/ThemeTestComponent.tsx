import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { StableClinicHeader } from './StableClinicHeader'
import { useStableClinicName, useStableDoctorName, useStableClinicLogo } from '@/hooks/useStableSettings'

/**
 * مكون اختبار لضمان عدم اختفاء البيانات عند تغيير الثيم
 */
export function ThemeTestComponent() {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>اختبار استقرار البيانات</span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDarkMode}
            className="transition-all duration-200"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 mr-2" />
            ) : (
              <Moon className="h-4 w-4 mr-2" />
            )}
            {isDarkMode ? 'فاتح' : 'مظلم'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* مكون الهيدر المستقر */}
        <div>
          <h3 className="text-lg font-semibold mb-3">مكون الهيدر المستقر:</h3>
          <StableClinicHeader showLogo={true} showDoctorName={true} />
        </div>

        {/* القيم المستقرة منفردة */}
        <div>
          <h3 className="text-lg font-semibold mb-3">القيم المستقرة منفردة:</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">اسم العيادة:</span>
              <span className="text-primary">{clinicName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">اسم الدكتور:</span>
              <span className="text-primary">{doctorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">الشعار:</span>
              {clinicLogo ? (
                <img 
                  src={clinicLogo} 
                  alt="شعار العيادة" 
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <span className="text-muted-foreground">لا يوجد شعار</span>
              )}
            </div>
          </div>
        </div>

        {/* تعليمات الاختبار */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">تعليمات الاختبار:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>اضغط على زر تبديل الثيم أعلاه</li>
            <li>لاحظ أن جميع البيانات تبقى ظاهرة</li>
            <li>لا يجب أن تختفي أي من المعلومات أثناء التبديل</li>
            <li>إذا اختفت البيانات، فهناك مشكلة تحتاج إصلاح</li>
          </ol>
        </div>

        {/* معلومات الحالة الحالية */}
        <div className="bg-accent p-4 rounded-lg">
          <h4 className="font-semibold mb-2">الحالة الحالية:</h4>
          <div className="text-sm space-y-1">
            <div>الوضع: {isDarkMode ? 'مظلم' : 'فاتح'}</div>
            <div>اسم العيادة محمل: {clinicName ? 'نعم' : 'لا'}</div>
            <div>اسم الدكتور محمل: {doctorName ? 'نعم' : 'لا'}</div>
            <div>الشعار محمل: {clinicLogo ? 'نعم' : 'لا'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ThemeTestComponent
