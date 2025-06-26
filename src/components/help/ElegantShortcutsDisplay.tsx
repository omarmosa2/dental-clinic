import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Keyboard, 
  ChevronDown, 
  ChevronUp,
  Settings,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
  Search,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutItem {
  key: string
  arabicKey: string
  description: string
  icon: React.ReactNode
  category: string
}

const shortcuts: ShortcutItem[] = [
  // التنقل
  { key: '0', arabicKey: '٠', description: 'لوحة التحكم', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '1', arabicKey: '١', description: 'المرضى', icon: <Users className="w-3 h-3" />, category: 'تنقل' },
  { key: '2', arabicKey: '٢', description: 'المواعيد', icon: <Calendar className="w-3 h-3" />, category: 'تنقل' },
  { key: '3', arabicKey: '٣', description: 'الدفعات', icon: <DollarSign className="w-3 h-3" />, category: 'تنقل' },
  { key: '4', arabicKey: '٤', description: 'المخزون', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '5', arabicKey: '٥', description: 'المختبرات', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '6', arabicKey: '٦', description: 'الأدوية', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '7', arabicKey: '٧', description: 'العلاجات', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '8', arabicKey: '٨', description: 'احتياجات العيادة', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  { key: '9', arabicKey: '٩', description: 'التقارير', icon: <Settings className="w-3 h-3" />, category: 'تنقل' },
  
  // الإجراءات
  { key: 'A', arabicKey: 'ش', description: 'إضافة مريض جديد', icon: <Users className="w-3 h-3" />, category: 'إجراءات' },
  { key: 'S', arabicKey: 'س', description: 'إضافة موعد جديد', icon: <Calendar className="w-3 h-3" />, category: 'إجراءات' },
  { key: 'D', arabicKey: 'ي', description: 'إضافة دفعة جديدة', icon: <DollarSign className="w-3 h-3" />, category: 'إجراءات' },
  
  // العمليات
  { key: 'F1', arabicKey: 'F1', description: 'فتح الإعدادات', icon: <Settings className="w-3 h-3" />, category: 'عمليات' },
  { key: 'R', arabicKey: 'ق', description: 'تحديث الصفحة', icon: <RefreshCw className="w-3 h-3" />, category: 'عمليات' },
  { key: 'F', arabicKey: 'ب', description: 'فتح البحث', icon: <Search className="w-3 h-3" />, category: 'عمليات' },
  { key: 'ESC', arabicKey: 'ESC', description: 'إغلاق النوافذ', icon: <X className="w-3 h-3" />, category: 'عمليات' },
]

interface ElegantShortcutsDisplayProps {
  className?: string
  compact?: boolean
}

export default function ElegantShortcutsDisplay({ className, compact = false }: ElegantShortcutsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))
  const filteredShortcuts = selectedCategory 
    ? shortcuts.filter(s => s.category === selectedCategory)
    : shortcuts

  if (compact) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Card className="shadow-lg border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  اختصارات سريعة
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {/* Category Filter */}
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="h-6 text-xs"
                  >
                    الكل
                  </Button>
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="h-6 text-xs"
                    >
                      {category}
                    </Button>
                  ))}
                </div>

                {/* Shortcuts List */}
                <div className="space-y-1">
                  {filteredShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {shortcut.icon}
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {shortcut.key}
                        </Badge>
                        {shortcut.arabicKey !== shortcut.key && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-green-200 text-green-700 dark:border-green-800 dark:text-green-300">
                            {shortcut.arabicKey}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Full display version
  return (
    <Card className={cn("shadow-lg", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg">اختصارات لوحة المفاتيح</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <div key={category} className="space-y-2">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 border-b border-blue-200 pb-1">
                {category}
              </h4>
              <div className="space-y-1">
                {shortcuts.filter(s => s.category === category).map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.icon}
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {shortcut.key}
                      </Badge>
                      {shortcut.arabicKey !== shortcut.key && (
                        <Badge variant="outline" className="text-xs">
                          {shortcut.arabicKey}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
