import { Zap, Clock, Sparkles, Play, ArrowRight, CalendarDays } from 'lucide-react';

function getActionStatusLabel(action) {
  if (action.status === 'active') {
    if (action.startOffsetMinutes > 0) return `En progreso · retraso de ${action.startOffsetMinutes} min`;
    if (action.startOffsetMinutes < 0) return `En progreso · ${Math.abs(action.startOffsetMinutes)} min antes`;
    return 'En progreso';
  }
  if (action.status === 'delayed') return `Retraso de ${action.delayMinutes} min`;
  if (action.status === 'upcoming') {
    return action.startsInMinutes > 0
      ? `Empieza en ${action.startsInMinutes} min`
      : `Empieza a las ${action.scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return 'Disponible ahora';
}

export function NextActionCard({
  action,
  currentEnergy,
  energyColor,
  isBusy,
  actionError,
  onStartNext,
  onOpenPlanner,
}) {
  const isHighFocus = currentEnergy >= 8;

  return (
    <section className="card card-next-action" style={{ '--accent-color': energyColor || 'var(--accent)' }}>
      <div className="card-decor" aria-hidden="true" />

      <header className="card-header">
        <Zap className="card-icon" aria-hidden="true" />
        <h2 className="card-title">Próxima acción</h2>
      </header>

      {action ? (
        <>
          <h3 className="action-title">{action.title}</h3>
          <div className="action-meta">
            <span className="meta-item">{action.type === 'task' ? 'Tarea' : 'Hábito'}</span>
            <span className="meta-item">
              <Clock className="meta-icon" aria-hidden="true" />
              <time dateTime={action.scheduledStart.toISOString()}>
                {action.scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {action.scheduledEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </span>
            <span className={`action-status action-status-${action.status}`} role="status">
              {getActionStatusLabel(action)}
            </span>
            {isHighFocus && (
              <span className="focus-badge">
                <Sparkles aria-hidden="true" />
                Alta concentración
              </span>
            )}
          </div>
          {actionError && <p className="dashboard-v2-error" role="alert">{actionError}</p>}
          <button
            className="action-btn"
            onClick={onStartNext}
            disabled={isBusy || action.status === 'active'}
            aria-busy={isBusy}
          >
            <Play className="btn-icon" aria-hidden="true" />
            <span>
              {action.status === 'active'
                ? 'Acción en curso'
                : action.type === 'habit'
                  ? 'Completar hábito'
                  : action.status === 'delayed'
                    ? 'Iniciar con retraso'
                    : 'Empezar ahora'}
            </span>
            <ArrowRight className="btn-arrow" aria-hidden="true" />
          </button>
        </>
      ) : (
        <div className="empty-state">
          <p>No hay acciones programadas pendientes para hoy</p>
          <button className="primary-btn" onClick={onOpenPlanner}>
            <CalendarDays className="btn-icon" aria-hidden="true" />
            Ir al planificador
          </button>
        </div>
      )}
    </section>
  );
}