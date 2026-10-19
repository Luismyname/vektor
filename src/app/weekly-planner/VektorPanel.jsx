import { useState } from 'react'

const MOTIVATIONAL_PHRASE = 'Los pequeños avances repetidos terminan creando grandes resultados.'

function getLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getUpcomingEntry(entries, currentTime) {
  const today = getLocalDate(currentTime)
  const now = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`

  return entries
    .filter((entry) => entry.status === 'scheduled' && (entry.date > today || (entry.date === today && entry.start_time.slice(0, 5) >= now)))
    .sort((left, right) => `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`))[0] || null
}

function getEntryLabel(entry, taskById, habitById) {
  if (entry.task_id) return taskById[entry.task_id]?.title || 'Tarea'
  if (entry.habit_id) return habitById[entry.habit_id]?.title || 'Hábito'
  if (entry.is_creative_block) return entry.notes?.trim() || 'Bloque creativo'
  return entry.notes?.trim() || 'Evento fijo'
}

function getEntryType(entry) {
  if (entry.task_id) return 'Tarea'
  if (entry.habit_id) return 'Hábito'
  if (entry.is_creative_block) return 'Bloque creativo'
  return '🔒 Evento fijo'
}

export function VektorPanel({ analytics, entries, taskById, habitById, currentTime }) {
  const insights = (analytics.insights || [])
    .filter((insight) => ['energy_peak', 'energy_low', 'creative_type', 'quality', 'correlation'].includes(insight.type))
    .slice(0, 3)
  const recommendation = insights.find((insight) => ['energy_peak', 'quality', 'creative_type'].includes(insight.type))
  const nextEntry = getUpcomingEntry(entries, currentTime)
  const energyDays = Object.entries(analytics.energyByDayHour || {}).map(([date, hours]) => {
    const values = Object.values(hours).filter(Number.isFinite)
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

    return {
      date,
      day: new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' }),
      average,
    }
  })
  const progress = analytics.progress
  const totalActivities = progress
    ? progress.scheduled + progress.completed + progress.failed + progress.moved
    : 0
  const [recommendationResponse, setRecommendationResponse] = useState(null)

  return (
    <aside className="vektor-panel" aria-label="Panel Vektor">
      <section className="vektor-next-activity" aria-labelledby="next-activity-title">
        <h2 id="next-activity-title">Próxima actividad</h2>
        {nextEntry ? (
          <div className="vektor-next-entry">
            <strong>{getEntryLabel(nextEntry, taskById, habitById)}</strong>
            <span>{getEntryType(nextEntry)} · {nextEntry.start_time.slice(0, 5)}</span>
          </div>
        ) : (
          <p>No tienes actividades próximas.</p>
        )}
      </section>

      <section className="vektor-recommendation" aria-labelledby="vektor-recommendation-title">
        <h2 id="vektor-recommendation-title">Vektor recomienda</h2>
        {recommendation ? (
          <>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.description}. {recommendation.actionable}.</p>
            {recommendationResponse ? (
              <p className="vektor-recommendation-response" role="status">
                {recommendationResponse === 'accepted' ? 'La tendrás en cuenta esta semana.' : 'Mantendrás tu planificación actual.'}
              </p>
            ) : (
              <div className="vektor-recommendation-actions">
                <button type="button" onClick={() => setRecommendationResponse('accepted')}>Aceptar</button>
                <button type="button" onClick={() => setRecommendationResponse('maintain')}>Mantener</button>
              </div>
            )}
          </>
        ) : (
          <p>Cuando haya más registros de energía o bloques creativos, Vektor podrá recomendarte una franja.</p>
        )}
      </section>

      <section className="vektor-insights" aria-labelledby="vektor-insights-title">
        <h2 id="vektor-insights-title">Conociéndote mejor</h2>
        {insights.length ? (
          <ul>
            {insights.map((insight) => (
              <li key={insight.type}>
                <strong>{insight.title}</strong>
                <p>{insight.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>Los patrones aparecerán cuando haya datos reales de energía o bloques creativos.</p>
        )}
      </section>

      <section className="vektor-weekly-energy" aria-labelledby="vektor-weekly-energy-title">
        <h2 id="vektor-weekly-energy-title">Energía semanal</h2>
        <ul>
          {energyDays.map(({ date, day, average }) => (
            <li key={date} aria-label={`${day}: ${average === null ? 'sin registros' : `${Math.round(average * 10)}%`}`}>
              <span>{day}</span>
              <span className="vektor-energy-track" aria-hidden="true">
                <span style={{ width: `${average === null ? 0 : Math.max(0, Math.min(average * 10, 100))}%` }} />
              </span>
              <strong>{average === null ? '—' : `${Math.round(average * 10)}%`}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="vektor-reflection" aria-labelledby="vektor-reflection-title">
        <h2 id="vektor-reflection-title">Reflexión de Vektor</h2>
        {totalActivities ? (
          <p>
            Has completado <strong>{progress.completed}</strong> de <strong>{totalActivities}</strong> actividades esta semana.
            {' '}{progress.completionRate >= 80
              ? 'La constancia está creando resultados.'
              : progress.completionRate >= 50
                ? 'Vas avanzando; mantén un ritmo sostenible.'
                : 'Cada paso cuenta.'}
          </p>
        ) : (
          <p>Aún no hay actividad registrada esta semana. Puedes empezar con un solo bloque.</p>
        )}
      </section>

      <p className="vektor-motivational-phrase">{MOTIVATIONAL_PHRASE}</p>
    </aside>
  )
}
