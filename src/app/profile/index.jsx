import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthenticatedUser } from '../../services/auth'
import { supabase } from '../../services/supabase'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', avatarUrl: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { user: authenticatedUser } = await getAuthenticatedUser()
      if (!authenticatedUser) return
      const metadata = authenticatedUser.user_metadata || {}
      setUser(authenticatedUser)
      setForm({
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        email: authenticatedUser.email || '',
        avatarUrl: metadata.avatar_url || '',
      })
    }

    loadUser()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const name = [form.firstName, form.lastName].filter(Boolean).join(' ') || form.email || 'Usuario'
  const avatarUrl = form.avatarUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=ffffff&bold=true&format=svg`

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setError('')

    const { data, error: updateError } = await supabase.auth.updateUser({
      email: form.email.trim(),
      data: {
        ...user.user_metadata,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        avatar_url: form.avatarUrl.trim(),
      },
    })

    setIsSaving(false)
    if (updateError) {
      setError('No se pudo actualizar tu perfil. Inténtalo de nuevo.')
      return
    }

    setUser(data.user)
    setMessage('Perfil actualizado correctamente.')
  }

  return (
    <main className="auth-page">
      <section className="register-panel login-panel" aria-labelledby="profile-title">
        <p className="auth-kicker">VEKTOR / PERFIL</p>
        <h1 id="profile-title">Configuración de tu perfil</h1>
        <p className="auth-intro">Edita tu información personal, avatar y correo electrónico.</p>
        <div className="profile-avatar-preview">
          <img src={avatarUrl} alt={`Avatar de ${name}`} />
          <div>
            <strong>{form.avatarUrl.trim() ? 'Tu imagen de perfil' : 'Avatar con tus siglas'}</strong>
            <p>La vista previa se actualiza al escribir una URL.</p>
          </div>
        </div>
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Nombre<input name="firstName" value={form.firstName} onChange={handleChange} required /></label>
            <label>Apellido<input name="lastName" value={form.lastName} onChange={handleChange} required /></label>
            <label className="field-wide">Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
            <label className="field-wide">URL del avatar<input name="avatarUrl" type="url" value={form.avatarUrl} onChange={handleChange} placeholder="https://..." /></label>
          </div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {message && <p className="form-message form-message-success" role="status">{message}</p>}
          <div className="register-actions">
            <button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar cambios'}</button>
            {form.avatarUrl.trim() && <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, avatarUrl: '' }))}>Eliminar imagen</button>}
          </div>
        </form>
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
