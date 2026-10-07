import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Paginación de 3 tareas por página con controles de navegación y botón "Ver todos"
export default function DashboardTasks({ tasks = [], onStart = () => {}, activeTaskId = null }) {
  const navigate = useNavigate()
  const pendingTasks = tasks.filter((task) => task.status !== 'completed')

  const ITEMS_PER_PAGE = 3
  const totalPages = Math.ceil(pendingTasks.length / ITEMS_PER_PAGE)
  const [currentPage, setCurrentPage] = useState(1)

  const currentTasks = pendingTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const showPagination = pendingTasks.length > ITEMS_PER_PAGE

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1)
  }

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1)
  }

  const handleViewAll = () => {
    navigate('/tasks')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'ArrowRight') handleNext()
  }

  return (
    <section
      id="dashboard-tasks"
      className="dashboard-card"
      aria-labelledby="dashboard-tasks-title"
      style={{ position: 'relative', padding: '24px 20px', paddingBottom: '60px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 id="dashboard-tasks-title" className="dashboard-section-title">
          Tareas futuras
        </h2>

        {showPagination && (
          <div
            className="dashboard-tasks-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0
            }}
            onKeyDown={handleKeyDown}
            role="navigation"
            aria-label="Paginación de tareas"
          >
            {currentPage > 1 && (
              <button
                type="button"
                className="secondary-button small-button"
                onClick={handlePrev}
                aria-label="Página anterior"
                style={{ minWidth: 'auto', padding: '6px 12px' }}
              >
                Atrás
              </button>
            )}

            <span
              className="dashboard-tasks-page-indicator"
              style={{
                color: 'var(--muted-text)',
                fontSize: '13px',
                fontWeight: 600,
                minWidth: '36px',
                textAlign: 'center'
              }}
              aria-label={`Página ${currentPage} de ${totalPages}`}
            >
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages && (
              <button
                type="button"
                className="secondary-button small-button"
                onClick={handleNext}
                aria-label="Página siguiente"
                style={{ minWidth: 'auto', padding: '6px 12px' }}
              >
                Siguiente
              </button>
            )}
          </div>
        )}
      </div>

      {pendingTasks.length ? (
        <ul className="dashboard-task-summary">
          {currentTasks.map((task) => {
            const isActive = task.id === activeTaskId
            const statusLabel = isActive || task.status === 'in_progress' ? 'Tarea en curso' : 'Tarea pendiente'
            return (
              <li key={task.id} className={`dashboard-task-row ${isActive ? 'is-active-task' : ''}`}>
                <div className="dashboard-task-copy">
                  <strong>{task.title}</strong>
                  <span className="task-related-value">{statusLabel}</span>
                  {task.priority && <span className={`task-priority task-priority-${task.priority}`}>{task.priority}</span>}
                </div>
                <button type="button" className="primary-button small-button" onClick={() => onStart(task)}>
                  {isActive ? 'Modificar' : 'Iniciar tarea'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="dashboard-empty">No tienes tareas pendientes.</p>
      )}

      <button
        type="button"
        className="primary-button small-button"
        onClick={handleViewAll}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          minWidth: 'auto',
          padding: '8px 14px',
          fontSize: '12px'
        }}
      >
        Ver todos
      </button>
    </section>
  )
}