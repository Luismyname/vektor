import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWeekDates, getWeekStart, getWeeklyPlanner } from '../../services/weekly-planner'

const STATUS_LABELS = { completed: 'Completada', failed: 'Fallida', moved: 'Movida', scheduled: 'Programada' }

export default function WeeklyPreview({ userId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStart = getWeekStart()
  const dates = useMemo(() => getWeekDates(weekStart), [weekStart])

  useEffect(() => {
    let active = true
    getWeeklyPlanner(userId, weekStart).then(({ entries: weeklyEntries }) => {
      if (active) {
        setEntries(weeklyEntries.filter((entry) => entry.task_id || entry.habit_id))
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [userId, weekStart])

  return (
    <section className="dashboard-card weekly-preview" aria-labelledby="weekly-preview-title">
      <div className="weekly-preview-heading"><div><p className="auth-kicker">ESTA SEMANA</p><h2 id="weekly-preview-title" className="dashboard-section-title">Plan semanal</h2></div><Link to="/weekly-planner">Abrir planner</Link></div>
      {loading ? <p className="dashboard-empty">Cargando planificación...</p> : <div className="weekly-preview-grid">
        {dates.map((date) => <div className="weekly-preview-day" key={date}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</strong>{entries.filter((entry) => entry.date === date).map((entry) => <div className={`weekly-preview-entry status-${entry.status}`} key={entry.id} title={STATUS_LABELS[entry.status]}><span>{entry.task_id ? 'Tarea' : 'Hábito'}</span><small>{entry.start_time.slice(0, 5)}</small></div>)}</div>)}
      </div>}
    </section>
  )
}