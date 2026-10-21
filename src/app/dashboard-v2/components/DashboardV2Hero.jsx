import { Play, Zap } from 'lucide-react';

function getDisplayName(user, profile) {
  const candidates = [
    profile?.full_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.first_name,
  ];

  return candidates.find(name => typeof name === 'string' && name.trim())?.trim() || 'Usuario';
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardV2Hero({
  user,
  profile,
  currentEnergy,
  pendingTasksCount,
  activeHabitsCount,
  energyLabel,
  energyColor,
  onStartNextSession,
}) {
  const name = getDisplayName(user, profile).split(/\s+/)[0];

  return (
    <section className="dashboard-v2-hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <div className="hero-energy">
          {currentEnergy != null && energyLabel ? (
            <>
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
            </>
          ) : (
            <span className="hero-energy-label">Sin registro de energía para hoy</span>
          )}
        </div>
        <h1 id="hero-title" className="hero-title">{getGreeting()}, {name}</h1>
        <p className="hero-subtitle">
          Hoy tienes {pendingTasksCount} tareas pendientes y {activeHabitsCount} hábitos activos.
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