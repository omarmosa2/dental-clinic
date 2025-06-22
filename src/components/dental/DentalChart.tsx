import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { TEETH_DATA, getToothInfo, TREATMENT_TYPES } from '@/data/teethData'
import { DentalTreatment } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/contexts/ThemeContext'

interface DentalChartProps {
  patientId: string
  onToothClick: (toothNumber: number) => void
  selectedTooth?: number | null
  className?: string
}

export default function DentalChart({
  patientId,
  onToothClick,
  selectedTooth,
  className
}: DentalChartProps) {
  const { treatments, loadTreatmentsByPatient } = useDentalTreatmentStore()
  const { isDarkMode } = useTheme()
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)

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
    const toothInfo = getToothInfo(toothNumber)
    const treatment = getToothTreatment(toothNumber)
    const color = getToothColor(toothNumber)
    const status = getToothStatus(toothNumber)
    const isSelected = selectedTooth === toothNumber
    const isHovered = hoveredTooth === toothNumber

    if (!toothInfo) return null

    return (
      <TooltipProvider key={toothNumber}>
        <Tooltip>
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
                color: isDarkMode ? '#ffffff' : '#000000'
              }}
              onClick={() => onToothClick(toothNumber)}
              onMouseEnter={() => setHoveredTooth(toothNumber)}
              onMouseLeave={() => setHoveredTooth(null)}
            >
              {/* Tooth number */}
              <div className="text-xs font-bold mb-1">
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
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center space-y-1">
              <div className="font-semibold">{toothInfo.arabicName}</div>
              <div className="text-sm text-muted-foreground">رقم {toothNumber}</div>
              <div className="text-sm">
                <Badge variant="secondary" style={{ backgroundColor: color + '20', color: color }}>
                  {status}
                </Badge>
              </div>
              {treatment?.next_treatment && (
                <div className="text-xs text-muted-foreground">
                  العلاج القادم: {treatment.next_treatment}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Split teeth into upper and lower rows
  const upperTeeth = TEETH_DATA.filter(t => t.position === 'upper').sort((a, b) => a.number - b.number)
  const lowerTeeth = TEETH_DATA.filter(t => t.position === 'lower').sort((a, b) => a.number - b.number)

  return (
    <Card className={cn("w-full", className)} dir="rtl">
      <CardHeader>
        <CardTitle className="text-center text-lg font-semibold">
          مخطط الأسنان التفاعلي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
            الفك العلوي
          </div>
          <div className="grid grid-cols-16 gap-1 justify-center">
            {upperTeeth.map(tooth => renderTooth(tooth.number))}
          </div>
        </div>

        {/* Lower Jaw */}
        <div className="space-y-2">
          <div className="text-center text-sm font-medium text-muted-foreground">
            الفك السفلي
          </div>
          <div className="grid grid-cols-16 gap-1 justify-center">
            {lowerTeeth.map(tooth => renderTooth(tooth.number))}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-muted-foreground mt-4">
          انقر على أي سن لعرض تفاصيل العلاج
        </div>
      </CardContent>
    </Card>
  )
}
