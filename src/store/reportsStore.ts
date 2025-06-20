import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ReportData,
  ReportFilter,
  PatientReportData,
  AppointmentReportData,
  FinancialReportData,
  InventoryReportData,
  AnalyticsReportData,
  ReportExportOptions
} from '../types'

interface ReportsState {
  // Data
  reportData: ReportData | null
  patientReports: PatientReportData | null
  appointmentReports: AppointmentReportData | null
  financialReports: FinancialReportData | null
  inventoryReports: InventoryReportData | null
  analyticsReports: AnalyticsReportData | null

  // UI State
  isLoading: boolean
  isExporting: boolean
  error: string | null
  activeReportType: 'overview' | 'patients' | 'appointments' | 'financial' | 'inventory' | 'analytics'

  // Filters
  currentFilter: ReportFilter
  savedFilters: { name: string; filter: ReportFilter }[]

  // Cache
  cachedReports: Map<string, { data: any; timestamp: number }>
  cacheExpiry: number // in milliseconds

  // Auto-refresh management
  autoRefreshInterval: NodeJS.Timeout | null
}

interface ReportsActions {
  // Data operations
  generateReport: (type: ReportsState['activeReportType'], filter?: Partial<ReportFilter>) => Promise<void>
  generateAllReports: (filter?: Partial<ReportFilter>) => Promise<void>
  refreshReports: () => Promise<void>

  // Filter operations
  setFilter: (filter: Partial<ReportFilter>) => void
  resetFilter: () => void
  saveFilter: (name: string) => void
  loadFilter: (name: string) => void
  deleteFilter: (name: string) => void

  // UI operations
  setActiveReportType: (type: ReportsState['activeReportType']) => void
  clearError: () => void

  // Export operations
  exportReport: (type: ReportsState['activeReportType'], options: ReportExportOptions) => Promise<void>

  // Cache operations
  clearCache: () => void
  getCachedReport: (key: string) => any | null
  setCachedReport: (key: string, data: any) => void

  // Auto-refresh operations
  startAutoRefresh: (intervalMinutes?: number) => void
  stopAutoRefresh: () => void
  syncReportsData: () => Promise<void>
}

type ReportsStore = ReportsState & ReportsActions

const getDefaultFilter = (): ReportFilter => {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    dateRange: {
      start: startOfMonth.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      preset: 'month'
    }
  }
}

const generateCacheKey = (type: string, filter: ReportFilter): string => {
  return `${type}_${JSON.stringify(filter)}`
}

export const useReportsStore = create<ReportsStore>()(
  devtools(
    (set, get) => {
      // Listen for patient-related events to auto-refresh reports
      if (typeof window !== 'undefined') {
        // Auto-refresh when patient is deleted
        window.addEventListener('patient-deleted', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient deletion:', error)
          }
        })

        // Auto-refresh when patient is added
        window.addEventListener('patient-added', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient addition:', error)
          }
        })

        // Auto-refresh when patient is updated
        window.addEventListener('patient-updated', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('patients')
          } catch (error) {
            console.error('Error refreshing reports after patient update:', error)
          }
        })

        // Auto-refresh when appointment is added/updated/deleted
        window.addEventListener('appointment-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('appointments')
          } catch (error) {
            console.error('Error refreshing appointment reports:', error)
          }
        })

        // Auto-refresh when payment is added/updated/deleted
        window.addEventListener('payment-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('financial')
          } catch (error) {
            console.error('Error refreshing financial reports:', error)
          }
        })

        // Auto-refresh when inventory is added/updated/deleted
        window.addEventListener('inventory-changed', async (event: any) => {
          const { clearCache, generateReport } = get()
          clearCache()
          try {
            await generateReport('inventory')
          } catch (error) {
            console.error('Error refreshing inventory reports:', error)
          }
        })
      }

      return {
        // Initial state
        reportData: null,
        patientReports: null,
        appointmentReports: null,
        financialReports: null,
        inventoryReports: null,
        analyticsReports: null,
        isLoading: false,
        isExporting: false,
        error: null,
        activeReportType: 'overview',
        currentFilter: getDefaultFilter(),
        savedFilters: [],
        cachedReports: new Map(),
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        autoRefreshInterval: null,

      // Data operations
      generateReport: async (type, filterOverride) => {
        const { currentFilter, getCachedReport, setCachedReport, cacheExpiry } = get()
        const filter = { ...currentFilter, ...filterOverride }
        const cacheKey = generateCacheKey(type, filter)

        // Check cache first
        const cached = getCachedReport(cacheKey)
        if (cached) {
          set({ [`${type}Reports`]: cached, isLoading: false })
          return
        }

        set({ isLoading: true, error: null })

        try {
          let reportData: any = null

          switch (type) {
            case 'patients':
              reportData = await window.electronAPI?.reports?.generatePatientReport(filter)
              set({ patientReports: reportData })
              break
            case 'appointments':
              reportData = await window.electronAPI?.reports?.generateAppointmentReport(filter)
              console.log(`✅ Appointment report generated:`, reportData)
              set({ appointmentReports: reportData })
              break
            case 'financial':
              reportData = await window.electronAPI?.reports?.generateFinancialReport(filter)
              console.log(`✅ Financial report generated:`, reportData)
              set({ financialReports: reportData })
              break
            case 'inventory':
              reportData = await window.electronAPI?.reports?.generateInventoryReport(filter)
              console.log(`✅ Inventory report generated:`, reportData)
              set({ inventoryReports: reportData })
              break
            case 'analytics':
              reportData = await window.electronAPI?.reports?.generateAnalyticsReport(filter)
              console.log(`✅ Analytics report generated:`, reportData)
              set({ analyticsReports: reportData })
              break
            case 'overview':
              reportData = await window.electronAPI?.reports?.generateOverviewReport(filter)
              console.log(`✅ Overview report generated:`, reportData)
              set({ reportData })
              break
          }

          // Cache the result
          if (reportData) {
            setCachedReport(cacheKey, reportData)
            console.log(`💾 Report cached with key: ${cacheKey}`)
          }

          set({ isLoading: false })
        } catch (error) {
          console.error(`❌ Error generating ${type} report:`, error)
          set({
            error: error instanceof Error ? error.message : `Failed to generate ${type} report`,
            isLoading: false
          })
        }
      },

      generateAllReports: async (filterOverride) => {
        const { generateReport } = get()
        const reportTypes: ReportsState['activeReportType'][] = [
          'patients', 'appointments', 'financial', 'inventory', 'analytics'
        ]

        set({ isLoading: true, error: null })

        try {
          // Generate reports sequentially to avoid overwhelming the system
          for (const type of reportTypes) {
            await generateReport(type, filterOverride)
          }

          console.log('✅ All reports generated successfully')
          set({ isLoading: false })
        } catch (error) {
          console.error('❌ Error generating all reports:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to generate reports',
            isLoading: false
          })
        }
      },

      refreshReports: async () => {
        const { activeReportType, currentFilter, clearCache } = get()
        clearCache()
        await get().generateReport(activeReportType, currentFilter)
      },

      // Filter operations
      setFilter: (filter) => {
        set({ currentFilter: { ...get().currentFilter, ...filter } })
      },

      resetFilter: () => {
        set({ currentFilter: getDefaultFilter() })
      },

      saveFilter: (name) => {
        const { currentFilter, savedFilters } = get()
        const newFilter = { name, filter: currentFilter }
        const existingIndex = savedFilters.findIndex(f => f.name === name)

        if (existingIndex >= 0) {
          const updated = [...savedFilters]
          updated[existingIndex] = newFilter
          set({ savedFilters: updated })
        } else {
          set({ savedFilters: [...savedFilters, newFilter] })
        }
      },

      loadFilter: (name) => {
        const { savedFilters } = get()
        const savedFilter = savedFilters.find(f => f.name === name)
        if (savedFilter) {
          set({ currentFilter: savedFilter.filter })
        }
      },

      deleteFilter: (name) => {
        const { savedFilters } = get()
        set({ savedFilters: savedFilters.filter(f => f.name !== name) })
      },

      // UI operations
      setActiveReportType: (type) => {
        set({ activeReportType: type })
      },

      clearError: () => {
        set({ error: null })
      },

      // Export operations
      exportReport: async (type, options) => {
        set({ isExporting: true, error: null })

        try {
          const { currentFilter } = get()
          const result = await window.electronAPI?.reports?.exportReport(type, currentFilter, options)
          set({ isExporting: false })

          if (result?.success) {
            // Show success notification
            const event = new CustomEvent('showToast', {
              detail: {
                title: 'تم التصدير بنجاح',
                description: `تم حفظ التقرير في: ${result.filePath}`,
                type: 'success'
              }
            })
            window.dispatchEvent(event)
          } else {
            throw new Error(result?.message || 'فشل في تصدير التقرير')
          }

          return result
        } catch (error) {
          console.error('Error exporting report:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to export report'
          set({
            error: errorMessage,
            isExporting: false
          })

          // Show error notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'خطأ في التصدير',
              description: errorMessage,
              type: 'error'
            }
          })
          window.dispatchEvent(event)

          throw error
        }
      },

      // Cache operations
      clearCache: () => {
        set({ cachedReports: new Map() })
      },

      // Auto-refresh operations
      startAutoRefresh: (intervalMinutes = 5) => {
        const { stopAutoRefresh } = get()
        stopAutoRefresh() // Clear any existing interval

        const interval = setInterval(async () => {
          const { activeReportType, generateReport, generateAllReports } = get()
          try {
            if (activeReportType === 'overview') {
              await generateAllReports()
            } else {
              await generateReport(activeReportType)
            }
            console.log('Auto-refresh completed successfully')
          } catch (error) {
            console.error('Auto-refresh failed:', error)
          }
        }, intervalMinutes * 60 * 1000)

        set({ autoRefreshInterval: interval })
      },

      stopAutoRefresh: () => {
        const { autoRefreshInterval } = get()
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval)
          set({ autoRefreshInterval: null })
        }
      },

      // Real-time data sync
      syncReportsData: async () => {
        const { generateAllReports } = get()
        try {
          await generateAllReports()

          // Show sync notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'تم تحديث البيانات',
              description: 'تم مزامنة جميع التقارير بنجاح',
              type: 'success'
            }
          })
          window.dispatchEvent(event)
        } catch (error) {
          console.error('Data sync failed:', error)

          // Show error notification
          const event = new CustomEvent('showToast', {
            detail: {
              title: 'خطأ في المزامنة',
              description: 'فشل في تحديث البيانات',
              type: 'error'
            }
          })
          window.dispatchEvent(event)
        }
      },

      getCachedReport: (key) => {
        const { cachedReports, cacheExpiry } = get()
        const cached = cachedReports.get(key)

        if (cached && Date.now() - cached.timestamp < cacheExpiry) {
          return cached.data
        }

        return null
      },

      setCachedReport: (key, data) => {
        const { cachedReports } = get()
        const newCache = new Map(cachedReports)
        newCache.set(key, { data, timestamp: Date.now() })
        set({ cachedReports: newCache })
      }
      }
    }),
    {
      name: 'reports-store'
    }
  )
