import { useEffect, useState } from 'react'

interface Preferences extends Record<string, unknown> {
  theme: string
  timerMinutes: number
  sounds: boolean
  showValues: boolean
}

// Clave y valores de respaldo para las preferencias locales de interfaz.
const STORAGE_KEY = 'vektor-preferences'
const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  timerMinutes: 25,
  sounds: false,
  showValues: true,
}

// Combina lo persistido con valores por defecto y tolera JSON corrupto.
function readPreferences(): Preferences {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

// Mantiene preferencias en React y las serializa en localStorage al cambiarlas.
export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  function updatePreference(name: string, value: unknown) {
    setPreferences((current) => ({ ...current, [name]: value }))
  }

  return { preferences, updatePreference }
}
