import { createContext, useEffect, useState } from 'react'

export const ThemeContext = createContext(null)

const THEME_KEY = 'vektor-theme'
const DEFAULT_THEME = 'dark'

/**
 * Proveedor de tema que aplica el tema globalmente en toda la aplicación.
 * Sincroniza con localStorage y aplica el tema en document.documentElement.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  useEffect(() => {
    // Aplicar tema globalmente
    document.documentElement.dataset.theme = theme
    
    // Guardar en localStorage
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Ignorar errores de localStorage
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
