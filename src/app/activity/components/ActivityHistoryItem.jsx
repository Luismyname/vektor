function getStatusLabel(activity) {
  if (activity.type === 'completed') return 'Tarea finalizada'
  if (activity.type === 'in_progress') return 'Tarea en curso'
  return 'Tarea pendiente'
}

export default function ActivityHistoryItem({ activity, onClick }) {
  const createdAt = activity.created_at ? new Date(activity.created_at) : null
  const formattedDate = createdAt ? createdAt.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'Sin fecha'

  return (
    <li className="activity-history-item" onClick={() => onClick?.(activity)} onKeyDown={(event) => event.key === 'Enter' && onClick?.(activity)} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="activity-history-badge" aria-hidden="true" />
      <div className="activity-history-copy">
        <div className="activity-history-row">
          <strong>{activity.title}</strong>
          <span>{getStatusLabel(activity)}</span>
        </div>
        <p>{activity.type === 'task_extended' ? `Tiempo añadido: ${activity.duration ?? 0} min` : activity.duration ? `Duración: ${activity.duration} min` : 'Sin duración registrada'}</p>
        <time>{formattedDate}</time>
      </div>
    </li>
  )
}
