import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency mapping for Arabic currency names to ISO codes
const currencyMapping: { [key: string]: string } = {
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

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  // Handle null, undefined, or empty currency
  if (!currency) {
    currency = 'SAR'
  }

  // Map Arabic currency names to ISO codes
  const isoCode = currencyMapping[currency] || currency

  try {
    // Try to format with the ISO code
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: isoCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback: format as number with currency symbol
    console.warn(`Invalid currency code: ${currency}, falling back to SAR`)
    try {
      return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch (fallbackError) {
      // Ultimate fallback: just format the number with currency text
      const formattedNumber = new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
      return `${formattedNumber} ${currency}`
    }
  }
}

// Gregorian months in Arabic
const gregorianMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

// Arabic-Indic numerals
const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

function toArabicNumerals(num: number): string {
  return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('')
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  const arabicDay = toArabicNumerals(day)
  const arabicYear = toArabicNumerals(year)
  const monthName = gregorianMonths[month]

  return `${arabicDay} ${monthName} ${arabicYear}م`
}

// formatGregorianDate function - same as formatDate since we're using Gregorian calendar
export function formatGregorianDate(dateString: string): string {
  return formatDate(dateString)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  const arabicDay = toArabicNumerals(day)
  const arabicYear = toArabicNumerals(year)
  const monthName = gregorianMonths[month]

  const time = date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  return `${arabicDay} ${monthName} ${arabicYear}م - ${time}`
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function getCurrentGregorianDate(): string {
  const today = new Date()
  return formatDate(today.toISOString())
}

export function getGregorianMonthName(monthNumber: number): string {
  return gregorianMonths[monthNumber] || ''
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
