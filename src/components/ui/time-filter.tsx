import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar, Filter, X, ChevronDown, CalendarDays } from 'lucide-react'

export interface TimeFilterOptions {
  preset: 'today' | 'week' | 'month' | 'year' | 'custom'
  startDate?: string
  endDate?: string
}

interface TimeFilterProps {
  value: TimeFilterOptions
  onChange: (filter: TimeFilterOptions) => void
  onClear?: () => void
  className?: string
  showTitle?: boolean
  title?: string
  defaultOpen?: boolean
}

export function TimeFilter({
  value,
  onChange,
  onClear,
  className = '',
  showTitle = true,
  title = 'فلترة زمنية',
  defaultOpen = false
}: TimeFilterProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const handlePresetChange = (preset: TimeFilterOptions['preset']) => {
    const today = new Date()
    let startDate = ''
    let endDate = today.toISOString().split('T')[0]

    switch (preset) {
      case 'today':
        startDate = today.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        startDate = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate = monthStart.toISOString().split('T')[0]
        break
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1)
        startDate = yearStart.toISOString().split('T')[0]
        break
      case 'custom':
        // Keep existing dates for custom
        startDate = value.startDate || ''
        endDate = value.endDate || ''
        break
    }

    onChange({
      preset,
      startDate,
      endDate
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', date: string) => {
    onChange({
      ...value,
      [field]: date,
      preset: 'custom'
    })
  }

  const handleClear = () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const defaultFilter: TimeFilterOptions = {
      preset: 'month',
      startDate: monthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }

    onChange(defaultFilter)
    onClear?.()
  }

  const getPresetLabel = (preset: TimeFilterOptions['preset']) => {
    switch (preset) {
      case 'today':
        return 'اليوم'
      case 'week':
        return 'هذا الأسبوع'
      case 'month':
        return 'هذا الشهر'
      case 'year':
        return 'هذه السنة'
      case 'custom':
        return 'فترة مخصصة'
      default:
        return 'هذا الشهر'
    }
  }

  return (
    <div className={`${className}`} dir="rtl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between text-sm h-9"
            size="sm"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>فلترة زمنية</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <Card className="border-muted" dir="rtl">
            <CardContent className="p-4 space-y-3">
              {/* Preset Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-right block text-muted-foreground">
                  الفترة الزمنية
                </label>
                <Select value={value.preset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="text-right h-8 text-sm" dir="rtl">
                    <SelectValue placeholder="اختر الفترة الزمنية" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">هذا الأسبوع</SelectItem>
                    <SelectItem value="month">هذا الشهر</SelectItem>
                    <SelectItem value="year">هذه السنة</SelectItem>
                    <SelectItem value="custom">فترة مخصصة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {value.preset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-right block text-muted-foreground">
                      من تاريخ
                    </label>
                    <Input
                      type="date"
                      value={value.startDate || ''}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      className="text-right h-8 text-sm"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-right block text-muted-foreground">
                      إلى تاريخ
                    </label>
                    <Input
                      type="date"
                      value={value.endDate || ''}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      className="text-right h-8 text-sm"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}

              {/* Current Selection Display */}
              <div className="bg-muted/30 p-2 rounded text-right">
                <div className="text-xs text-muted-foreground mb-1">الفترة المحددة:</div>
                <div className="text-sm font-medium">
                  {getPresetLabel(value.preset)}
                  {value.startDate && value.endDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      من {new Date(value.startDate).toLocaleDateString('en-GB')}
                      إلى {new Date(value.endDate).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
              </div>

              {/* Clear Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleClear} className="h-7 text-xs">
                  <X className="w-3 h-3 ml-1" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export default TimeFilter
