import { useEffect, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import DashboardActivity from './components/DashboardActivity'
import DashboardHabits from './components/DashboardHabits'
import DashboardSummary from './components/DashboardSummary'
import DashboardTasks from './components/DashboardTasks'
import { getTasks } from '../../services/tasks'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser()
      if (userError || !authenticatedUser) {
        if (active) setError('No se pudo cargar la sesión.')
        return
      }

      const { profile: currentProfile, error: profileError } = await getCurrentProfile(authenticatedUser.id)
      if (!active) return

      if (profileError || !currentProfile) {
        setError('No se pudo cargar tu perfil.')
        return
      }

      const { tasks: currentTasks } = await getTasks(authenticatedUser.id)
      setUser(authenticatedUser)
      setProfile(currentProfile)
      setTasks(currentTasks)
    }

    loadDashboard()
    return () => { active = false }
  }, [])

  if (error) return <div className="route-loading">{error}</div>
  if (!user || !profile) return <div className="route-loading">Cargando tu dashboard...</div>

  const answers = profile.answers && typeof profile.answers === 'object' ? Object.entries(profile.answers) : []

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / DASHBOARD</p>
          <h1>Tu dirección empieza aquí</h1>
          <p>Este es el resumen de lo que descubrimos en tu onboarding.</p>
        </section>

        <DashboardSummary
          dominantValue={profile.dominant_value}
          secondaryValue={profile.secondary_value}
        />
        <DashboardHabits habits={profile.habits} />

        <div className="dashboard-lower-grid">
          <DashboardTasks tasks={tasks} />
          <DashboardActivity />
        </div>

        <section className="dashboard-card dashboard-answers" aria-labelledby="dashboard-answers-title">
          <h2 id="dashboard-answers-title" className="dashboard-section-title">Tus respuestas</h2>
          {answers.length ? (
            <dl className="dashboard-answer-list">
              {answers.map(([question, answer]) => (
                <div className="dashboard-answer" key={question}>
                  <dt>Pregunta {question}</dt>
                  <dd>{String(answer)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="dashboard-empty">No hay respuestas disponibles.</p>
          )}
        </section>
      </div>
    </main>
  )
}
