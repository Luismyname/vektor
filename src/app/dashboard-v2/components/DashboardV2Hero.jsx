import { Play, Zap } from 'lucide-react';

export function DashboardV2Hero({
  user,
  pendingTasksCount,
  activeHabitsCount,
  energyLabel,
  energyColor,
  onStartNextSession,
}) {
  const name = user?.user_metadata?.first_name || 'Luis';

  return (
    <section className="dashboard-v2-hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <div className="hero-status">
          <span className="status-badge" style={{ borderColor: energyColor }}>
            <span className="status-dot" style={{ background: energyColor }} aria-hidden="true" />
            {energyLabel}
          </span>
        </div>

        <h1 id="hero-title" className="hero-title">Buenos días, {name.split(' ')[0]}</h1>
        <p className="hero-subtitle">
          Hoy tienes {pendingTasksCount} tareas importantes, {activeHabitsCount} hábitos pendientes y energía {energyLabel.toLowerCase()}.
        </p>
      </div>

      <button
        className="hero-cta"
        onClick={onStartNextSession}
        disabled={false}
        aria-label="Iniciar próxima sesión"
      >
        <Play className="cta-icon" aria-hidden="true" />
        <span>Iniciar próxima sesión</span>
        <Zap className="cta-spark" aria-hidden="true" />
      </button>
    </section>
  );
}