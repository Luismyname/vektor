import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getWeekDates, getWeekStart, getWeeklyPlanner } from '../../services/weekly-planner'

// Etiquetas de estado usadas en la vista resumida del plan semanal.
const STATUS_LABELS = { completed: 'Completada', failed: 'Fallida', moved: 'Movida', scheduled: 'Programada' }

// Carga los bloques de la semana actual y presenta un resumen enlazado al planner.
export default function WeeklyPreview({ userId }) {
  const { user: authUser } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const weekStart = useMemo(() => getWeekStart(), [])
  const dates = useMemo(() => getWeekDates(weekStart), [weekStart])

  useEffect(() => {
    let active = true
    async function loadWeeklyPreview() {
      if (!authUser) {
        if (active) {
          setError('No se pudo validar la sesión.')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError('')
      setEntries([])

      try {
        const { entries: weeklyEntries, error: plannerError } = await getWeeklyPlanner(authUser.id, weekStart)
        if (plannerError) throw plannerError

        if (active) setEntries((weeklyEntries || []).filter((entry) => entry.task_id || entry.habit_id))
      } catch {
        if (active) setError('No se pudo cargar el plan semanal.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWeeklyPreview()
    return () => { active = false }
  }, [authUser, userId, weekStart])

  return (
    <section className="dashboard-card weekly-preview" aria-labelledby="weekly-preview-title">
      <div className="weekly-preview-heading">
        <div>
          <p className="auth-kicker">ESTA SEMANA</p>
          <h2 id="weekly-preview-title" className="dashboard-section-title">Plan semanal</h2>
        </div>
        <Link to="/weekly-planner">Abrir planner</Link>
      </div>
      {loading ? (
        <div className="weekly-preview-skeleton" aria-label="Cargando plan semanal" aria-busy="true">
          {dates.map((date) => <div className="weekly-preview-skeleton-day" key={date}><span /><i /><i /></div>)}
        </div>
      ) : error ? (
        <p className="dashboard-empty weekly-preview-empty" role="status">{error}</p>
      ) : entries.length === 0 ? (
        <p className="dashboard-empty weekly-preview-empty">No hay elementos programados esta semana</p>
      ) : (
        <div className="weekly-preview-grid">
          {dates.map((date) => (
            <div className="weekly-preview-day" key={date}>
              <strong>{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</strong>
              {entries.filter((entry) => entry.date === date).map((entry) => (
                <div className={`weekly-preview-entry status-${entry.status}`} key={entry.id} title={STATUS_LABELS[entry.status]}>
                  <span>{entry.task_id ? 'Tarea' : 'Hábito'}</span>
                  <small>{entry.start_time?.slice(0, 5)}</small>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}