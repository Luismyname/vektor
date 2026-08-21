import { useEffect, useMemo, useState } from 'react'
import { getAuthenticatedUser } from '../../../services/auth'
import { getActivityHistory, hideActivityFromDashboard } from '../../../services/activity'
import ActivityFilters from './ActivityFilters'
import ActivityHistoryItem from './ActivityHistoryItem'
import ActivitySearchBar from './ActivitySearchBar'

const DEFAULT_FILTERS = {
  day: '',
  month: '',
  year: '',
  type: 'all',
}

export default function ActivityHistoryPage() {
  const [user, setUser] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true

    async function loadHistory() {
      const { user: authenticatedUser, error } = await getAuthenticatedUser()
      if (error || !authenticatedUser) {
        if (active) setLoading(false)
        return
      }

      const { activities: data } = await getActivityHistory(authenticatedUser.id, DEFAULT_FILTERS)
      if (active) {
        setUser(authenticatedUser)
        setActivities(data)
        setLoading(false)
      }
    }

    loadHistory()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return

    let active = true
    async function refreshHistory() {
      const { activities: data } = await getActivityHistory(user.id, {
        ...filters,
        type: filters.type === 'all' ? '' : filters.type,
      })
      if (active) {
        setActivities(data)
      }
    }

    refreshHistory()
    return () => { active = false }
  }, [user, filters])

  const filteredBySearch = useMemo(() => {
    if (!query.trim()) return activities

    const normalized = query.trim().toLowerCase()
    return activities.filter((activity) => {
      const title = (activity.title || '').toLowerCase()
      const date = activity.created_at ? new Date(activity.created_at).toISOString().slice(0, 10) : ''
      return title.includes(normalized) || date.includes(normalized)
    })
  }, [activities, query])

  const handleHideFromDashboard = async (activityId) => {
    if (!user) return
    await hideActivityFromDashboard(activityId)
    const { activities: data } = await getActivityHistory(user.id, {
      ...filters,
      type: filters.type === 'all' ? '' : filters.type,
    })
    setActivities(data)
  }

  if (!user && !loading) return <div className="route-loading">No se pudo cargar la actividad.</div>

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / ACTIVIDAD</p>
          <h1>Historial completo</h1>
          <p>Consulta todo el registro de tus tareas, tiempos y avances.</p>
        </section>

        <section className="dashboard-card activity-history-card">
          <div className="activity-history-header">
            <ActivitySearchBar value={query} onChange={setQuery} />
            <button type="button" className="secondary-button" onClick={() => {
              setFilters(DEFAULT_FILTERS)
              setQuery('')
            }}>
              Limpiar filtros
            </button>
          </div>

          <ActivityFilters filters={filters} onChange={setFilters} />

          <div className="activity-history-list-wrap">
            {loading ? (
              <p className="dashboard-empty">Cargando historial...</p>
            ) : filteredBySearch.length ? (
              <ul className="activity-history-list">
                {filteredBySearch.map((activity) => (
                  <div key={activity.id} className="activity-history-row">
                    <ActivityHistoryItem activity={activity} />
                    {activity.hidden_in_dashboard !== true && (
                      <button type="button" className="ghost-button" onClick={() => handleHideFromDashboard(activity.id)}>
                        Ocultar del dashboard
                      </button>
                    )}
                  </div>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty">No hay actividad que coincida con esos filtros.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
