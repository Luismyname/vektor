import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

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