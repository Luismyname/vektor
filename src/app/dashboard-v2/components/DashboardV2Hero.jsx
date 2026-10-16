import { Play, Zap } from 'lucide-react';

export function DashboardV2Hero({
  user,
  currentEnergy,
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
        <div className="hero-energy">
          <span className="hero-energy-label">Energía ahora</span>
          <span className="hero-energy-value">{energyLabel} · {currentEnergy}/10</span>
          <div
            className="hero-energy-track"
            role="meter"
            aria-label="Energía actual"
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={currentEnergy}
          >
            <span
              className="hero-energy-fill"
              style={{ width: `${currentEnergy * 10}%`, background: energyColor }}
            />
          </div>
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