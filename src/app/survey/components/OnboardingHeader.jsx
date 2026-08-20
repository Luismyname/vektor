import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthenticatedUser } from '../../../services/auth'
import { supabase } from '../../../services/supabase'

function getUserName(user) {
  const metadata = user.user_metadata || {}
  const fullName = [metadata.first_name, metadata.middle_name, metadata.last_name]
    .filter(Boolean)
    .join(' ')

  return fullName || metadata.full_name || user.email || 'Usuario'
}

function getAvatarUrl(user, name) {
  const metadata = user.user_metadata || {}
  if (metadata.avatar_url || metadata.picture) return metadata.avatar_url || metadata.picture

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=ffffff&bold=true&format=svg`
}

export default function OnboardingHeader({ onSignedOut }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const { user: authenticatedUser } = await getAuthenticatedUser()
      if (active) setUser(authenticatedUser)
    }

    loadUser()
    return () => { active = false }
  }, [])

  async function handleSignOut() {
    setIsSigningOut(true)
    onSignedOut?.()
    const { error } = await supabase.auth.signOut()

    if (error) {
      setIsSigningOut(false)
      return
    }

    navigate('/', { replace: true })
  }

  if (!user) return null

  const name = getUserName(user)

  return (
    <header className="onboarding-header top-header" aria-label="barra superior">
      <div className="header-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-expanded={menuOpen}
          aria-controls="onboarding-menu"
        >
          ☰ Menu
        </button>
        {menuOpen && (
          <nav id="onboarding-menu" className="menu-dropdown" aria-label="navegación del onboarding">
            <ul>
              <li><Link to="/profile" onClick={() => setMenuOpen(false)}>Perfil</Link></li>
              <li><Link to="/dashboard#dashboard-habits" onClick={() => setMenuOpen(false)}>Hábitos iniciales</Link></li>
              <li><Link to="/dashboard#dashboard-tasks" onClick={() => setMenuOpen(false)}>Tareas futuras</Link></li>
              <li><Link to="/dashboard#dashboard-activity" onClick={() => setMenuOpen(false)}>Actividad</Link></li>
            </ul>
          </nav>
        )}
      </div>
      <div className="header-right">
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
      </div>
    </header>
  )
}
