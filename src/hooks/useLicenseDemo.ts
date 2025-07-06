import { useState, useEffect } from 'react'

interface LicenseState {
  isLicenseValid: boolean
  isFirstRun: boolean
  isLoading: boolean
  error: string | null
  licenseData: any | null
  machineInfo: any | null
}

export function useLicenseDemo() {
  const [licenseState, setLicenseState] = useState<LicenseState>({
    isLicenseValid: true, // Always valid in demo
    isFirstRun: false,
    isLoading: false,
    error: null,
    licenseData: {
      license: 'DEMO-DEMO-DEMO-DEMO',
      hwid: 'demo-machine',
      activated: true,
      timestamp: Date.now()
    },
    machineInfo: {
      hwid: 'demo-machine',
      platform: 'web',
      arch: 'demo'
    }
  })

  useEffect(() => {
    // Simulate loading for demo
    const timer = setTimeout(() => {
      setLicenseState(prev => ({
        ...prev,
        isLoading: false
      }))
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const activateLicense = async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
    // Always return success for demo
    return { success: true }
  }

  return {
    ...licenseState,
    activateLicense
  }
}
