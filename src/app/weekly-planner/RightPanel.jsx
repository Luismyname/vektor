import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'

// Panel derecho "Vektor Recommenda" - Fase 2
export function RightPanel({ 
  analytics, 
  user 
}) {
  if (!analytics) return null
  if (!user) return null

  const { creativeStats, avgEnergyByHour, energyQualityCorrelation } = analytics

  // Second insights from local computed data
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const localInsights = useMemo(() => {
    if (!analytics.progress) return []
    
    const insights = []

    const completed = analytics.progress?.completed || 0
    const total = (analytics.progress?.completed || 0) + (analytics.progress?.scheduled || 0) + (analytics.progress?.failed || 0)
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    insights.push({
      type: 'success',
      title: `Completas ${rate}% de tus tareas`,
      description: `${completed} de ${total} tareas completadas`,
      actionable: rate < 50 ? 'Divide tareas grandes en pasos menores' : '¡Buen ritmo! Mantén el ritmo'
    })

    // Energy trend over the week
    if (Object.keys(avgEnergyByHour).length > 0) {
      const peakHour = Object.entries(avgEnergyByHour)
        .reduce((max, [h, v]) => v > max.val ? { hour: parseInt(h), val: v } : max, { hour: 9, val: 0 })

      insights.push({
        type: 'info',
        title: `Tu pico de energía: ${peakHour.hour}:00`,
        description: `Promedio ${peakHour.val}/10 a esa hora`,
        actionable: `Agenda deep work a las ${peakHour.hour}:00`
      })
    }

    if (creativeStats && creativeStats.totalBlocks > 0) {
      insights.push({
        type: 'info',
        title: `Deep Work: ${Math.round((creativeStats.totalMinutes || 0) / 60 * 10) / 10}h esta semana`,
        description: `Calidad promedio: ${creativeStats.avgQuality || '—'}/10`,
        actionable: creativeStats.avgQuality < 6 ? 'Intenta reducir interrupciones' : '¡Buen trabajo manteniendo la calidad!'
      })
    }

    if (energyQualityCorrelation) {
      const { correlation, interpretation } = energyQualityCorrelation
      if (interpretation === 'positive') {
        insights.push({
          type: 'correlation',
          title: 'Energía alta = Mejor deep work',
          description: `Correlación ${correlation > 0 ? '+' : ''}${Math.round(correlation * 100)}% entre energía al inicio y calidad`,
          actionable: 'Programa bloques creativos en tus horas pico de energía'
        })
      }
    }

    return insights
  }, [analytics, creativeStats, avgEnergyByHour, energyQualityCorrelation])

  // Use the insights array for display
  const displayInsights = localInsights

  // Energy data from analytics (or empty state)
  const energyByDay = analytics.energyByDay || {}

  // Reminders from analytics (or empty state)
  const reminders = analytics.reminders || []

  return (
    <aside className="right-panel" aria-label="Vektor Recommenda">
      {/* Tarjeta Principal - Vektor Recommenda */}
      <section className="recommendation-card" aria-labelledby="recommendation-title">
        <header className="recommendation-header">
          <div className="recommendation-badge">
            <Sparkles className="badge-icon" aria-hidden="true" />
            <span>Vektor recomienda</span>
          </div>
        </header>
        <div className="recommendation-content">
          {displayInsights.length > 0 && displayInsights[0] ? (
            <>
              <h3 id="recommendation-title">{displayInsights[0].title}</h3>
              <p className="recommendation-reason">
                {displayInsights[0].description}
              </p>
              <div className="recommendation-actions">
                <button className="btn-primary" aria-label="Aceptar recomendación">
                  Sí, mover
                </button>
                <button className="btn-ghost" aria-label="Rechazar recomendación">
                  No, gracias
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 id="recommendation-title">Necesitamos más datos</h3>
              <p className="recommendation-reason">
                Completa check-ins de energía y bloques creativos para recibir recomendaciones personalizadas.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Panel Energía Semanal */}
      <section className="energy-panel" aria-labelledby="energy-title">
        <header className="panel-header">
          <h3 id="energy-title">Tu energía esta semana</h3>
        </header>
        <div className="energy-week">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => {
            const dayKey = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]
            const dayData = energyByDay[dayKey] || {}
            const energy = dayData.avg || null
            return (
              <div key={i} className="energy-day">
                <span className="energy-day-label">{day}</span>
                <div className="energy-bar-container">
                  <div 
                    className="energy-bar-fill" 
                    style={{ width: energy !== null ? `${(energy / 10) * 100}%` : '0%' }}
                    aria-label={`${day}: ${energy !== null ? energy + '/10' : 'sin datos'}`}
                  />
                </div>
                <span className="energy-value">{energy !== null ? energy : '—'}</span>
              </div>
            )
          })}
        </div>
        {Object.keys(energyByDay).length === 0 && (
          <p className="energy-empty">Necesitamos más datos de energía para mostrar el panel semanal.</p>
        )}
      </section>

      {/* Insights - Máximo 2 tarjetas */}
      <section className="insights-section" aria-labelledby="insights-title">
        <h3 id="insights-title" className="section-title">Insights</h3>
        <div className="insights-grid">
          {displayInsights.slice(0, 2).map((insight, i) => (
            <article key={i} className={`insight-card ${insight.type}`}>
              <div className="insight-icon" aria-hidden="true">
                {insight.type === 'success' && '✅'}
                {insight.type === 'info' && '💡'}
                {insight.type === 'warning' && '⚠️'}
              </div>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p className="insight-description">{insight.description}</p>
                <p className="insight-actionable">{insight.actionable}</p>
              </div>
            </article>
          ))}
          {displayInsights.length === 0 && (
            <p className="insights-empty">Necesitamos más datos para generar insights.</p>
          )}
        </div>
      </section>

      {/* Recordatorios - Sección visual distinta */}
      <section className="reminders-section" aria-labelledby="reminders-title">
        <header className="section-header">
          <h3 id="reminders-title" className="section-title">
            <span className="section-icon" aria-hidden="true">🔔</span>
            Recordatorios
          </h3>
        </header>
        <div className="reminders-list" role="list">
          {reminders.length > 0 ? (
            reminders.map((reminder, i) => (
              <article key={i} className="reminder-item" role="listitem">
                <span className="reminder-badge" aria-label="Recordatorio">🔔</span>
                <div className="reminder-content">
                  <strong>{reminder.title}</strong>
                  <span className="reminder-time">{reminder.time}</span>
                </div>
                <span className="reminder-lock" aria-label="Inamovible" title="Inamovible">🔒</span>
              </article>
            ))
          ) : (
            <article className="reminder-item empty" role="listitem">
              <span className="reminder-badge empty" aria-hidden="true">➕</span>
              <span className="empty-text">No hay recordatorios esta semana</span>
            </article>
          )}
        </div>
      </section>
    </aside>
  )
}