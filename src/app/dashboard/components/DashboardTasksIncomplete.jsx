import { useNavigate } from 'react-router-dom'
import { useCognitivePagination } from '../../../hooks/useCognitivePagination'
import { updatePlannerEntryStatus } from '../../../services/weekly-planner'

// Componente para lista paginada de tareas sin completar (scheduled/failed/moved)
export default function DashboardTasksIncomplete({ 
  entries = [], 
  tasks = [],
  onRefresh = () => {}
}) {
  const navigate = useNavigate()
  
  // Filtrar solo tareas (no hábitos) con estados scheduled/failed/moved
  const taskEntries = entries.filter(e => e.task_id)
  
  // Mapear entradas a tareas con info de la entrada
  const incompleteTasks = taskEntries.map(entry => {
    const task = tasks.find(t => t.id === entry.task_id)
    return {
      ...entry,
      task: task || { title: 'Tarea eliminada', priority: 'medium' }
    }
  })

  // Ordenar por fecha y hora
  const sortedEntries = [...incompleteTasks].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const pagination = useCognitivePagination(sortedEntries, 3)
  
  const STATUS_LABELS = {
    scheduled: { label: 'Programada', color: 'var(--accent)', bg: 'rgba(107, 78, 255, 0.15)' },
    failed: { label: 'Fallida', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.15)' },
    moved: { label: 'Movida', color: 'var(--color-warning, #eab308)', bg: 'rgba(234, 179, 8, 0.15)' }
  }

  const STATUS_ACTIONS = {
    scheduled: { label: 'Finalizada', targetStatus: 'completed', color: 'var(--color-success)' },
    failed: { label: 'Finalizada', targetStatus: 'completed', color: 'var(--color-success)' },
    moved: { label: 'Finalizada', targetStatus: 'completed', color: 'var(--color-success)' }
  }

  const SECONDARY_ACTIONS = {
    scheduled: { label: 'No finalizada', targetStatus: 'failed', color: 'var(--color-danger)' },
    failed: { label: 'No finalizada', targetStatus: 'failed', color: 'var(--color-danger)' },
    moved: { label: 'No finalizada', targetStatus: 'failed', color: 'var(--color-danger)' }
  }

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

  const formatTime = (timeStr) => timeStr || '—'

  return (
    <section id="dashboard-tasks-incomplete" className="dashboard-card" aria-labelledby="tasks-incomplete-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="tasks-incomplete-title" className="dashboard-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Tareas sin completar</span>
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
            onClick={() => navigate('/tasks')}
            style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '12px' }}
          >
            Ver todo
          </button>
        </div>
      </div>

      {sortedEntries.length ? (
        <>
          <ul className="dashboard-task-summary" style={{ marginBottom: pagination.totalPages > 1 ? '16px' : '0' }}>
            {pagination.currentItems.map((entry) => {
              const statusInfo = STATUS_LABELS[entry.status] || { label: entry.status, color: 'var(--muted-text)', bg: 'var(--color-white-10)' }
              const primaryAction = STATUS_ACTIONS[entry.status]
              const secondaryAction = SECONDARY_ACTIONS[entry.status]
              
              return (
                <li key={entry.id} className="dashboard-task-row" style={{ padding: '14px 16px' }}>
                  <div className="dashboard-task-copy" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{entry.task?.title || 'Tarea sin título'}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
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
                    </div>
                    {entry.task?.description && (
                      <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: '12px', lineHeight: 1.4 }}>{entry.task.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="primary-button small-button"
                      onClick={() => handleStatusChange(entry.id, primaryAction.targetStatus)}
                      style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '11px' }}
                    >
                      {primaryAction.label}
                    </button>
                    <button
                      type="button"
                      className="secondary-button small-button"
                      onClick={() => handleStatusChange(entry.id, secondaryAction.targetStatus)}
                      style={{ minWidth: 'auto', padding: '6px 12px', fontSize: '11px' }}
                    >
                      {secondaryAction.label}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="dashboard-empty">No hay tareas sin completar.</p>
      )}
      <button
        type="button"
        className="primary-button small-button"
        onClick={() => navigate('/tasks')}
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