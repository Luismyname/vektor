import { useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from '../context/AuthContext'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  completeOnboarding: () => void
}

/**
 * Hook para acceder al contexto de autenticación.
 * 
 * Uso:
 *   const { user, loading, isAuthenticated } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext) as AuthContextValue | null
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}