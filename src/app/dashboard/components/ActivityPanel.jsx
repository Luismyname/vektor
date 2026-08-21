import ActivityItem from './ActivityItem'

export default function ActivityPanel({ activities = [], tasks = [], onSelectActivity = () => {} }) {
  return (
    <section id="dashboard-activity" className="dashboard-card" aria-labelledby="dashboard-activity-title">
      <h2 id="dashboard-activity-title" className="dashboard-section-title">Actividad reciente</h2>

      {activities.length ? (
        <ul className="activity-list">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              tasks={tasks}
              onSelectActivity={onSelectActivity}
            />
          ))}
        </ul>
      ) : (
        <p className="dashboard-empty">Tu actividad aparecerá aquí cuando empieces.</p>
      )}
    </section>
  )
}
