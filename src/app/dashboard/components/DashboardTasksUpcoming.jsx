import { useNavigate } from 'react-router-dom'
import { useCognitivePagination } from '../../../hooks/useCognitivePagination'

const PRIORITY_SCORE = { high: 0, medium: 1, low: 2 }

const PRIORITY_LABELS = {
  high: { label: 'HIGH', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.15)' },
  medium: { label: 'MEDIUM', color: 'var(--accent)', bg: 'rgba(107, 78, 255, 0.15)' },
  low: { label: 'LOW', color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.15)' }
}

// Componente para lista paginada de tareas por colocar (máx 3 por página)
export default function DashboardTasksUpcoming({ 
  tasks = [], 
  activeTaskId = null, 
  onStart = () => {},
  taskTimes = {}
}) {
  const navigate = useNavigate()

  // Filtrar tareas pendientes (no completadas)
  const pendingTasks = tasks.filter((task) => task.status !== 'completed')
  
  // Ordenar por próxima hora programada, luego por prioridad
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const timeA = taskTimes[a.id]?.start_time || '99:99'
    const timeB = taskTimes[b.id]?.start_time || '99:99'
    
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    
    // Si no tienen hora programada, ordenar por prioridad
    return (PRIORITY_SCORE[a.priority] ?? 1) - (PRIORITY_SCORE[b.priority] ?? 1)
  })

  const pagination = useCognitivePagination(sortedTasks, 3)

  return (
    <section id="dashboard-tasks-upcoming" className="dashboard-card" aria-labelledby="tasks-upcoming-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="tasks-upcoming-title" className="dashboard-section-title">Tareas por colocar</h2>
        
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

      {sortedTasks.length ? (
        <>
          <ul className="dashboard-task-summary" style={{ marginBottom: pagination.totalPages > 1 ? '16px' : '0' }}>
            {pagination.currentItems.map((task) => {
              const isActive = task.id === activeTaskId
              const statusLabel = isActive || task.status === 'in_progress' ? 'Tarea en curso' : 'Tarea pendiente'
              const priorityInfo = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium
              const nextTime = taskTimes[task.id]?.start_time || '—'
              
              return (
                <li key={task.id} className={`dashboard-task-row ${isActive ? 'is-active-task' : ''}`} style={{ padding: '14px 16px' }}>
                  <div className="dashboard-task-copy" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="task-related-value" style={{ fontSize: '12px', color: 'var(--muted-text)' }}>{statusLabel}</span>
                      <span style={{ 
                        background: priorityInfo.bg, 
                        color: priorityInfo.color, 
                        padding: '2px 8px', 
                        borderRadius: '999px', 
                        fontSize: '10px', 
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {priorityInfo.label}
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
                        {nextTime}
                      </span>
                    </div>
                    {task.description && (
                      <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: '12px', lineHeight: 1.4 }}>{task.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="primary-button small-button"
                    onClick={() => onStart(task)}
                    style={{ minWidth: 'auto', padding: '6px 12px', flexShrink: 0 }}
                  >
                    {isActive ? 'Modificar' : 'Iniciar tarea'}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <p className="dashboard-empty">No tienes tareas pendientes por colocar.</p>
      )}
    </section>
  )
}