import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { QuickAccessService } from '@/services/quickAccessService'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { GlobalSearchService } from '@/services/globalSearchService'
import type {
  SearchResults,
  SearchCriteria,
  SmartAlert,
  QuickAccessData,
  ActivityLog,
  QuickAction,
  QuickLink
} from '@/types'

interface GlobalState {
  // Search State
  globalSearchQuery: string
  globalSearchResults: SearchResults | null
  isSearching: boolean
  searchHistory: string[]

  // Alerts State
  alerts: SmartAlert[]
  unreadAlertsCount: number
  isLoadingAlerts: boolean

  // Quick Access State
  quickAccessData: QuickAccessData | null
  isLoadingQuickAccess: boolean

  // Activity Log State
  recentActivities: ActivityLog[]

  // Quick Actions State
  quickActions: QuickAction[]
  quickLinks: QuickLink[]

  // Global State
  isGlobalLoading: boolean
  lastSyncTime: string | null
  error: string | null

  // UI State
  showGlobalSearch: boolean
  showQuickAccess: boolean
  showAlerts: boolean
}

interface GlobalActions {
  // Search Actions
  setGlobalSearchQuery: (query: string) => void
  performGlobalSearch: (criteria: SearchCriteria) => Promise<void>
  clearSearchResults: () => void
  addToSearchHistory: (query: string) => void
  clearSearchHistory: () => void

  // Alerts Actions
  loadAlerts: () => Promise<void>
  markAlertAsRead: (alertId: string) => Promise<void>
  dismissAlert: (alertId: string) => Promise<void>
  snoozeAlert: (alertId: string, snoozeUntil: string) => Promise<void>
  createAlert: (alert: Omit<SmartAlert, 'id' | 'createdAt'>) => Promise<void>

  // Quick Access Actions
  loadQuickAccessData: () => Promise<void>
  refreshQuickAccessData: () => Promise<void>

  // Activity Log Actions
  addActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => void
  loadRecentActivities: () => Promise<void>

  // Quick Actions
  executeQuickAction: (actionId: string) => void
  addQuickAction: (action: QuickAction) => void
  removeQuickAction: (actionId: string) => void

  // Global Actions
  syncAllData: () => Promise<void>
  clearError: () => void

  // UI Actions
  toggleGlobalSearch: () => void
  toggleQuickAccess: () => void
  toggleAlerts: () => void
}

type GlobalStore = GlobalState & GlobalActions

export const useGlobalStore = create<GlobalStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      globalSearchQuery: '',
      globalSearchResults: null,
      isSearching: false,
      searchHistory: [],

      alerts: [],
      unreadAlertsCount: 0,
      isLoadingAlerts: false,

      quickAccessData: null,
      isLoadingQuickAccess: false,

      recentActivities: [],

      quickActions: [],
      quickLinks: [],

      isGlobalLoading: false,
      lastSyncTime: null,
      error: null,

      showGlobalSearch: false,
      showQuickAccess: true,
      showAlerts: true,

      // Search Actions
      setGlobalSearchQuery: (query: string) => {
        set({ globalSearchQuery: query })
      },

      performGlobalSearch: async (criteria: SearchCriteria) => {
        set({ isSearching: true, error: null })
        try {
          const startTime = Date.now()

          // Call the global search service
          const results = await GlobalSearchService.performGlobalSearch(criteria)
          const searchTime = Date.now() - startTime

          set({
            globalSearchResults: {
              ...results,
              searchTime,
              query: criteria.query
            },
            isSearching: false
          })

          // Add to search history if query is not empty
          if (criteria.query.trim()) {
            get().addToSearchHistory(criteria.query.trim())
          }
        } catch (error) {
          console.error('Global search error:', error)
          set({
            error: error instanceof Error ? error.message : 'فشل في البحث الشامل',
            isSearching: false
          })
        }
      },

      clearSearchResults: () => {
        set({
          globalSearchResults: null,
          globalSearchQuery: ''
        })
      },

      addToSearchHistory: (query: string) => {
        const { searchHistory } = get()
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
        set({ searchHistory: newHistory })
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] })
      },

      // Alerts Actions
      loadAlerts: async () => {
        set({ isLoadingAlerts: true, error: null })
        try {
          const alerts = await SmartAlertsService.getAllAlerts()
          const unreadCount = alerts.filter(alert => !alert.isRead).length

          set({
            alerts,
            unreadAlertsCount: unreadCount,
            isLoadingAlerts: false
          })
        } catch (error) {
          console.error('Load alerts error:', error)
          set({
            error: error instanceof Error ? error.message : 'فشل في تحميل التنبيهات',
            isLoadingAlerts: false
          })
        }
      },

      markAlertAsRead: async (alertId: string) => {
        try {
          await SmartAlertsService.updateAlert(alertId, { isRead: true })

          const { alerts } = get()
          const updatedAlerts = alerts.map(alert =>
            alert.id === alertId ? { ...alert, isRead: true } : alert
          )
          const unreadCount = updatedAlerts.filter(alert => !alert.isRead).length

          set({
            alerts: updatedAlerts,
            unreadAlertsCount: unreadCount
          })
        } catch (error) {
          console.error('Mark alert as read error:', error)
        }
      },

      dismissAlert: async (alertId: string) => {
        try {
          await SmartAlertsService.updateAlert(alertId, { isDismissed: true })

          const { alerts } = get()
          const updatedAlerts = alerts.map(alert =>
            alert.id === alertId ? { ...alert, isDismissed: true } : alert
          )

          set({ alerts: updatedAlerts })
        } catch (error) {
          console.error('Dismiss alert error:', error)
        }
      },

      snoozeAlert: async (alertId: string, snoozeUntil: string) => {
        try {
          await SmartAlertsService.updateAlert(alertId, { snoozeUntil })

          const { alerts } = get()
          const updatedAlerts = alerts.map(alert =>
            alert.id === alertId ? { ...alert, snoozeUntil } : alert
          )

          set({ alerts: updatedAlerts })
        } catch (error) {
          console.error('Snooze alert error:', error)
        }
      },

      createAlert: async (alert: Omit<SmartAlert, 'id' | 'createdAt'>) => {
        try {
          const newAlert = await SmartAlertsService.createAlert(alert)
          const { alerts, unreadAlertsCount } = get()
          set({
            alerts: [newAlert, ...alerts],
            unreadAlertsCount: unreadAlertsCount + 1
          })
        } catch (error) {
          console.error('Create alert error:', error)
        }
      },

      // Quick Access Actions
      loadQuickAccessData: async () => {
        set({ isLoadingQuickAccess: true, error: null })
        try {
          const quickAccessData = await QuickAccessService.getQuickAccessData()
          set({
            quickAccessData,
            isLoadingQuickAccess: false
          })
        } catch (error) {
          console.error('Load quick access data error:', error)
          set({
            error: error instanceof Error ? error.message : 'فشل في تحميل بيانات الوصول السريع',
            isLoadingQuickAccess: false
          })
        }
      },

      refreshQuickAccessData: async () => {
        await get().loadQuickAccessData()
      },

      // Activity Log Actions
      addActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => {
        const { recentActivities } = get()
        const newActivity: ActivityLog = {
          ...activity,
          id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }

        const updatedActivities = [newActivity, ...recentActivities].slice(0, 50)
        set({ recentActivities: updatedActivities })
      },

      loadRecentActivities: async () => {
        try {
          const activities = await window.electronAPI?.activities?.getRecent?.() || []
          set({ recentActivities: activities })
        } catch (error) {
          console.error('Load recent activities error:', error)
        }
      },

      // Quick Actions
      executeQuickAction: (actionId: string) => {
        const { quickActions } = get()
        const action = quickActions.find(a => a.id === actionId)
        if (action) {
          action.action()
        }
      },

      addQuickAction: (action: QuickAction) => {
        const { quickActions } = get()
        set({ quickActions: [...quickActions, action] })
      },

      removeQuickAction: (actionId: string) => {
        const { quickActions } = get()
        set({ quickActions: quickActions.filter(a => a.id !== actionId) })
      },

      // Global Actions
      syncAllData: async () => {
        set({ isGlobalLoading: true })
        try {
          await Promise.all([
            get().loadAlerts(),
            get().loadQuickAccessData(),
            get().loadRecentActivities()
          ])

          set({
            lastSyncTime: new Date().toISOString(),
            isGlobalLoading: false
          })
        } catch (error) {
          console.error('Sync all data error:', error)
          set({
            error: error instanceof Error ? error.message : 'Sync failed',
            isGlobalLoading: false
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      // UI Actions
      toggleGlobalSearch: () => {
        set(state => ({ showGlobalSearch: !state.showGlobalSearch }))
      },

      toggleQuickAccess: () => {
        set(state => ({ showQuickAccess: !state.showQuickAccess }))
      },

      toggleAlerts: () => {
        set(state => ({ showAlerts: !state.showAlerts }))
      }
    }),
    {
      name: 'global-store'
    }
  )
)
