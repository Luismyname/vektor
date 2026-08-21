import { Link } from 'react-router-dom'

export default function Settings() {
  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="settings-title">
        <p className="auth-kicker">VEKTOR / CONFIGURACIÓN</p>
        <h1 id="settings-title">Configuración</h1>
        <p className="auth-intro">Administra las preferencias de tu espacio personal.</p>
        <div className="profile-setting">
          <div>
            <h2>Perfil y cuenta</h2>
            <p>Actualiza tu información personal desde tu perfil.</p>
          </div>
          <Link className="profile-action" to="/profile">Abrir perfil</Link>
        </div>
      </section>
    </main>
  )
}