import { Link } from 'react-router-dom'
import { usePreferences } from '../../hooks/usePreferences'

export default function Settings() {
  const { preferences, updatePreference } = usePreferences()

  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="settings-title">
        <p className="auth-kicker">VEKTOR / CONFIGURACIÓN</p>
        <h1 id="settings-title">Configuración</h1>
        <p className="auth-intro">Administra las preferencias de tu espacio personal.</p>
        <div className="settings-list">
          <label className="settings-row">Tema<select value={preferences.theme} onChange={(event) => updatePreference('theme', event.target.value)}><option value="dark">Oscuro</option><option value="light">Claro</option></select></label>
          <label className="settings-row">Duración por defecto<span><input type="number" min="1" max="120" value={preferences.timerMinutes} onChange={(event) => updatePreference('timerMinutes', Number(event.target.value) || 1)} /> minutos</span></label>
          <label className="settings-row">Sonidos<button type="button" className={`settings-toggle ${preferences.sounds ? 'is-on' : ''}`} aria-pressed={preferences.sounds} onClick={() => updatePreference('sounds', !preferences.sounds)}>{preferences.sounds ? 'Activados' : 'Desactivados'}</button></label>
          <label className="settings-row">Valores del onboarding<button type="button" className={`settings-toggle ${preferences.showValues ? 'is-on' : ''}`} aria-pressed={preferences.showValues} onClick={() => updatePreference('showValues', !preferences.showValues)}>{preferences.showValues ? 'Visibles' : 'Ocultos'}</button></label>
        </div>
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