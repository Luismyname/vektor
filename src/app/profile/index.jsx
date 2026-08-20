import { Link } from 'react-router-dom'

export default function Profile() {
  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="profile-title">
        <p className="auth-kicker">VEKTOR / PERFIL</p>
        <h1 id="profile-title">Configuración de tu perfil</h1>
        <p className="auth-intro">Aquí puedes revisar tu configuración y actualizar la dirección de tus hábitos.</p>
        <div className="profile-setting">
          <div>
            <h2>Cuestionario de valores</h2>
            <p>Actualiza tus respuestas para recalcular tus valores y hábitos iniciales.</p>
          </div>
          <Link className="profile-action" to="/onboarding?mode=edit">Cambiar respuestas</Link>
        </div>
      </section>
    </main>
  )
}
