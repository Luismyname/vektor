import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
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

  // Evita guardar el tema local o anterior mientras se resuelve la sesión actual.
  const isInitialLoad = useRef(true)
  const authenticatedUserId = useRef(undefined)

  // Carga el tema correcto tras el inicio, login, logout o cambio de cuenta.
  useEffect(() => {
    let active = true
    let requestId = 0

    async function loadTheme(userId, currentRequestId) {
      try {
        const { theme: savedTheme, error } = await getUserTheme(userId)
        if (!active || currentRequestId !== requestId) return
        if (error) {
          console.error('Error loading theme:', error)
        }

        const resolvedTheme = !error && (savedTheme === 'dark' || savedTheme === 'light')
          ? savedTheme
          : DEFAULT_THEME
        setTheme(resolvedTheme)
        try {
          localStorage.setItem(THEME_KEY, resolvedTheme)
        } catch (storageError) {
          console.error('[ThemeProvider] Error saving theme to localStorage:', storageError)
        }
      } catch (err) {
        if (active && currentRequestId === requestId) {
          console.error('Error loading theme:', err)
        }
      } finally {
        if (active && currentRequestId === requestId) {
          isInitialLoad.current = false
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id || null
      if (authenticatedUserId.current === userId) return

      authenticatedUserId.current = userId
      const currentRequestId = ++requestId
      isInitialLoad.current = true

      if (!userId) {
        isInitialLoad.current = false
        return
      }

      setTheme(DEFAULT_THEME)
      window.setTimeout(() => {
        if (active && currentRequestId === requestId) {
          loadTheme(userId, currentRequestId)
        }
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
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

    // Guardar en el perfil asociado a la sesión vigente.
    let cancelled = false
    async function saveTheme() {
      const userId = authenticatedUserId.current
      if (!userId) return

      try {
        const { error } = await updateUserTheme(userId, theme)
        if (error && !cancelled) console.error('[ThemeProvider] Error saving theme:', error)
        else if (!cancelled) console.log('[ThemeProvider] Saved to Supabase:', theme)
      } catch (err) {
        if (!cancelled) console.error('[ThemeProvider] Error saving theme:', err)
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