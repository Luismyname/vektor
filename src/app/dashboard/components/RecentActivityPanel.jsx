import RecentActivityItem from './RecentActivityItem'

export default function RecentActivityPanel({ activities = [], onHide }) {
  return (
    <section id="dashboard-activity" className="dashboard-card" aria-labelledby="dashboard-activity-title">
      <h2 id="dashboard-activity-title" className="dashboard-section-title">Actividad reciente</h2>

      {activities.length ? (
        <ul className="activity-list">
          {activities.map((activity) => (
            <RecentActivityItem key={activity.id} activity={activity} onHide={onHide} />
          ))}
        </ul>
      ) : (
        <p className="dashboard-empty">Tu actividad aparecerá aquí cuando empieces.</p>
      )}
    </section>
  )
}
