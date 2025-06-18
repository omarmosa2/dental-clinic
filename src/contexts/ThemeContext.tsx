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
    // Background classes - Sky Theme
    bgPrimary: isDarkMode ? 'bg-background' : 'bg-background',
    bgSecondary: isDarkMode ? 'bg-card' : 'bg-muted',
    bgTertiary: isDarkMode ? 'bg-muted' : 'bg-accent',

    // Text classes - Sky Theme
    textPrimary: isDarkMode ? 'text-foreground' : 'text-foreground',
    textSecondary: isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground',
    textMuted: isDarkMode ? 'text-muted-foreground' : 'text-muted-foreground',

    // Border classes - Sky Theme
    border: isDarkMode ? 'border-border' : 'border-border',
    borderLight: isDarkMode ? 'border-border' : 'border-input',

    // Card classes - Sky Theme
    card: isDarkMode
      ? 'bg-card border-border text-card-foreground'
      : 'bg-card border-border text-card-foreground',

    // Button classes - Sky Theme
    buttonPrimary: isDarkMode
      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
      : 'bg-primary hover:bg-primary/90 text-primary-foreground',
    buttonSecondary: isDarkMode
      ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border'
      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border',

    // Input classes - Sky Theme
    input: isDarkMode
      ? 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring'
      : 'bg-background border-input text-foreground placeholder-muted-foreground focus:border-ring',

    // Status classes - Sky Theme
    statusScheduled: isDarkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary',
    statusCompleted: isDarkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800',
    statusCancelled: isDarkMode ? 'bg-destructive/20 text-destructive' : 'bg-destructive/10 text-destructive',
    statusNoShow: isDarkMode ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground',

    // Navigation classes - Sky Theme
    nav: isDarkMode
      ? 'bg-background border-border'
      : 'bg-background border-border',
    navItem: isDarkMode
      ? 'text-muted-foreground hover:text-foreground hover:bg-accent'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
    navItemActive: isDarkMode
      ? 'text-primary bg-accent border-primary'
      : 'text-primary bg-accent border-primary',
  }
}

// Utility function to get theme-aware colors - Sky Theme
export function getThemeColors(isDarkMode: boolean) {
  return {
    primary: isDarkMode ? '#38bdf8' : '#0284c7',
    secondary: isDarkMode ? '#0ea5e9' : '#0369a1',
    success: isDarkMode ? '#10b981' : '#059669',
    warning: isDarkMode ? '#f59e0b' : '#d97706',
    error: isDarkMode ? '#ef4444' : '#dc2626',
    background: isDarkMode ? '#082f49' : '#ffffff',
    surface: isDarkMode ? '#0c4a6e' : '#f0f9ff',
    text: isDarkMode ? '#e0f2fe' : '#082f49',
    textSecondary: isDarkMode ? '#bae6fd' : '#0369a1',
  }
}
