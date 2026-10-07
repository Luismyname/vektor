import { useEffect, useRef, useState } from 'react'
import { getAuthenticatedUser } from '../services/auth'
import { getUserTheme, updateUserTheme } from '../services/theme'
import { ThemeContext } from './ThemeContext'

// Clave local para cargar el tema antes de consultar la red.
const THEME_KEY = 'vektor-theme'
// Tema aplicado cuando no existe una preferencia guardada.
const DEFAULT_THEME = 'dark'

/**
 * Proveedor de tema que aplica el tema globalmente en toda la aplicación.
 * Sincroniza con Supabase y localStorage para persistencia entre dispositivos.
 */
export function ThemeProvider({ children }) {
  // Inicializar con localStorage para carga inmediata
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      return saved || DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  // Aplicar tema inicial inmediatamente (síncrono, sin useEffect)
  document.documentElement.setAttribute('data-theme', theme)

  // Guardar tema inicial en localStorage si no existe
  useEffect(() => {
    try {
      if (!localStorage.getItem(THEME_KEY)) {
        localStorage.setItem(THEME_KEY, theme)
        console.log('[ThemeProvider] Initial theme saved to localStorage:', theme)
      }
    } catch (err) {
      console.error('[ThemeProvider] Error saving initial theme:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bandera para evitar guardar durante la carga inicial de Supabase
  const isInitialLoad = useRef(true)

  // Cargar tema de Supabase al iniciar
  useEffect(() => {
    let active = true

    async function loadTheme() {
      try {
        const { user } = await getAuthenticatedUser()
        if (user && active) {
          const { theme: savedTheme, error } = await getUserTheme(user.id)
          if (!error && savedTheme) {
            setTheme(savedTheme)
          }
        }
      } catch (err) {
        console.error('Error loading theme:', err)
      } finally {
        if (active) {
          isInitialLoad.current = false
        }
      }
    }

    loadTheme()
    return () => { active = false }
  }, [])

  // Aplicar tema y guardar cuando cambia
  useEffect(() => {
    // Aplicar tema globalmente inmediatamente
    document.documentElement.setAttribute('data-theme', theme)

    // No guardar durante la carga inicial de Supabase
    if (isInitialLoad.current) {
      return
    }
    
    // Guardar en localStorage (caché para carga rápida)
    try {
      localStorage.setItem(THEME_KEY, theme)
      console.log('[ThemeProvider] Saved to localStorage:', theme)
    } catch (err) {
      console.error('[ThemeProvider] Error saving to localStorage:', err)
    }

    // Guardar en Supabase (persistencia entre dispositivos)
    let cancelled = false
    async function saveTheme() {
      try {
        const { user } = await getAuthenticatedUser()
        if (user && !cancelled) {
          await updateUserTheme(user.id, theme)
          console.log('[ThemeProvider] Saved to Supabase:', theme)
        }
      } catch (err) {
        console.error('[ThemeProvider] Error saving theme:', err)
      }
    }

    saveTheme()
    return () => { cancelled = true }
  }, [theme])

  // Sincronizar tema entre pestañas y navegaciones
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === THEME_KEY && e.newValue) {
        setTheme(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Alterna entre los dos temas disponibles y deja que el efecto los persista.
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