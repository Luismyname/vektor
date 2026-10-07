import { useEffect, useState } from 'react'
import { getAuthenticatedUser } from '../services/auth'
import { supabase } from '../services/supabase'
import { AuthContext } from './AuthContext'

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