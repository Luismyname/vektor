import { useTheme } from '../../hooks/useTheme'

export default function Preferences() {
  const { theme, setTheme } = useTheme()

  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="preferences-title">
        <h1 id="preferences-title">Configuración</h1>
        <fieldset className="settings-list theme-options">
          <legend>Tema de Vektor</legend>
          <label className="settings-row theme-option">
            <span>Claro</span>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
            />
          </label>
          <label className="settings-row theme-option">
            <span>Oscuro</span>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => setTheme('dark')}
            />
          </label>
        </fieldset>
      </section>
    </main>
  )
}
