import { CheckCircle2, Activity, Clock } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ITEMS_TO_SHOW = 3;

function formatRelativeTime(value, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Fecha desconocida';

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'Completada hace un momento';
  if (elapsedMinutes < 60) return `Completada hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `Completada hace ${elapsedHours} ${elapsedHours === 1 ? 'hora' : 'horas'}`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Completada hace ${elapsedDays} ${elapsedDays === 1 ? 'día' : 'días'}`;
}

export function RecentActivityCard({
  activities = [],
  loadError = '',
  onHideActivity,
  onViewAll,
}) {
  const navigate = useNavigate();
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [hideError, setHideError] = useState('');
  const pendingIdsRef = useRef(new Set());
  const completedActivities = activities
    .filter(activity => activity.type === 'completed' && activity.hidden_in_dashboard !== true)
    .slice(0, ITEMS_TO_SHOW);

  async function handleHide(activityId) {
    if (pendingIdsRef.current.has(activityId)) return;

    const nextPendingIds = new Set(pendingIdsRef.current).add(activityId);
    pendingIdsRef.current = nextPendingIds;
    setPendingIds(nextPendingIds);
    setHideError('');

    try {
      const { error } = await onHideActivity(activityId);
      if (error) throw error;
    } catch (error) {
      console.error('Hide dashboard progress failed:', error);
      setHideError(error instanceof Error ? error.message : 'No se pudo ocultar el progreso.');
    } finally {
      const remainingIds = new Set(pendingIdsRef.current);
      remainingIds.delete(activityId);
      pendingIdsRef.current = remainingIds;
      setPendingIds(remainingIds);
    }
  }

  function openActivity() {
    if (onViewAll) onViewAll();
    else navigate('/activity');
  }

  return (
    <section className="card card-activity" aria-labelledby="activity-title">
      <header className="card-header">
        <Activity className="card-icon" aria-hidden="true" />
        <h2 id="activity-title" className="card-title">Progreso reciente</h2>
      </header>

      {loadError && <p className="dashboard-v2-error" role="alert">{loadError}</p>}
      {hideError && <p className="dashboard-v2-error" role="alert">{hideError}</p>}

      {completedActivities.length > 0 ? (
        <ul className="activity-list" role="list">
          {completedActivities.map(activity => (
            <li key={activity.id} className="activity-item">
              <div className="activity-icon-wrapper">
                <CheckCircle2 className="activity-icon" aria-hidden="true" />
              </div>
              <div className="activity-content">
                <strong>{activity.title}</strong>
                <time dateTime={activity.created_at}>
                  {formatRelativeTime(activity.created_at)}
                </time>
                {activity.duration != null && (
                  <span className="activity-duration">
                    <Clock className="activity-duration-icon" aria-hidden="true" />
                    {activity.duration} min
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => handleHide(activity.id)}
                disabled={pendingIds.has(activity.id)}
                aria-busy={pendingIds.has(activity.id)}
                aria-label={`Ocultar ${activity.title} del dashboard`}
              >
                {pendingIds.has(activity.id) ? 'Ocultando...' : 'Ocultar'}
              </button>
            </li>
          ))}
        </ul>
      ) : loadError ? null : (
        <div className="empty-state">
          <p>Aún no hay avances registrados.</p>
        </div>
      )}

      <button type="button" className="view-all-btn" onClick={openActivity}>
        {completedActivities.length > 0 ? 'Ver toda la actividad' : 'Ir a actividad'}
      </button>
    </section>
  );
}
