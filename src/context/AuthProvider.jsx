import { useEffect, useState, useCallback } from 'react'
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const checkOnboarding = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('completed_onboarding')
        .eq('user_id', userId)
        .maybeSingle()
      if (!error && data) {
        setNeedsOnboarding(!data.completed_onboarding)
      }
    } catch (err) {
      console.error('Error checking onboarding:', err)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadUser() {
      const { user: authenticatedUser } = await getAuthenticatedUser()
      if (active) {
        setUser(authenticatedUser)
        if (authenticatedUser) {
          await checkOnboarding(authenticatedUser.id)
        }
        setLoading(false)
      }
    }

    loadUser()

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user || null)
        if (session?.user) {
          checkOnboarding(session.user.id)
        } else {
          setNeedsOnboarding(false)
        }
        setLoading(false)
      }
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [checkOnboarding])

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false)
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    needsOnboarding,
    completeOnboarding,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}