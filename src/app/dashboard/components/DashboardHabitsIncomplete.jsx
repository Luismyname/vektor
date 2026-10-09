import { useNavigate } from 'react-router-dom'
import { useCognitivePagination } from '../../../hooks/useCognitivePagination'
import { updatePlannerEntryStatus } from '../../../services/weekly-planner'

// Componente para lista paginada de hábitos sin completar (scheduled/failed/moved)
export default function DashboardHabitsIncomplete({ 
  entries = [], 
  habits = [],
  onRefresh = () => {}
}) {
  const navigate = useNavigate()
  
  // Filtrar solo hábitos con estados scheduled/failed/moved
  const habitEntries = entries.filter(e => e.habit_id)
  
  // Mapear entradas a hábitos con info de la entrada
  const incompleteHabits = habitEntries.map(entry => {
    const habit = habits.find(h => h.id === entry.habit_id || h.title === entry.habit_id)
    return {
      ...entry,
      habit: habit || { title: 'Hábito eliminado', duration: 30 }
    }
  })

  // Ordenar por fecha y hora
  const sortedEntries = [...incompleteHabits].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const pagination = useCognitivePagination(sortedEntries, 3)
  
  const STATUS_LABELS = {
    scheduled: { label: 'Programado', color: 'var(--accent)', bg: 'rgba(107, 78, 255, 0.15)' },
    failed: { label: 'Fallado', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.15)' },
    moved: { label: 'Movido', color: 'var(--color-warning, #eab308)', bg: 'rgba(234, 179, 8, 0.15)' }
  }

  const PRIMARY_ACTION = { label: 'Finalizado', targetStatus: 'completed', color: 'var(--color-success)' }
  const SECONDARY_ACTION = { label: 'No finalizado', targetStatus: 'failed', color: 'var(--color-danger)' }

  const handleStatusChange = async (entryId, newStatus) => {
    const { error } = await updatePlannerEntryStatus(entryId, newStatus)
    if (error) {
      console.error('Error updating status:', error)
      return
    }
    onRefresh()
  }

  const formatDateDisplay = (dateStr) => {
    const date = new Date(`${dateStr}T12:00:00`)
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : '—'

  return (
    <section id="dashboard-habits-incomplete" className="dashboard-card" aria-labelledby="habits-incomplete-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="habits-incomplete-title" className="dashboard-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Hábitos sin completar</span>
          <span style={{ 
            background: 'var(--color-white-10)', 
            color: 'var(--text-primary)', 
            padding: '2px 8px', 
            borderRadius: '999px', 
            fontSize: '11px', 
            fontWeight: 600,
            fontVariant: 'tabular-nums'
          }}>
            {sortedEntries.length}
          </span>
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {pagination.totalPages > 1 && (
            <>
              {pagination.hasPrev && (
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={pagination.goPrev}
                  aria-label="Página anterior"
                  style={{ minWidth: 'auto', padding: '6px 12px' }}
                >
                  Atrás
                </button>
              )}
              <span
                className="pagination-indicator"
                style={{
                  color: 'var(--muted-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  minWidth: '36px',
                  textAlign: 'center'
                }}
                aria-label={`Página ${pagination.currentPage} de ${pagination.totalPages}`}
              >
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              {pagination.hasNext && (
                <button
                  type="button"
                  className="secondary-button small-button"
                  onClick={pagination.goNext}
                  aria-label="Página siguiente"
                  style={{ minWidth: 'auto', padding: '6px 12px' }}
                >
                  Siguiente
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="primary-button small-button"
            onClick={() => navigate('/habits')}
            style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '12px' }}
          >
            Ver todo
          </button>
        </div>
      </div>

      {sortedEntries.length ? (
        <>
          <ul className="habit-list" style={{ marginBottom: pagination.totalPages > 1 ? '16px' : '0' }}>
            {pagination.currentItems.map((entry) => {
              const statusInfo = STATUS_LABELS[entry.status] || { label: entry.status, color: 'var(--muted-text)', bg: 'var(--color-white-10)' }
              const habitTitle = entry.habit?.title || 'Hábito sin título'
              
              return (
                <li key={entry.id} className="habit-item" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div className="habit-item-label" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span className="habit-title" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{habitTitle}</span>
                    <span style={{ 
                      background: statusInfo.bg, 
                      color: statusInfo.color, 
                      padding: '2px 8px', 
                      borderRadius: '999px', 
                      fontSize: '10px', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {statusInfo.label}
                    </span>
                    <span style={{ 
                      background: 'var(--color-white-10)', 
                      color: 'var(--text-primary)', 
                      padding: '2px 8px', 
                      borderRadius: '999px', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      fontVariant: 'tabular-nums'
                    }}>
                      {formatDateDisplay(entry.date)} {formatTime(entry.start_time)}
                    </span>
                    {entry.habit?.duration && (
                      <span style={{ color: 'var(--muted-text)', fontSize: '12px' }}>⏱ {entry.habit.duration} min</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="primary-button small-button"
                      onClick={() => handleStatusChange(entry.id, PRIMARY_ACTION.targetStatus)}
                      style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '11px' }}
                    >
                      {PRIMARY_ACTION.label}
                    </button>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleStatusChange(entry.id, SECONDARY_ACTION.targetStatus)}
                      style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '11px' }}
                    >
                      {SECONDARY_ACTION.label}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="dashboard-empty">No hay hábitos sin completar.</p>
      )}
      <button
        type="button"
        className="primary-button small-button"
        onClick={() => navigate('/habits')}
        style={{ 
          position: 'absolute', 
          bottom: '20px', 
          right: '20px', 
          minWidth: 'auto', 
          padding: '8px 14px', 
          fontSize: '12px' 
        }}
      >
        Ver todo
      </button>
    </section>
  )
}