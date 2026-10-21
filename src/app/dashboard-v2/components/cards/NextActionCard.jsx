import { Zap, Clock, Sparkles, Play, ArrowRight, Plus } from 'lucide-react';

export function NextActionCard({ nextAction, scheduledTime, currentEnergy, energyColor, onStartNext, onCreateTask }) {
  const action = nextAction;
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
            {scheduledTime && (
              <span className="meta-item">
                <Clock className="meta-icon" aria-hidden="true" />
                <span>{scheduledTime}</span>
              </span>
            )}
            {isHighFocus && (
              <span className="focus-badge">
                <Sparkles aria-hidden="true" />
                Alta concentración
              </span>
            )}
          </div>
          <button className="action-btn" onClick={onStartNext}>
            <Play className="btn-icon" aria-hidden="true" />
            <span>Empezar ahora</span>
            <ArrowRight className="btn-arrow" aria-hidden="true" />
          </button>
        </>
      ) : (
        <div className="empty-state">
          <p>No hay tareas pendientes</p>
          <button className="primary-btn" onClick={onCreateTask}>
            <Plus className="btn-icon" aria-hidden="true" />
            Crear primera tarea
          </button>
        </div>
      )}
    </section>
  );
}