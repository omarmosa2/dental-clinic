import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency mapping for Arabic currency names to ISO codes
const currencyMapping: { [key: string]: string } = {
  '$': 'USD',
  '$ أمريكي': 'USD',
  'ريال': 'SAR',
  'ريال سعودي': 'SAR',
  'درهم': 'AED',
  'درهم إماراتي': 'AED',
  'دينار': 'KWD',
  'دينار كويتي': 'KWD',
  'دولار': 'USD',
  'دولار أمريكي': 'USD',
  'يورو': 'EUR',
  'جنيه': 'EGP',
  'جنيه مصري': 'EGP',
  'SAR': 'SAR',
  'AED': 'AED',
  'KWD': 'KWD',
  'USD': 'USD',
  'EUR': 'EUR',
  'EGP': 'EGP'
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Validate amount first
  const validAmount = Number(amount)
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    console.warn('Invalid amount for currency formatting:', amount)
    return '$0.00' // Return default formatted zero
  }

  // Handle null, undefined, or empty currency
  if (!currency) {
    currency = 'USD'
  }

  // Map Arabic currency names to ISO codes
  const isoCode = currencyMapping[currency] || currency

  try {
    // Try to format with the ISO code
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: isoCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(validAmount)
  } catch (error) {
    // Fallback: format as number with currency symbol
    console.warn(`Invalid currency code: ${currency}, falling back to USD`)
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(validAmount)
    } catch (fallbackError) {
      // Ultimate fallback: just format the number with currency text
      try {
        const formattedNumber = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(validAmount)
        return `${formattedNumber} ${currency}`
      } catch (finalError) {
        // Final fallback: return simple formatted string
        return `${validAmount.toFixed(2)} ${currency}`
      }
    }
  }
}

// Import Gregorian calendar configuration
import { GREGORIAN_MONTHS_AR, formatGregorianDate as formatGregorianDateCore, formatGregorianMonthYear as formatGregorianMonthYearCore, parseGregorianMonthString } from './gregorianCalendar'

// Gregorian months in Arabic - التقويم الميلادي
// This application uses ONLY Gregorian calendar system
const gregorianMonths = GREGORIAN_MONTHS_AR

// Arabic-Indic numerals
const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

function toArabicNumerals(num: number): string {
  return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('')
}

export function formatDate(dateString: string | Date | null | undefined, format?: 'short' | 'long'): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Using Gregorian calendar system - التقويم الميلادي
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()

    // Format as DD/MM/YYYY (Gregorian format)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year}`
  } catch (error) {
    console.warn('Error formatting date:', error, 'Input:', dateString)
    return '--'
  }
}

// formatGregorianDate function - same as formatDate since we're using Gregorian calendar
export function formatGregorianDate(dateString: string | Date): string {
  return formatDate(dateString)
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Using Gregorian calendar system - التقويم الميلادي
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()

    // Format date as DD/MM/YYYY (Gregorian format)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')
    const formattedDate = `${formattedDay}/${formattedMonth}/${year}`

    const time = date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    return `${formattedDate} - ${time}`
  } catch (error) {
    console.warn('Error formatting date time:', error, 'Input:', dateString)
    return '--'
  }
}

export function formatTime(dateString: string | null | undefined): string {
  // Handle null, undefined, or empty string cases
  if (!dateString) {
    return '--'
  }

  try {
    const date = new Date(dateString)

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.warn('Error formatting time:', error, 'Input:', dateString)
    return '--'
  }
}

export function getCurrentGregorianDate(): string {
  const today = new Date()
  return formatDate(today)
}

/**
 * حساب بداية الأسبوع (الأحد)
 * Calculate start of week (Sunday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const weekStart = new Date(date)
  const dayOfWeek = weekStart.getDay() // 0 = الأحد، 1 = الاثنين، إلخ
  weekStart.setDate(date.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0) // تعيين بداية اليوم
  return weekStart
}

/**
 * حساب نهاية الأسبوع (السبت)
 * Calculate end of week (Saturday)
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekEnd = new Date(date)
  const dayOfWeek = weekEnd.getDay() // 0 = الأحد، 1 = الاثنين، إلخ
  weekEnd.setDate(date.getDate() + (6 - dayOfWeek))
  weekEnd.setHours(23, 59, 59, 999) // تعيين نهاية اليوم
  return weekEnd
}

export function getGregorianMonthName(monthNumber: number): string {
  return gregorianMonths[monthNumber] || ''
}

// Format month and year using Gregorian calendar with Arabic month names
export function formatGregorianMonthYear(year: number, monthIndex: number): string {
  return formatGregorianMonthYearCore(year, monthIndex)
}

// Parse YYYY-MM format and return Gregorian month name with year
export function parseAndFormatGregorianMonth(monthString: string): string {
  return parseGregorianMonthString(monthString)
}

// Function to get status color (keeping existing functionality)
export function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'no_show':
      return 'bg-muted text-muted-foreground border-border'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

// Professional chart color schemes for better data visualization
export const chartColorSchemes = {
  // Primary color scheme - Professional blues and teals
  primary: [
    '#0ea5e9', // Sky blue
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#1e40af', // Dark blue
    '#0284c7', // Sky 600
    '#0369a1', // Sky 700
    '#075985', // Sky 800
    '#0c4a6e'  // Sky 900
  ],

  // Medical color scheme - Health-focused colors
  medical: [
    '#10b981', // Emerald (success/healthy)
    '#059669', // Emerald 600
    '#047857', // Emerald 700
    '#065f46', // Emerald 800
    '#064e3b', // Emerald 900
    '#22c55e', // Green 500
    '#16a34a', // Green 600
    '#15803d'  // Green 700
  ],

  // Status color scheme - For appointment/payment statuses
  status: [
    '#10b981', // Completed (green)
    '#f59e0b', // Pending (amber)
    '#ef4444', // Cancelled/Failed (red)
    '#6b7280', // No show (gray)
    '#8b5cf6', // Scheduled (purple)
    '#06b6d4', // In progress (cyan)
    '#f97316', // Warning (orange)
    '#ec4899'  // Priority (pink)
  ],

  // Financial color scheme - Money-related visualizations
  financial: [
    '#059669', // Revenue (green)
    '#dc2626', // Expenses (red)
    '#d97706', // Pending (amber)
    '#7c3aed', // Profit (purple)
    '#0891b2', // Cash flow (cyan)
    '#be185d', // Debt (pink)
    '#ea580c', // Investment (orange)
    '#4338ca'  // Savings (indigo)
  ],

  // Categorical color scheme - For diverse data categories
  categorical: [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#6366f1'  // Indigo
  ],

  // Gradient color scheme - For area charts and backgrounds
  gradients: {
    blue: ['#dbeafe', '#3b82f6'],
    green: ['#dcfce7', '#10b981'],
    purple: ['#f3e8ff', '#8b5cf6'],
    orange: ['#fed7aa', '#f97316'],
    red: ['#fecaca', '#ef4444'],
    cyan: ['#cffafe', '#06b6d4']
  },

  // Inventory color scheme - For stock and supply management
  inventory: [
    '#10b981', // In stock (green)
    '#f59e0b', // Low stock (amber)
    '#ef4444', // Out of stock (red)
    '#8b5cf6', // Ordered (purple)
    '#06b6d4', // Received (cyan)
    '#f97316', // Expired (orange)
    '#ec4899', // Reserved (pink)
    '#6b7280'  // Discontinued (gray)
  ],

  // Patient demographics color scheme
  demographics: [
    '#3b82f6', // Male (blue)
    '#ec4899', // Female (pink)
    '#10b981', // Adult (green)
    '#f59e0b', // Senior (amber)
    '#8b5cf6', // Child (purple)
    '#06b6d4', // Teen (cyan)
    '#f97316', // Infant (orange)
    '#6b7280'  // Unknown (gray)
  ],

  // Treatment type color scheme
  treatments: [
    '#10b981', // Cleaning (green)
    '#3b82f6', // Filling (blue)
    '#8b5cf6', // Root canal (purple)
    '#f59e0b', // Crown (amber)
    '#ef4444', // Extraction (red)
    '#06b6d4', // Orthodontics (cyan)
    '#f97316', // Implant (orange)
    '#ec4899'  // Cosmetic (pink)
  ]
}

// Get theme-aware chart colors
export function getChartColors(scheme: keyof typeof chartColorSchemes = 'primary', isDarkMode: boolean = false): string[] {
  const colors = chartColorSchemes[scheme]

  if (isDarkMode) {
    // Brighten colors for dark mode
    return colors.map(color => {
      // Convert hex to RGB and brighten
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      // Increase brightness by 20%
      const brightenedR = Math.min(255, Math.round(r * 1.2))
      const brightenedG = Math.min(255, Math.round(g * 1.2))
      const brightenedB = Math.min(255, Math.round(b * 1.2))

      return `#${brightenedR.toString(16).padStart(2, '0')}${brightenedG.toString(16).padStart(2, '0')}${brightenedB.toString(16).padStart(2, '0')}`
    })
  }

  return colors
}

// Enhanced professional chart configuration
export const chartConfig = {
  // Responsive breakpoints with improved heights
  responsive: {
    mobile: { width: '100%', height: 280 },
    tablet: { width: '100%', height: 320 },
    desktop: { width: '100%', height: 380 },
    large: { width: '100%', height: 420 }
  },

  // Grid and axis styling
  grid: {
    strokeDasharray: '3 3',
    stroke: '#e5e7eb', // Light gray
    strokeOpacity: 0.5
  },

  darkGrid: {
    strokeDasharray: '3 3',
    stroke: '#374151', // Dark gray
    strokeOpacity: 0.7
  },

  // Enhanced axis styling
  axis: {
    light: {
      tick: { fontSize: 12, fill: '#6b7280', fontFamily: 'Inter, sans-serif' },
      axisLine: { stroke: '#d1d5db', strokeWidth: 1 },
      tickLine: { stroke: '#d1d5db', strokeWidth: 1 }
    },
    dark: {
      tick: { fontSize: 12, fill: '#9ca3af', fontFamily: 'Inter, sans-serif' },
      axisLine: { stroke: '#4b5563', strokeWidth: 1 },
      tickLine: { stroke: '#4b5563', strokeWidth: 1 }
    }
  },

  // Enhanced tooltip styling with RTL support
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      fontSize: '14px',
      fontWeight: '500',
      fontFamily: 'Inter, sans-serif',
      direction: 'rtl',
      textAlign: 'right'
    },

    darkContentStyle: {
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      fontSize: '14px',
      fontWeight: '500',
      color: '#f9fafb',
      fontFamily: 'Inter, sans-serif',
      direction: 'rtl',
      textAlign: 'right'
    }
  },

  // Enhanced animation settings
  animation: {
    duration: 800,
    easing: 'ease-in-out',
    delay: 0
  },

  // Chart-specific configurations
  pie: {
    outerRadius: 120,
    innerRadius: 50,
    paddingAngle: 2,
    strokeWidth: 2
  },

  bar: {
    radius: [4, 4, 0, 0],
    minPointSize: 5,
    maxBarSize: 100,
    barCategoryGap: '20%'
  },

  line: {
    strokeWidth: 3,
    dot: { strokeWidth: 2, r: 4 },
    activeDot: { r: 6, strokeWidth: 2 }
  },

  area: {
    strokeWidth: 3,
    fillOpacity: 0.3
  }
}

// Get enhanced chart configuration based on theme
export function getChartConfig(isDarkMode: boolean = false) {
  return {
    ...chartConfig,
    grid: isDarkMode ? chartConfig.darkGrid : chartConfig.grid,
    tooltip: isDarkMode ? chartConfig.tooltip.darkContentStyle : chartConfig.tooltip.contentStyle,
    axis: isDarkMode ? chartConfig.axis.dark : chartConfig.axis.light
  }
}

// Get chart colors with automatic fallback
export function getChartColorsWithFallback(
  scheme: keyof typeof chartColorSchemes = 'primary',
  isDarkMode: boolean = false,
  dataLength: number = 1
): string[] {
  const colors = getChartColors(scheme, isDarkMode)

  // If we need more colors than available, cycle through them
  if (dataLength > colors.length) {
    const result: string[] = []
    for (let i = 0; i < dataLength; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }

  return colors.slice(0, dataLength)
}

// Format chart values with proper currency and number formatting
export function formatChartValue(
  value: number,
  type: 'currency' | 'percentage' | 'number' = 'number',
  currency: string = 'USD'
): string {
  // Validate input value
  const validValue = Number(value)
  if (isNaN(validValue) || !isFinite(validValue)) {
    console.warn('Invalid value for chart formatting:', value)
    switch (type) {
      case 'currency':
        return '$0.00'
      case 'percentage':
        return '0%'
      case 'number':
      default:
        return '0'
    }
  }

  try {
    switch (type) {
      case 'currency':
        return formatCurrency(validValue, currency)
      case 'percentage':
        const percentage = Math.round(validValue * 10) / 10
        return `${isNaN(percentage) ? 0 : percentage}%`
      case 'number':
      default:
        try {
          return validValue.toLocaleString('ar-SA', { maximumFractionDigits: 2 })
        } catch (localeError) {
          // Fallback to simple formatting
          return validValue.toFixed(2)
        }
    }
  } catch (error) {
    console.warn('Error formatting chart value:', error)
    return validValue.toString()
  }
}

// Function to get initials from full name
export function getInitials(fullName: string): string {
  if (!fullName) return '??'

  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase()
  }

  // Take first letter of first name and first letter of last name
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
}

// Function to calculate age from date of birth (keeping for backward compatibility)
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}
