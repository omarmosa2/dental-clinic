import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { getTeethData, getToothInfo, getUpperTeeth, getLowerTeeth, TREATMENT_TYPES } from '@/data/teethData'
import { DentalTreatment } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/contexts/ThemeContext'
import { Baby, User } from 'lucide-react'

interface DentalChartProps {
  patientId: string
  onToothClick: (toothNumber: number) => void
  selectedTooth?: number | null
  className?: string
  isPrimaryTeeth?: boolean
  onPrimaryTeethChange?: (isPrimary: boolean) => void
}

export default function DentalChart({
  patientId,
  onToothClick,
  selectedTooth,
  className,
  isPrimaryTeeth: externalIsPrimaryTeeth = false,
  onPrimaryTeethChange
}: DentalChartProps) {
  const { treatments, loadTreatmentsByPatient } = useDentalTreatmentStore()
  const { isDarkMode } = useTheme()
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)
  const [internalIsPrimaryTeeth, setInternalIsPrimaryTeeth] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isPrimaryTeeth = onPrimaryTeethChange ? externalIsPrimaryTeeth : internalIsPrimaryTeeth
  const setIsPrimaryTeeth = onPrimaryTeethChange || setInternalIsPrimaryTeeth

  useEffect(() => {
    if (patientId) {
      loadTreatmentsByPatient(patientId)
    }
  }, [patientId, loadTreatmentsByPatient])

  // Force re-render when treatments change
  useEffect(() => {
    // This effect will trigger when treatments array changes
  }, [treatments])

  // Get treatment for specific tooth
  const getToothTreatment = (toothNumber: number): DentalTreatment | undefined => {
    return treatments.find(t => t.tooth_number === toothNumber && t.treatment_status !== 'cancelled')
  }

  // Get tooth color based on treatment
  const getToothColor = (toothNumber: number): string => {
    const treatment = getToothTreatment(toothNumber)
    if (treatment) {
      return treatment.treatment_color
    }
    return TREATMENT_TYPES.find(t => t.value === 'healthy')?.color || '#22c55e'
  }

  // Get tooth status text
  const getToothStatus = (toothNumber: number): string => {
    const treatment = getToothTreatment(toothNumber)
    if (treatment) {
      return treatment.current_treatment || 'سليم'
    }
    return 'سليم'
  }

  // Render individual tooth
  const renderTooth = (toothNumber: number) => {
    const toothInfo = getToothInfo(toothNumber, isPrimaryTeeth)
    const treatment = getToothTreatment(toothNumber)
    const color = getToothColor(toothNumber)
    const status = getToothStatus(toothNumber)
    const isSelected = selectedTooth === toothNumber
    const isHovered = hoveredTooth === toothNumber

    if (!toothInfo) return null

    return (
      <Tooltip key={toothNumber}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "relative h-16 w-16 p-1 transition-all duration-200 border-2",
              "flex flex-col items-center justify-center text-xs font-medium",
              isSelected && "ring-2 ring-blue-500 ring-offset-2",
              isHovered && "scale-105 shadow-lg",
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
            )}
            style={{
              backgroundColor: isSelected ? color : (isHovered ? color + '20' : color + '10'),
              borderColor: color,
              color: '#000000', // Always use black text for better contrast
              textShadow: '0 0 2px rgba(255,255,255,0.8)' // Add white text shadow for better readability
            }}
            onClick={() => onToothClick(toothNumber)}
            onMouseEnter={() => setHoveredTooth(toothNumber)}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {/* Tooth number */}
            <div
              className="text-xs font-bold mb-1 px-1 rounded"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#000000',
                textShadow: 'none'
              }}
            >
              {toothNumber}
            </div>

            {/* Tooth icon/representation */}
            <div
              className="w-6 h-6 rounded-sm border"
              style={{
                backgroundColor: color,
                borderColor: isDarkMode ? '#ffffff40' : '#00000040'
              }}
            />

            {/* Treatment indicator */}
            {treatment && (
              <div className="absolute -top-1 -right-1">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-white dark:bg-gray-800 border shadow-lg" dir="rtl">
          <div className="text-center space-y-2 p-2">
            <div className="font-semibold text-gray-900 dark:text-gray-100">{toothInfo.arabicName}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">رقم {toothNumber}</div>
            <div className="text-sm">
              <Badge
                variant="secondary"
                className="font-medium"
                style={{
                  backgroundColor: color + '20',
                  color: '#000000',
                  border: `1px solid ${color}`,
                  textShadow: 'none'
                }}
              >
                {status}
              </Badge>
            </div>
            {treatment?.next_treatment && (
              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-1 rounded">
                العلاج القادم: {treatment.next_treatment}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Split teeth into upper and lower rows
  const upperTeeth = getUpperTeeth(isPrimaryTeeth)
  const lowerTeeth = getLowerTeeth(isPrimaryTeeth)

  return (
    <TooltipProvider>
      <Card className={cn("w-full bg-card dark:bg-card border-border", className)} dir="rtl">
        <CardHeader className="bg-card dark:bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              مخطط الأسنان التفاعلي
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isPrimaryTeeth ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrimaryTeeth(true)}
                className="flex items-center gap-2"
              >
                <Baby className="w-4 h-4" />
                أسنان لبنية
              </Button>
              <Button
                variant={!isPrimaryTeeth ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrimaryTeeth(false)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                أسنان دائمة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 bg-card dark:bg-card">
          {/* Treatment Legend */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {TREATMENT_TYPES.slice(0, 6).map((type) => (
              <Badge
                key={type.value}
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: type.color + '20',
                  color: type.color,
                  borderColor: type.color + '40'
                }}
              >
                {type.label}
              </Badge>
            ))}
          </div>

          {/* Upper Jaw */}
          <div className="space-y-2">
            <div className="text-center text-sm font-medium text-muted-foreground">
              {isPrimaryTeeth ? 'الفك العلوي اللبني' : 'الفك العلوي'}
            </div>
            <div className={`grid gap-1 justify-center ${isPrimaryTeeth ? 'grid-cols-10' : 'grid-cols-16'}`}>
              {upperTeeth.map(tooth => renderTooth(tooth.number))}
            </div>
          </div>

          {/* Lower Jaw */}
          <div className="space-y-2">
            <div className="text-center text-sm font-medium text-muted-foreground">
              {isPrimaryTeeth ? 'الفك السفلي اللبني' : 'الفك السفلي'}
            </div>
            <div className={`grid gap-1 justify-center ${isPrimaryTeeth ? 'grid-cols-10' : 'grid-cols-16'}`}>
              {lowerTeeth.map(tooth => renderTooth(tooth.number))}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs text-muted-foreground mt-4">
            انقر على أي سن لعرض تفاصيل العلاج
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
