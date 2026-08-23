export default function TaskItem({ task, selected, onToggleSelection, onDelete, onEdit }) {
  const isCompleted = task.status === 'completed'
  const statusLabel = task.status === 'completed'
    ? 'Tarea finalizada'
    : task.status === 'in_progress'
      ? 'Tarea en curso'
      : 'Tarea pendiente'

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onEdit(task)
    }
  }

  return (
    <li className={`task-item${isCompleted ? ' task-item-completed' : ''}`} onClick={() => onEdit(task)} onKeyDown={handleKeyDown} role="button" tabIndex="0">
      <label className="task-item-main" onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelection(task.id)} aria-label={`Seleccionar ${task.title}`} />
        <span>
          <strong>{task.title}</strong>
          {task.description && <small>{task.description}</small>}
        </span>
      </label>
      <div className="task-item-meta">
        <span className="task-related-value">{statusLabel}</span>
        <span className={`task-priority task-priority-${task.priority}`}>{task.priority}</span>
        {task.related_value && <span className="task-related-value">{task.related_value}</span>}
        <button className="task-delete" type="button" onClick={(event) => { event.stopPropagation(); onDelete(task.id) }} aria-label={`Eliminar ${task.title}`}>Eliminar</button>
      </div>
    </li>
  )
}