import { Dumbbell, BookOpen, Zap, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ICON_MAP = {
  completed: Dumbbell,
  focus: Zap,
  habit: BookOpen,
  default: Activity,
};

export function RecentActivityCard({ activities }) {
  const navigate = useNavigate();
  const recent = activities.slice(0, 3);

  return (
    <section className="card card-activity" aria-labelledby="activity-title">
      <header className="card-header">
        <Activity className="card-icon" aria-hidden="true" />
        <h2 id="activity-title" className="card-title">Actividad reciente</h2>
      </header>

      {recent.length > 0 ? (
        <ul className="activity-list" role="list">
          {recent.map(activity => {
            const Icon = ICON_MAP[activity.type] || ICON_MAP.default;
            const date = new Date(activity.created_at || activity.started_at);
            const timeAgo = formatRelativeTime(date);
            return (
              <li key={activity.id} className="activity-item">
                <div className="activity-icon-wrapper">
                  <Icon className="activity-icon" aria-hidden="true" />
                </div>
                <div className="activity-content">
                  <strong>{getActivityTitle(activity)}</strong>
                  <time>{timeAgo}</time>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-state">Tu actividad aparecerá aquí cuando empieces.</p>
      )}

      <button className="view-all-btn" onClick={() => navigate('/activity')}>
        Ver toda la actividad
      </button>
    </section>
  );
}

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 36e5);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Hace ${days}d`;
  if (hours > 0) return `Hace ${hours}h`;
  return 'Hace un momento';
}

function getActivityTitle(activity) {
  if (activity.type === 'completed') return `${activity.title} completado`;
  if (activity.type === 'focus') return `Sesión de foco finalizada`;
  if (activity.type === 'habit') return `Hábito: ${activity.title}`;
  return activity.title || 'Actividad';
}