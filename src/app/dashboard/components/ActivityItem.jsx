const ACTIVITY_LABELS = {
  task_started: 'Tarea iniciada',
  task_extended: 'Tiempo ampliado',
  task_completed: 'Tarea completada',
}

export default function ActivityItem({ activity, tasks = [], onSelectActivity = () => {} }) {
  const formattedDuration = activity.duration ? `${activity.duration} min` : 'Sin duración'
  const label = ACTIVITY_LABELS[activity.type] || 'Actividad'
  const createdAt = activity.created_at ? new Date(activity.created_at) : null
  const timeLabel = createdAt ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'
  const relatedTask = activity.task_id ? tasks.find((task) => task.id === activity.task_id) : null

  return (
    <li className="activity-item">
      <button
        type="button"
        className="activity-item-button"
        onClick={() => {
          if (relatedTask) onSelectActivity(relatedTask)
          else if (activity.task_id) onSelectActivity({ id: activity.task_id, title: activity.title, priority: 'medium', duration: activity.duration || 25 })
        }}
      >
        <div className="activity-item-badge" aria-hidden="true" />
        <div className="activity-item-copy">
          <div className="activity-item-row">
            <strong>{label}</strong>
            <span>{formattedDuration}</span>
          </div>
          <p>{activity.title}</p>
          <time>{timeLabel}</time>
        </div>
      </button>
    </li>
  )
}
