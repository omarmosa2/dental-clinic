import React from 'react'
import ThemeTestComponent from '@/components/ThemeTestComponent'

/**
 * صفحة اختبار لضمان عدم اختفاء البيانات عند تغيير الثيم
 */
export default function ThemeTestPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          اختبار استقرار البيانات عند تغيير الثيم
        </h1>
        <p className="text-muted-foreground">
          هذه الصفحة تختبر أن البيانات لا تختفي عند التبديل بين الوضع المظلم والفاتح
        </p>
      </div>
      
      <ThemeTestComponent />
    </div>
  )
}
