import { useState, useEffect, useMemo } from 'react'
import { TimeFilterOptions } from '@/components/ui/time-filter'

export interface FilterableData {
  created_at?: string
  date?: string
  order_date?: string
  prescription_date?: string
  appointment_date?: string
  payment_date?: string
  [key: string]: any
}

interface UseTimeFilteredStatsOptions<T extends FilterableData> {
  data: T[]
  dateField?: keyof T
  initialFilter?: TimeFilterOptions
}

export function useTimeFilteredStats<T extends FilterableData>({
  data,
  dateField = 'created_at',
  initialFilter
}: UseTimeFilteredStatsOptions<T>) {
  // Initialize default filter
  const getDefaultFilter = (): TimeFilterOptions => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    
    return {
      preset: 'month',
      startDate: monthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  }

  const [timeFilter, setTimeFilter] = useState<TimeFilterOptions>(
    initialFilter || getDefaultFilter()
  )

  // Filter data based on time filter
  const filteredData = useMemo(() => {
    if (!timeFilter.startDate || !timeFilter.endDate) {
      return data
    }

    const startDate = new Date(timeFilter.startDate)
    const endDate = new Date(timeFilter.endDate)
    endDate.setHours(23, 59, 59, 999) // Include the entire end date

    return data.filter(item => {
      const itemDateValue = item[dateField]
      if (!itemDateValue) return false
      
      const itemDate = new Date(itemDateValue as string)
      return itemDate >= startDate && itemDate <= endDate
    })
  }, [data, timeFilter, dateField])

  // Calculate basic statistics
  const stats = useMemo(() => {
    const total = filteredData.length
    
    // Calculate period-based statistics
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const yearStart = new Date(today.getFullYear(), 0, 1)

    const todayCount = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= todayStart
    }).length

    const weekCount = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= weekStart
    }).length

    const monthCount = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= monthStart
    }).length

    const yearCount = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= yearStart
    }).length

    return {
      total,
      filtered: filteredData.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      year: yearCount
    }
  }, [data, filteredData, dateField])

  // Calculate financial statistics if data has amount fields
  const financialStats = useMemo(() => {
    const hasAmount = filteredData.some(item => 
      'amount' in item || 'total_amount' in item || 'cost' in item || 'price' in item
    )

    if (!hasAmount) return null

    const totalAmount = filteredData.reduce((sum, item) => {
      const amount = (item as any).amount || 
                   (item as any).total_amount || 
                   (item as any).cost || 
                   (item as any).price || 0
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0)
    }, 0)

    const averageAmount = filteredData.length > 0 ? totalAmount / filteredData.length : 0

    return {
      total: totalAmount,
      average: averageAmount,
      count: filteredData.length
    }
  }, [filteredData])

  // Group data by time periods for charts
  const groupedData = useMemo(() => {
    const groups: { [key: string]: T[] } = {}
    
    filteredData.forEach(item => {
      const itemDate = new Date(item[dateField] as string)
      let groupKey = ''

      switch (timeFilter.preset) {
        case 'today':
          groupKey = itemDate.toLocaleTimeString('ar-SA', { hour: '2-digit' })
          break
        case 'week':
          groupKey = itemDate.toLocaleDateString('ar-SA', { weekday: 'short' })
          break
        case 'month':
          groupKey = itemDate.getDate().toString()
          break
        case 'year':
          groupKey = itemDate.toLocaleDateString('ar-SA', { month: 'short' })
          break
        default:
          groupKey = itemDate.toLocaleDateString('ar-SA')
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    return groups
  }, [filteredData, timeFilter.preset, dateField])

  // Calculate trend (comparison with previous period)
  const trend = useMemo(() => {
    if (!timeFilter.startDate || !timeFilter.endDate) return null

    const currentStart = new Date(timeFilter.startDate)
    const currentEnd = new Date(timeFilter.endDate)
    const periodLength = currentEnd.getTime() - currentStart.getTime()
    
    const previousStart = new Date(currentStart.getTime() - periodLength)
    const previousEnd = new Date(currentStart.getTime() - 1)

    const previousData = data.filter(item => {
      const itemDate = new Date(item[dateField] as string)
      return itemDate >= previousStart && itemDate <= previousEnd
    })

    const currentCount = filteredData.length
    const previousCount = previousData.length
    
    if (previousCount === 0) return null

    const changePercent = ((currentCount - previousCount) / previousCount) * 100
    
    return {
      current: currentCount,
      previous: previousCount,
      change: currentCount - previousCount,
      changePercent: Math.round(changePercent * 100) / 100,
      isPositive: changePercent >= 0
    }
  }, [data, filteredData, timeFilter, dateField])

  const handleFilterChange = (newFilter: TimeFilterOptions) => {
    setTimeFilter(newFilter)
  }

  const resetFilter = () => {
    setTimeFilter(getDefaultFilter())
  }

  return {
    timeFilter,
    filteredData,
    stats,
    financialStats,
    groupedData,
    trend,
    handleFilterChange,
    resetFilter
  }
}

export default useTimeFilteredStats
