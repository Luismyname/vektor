import { createContext, useContext, useEffect, useState } from 'react'
import { getAuthenticatedUser } from '../services/auth'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

/**
 * Proveedor de autenticación que carga el usuario una sola vez
 * y lo proporciona a todos los componentes hijos.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const { user: authenticatedUser } = await getAuthenticatedUser()
      if (active) {
        setUser(authenticatedUser)
        setLoading(false)
      }
    }

    loadUser()

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user || null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acceder al contexto de autenticación.
 * 
 * Uso:
 *   const { user, loading, isAuthenticated } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
