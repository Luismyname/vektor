import { useMemo } from 'react'

/**
 * Panel resumen de bloques creativos de la semana
 */
export default function CreativeBlocksSummary({ stats, weeklyBlocks, avgQuality }) {
  const blocksWithQuality = useMemo(
    () => (weeklyBlocks || []).filter(b => b.quality_score !== null),
    [weeklyBlocks]
  )

  const totalHours = useMemo(
    () => Math.round((stats?.totalMinutes || 0) / 60 * 10) / 10,
    [stats?.totalMinutes]
  )

  const typeLabels = useMemo(() => ({
    deep_work: '🎯 Deep Work',
    shallow_work: '📋 Shallow Work',
    creative: '🎨 Creativo',
    learning: '📚 Aprendizaje',
    admin: '⚙️ Admin'
  }), [])

  if (!stats && (!weeklyBlocks || weeklyBlocks.length === 0)) {
    return (
      <div className="creative-blocks-summary empty">
        <div className="empty-state">
          <span className="empty-icon">🧠</span>
          <p>No hay bloques creativos esta semana</p>
          <p className="empty-hint">Añade un "Bloque Creativo" desde el calendario</p>
        </div>
      </div>
    )
  }

  return (
    <div className="creative-blocks-summary">
      <div className="summary-header">
        <h3>Bloques Creativos</h3>
        <span className="summary-period">{totalHours}h totales</span>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-value">{stats?.totalBlocks || weeklyBlocks?.length || 0}</span>
          <span className="stat-label">Bloques</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalHours}h</span>
          <span className="stat-label">Horas</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgQuality !== null ? avgQuality : (stats?.avgQuality || '—')}</span>
          <span className="stat-label">Calidad avg</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalInterruptions || 0}</span>
          <span className="stat-label">Interrupciones</span>
        </div>
      </div>

      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="summary-breakdown">
          <h4>Por tipo</h4>
          <div className="type-bars">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="type-bar">
                <span className="type-label">{typeLabels[type] || type}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(count / stats.totalBlocks) * 100}%` }}
                  />
                </div>
                <span className="type-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocksWithQuality.length > 0 && (
        <div className="quality-distribution">
          <h4>Distribución de calidad</h4>
          <div className="quality-bars">
            {[1,2,3,4,5,6,7,8,9,10].map(score => {
              const count = blocksWithQuality.filter(b => b.quality_score === score).length
              return (
                <div key={score} className="quality-bar" title={`${count} bloques con ${score}/10`}>
                  <div
                    className="quality-bar-fill"
                    style={{ height: `${count > 0 ? Math.max(10, (count / blocksWithQuality.length) * 100) : 0}%` }}
                  />
                  <span className="quality-score-label">{score}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .creative-blocks-summary {
          background: var(--bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
        }
        .creative-blocks-summary.empty {
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
        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 16px;
        }
        .summary-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .summary-period {
          font-size: 13px;
          color: var(--muted-text);
        }
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px;
          background: var(--bg-main);
          border: 1px solid var(--color-border-light);
          border-radius: 8px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-label {
          font-size: 11px;
          color: var(--muted-text);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .summary-breakdown h4,
        .quality-distribution h4 {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .type-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .type-label {
          width: 110px;
          font-size: 12px;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .bar-track {
          flex: 1;
          height: 8px;
          background: var(--color-border-light);
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), #7a61ff);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .type-count {
          width: 30px;
          text-align: right;
          font-size: 12px;
          font-weight: 600;
          color: var(--muted-text);
        }
        .quality-bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 80px;
          padding-top: 8px;
        }
        .quality-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .quality-bar-fill {
          width: 100%;
          background: var(--accent);
          border-radius: 2px 2px 0 0;
          transition: height 0.3s ease;
        }
        .quality-score-label {
          font-size: 9px;
          color: var(--muted-text);
        }
        @media (max-width: 600px) {
          .summary-stats { grid-template-columns: repeat(2, 1fr); }
          .type-label { width: 90px; font-size: 11px; }
        }
      `}</style>
    </div>
  )
}