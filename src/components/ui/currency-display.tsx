import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
  fallbackFormat?: boolean
}

export function CurrencyDisplay({ 
  amount, 
  currency = 'SAR', 
  className = '',
  fallbackFormat = true 
}: CurrencyDisplayProps) {
  try {
    return (
      <span className={className}>
        {formatCurrency(amount, currency)}
      </span>
    )
  } catch (error) {
    console.warn('Error formatting currency:', error)
    
    if (fallbackFormat) {
      // Fallback formatting
      const formattedNumber = new Intl.NumberFormat('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
      
      return (
        <span className={className}>
          {formattedNumber} {currency}
        </span>
      )
    }
    
    return (
      <span className={className}>
        {amount} {currency}
      </span>
    )
  }
}

export default CurrencyDisplay
