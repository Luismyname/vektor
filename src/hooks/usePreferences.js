import { useEffect, useState } from 'react'

const STORAGE_KEY = 'vektor-preferences'
const DEFAULT_PREFERENCES = {
  theme: 'dark',
  timerMinutes: 25,
  sounds: false,
  showValues: true,
}

function readPreferences() {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences])

  function updatePreference(name, value) {
    setPreferences((current) => ({ ...current, [name]: value }))
  }

  return { preferences, updatePreference }
}
