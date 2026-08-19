import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/auth'

const initialForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  birthDate: '',
  address: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

function getAge(birthDate) {
  const birthday = new Date(`${birthDate}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const birthdayThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())

  if (today < birthdayThisYear) age -= 1
  return age
}

function validateForm(form) {
  if (!form.firstName || !form.lastName || !form.birthDate || !form.address || !form.email) {
    return 'Completa todos los campos obligatorios.'
  }

  if (!Number.isFinite(getAge(form.birthDate)) || getAge(form.birthDate) < 18) {
    return 'Debes ser mayor de edad para registrarte.'
  }

  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
    return 'La contraseña debe tener 8 caracteres, una mayúscula, un número y un carácter especial.'
  }

  if (form.password !== form.passwordConfirmation) {
    return 'Las contraseñas no coinciden.'
  }

  return ''
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateForm(form)

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    const { error: registerError } = await registerUser(form)
    setIsSubmitting(false)

    if (registerError) {
      setError(registerError.message.includes('already registered')
        ? 'Ese correo electrónico ya está registrado.'
        : 'No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo.')
      return
    }

    setSuccess('Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.')
    setForm(initialForm)
  }

  return (
    <main className="auth-page">
      <section className="register-panel" aria-labelledby="register-title">
        <p className="auth-kicker">VEKTOR</p>
        <h1 id="register-title">Crear una cuenta</h1>
        <p className="auth-intro">Crea tu espacio y empieza a dar dirección a tus objetivos.</p>

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label>Nombre *<input name="firstName" value={form.firstName} onChange={handleChange} autoComplete="given-name" /></label>
            <label>Segundo nombre<input name="middleName" value={form.middleName} onChange={handleChange} autoComplete="additional-name" /></label>
            <label>Apellido *<input name="lastName" value={form.lastName} onChange={handleChange} autoComplete="family-name" /></label>
            <label>Fecha de nacimiento *<input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} max={new Date().toISOString().split('T')[0]} /></label>
            <label className="field-wide">Dirección *<input name="address" value={form.address} onChange={handleChange} autoComplete="street-address" /></label>
            <label>Correo electrónico *<input type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" /></label>
            <label>Contraseña *<input type="password" name="password" value={form.password} onChange={handleChange} autoComplete="new-password" /></label>
            <label>Repetir contraseña *<input type="password" name="passwordConfirmation" value={form.passwordConfirmation} onChange={handleChange} autoComplete="new-password" /></label>
          </div>

          <p className="password-hint">Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.</p>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {success && <p className="form-message form-message-success" role="status">{success}</p>}

          <div className="register-actions">
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}</button>
            <button type="button" className="secondary-button" onClick={() => navigate('/')}>Cancelar</button>
          </div>
        </form>

        <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/">Inicia sesión desde la portada</Link></p>
      </section>
    </main>
  )
}
