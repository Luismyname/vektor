/**
 * Panel de patrones semanales detectados automáticamente
 */
export default function WeeklyPatterns({ insights, bestDeepWorkDays, chronotype }) {
  if (!insights || insights.length === 0) {
    return (
      <div className="weekly-patterns empty">
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Necesitas más datos</p>
          <p className="empty-hint">Registra energía y completa bloques para ver patrones</p>
        </div>
      </div>
    )
  }

  const iconForType = (type) => {
    const icons = {
      energy_peak: '⚡',
      energy_low: '🔋',
      creative_type: '🧠',
      quality: '⭐',
      correlation: '📊',
      completion: '✅'
    }
    return icons[type] || '💡'
  }

  const colorForType = (type) => {
    const colors = {
      energy_peak: 'var(--accent)',
      energy_low: 'var(--color-warning)',
      creative_type: 'var(--color-accent-light)',
      quality: 'var(--color-success)',
      correlation: 'var(--color-accent-light)',
      completion: 'var(--color-success)'
    }
    return colors[type] || 'var(--text-primary)'
  }

  return (
    <div className="weekly-patterns">
      <div className="patterns-header">
        <h3>Vektor recomienda</h3>
        {chronotype && (
          <span className="chronotype-badge" style={{ '--badge-color': colorForType('creative_type') }}>
            Cronotipo: {chronotype.charAt(0).toUpperCase() + chronotype.slice(1)}
          </span>
        )}
      </div>

      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className="insight-card" style={{ '--insight-color': colorForType(insight.type) }}>
            <div className="insight-icon" style={{ background: colorForType(insight.type) }}>
              {iconForType(insight.type)}
            </div>
            <div className="insight-content">
              <h4>{insight.title}</h4>
              <p className="insight-description">{insight.description}</p>
              <p className="insight-actionable">{insight.actionable}</p>
            </div>
          </div>
        ))}
      </div>

      {bestDeepWorkDays && bestDeepWorkDays.length > 0 && (
        <div className="best-days">
          <h4>Mejores días para Deep Work</h4>
          <div className="best-days-list">
            {bestDeepWorkDays.slice(0, 3).map((day, i) => (
              <div key={day.date} className="best-day-item">
                <span className="day-rank">#{i + 1}</span>
                <span className="day-name">
                  {new Date(day.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <span className="day-score" style={{ color: day.avgScore >= 7 ? 'var(--color-success)' : day.avgScore >= 5 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                  {day.avgScore}/10
                </span>
                <span className="day-sessions">{day.sessions} sesiones</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .weekly-patterns {
          background: var(--bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }
        .weekly-patterns.empty {
          padding: 40px 20px;
          text-align: center;
        }
        .empty-state .empty-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 12px;
        }
        .empty-state p {
          margin: 4px 0;
          color: var(--muted-text);
          font-size: 14px;
        }
        .empty-hint { font-size: 12px !important; opacity: 0.7; }
        .patterns-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .patterns-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .chronotype-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--color-accent-light);
          color: var(--insight-color, var(--accent));
          text-transform: capitalize;
        }
        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .insight-card {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: var(--bg-main);
          border: 1px solid var(--color-border-light);
          border-radius: 10px;
          border-left: 3px solid var(--insight-color);
        }
        .insight-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .insight-content { flex: 1; min-width: 0; }
        .insight-content h4 {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .insight-description {
          margin: 0 0 6px;
          font-size: 13px;
          color: var(--muted-text);
          line-height: 1.4;
        }
        .insight-actionable {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: var(--insight-color);
        }
        .best-days {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--color-border-light);
        }
        .best-days h4 {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .best-days-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .best-day-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-main);
          border-radius: 8px;
          border: 1px solid var(--color-border-light);
        }
        .day-rank {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: var(--color-accent-light);
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
        }
        .day-name {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary);
        }
        .day-score {
          font-size: 13px;
          font-weight: 700;
        }
        .day-sessions {
          font-size: 11px;
          color: var(--muted-text);
        }
        @media (max-width: 600px) {
          .insight-card { flex-direction: column; gap: 8px; }
          .insight-icon { width: 32px; height: 32px; }
        }
      `}</style>
    </div>
  )
}