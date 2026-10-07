import { useState, useMemo } from 'react'

// Busca y ordena tareas abiertas para vincular una existente al intervalo.
export default function ExistingTaskSelector({ tasks, onSelect, onClose }) {
  const [search, setSearch] = useState('')

  const visibleTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks])

  const filteredTasks = useMemo(() => {
    return visibleTasks
      .filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
      })
  }, [visibleTasks, search])

  const priorityLabels = {
    high: { label: 'HIGH', color: 'var(--color-danger)' },
    medium: { label: 'MEDIUM', color: 'var(--accent)' },
    low: { label: 'LOW', color: 'var(--color-success)' }
  }

  return (
    <div className="selector-modal">
      <div className="selector-header">
        <h3>Seleccionar tarea existente</h3>
        <button className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
      </div>

      <div className="selector-search">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tarea..."
          className="search-input"
          aria-label="Buscar tarea"
          data-testid="task-search-input"
        />
      </div>

      <div className="task-list" role="listbox" aria-label="Tareas disponibles">
        {filteredTasks.length === 0 ? (
          <p className="empty-state">No hay tareas disponibles</p>
        ) : (
          <ul className="task-options" role="listbox">
            {filteredTasks.map((task) => {
              return (
                <li
                  key={task.id}
                  className="task-option"
                  role="option"
                  data-status={task.status}
                  data-priority={task.priority}
                  onClick={() => onSelect(task)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(task) }}
                >
                  <div className="task-option-content">
                    <span className="task-title">{task.title}</span>
                    <span
                      className="task-priority"
                      style={{ backgroundColor: priorityLabels[task.priority]?.color || 'var(--muted-text)' }}
                    >
                      {priorityLabels[task.priority]?.label || task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    {task.duration && <span>⏱ {task.duration} min</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}