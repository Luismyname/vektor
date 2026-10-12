import { useMemo } from 'react'

/**
 * Panel de correlación: Energía + Bloques Creativos + Completado de Tareas
 */
export default function CorrelationPanel({ 
  energyQualityCorrelation, 
  blocksWithEnergy, 
  progress, 
  habitConsistency,
  creativeStats,
  avgEnergyByHour
}) {
  // Energy trend over the week
  const energyTrend = useMemo(() => {
    if (!avgEnergyByHour) return []
    return Object.entries(avgEnergyByHour)
      .map(([hour, avg]) => ({ hour: parseInt(hour), avg }))
      .sort((a, b) => a.hour - b.hour)
  }, [avgEnergyByHour])

  // Completion by day
  const completionByDay = useMemo(() => {
    if (!progress) return []
    return [
      { label: 'Completadas', value: progress.completed || 0, color: '#22c55e' },
      { label: 'Programadas', value: progress.scheduled || 0, color: '#6366f1' },
      { label: 'Fallidas', value: progress.failed || 0, color: '#ef4444' },
      { label: 'Movidas', value: progress.moved || 0, color: '#f97316' }
    ].filter(d => d.value > 0)
  }, [progress])

  // Habit completion rate
  const habitRate = useMemo(() => {
    if (!habitConsistency?.length) return null
    const totalScheduled = habitConsistency.reduce((sum, h) => sum + (h.scheduled || 0), 0)
    const totalCompleted = habitConsistency.reduce((sum, h) => sum + (h.completed || 0), 0)
    return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0
  }, [habitConsistency])

  const hasData = useMemo(() => 
    energyQualityCorrelation || (blocksWithEnergy?.length > 0) || (progress && (progress.scheduled + progress.completed > 0)),
    [energyQualityCorrelation, blocksWithEnergy, progress]
  )

  if (!hasData) {
    return (
      <div className="correlation-panel empty">
        <div className="empty-state">
          <span className="empty-icon">📈</span>
          <p>Datos insuficientes para correlaciones</p>
          <p className="empty-hint">Completa check-ins de energía y bloques creativos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="correlation-panel">
      <h3>Correlaciones Semanales</h3>

      {/* Energy × Quality Correlation */}
      {energyQualityCorrelation && (
        <div className="correlation-card">
          <div className="correlation-header">
            <h4>Energía → Calidad Deep Work</h4>
            <span className={`correlation-badge ${energyQualityCorrelation.interpretation}`}>
              {energyQualityCorrelation.correlation > 0 ? '+' : ''}{Math.round(energyQualityCorrelation.correlation * 100)}%
            </span>
          </div>
          <p className="correlation-desc">
            {energyQualityCorrelation.interpretation === 'positive' 
              ? 'Más energía al iniciar = mejor calidad en deep work' 
              : energyQualityCorrelation.interpretation === 'negative'
              ? 'Más energía correlaciona con menor calidad (revisa interrupciones)'
              : 'Sin correlación clara entre energía inicial y calidad'}
          </p>
          <div className="correlation-meta">
            <span>Muestra: {energyQualityCorrelation.sampleSize} bloques</span>
            <span>Con quality score: {energyQualityCorrelation.sampleSize} / {blocksWithEnergy?.length || 0}</span>
          </div>
        </div>
      )}

      {/* Energy Trend Mini Chart */}
      {energyTrend.length > 0 && (
        <div className="correlation-card">
          <h4>Energía Promedio por Hora</h4>
          <div className="mini-chart" role="img" aria-label="Gráfico de energía promedio por hora">
            {energyTrend.map((point, i) => (
              <div
                key={point.hour}
                className="chart-bar"
                style={{ 
                  '--bar-height': `${Math.max(5, (point.avg / 10) * 100)}%`,
                  '--bar-delay': `${i * 30}ms`
                }}
                title={`${point.hour}:00 - ${point.avg}/10`}
              >
                <span className="bar-label">{point.hour}h</span>
              </div>
            ))}
          </div>
          <div className="chart-axis">
            <span>5h</span>
            <span>14h</span>
            <span>23h</span>
          </div>
        </div>
      )}

      {/* Task Completion Donut */}
      {completionByDay.length > 0 && (
        <div className="correlation-card">
          <h4>Estado de Tareas</h4>
          <div className="completion-donut">
            <svg viewBox="0 0 100 100" className="donut-svg">
              {completionByDay.map((segment, i) => {
                const total = completionByDay.reduce((sum, s) => sum + s.value, 0)
                const percentage = segment.value / total
                const startAngle = completionByDay.slice(0, i).reduce((sum, s) => sum + s.value / total * 360, 0)
                const endAngle = startAngle + percentage * 360
                const largeArc = percentage > 0.5 ? 1 : 0
                const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180)
                const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180)
                const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180)
                const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180)
                return (
                  <path
                    key={segment.label}
                    d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                    fill={segment.color}
                  />
                )
              })}
              <circle cx="50" cy="50" r="28" fill="var(--bg-card)" />
            </svg>
            <div className="donut-legend">
              {completionByDay.map(seg => (
                <div key={seg.label} className="legend-item">
                  <span className="legend-dot" style={{ background: seg.color }} />
                  <span>{seg.label}: {seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Habit Completion */}
      {habitRate !== null && (
        <div className="correlation-card habit-rate">
          <div className="habit-rate-circle" style={{ '--rate': `${habitRate}%` }}>
            <span className="rate-value">{habitRate}%</span>
          </div>
          <div className="habit-rate-label">
            <h4>Consistencia Hábitos</h4>
            <p>{habitConsistency.filter(h => h.completed > 0).length} de {habitConsistency.length} activos completados</p>
          </div>
        </div>
      )}

      {/* Creative Blocks Summary */}
      {creativeStats && creativeStats.totalBlocks > 0 && (
        <div className="correlation-card">
          <h4>Resumen Deep Work</h4>
          <div className="deepwork-stats">
            <div className="dw-stat">
              <span className="dw-value">{Math.round(creativeStats.totalMinutes / 60 * 10) / 10}h</span>
              <span className="dw-label">Horas deep work</span>
            </div>
            <div className="dw-stat">
              <span className="dw-value">{creativeStats.avgQuality || '—'}/10</span>
              <span className="dw-label">Calidad promedio</span>
            </div>
            <div className="dw-stat">
              <span className="dw-value">{creativeStats.totalInterruptions}</span>
              <span className="dw-label">Interrupciones totales</span>
            </div>
            <div className="dw-stat">
              <span className="dw-value">{Math.round((creativeStats.withQualityScore / creativeStats.totalBlocks) * 100)}%</span>
              <span className="dw-label">Con quality score</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .correlation-panel {
          background: var(--bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 20px;
          display: grid;
          gap: 16px;
        }
        .correlation-panel.empty {
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
        .correlation-panel > h3 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .correlation-card {
          background: var(--bg-main);
          border: 1px solid var(--color-border-light);
          border-radius: 10px;
          padding: 16px;
        }
        .correlation-card h4 {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .correlation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .correlation-header h4 { margin: 0; }
        .correlation-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .correlation-badge.positive { background: #dcfce7; color: #166534; }
        .correlation-badge.negative { background: #fee2e2; color: #991b1b; }
        .correlation-badge.neutral { background: #fef3c7; color: #92400e; }
        .correlation-desc {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--muted-text);
          line-height: 1.5;
        }
        .correlation-meta {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--muted-text);
        }
        /* Mini Chart */
        .mini-chart {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 100px;
          padding: 8px 4px 4px;
        }
        .chart-bar {
          flex: 1;
          background: linear-gradient(180deg, var(--accent), #7a61ff);
          border-radius: 3px 3px 0 0;
          min-height: 5%;
          transition: height 0.5s ease-out;
          animation: barGrow 0.5s ease-out backwards;
          position: relative;
        }
        .chart-bar::before {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: var(--muted-text);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .chart-bar:hover::before { opacity: 1; }
        .bar-label {
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: var(--muted-text);
          white-space: nowrap;
        }
        @keyframes barGrow {
          from { height: 0; }
        }
        .chart-axis {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 10px;
          color: var(--muted-text);
        }
        /* Donut */
        .completion-donut {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }
        .donut-svg { width: 100px; height: 100px; }
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-primary);
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        /* Habit Rate */
        .habit-rate { display: flex; align-items: center; gap: 16px; }
        .habit-rate-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: conic-gradient(var(--accent) calc(var(--rate) * 3.6deg), var(--color-border-light) 0deg);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .habit-rate-circle::before {
          content: '';
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--bg-card);
        }
        .rate-value {
          position: relative;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .habit-rate-label h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .habit-rate-label p { margin: 0; font-size: 12px; color: var(--muted-text); }
        /* Deep Work Stats */
        .deepwork-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .dw-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--color-border-light);
          border-radius: 8px;
        }
        .dw-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .dw-label {
          font-size: 10px;
          color: var(--muted-text);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        @media (max-width: 768px) {
          .deepwork-stats { grid-template-columns: repeat(2, 1fr); }
          .completion-donut { flex-direction: column; gap: 16px; }
          .habit-rate { flex-direction: column; gap: 12px; text-align: center; }
        }
        @media (max-width: 600px) {
          .deepwork-stats { grid-template-columns: 1fr; }
          .correlation-meta { flex-direction: column; gap: 4px; }
        }
      `}</style>
    </div>
  )
}