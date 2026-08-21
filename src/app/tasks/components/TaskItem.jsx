export default function TaskItem({ task, onComplete, onDelete }) {
  const isCompleted = task.status === 'completed'

  return (
    <li className={`task-item${isCompleted ? ' task-item-completed' : ''}`}>
      <label className="task-item-main">
        <input type="checkbox" checked={isCompleted} onChange={() => !isCompleted && onComplete(task.id)} aria-label={`Completar ${task.title}`} />
        <span>
          <strong>{task.title}</strong>
          {task.description && <small>{task.description}</small>}
        </span>
      </label>
      <div className="task-item-meta">
        <span className={`task-priority task-priority-${task.priority}`}>{task.priority}</span>
        {task.related_value && <span className="task-related-value">{task.related_value}</span>}
        <button className="task-delete" type="button" onClick={() => onDelete(task.id)} aria-label={`Eliminar ${task.title}`}>Eliminar</button>
      </div>
    </li>
  )
}