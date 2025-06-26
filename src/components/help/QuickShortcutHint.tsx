import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Keyboard, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickShortcutHintProps {
  className?: string
}

const hints = [
  { key: 'F1', description: 'الإعدادات' },
  { key: 'A/ش', description: 'مريض جديد' },
  { key: 'S/س', description: 'موعد جديد' },
  { key: 'D/ي', description: 'دفعة جديدة' },
  { key: 'R/ق', description: 'تحديث' },
  { key: 'F/ب', description: 'بحث' },
  { key: '0-9', description: 'تنقل سريع' }
]

export default function QuickShortcutHint({ className }: QuickShortcutHintProps) {
  const [currentHint, setCurrentHint] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!isVisible || isPaused) return

    const interval = setInterval(() => {
      setCurrentHint((prev) => (prev + 1) % hints.length)
    }, 3000) // Change hint every 3 seconds

    return () => clearInterval(interval)
  }, [isVisible, isPaused])

  if (!isVisible) return null

  const hint = hints[currentHint]

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Keyboard className="w-3 h-3 text-blue-600 dark:text-blue-400" />
      <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
        نصيحة:
      </span>
      <Badge 
        variant="secondary" 
        className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700"
      >
        {hint.key}
      </Badge>
      <span className="text-xs text-blue-700 dark:text-blue-300">
        {hint.description}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className="h-4 w-4 p-0 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 ml-1"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
