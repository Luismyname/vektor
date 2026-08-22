import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthenticatedUser } from '../../../services/auth'
import { saveOnboarding } from '../../../services/users'
import { generateHabits } from '../../../lib/habits'
import { questions } from '../questions'
const values = ['salud', 'crecimiento', 'conexion', 'bienestar']

export default function SurveyForm() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const hasAllAnswers = questions.every((_, questionIndex) => values.includes(answers[questionIndex + 1]))
    if (!hasAllAnswers) {
      setError('Responde las 7 preguntas para continuar.')
      return
    }
    setIsSubmitting(true)
    const { user, error: userError } = await getAuthenticatedUser()
    const counts = values.map((value) => [value, Object.values(answers).filter((answer) => answer === value).length]).sort((a, b) => b[1] - a[1])
    const [dominantValue, secondaryValue] = [counts[0][0], counts[1][0]]
    const { error: saveError } = userError || !user
      ? { error: userError || new Error('Sesión no disponible') }
      : await saveOnboarding({ user, answers, dominantValue, secondaryValue, habits: generateHabits(dominantValue, secondaryValue, answers) })

    setIsSubmitting(false)
    if (saveError) {
      console.error('Error guardando onboarding:', saveError)
      const errorText = `${saveError.code || ''} ${saveError.message || ''}`.toLowerCase()
      setError(saveError.code === 'PGRST204' || saveError.code === '42703' || errorText.includes('column')
        ? 'Falta aplicar la migración de perfiles en Supabase. Ejecuta supabase/profiles.sql y vuelve a intentarlo.'
        : saveError.code === '42501'
          ? 'Supabase está bloqueando el guardado por permisos. Ejecuta nuevamente las políticas de supabase/profiles.sql.'
        : 'No se pudo guardar tu perfil. Inténtalo de nuevo.')
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <form className="onboarding-panel" onSubmit={handleSubmit}>
      <p className="auth-kicker">VEKTOR / ONBOARDING</p>
      <h1>Conozcamos tu dirección</h1>
      <p className="auth-intro">Responde estas 7 preguntas para preparar tu panel personal.</p>
      <div className="survey-questions">
        {questions.map(([text, options], questionIndex) => (
          <fieldset key={text}>
            <legend>{questionIndex + 1}. {text}</legend>
            {options.map((option, optionIndex) => {
              const value = values[optionIndex]
              return <label className="survey-option" key={option}><input type="radio" name={`question-${questionIndex + 1}`} value={value} checked={answers[questionIndex + 1] === value} required={optionIndex === 0} onChange={() => setAnswers((current) => ({ ...current, [questionIndex + 1]: value }))} /> <span>{option}</span></label>
            })}
          </fieldset>
        ))}
      </div>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      <button className="onboarding-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar y entrar al panel'}</button>
    </form>
  )
}
