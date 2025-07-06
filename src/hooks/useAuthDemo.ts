import { useState, useEffect } from 'react'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  passwordEnabled: boolean
}

export function useAuthDemo() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true, // Always authenticated in demo
    isLoading: false,
    passwordEnabled: false
  })

  useEffect(() => {
    // Simulate loading for demo
    const timer = setTimeout(() => {
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        passwordEnabled: false
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const login = async (password: string): Promise<boolean> => {
    // Always return true for demo
    return true
  }

  return {
    ...authState,
    login
  }
}
