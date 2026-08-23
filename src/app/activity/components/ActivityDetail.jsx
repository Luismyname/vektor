import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { finalizeActivity, getActivityById } from '../../../services/activity'

const STATUS_LABELS = {
  pending: 'Tarea pendiente',
  in_progress: 'Tarea en curso',
  completed: 'Tarea finalizada',
}

export default function ActivityDetail() {
  const { activityId } = useParams()
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState('')
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    let active = true
    async function loadActivity() {
      const { activity: currentActivity, error: loadError } = await getActivityById(activityId)
      if (!active) return
      if (loadError || !currentActivity) return setError('No se pudo cargar la actividad.')
      setActivity(currentActivity)
    }
    loadActivity()
    return () => { active = false }
  }, [activityId])

  async function handleFinalize() {
    if (!activity || activity.type === 'completed') return
    setIsFinalizing(true)
    const { error: finalizeError } = await finalizeActivity(activity.id, activity.task_id)
    setIsFinalizing(false)
    if (finalizeError) {
      setError('No se pudo finalizar la actividad.')
      return
    }
    setActivity((current) => ({ ...current, type: 'completed', tasks: { ...current.tasks, status: 'completed' } }))
  }

  if (error) return <div className="route-loading">{error}</div>
  if (!activity) return <div className="route-loading">Cargando actividad...</div>

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-card activity-detail-card" aria-labelledby="activity-detail-title">
          <p className="auth-kicker">VEKTOR / ACTIVIDAD</p>
          <h1 id="activity-detail-title">{activity.title}</h1>
          <p>{STATUS_LABELS[activity.type] || 'Tarea pendiente'}</p>
          <p>{activity.duration ? `Duración: ${activity.duration} min` : 'Sin duración registrada'}</p>
          {activity.tasks?.description && <p>{activity.tasks.description}</p>}
          <div className="modal-actions">
            {activity.type !== 'completed' && (
              <button type="button" className="primary-button danger" onClick={handleFinalize} disabled={isFinalizing}>
                {isFinalizing ? 'Finalizando...' : 'Finalizar actividad'}
              </button>
            )}
            <Link className="secondary-button" to="/activity">Volver al historial</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
