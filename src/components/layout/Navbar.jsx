import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'

// Construye el nombre del usuario a partir de metadatos o datos de cuenta.
function getUserName(user) {
  const metadata = user.user_metadata || {}
  const fullName = [metadata.first_name, metadata.middle_name, metadata.last_name]
    .filter(Boolean)
    .join(' ')

  return fullName || metadata.full_name || user.email || 'Usuario'
}

// Resuelve avatar existente o genera uno con iniciales a partir del nombre.
function getAvatarUrl(user, name) {
  const metadata = user.user_metadata || {}
  if (metadata.avatar_url || metadata.picture) return metadata.avatar_url || metadata.picture

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=ffffff&bold=true&format=svg`
}

// Navegación autenticada con enlaces de sección, avatar y cierre de sesión.
export default function Navbar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Finaliza la sesión de Supabase y vuelve a la portada al completarse.
  async function handleSignOut() {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setIsSigningOut(false)
      return
    }

    navigate('/', { replace: true })
  }

  const name = user ? getUserName(user) : ''

  return (
    <header className="top-header" aria-label="barra superior">
      <div className="header-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
          aria-expanded={menuOpen}
          aria-controls="dashboard-menu"
        >
          ☰ Menu
        </button>
        {menuOpen && (
          <nav id="dashboard-menu" className="menu-dropdown" aria-label="navegación del dashboard">
            <ul>
              <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
              <li><Link to="/profile" onClick={() => setMenuOpen(false)}>Perfil</Link></li>
              <li><Link to="/habits" onClick={() => setMenuOpen(false)}>Hábitos iniciales</Link></li>
              <li><Link to="/tasks" onClick={() => setMenuOpen(false)}>Tareas</Link></li>
              <li><Link to="/weekly-planner" onClick={() => setMenuOpen(false)}>Plan semanal</Link></li>
              <li><Link to="/activity" onClick={() => setMenuOpen(false)}>Actividad</Link></li>
              <li><Link to="/settings" onClick={() => setMenuOpen(false)}>Configuración</Link></li>
            </ul>
          </nav>
        )}
      </div>
      {user && (
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
      )}
    </header>
  )
}
