const ACTIVITY_LABELS = {
  task_started: 'En curso',
  task_extended: 'En curso (+ tiempo añadido)',
  task_completed: 'Finalizada',
}

export default function RecentActivityItem({ activity, onHide }) {
  const createdAt = activity.created_at ? new Date(activity.created_at) : null
  const formattedTime = createdAt ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'

  return (
    <li className="activity-item">
      <div className="activity-item-badge" aria-hidden="true" />
      <div className="activity-item-copy">
        <div className="activity-item-row">
          <strong>{activity.title}</strong>
          <span>{ACTIVITY_LABELS[activity.type] || activity.type}</span>
        </div>
        <p>{activity.type === 'task_extended' ? `Tiempo añadido: ${activity.duration ?? 0} min` : activity.duration ? `Duración: ${activity.duration} min` : 'Sin duración registrada'}</p>
        <div className="activity-item-actions">
          <time>{formattedTime}</time>
          <button type="button" className="ghost-button" onClick={() => onHide(activity.id)}>
            Eliminar del Dashboard
          </button>
        </div>
      </div>
    </li>
  )
}
