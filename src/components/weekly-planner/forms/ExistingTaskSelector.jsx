import { useState, useMemo } from 'react'
import { useTheme } from '../../../hooks/useTheme'

export default function ExistingTaskSelector({ tasks, onSelect, onClose }) {
  const { theme } = useTheme()
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== 'completed')
      .filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
      })
  }, [tasks, search])

  const priorityLabels = {
    high: { label: 'Alta', color: 'var(--color-danger)' },
    medium: { label: 'Media', color: 'var(--accent)' },
    low: { label: 'Baja', color: 'var(--color-success)' }
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