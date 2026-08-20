import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOnboardingDestination, signIn } from '../../services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError('La contraseña o el usuario son incorrectos.')
      setIsSubmitting(false)
      return
    }

    const { destination, error: profileError } = await getOnboardingDestination()
    setIsSubmitting(false)
    if (profileError || !destination) {
      setError('No se pudo comprobar tu perfil. Inténtalo de nuevo.')
      return
    }
    navigate(destination, { replace: true })
  }

  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="login-title">
        <p className="auth-kicker">VEKTOR</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className="auth-intro">Primero comprobaremos el estado de tu perfil.</p>
        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid login-fields">
            <label className="field-wide">Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label className="field-wide">Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          </div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          <div className="register-actions">
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Comprobando...' : 'Continuar'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/')} disabled={isSubmitting}>Cancelar</button>
          </div>
        </form>
      </section>
    </main>
  )
}
