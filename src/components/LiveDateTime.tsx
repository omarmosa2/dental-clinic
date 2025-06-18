/**
 * Live Date Time Component
 * Displays current date and time in Arabic with Gregorian calendar
 * Updates every second to show real-time clock
 */

import React, { useState, useEffect } from 'react'

export default function LiveDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatGregorianDateTime = (date: Date): string => {
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()

    // Gregorian months in Arabic
    const gregorianMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]

    // Arabic-Indic numerals
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    const toArabicNumerals = (num: number): string => {
      return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('')
    }

    const arabicDay = toArabicNumerals(day)
    const arabicYear = toArabicNumerals(year)
    const arabicHours = toArabicNumerals(hours.toString().padStart(2, '0'))
    const arabicMinutes = toArabicNumerals(minutes.toString().padStart(2, '0'))
    const arabicSeconds = toArabicNumerals(seconds.toString().padStart(2, '0'))
    const monthName = gregorianMonths[month]

    // Format: ٢٠٢٥/٦/١٧ - ١٢:٣٠:٤٥
    const dateNumbers = `${arabicYear}/${toArabicNumerals(month + 1)}/${arabicDay}`
    const timeNumbers = `${arabicHours}:${arabicMinutes}:${arabicSeconds}`
    
    return `${dateNumbers} - ${timeNumbers}`
  }

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-xs">📅</span>
      <span>{formatGregorianDateTime(currentDateTime)}</span>
    </div>
  )
}
