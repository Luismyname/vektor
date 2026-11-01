import { useContext, type Dispatch, type SetStateAction } from 'react'
import { ThemeContext } from '../context/ThemeContext'

interface ThemeContextValue {
  theme: string
  setTheme: Dispatch<SetStateAction<string>>
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
}

/**
 * Hook para acceder al contexto de tema.
 * 
 * Uso:
 *   const { theme, setTheme, toggleTheme, isDark, isLight } = useTheme()
 */
export function useTheme() {
  const context = useContext(ThemeContext) as ThemeContextValue | null
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}