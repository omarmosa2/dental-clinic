import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDarkMode, toggleDarkMode: storeToggleDarkMode, initializeDarkMode } = useSettingsStore()

  // Initialize theme on mount
  useEffect(() => {
    initializeDarkMode()
  }, [initializeDarkMode])

  // Apply theme changes to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => {
    storeToggleDarkMode()
  }

  const setDarkMode = (isDark: boolean) => {
    if (isDark !== isDarkMode) {
      storeToggleDarkMode()
    }
  }

  const value: ThemeContextType = {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook for theme-aware styling
export function useThemeClasses() {
  const { isDarkMode } = useTheme()

  return {
    // Background classes - Enhanced Sky Theme
    bgPrimary: 'bg-background',
    bgSecondary: 'bg-card',
    bgTertiary: 'bg-muted',
    bgElevated: isDarkMode ? 'bg-card shadow-lg shadow-black/10' : 'bg-card shadow-sm',

    // Text classes - Enhanced Sky Theme
    textPrimary: 'text-foreground',
    textSecondary: 'text-muted-foreground',
    textMuted: 'text-muted-foreground',
    textHighContrast: isDarkMode ? 'text-foreground' : 'text-foreground',
    textMediumContrast: isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground',

    // Border classes - Enhanced Sky Theme
    border: 'border-border',
    borderLight: 'border-input',
    borderFocus: 'border-ring',

    // Card classes - Enhanced Sky Theme
    card: isDarkMode
      ? 'bg-card border-border text-card-foreground shadow-lg shadow-black/10 hover:shadow-xl'
      : 'bg-card border-border text-card-foreground shadow-sm hover:shadow-md',

    // Button classes - Enhanced Sky Theme
    buttonPrimary: isDarkMode
      ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]'
      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-[0.98]',
    buttonSecondary: isDarkMode
      ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border shadow-lg shadow-secondary/20 active:scale-[0.98]'
      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border shadow-md active:scale-[0.98]',
    buttonGhost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-colors',
    buttonOutline: isDarkMode
      ? 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-ring/50 active:scale-[0.98] shadow-md'
      : 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-ring/50 active:scale-[0.98] shadow-sm',

    // Input classes - Enhanced Sky Theme
    input: isDarkMode
      ? 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring shadow-md'
      : 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring shadow-sm',

    // Status classes - Enhanced Sky Theme
    statusScheduled: isDarkMode
      ? 'bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-1 text-xs font-medium'
      : 'bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-1 text-xs font-medium',
    statusCompleted: isDarkMode
      ? 'bg-green-900/20 text-green-400 border border-green-800 rounded-full px-2 py-1 text-xs font-medium'
      : 'bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-1 text-xs font-medium',
    statusCancelled: isDarkMode
      ? 'bg-destructive/20 text-destructive border border-destructive/30 rounded-full px-2 py-1 text-xs font-medium'
      : 'bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-2 py-1 text-xs font-medium',
    statusNoShow: isDarkMode
      ? 'bg-muted text-muted-foreground border border-border rounded-full px-2 py-1 text-xs font-medium'
      : 'bg-muted text-muted-foreground border border-border rounded-full px-2 py-1 text-xs font-medium',
    statusInProgress: isDarkMode
      ? 'bg-amber-900/20 text-amber-400 border border-amber-800 rounded-full px-2 py-1 text-xs font-medium'
      : 'bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-1 text-xs font-medium',

    // Navigation classes - Enhanced Sky Theme
    nav: 'bg-background border-border shadow-sm',
    navItem: 'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-md px-3 py-2',
    navItemActive: 'text-primary bg-accent border-l-2 border-primary font-medium',

    // Table classes - Enhanced Sky Theme
    table: isDarkMode
      ? 'bg-card border-border shadow-lg shadow-black/10'
      : 'bg-background border-border shadow-sm',
    tableHeader: 'bg-muted text-foreground font-semibold',
    tableRow: 'hover:bg-accent/50 transition-colors',
    tableCell: 'text-foreground border-border',

    // Dialog classes - Enhanced Sky Theme
    dialog: isDarkMode
      ? 'bg-card border-border shadow-xl shadow-black/20'
      : 'bg-background border-border shadow-lg',
    dialogHeader: 'text-foreground font-semibold',
    dialogContent: 'text-muted-foreground',

    // Notification classes - Enhanced Sky Theme
    notificationSuccess: isDarkMode
      ? 'bg-green-900/20 text-green-400 border border-green-800 shadow-lg'
      : 'bg-green-50 text-green-800 border border-green-200 shadow-md',
    notificationError: isDarkMode
      ? 'bg-red-900/20 text-red-400 border border-red-800 shadow-lg'
      : 'bg-red-50 text-red-800 border border-red-200 shadow-md',
    notificationWarning: isDarkMode
      ? 'bg-amber-900/20 text-amber-400 border border-amber-800 shadow-lg'
      : 'bg-amber-50 text-amber-800 border border-amber-200 shadow-md',
    notificationInfo: isDarkMode
      ? 'bg-blue-900/20 text-blue-400 border border-blue-800 shadow-lg'
      : 'bg-blue-50 text-blue-800 border border-blue-200 shadow-md',
  }
}

// Utility function to get theme-aware colors - Enhanced Sky Theme
export function getThemeColors(isDarkMode: boolean) {
  return {
    primary: isDarkMode ? '#38bdf8' : '#0284c7',
    primaryHover: isDarkMode ? '#0ea5e9' : '#0369a1',
    secondary: isDarkMode ? '#0ea5e9' : '#0369a1',
    secondaryHover: isDarkMode ? '#0284c7' : '#075985',
    success: isDarkMode ? '#22c55e' : '#059669',
    successHover: isDarkMode ? '#16a34a' : '#047857',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    warningHover: isDarkMode ? '#d97706' : '#b45309',
    error: isDarkMode ? '#ef4444' : '#dc2626',
    errorHover: isDarkMode ? '#dc2626' : '#b91c1c',
    background: isDarkMode ? '#0f172a' : '#ffffff',
    surface: isDarkMode ? '#1e293b' : '#f8fafc',
    surfaceElevated: isDarkMode ? '#334155' : '#f1f5f9',
    text: isDarkMode ? '#f1f5f9' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#475569',
    textMuted: isDarkMode ? '#64748b' : '#64748b',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    borderLight: isDarkMode ? '#475569' : '#cbd5e1',
    accent: isDarkMode ? '#1e293b' : '#f1f5f9',
    accentHover: isDarkMode ? '#334155' : '#e2e8f0',
  }
}

// Utility function to get status colors
export function getStatusColors(isDarkMode: boolean) {
  return {
    scheduled: {
      bg: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.1)',
      text: isDarkMode ? '#38bdf8' : '#0284c7',
      border: isDarkMode ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.2)',
    },
    completed: {
      bg: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(5, 150, 105, 0.1)',
      text: isDarkMode ? '#22c55e' : '#059669',
      border: isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(5, 150, 105, 0.2)',
    },
    cancelled: {
      bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.1)',
      text: isDarkMode ? '#ef4444' : '#dc2626',
      border: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.2)',
    },
    inProgress: {
      bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.1)',
      text: isDarkMode ? '#f59e0b' : '#d97706',
      border: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(217, 119, 6, 0.2)',
    },
  }
}
