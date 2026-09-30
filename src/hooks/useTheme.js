import { useContext } from 'react'
import { ThemeContext } from '../context/ThemeProvider'

/**
 * Hook para acceder al contexto de tema.
 * 
 * Uso:
 *   const { theme, toggleTheme, isDark } = useTheme()
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}
