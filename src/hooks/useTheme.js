import { useContext } from 'react'
import { ThemeContext } from '../context/ThemeContext'

/**
 * Hook para acceder al contexto de tema.
 * 
 * Uso:
 *   const { theme, setTheme, toggleTheme, isDark, isLight } = useTheme()
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}