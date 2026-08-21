const ACTIVITY_LABELS = {
  task_started: 'En curso',
  task_extended: 'En curso (+ tiempo añadido)',
  task_completed: 'Finalizada',
}

export default function ActivityHistoryItem({ activity }) {
  const createdAt = activity.created_at ? new Date(activity.created_at) : null
  const formattedDate = createdAt ? createdAt.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'Sin fecha'

  return (
    <li className="activity-history-item">
      <div className="activity-history-badge" aria-hidden="true" />
      <div className="activity-history-copy">
        <div className="activity-history-row">
          <strong>{activity.title}</strong>
          <span>{ACTIVITY_LABELS[activity.type] || activity.type}</span>
        </div>
        <p>{activity.type === 'task_extended' ? `Tiempo añadido: ${activity.duration ?? 0} min` : activity.duration ? `Duración: ${activity.duration} min` : 'Sin duración registrada'}</p>
        <time>{formattedDate}</time>
      </div>
    </li>
  )
}
