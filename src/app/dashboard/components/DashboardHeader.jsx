import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../services/supabase'

// Construye el nombre visible desde metadatos y usa email como alternativa.
function getUserName(user) {
  const metadata = user.user_metadata || {}
  const fullName = [metadata.first_name, metadata.middle_name, metadata.last_name]
    .filter(Boolean)
    .join(' ')

  return fullName || metadata.full_name || user.email || 'Usuario'
}

// Selecciona avatar de metadatos o genera uno basado en el nombre.
function getAvatarUrl(user, name) {
  const metadata = user.user_metadata || {}
  if (metadata.avatar_url || metadata.picture) return metadata.avatar_url || metadata.picture

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=ffffff&bold=true&format=svg`
}

// Cabecera de bienvenida con cierre de sesión de Supabase.
export default function DashboardHeader({ user }) {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const name = getUserName(user)

  // Cierra la sesión remota y vuelve a la portada si la operación tuvo éxito.
  async function handleSignOut() {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setIsSigningOut(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <header className="dashboard-header">
      <div className="onboarding-user">
        <img className="onboarding-avatar" src={getAvatarUrl(user, name)} alt={`Avatar de ${name}`} />
        <div>
          <span className="onboarding-welcome">Tu espacio personal</span>
          <strong>{name}</strong>
        </div>
      </div>
      <button type="button" className="onboarding-signout" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>
    </header>
  )
}
