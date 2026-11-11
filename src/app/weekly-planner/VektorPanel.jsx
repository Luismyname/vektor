import { useState } from 'react'
import SleepRecordModal from '../../components/weekly-planner/forms/SleepRecordModal'
import { useEnergyInsights } from '../../hooks/useEnergyInsights'
import { useLowEnergyDay } from '../../hooks/useLowEnergyDay'
import { useRecommendations } from '../../hooks/useRecommendations'
import { useLearningPatterns } from '../../hooks/useLearningPatterns'
import { useEnergyImpacts } from '../../hooks/useEnergyImpacts'

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
  if (entry.obligation_id) return entry.obligation?.title || 'Obligación'
  if (entry.is_creative_block) return entry.notes?.trim() || 'Bloque creativo'
  return entry.notes?.trim() || 'Evento fijo'
}

function getEntryType(entry) {
  if (entry.task_id) return 'Tarea'
  if (entry.habit_id) return 'Hábito'
  if (entry.obligation_id) {
    return {
      work: 'Trabajo',
      class: 'Clase',
      sleep: 'Sueño',
      appointment: 'Cita fija',
    }[entry.obligation?.obligation_type] || 'Obligación'
  }
  if (entry.is_creative_block) return 'Bloque creativo'
  return '🔒 Evento fijo'
}

function formatEnergyHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function getImpactActivityLabel(summary, taskById, habitById, entries, patterns) {
  const learnedPattern = patterns.find((pattern) => (
    pattern.pattern_data.activity_id === summary.activityId
    && pattern.pattern_data.activity_type === summary.impactType
  ))
  if (typeof learnedPattern?.pattern_data.activity === 'string') return learnedPattern.pattern_data.activity
  if (summary.impactType === 'task') return taskById[summary.activityId]?.title || 'Tarea'
  if (summary.impactType === 'habit') return habitById[summary.activityId]?.title || 'Hábito'
  return entries.find((entry) => entry.obligation_id === summary.activityId)?.obligation?.title || 'Obligación'
}

function formatSignedImpact(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

export function VektorPanel({
  analytics,
  entries,
  taskById,
  habitById,
  currentTime,
  userId,
  habits = [],
  onApplyRecommendation,
  learningRefreshKey = 0,
}) {
  const availableInsights = (analytics.insights || [])
    .filter((insight) => ['energy_peak', 'energy_low', 'creative_type', 'quality', 'correlation'].includes(insight.type))
  const insights = availableInsights.slice(0, 3)
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
  const [sleepModalOpen, setSleepModalOpen] = useState(false)
  const today = getLocalDate(currentTime)
  const lowEnergyDay = useLowEnergyDay(userId, today)
  const energyInsights = useEnergyInsights(userId)
  const recommendationState = useRecommendations({
    userId,
    today,
    habits,
    hourlyProfile: energyInsights.hourlyProfile,
    energyConfidence: energyInsights.confidence,
    lowEnergyDay,
    currentTime,
  })
  const learningState = useLearningPatterns({
    userId,
    today,
    refreshKey: learningRefreshKey,
  })
  const energyImpactState = useEnergyImpacts({
    userId,
    refreshKey: learningRefreshKey,
  })
  const visibleLearningPatterns = learningState.patterns.filter((pattern) => (
    pattern.confidence >= 0.5
    && pattern.pattern_data.source !== 'energy-impact-engine'
  ))
  const [suggestionsDate, setSuggestionsDate] = useState(null)
  const [dismissedDate, setDismissedDate] = useState(null)
  const [recommendationDismissals, setRecommendationDismissals] = useState({
    scope: '',
    ids: [],
    hidden: false,
  })
  const [confirmingRecommendation, setConfirmingRecommendation] = useState(null)
  const [applyingRecommendation, setApplyingRecommendation] = useState(false)
  const [recommendationApplyError, setRecommendationApplyError] = useState('')
  const recommendationScope = `${userId || ''}:${today}`
  const recommendationIds = recommendationDismissals.scope === recommendationScope
    ? recommendationDismissals.ids
    : []
  const recommendationsHidden = recommendationDismissals.scope === recommendationScope
    && recommendationDismissals.hidden
  const visibleRecommendations = recommendationsHidden
    ? []
    : recommendationState.recommendations.filter((item) => !recommendationIds.includes(item.id))
  const actionByRecommendationId = recommendationState.actionByRecommendationId || {}
  const unavailableReasonByRecommendationId = recommendationState.unavailableReasonByRecommendationId || {}
  const suggestionsShown = suggestionsDate === today
  const showLowEnergyNotice = lowEnergyDay.isLowEnergy && dismissedDate !== today

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

      {!recommendationsHidden && (
        <section className="vektor-recommendation" aria-labelledby="vektor-recommendation-title">
          <h2 id="vektor-recommendation-title">⚡ Recomendaciones Vektor</h2>
          {recommendationState.loading ? (
            <p role="status">Preparando recomendaciones con tus datos…</p>
          ) : recommendationState.error ? (
            <p role="alert">No se pudieron cargar las recomendaciones: {recommendationState.error}</p>
          ) : visibleRecommendations.length ? (
            <ul className="vektor-recommendation-list">
              {visibleRecommendations.map((item) => (
                <li className="vektor-recommendation-card" key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{item.reason}</p>
                  <p className="vektor-recommendation-confidence">
                    Confianza {item.confidence === 'high' ? 'alta' : 'media'}
                  </p>
                  {item.recommendedWindow && (
                    <p>
                      Franja recomendada: {item.recommendedWindow.start} - {item.recommendedWindow.end}
                    </p>
                  )}
                  {actionByRecommendationId[item.id] ? (
                    <>
                      <p>
                        Nueva hora:{' '}
                        {actionByRecommendationId[item.id].suggestedStartTime}
                        {' - '}
                        {actionByRecommendationId[item.id].suggestedEndTime}
                        {' · '}
                        {new Date(`${actionByRecommendationId[item.id].suggestedDate}T12:00:00`)
                          .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </p>
                      <button
                        type="button"
                        disabled={!onApplyRecommendation}
                        onClick={() => {
                          setRecommendationApplyError('')
                          setConfirmingRecommendation({
                            recommendation: item,
                            action: actionByRecommendationId[item.id],
                          })
                        }}
                      >
                        Aplicar
                      </button>
                    </>
                  ) : (unavailableReasonByRecommendationId[item.id] ? (
                    <p className="vektor-recommendation-unavailable" role="status">
                      {unavailableReasonByRecommendationId[item.id]}
                    </p>
                  ) : null)}
                  <div className="vektor-recommendation-actions">
                    <button
                      type="button"
                      onClick={() => setRecommendationDismissals((current) => ({
                        scope: recommendationScope,
                        ids: [...(current.scope === recommendationScope ? current.ids : []), item.id],
                        hidden: false,
                      }))}
                    >
                      Entendido
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecommendationDismissals({
                        scope: recommendationScope,
                        ids: [],
                        hidden: true,
                      })}
                    >
                      Ocultar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : energyInsights.confidence === 'low' || energyInsights.confidence === 'insufficient' ? (
            <p>No hay suficientes datos todavía para generar recomendaciones fiables.</p>
          ) : (
            <p>No hay recomendaciones compatibles con tus tareas pendientes, hábitos y obligaciones actuales.</p>
          )}
          {confirmingRecommendation && (
            <div className="vektor-confirm-backdrop">
              <section
                className="vektor-confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vektor-confirm-title"
              >
                <h3 id="vektor-confirm-title">
                  ¿Quieres {confirmingRecommendation.action.plannerEntryId ? 'mover' : 'agendar'}{' '}
                  {confirmingRecommendation.action.habitId ? 'esta ocurrencia del hábito' : 'esta tarea'}?
                </h3>
                <dl>
                  <div>
                    <dt>Actual</dt>
                    <dd>
                      {confirmingRecommendation.action.currentStartTime
                        ? `${confirmingRecommendation.action.currentStartTime.slice(0, 5)} - ${confirmingRecommendation.action.currentEndTime.slice(0, 5)}`
                        : 'Sin bloque programado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Propuesto</dt>
                    <dd>
                      {confirmingRecommendation.action.suggestedStartTime}
                      {' - '}
                      {confirmingRecommendation.action.suggestedEndTime}
                      {' · '}
                      {new Date(`${confirmingRecommendation.action.suggestedDate}T12:00:00`)
                        .toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </dd>
                  </div>
                </dl>
                {recommendationApplyError && <p role="alert">{recommendationApplyError}</p>}
                <div className="vektor-confirm-actions">
                  <button
                    type="button"
                    disabled={applyingRecommendation}
                    onClick={() => setConfirmingRecommendation(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={applyingRecommendation}
                    onClick={async () => {
                      setApplyingRecommendation(true)
                      setRecommendationApplyError('')
                      try {
                        const result = await onApplyRecommendation?.(
                          confirmingRecommendation.action,
                          lowEnergyDay.isLowEnergy,
                        )
                        if (result?.error) {
                          setRecommendationApplyError(result.error.message || 'No se pudo aplicar la recomendación.')
                          return
                        }
                        setRecommendationDismissals((current) => ({
                          scope: recommendationScope,
                          ids: [...(current.scope === recommendationScope ? current.ids : []), confirmingRecommendation.recommendation.id],
                          hidden: false,
                        }))
                        setConfirmingRecommendation(null)
                        await recommendationState.reload()
                      } catch (error) {
                        setRecommendationApplyError(error instanceof Error
                          ? error.message
                          : 'No se pudo aplicar la recomendación.')
                      } finally {
                        setApplyingRecommendation(false)
                      }
                    }}
                  >
                    {applyingRecommendation ? 'Aplicando…' : 'Confirmar'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      )}

      <section className="vektor-learning" aria-labelledby="vektor-learning-title">
        <h2 id="vektor-learning-title">🧠 Aprendizajes detectados</h2>
        {learningState.loading ? (
          <p role="status">Revisando tus registros recientes…</p>
        ) : visibleLearningPatterns.length ? (
          <>
            <ul>
              {visibleLearningPatterns
                .slice(0, 5)
                .map((pattern) => (
                  <li key={`${pattern.pattern_type}:${pattern.pattern_data.key}`}>
                    <p>{pattern.pattern_data.summary}</p>
                    <span>
                      Confianza: {pattern.confidence >= 0.75 ? 'alta' : 'media'}
                    </span>
                  </li>
                ))}
            </ul>
            {learningState.error && (
              <p className="vektor-learning-error" role="alert">
                No se pudieron actualizar los aprendizajes. Se muestran los últimos patrones guardados.
              </p>
            )}
          </>
        ) : learningState.error ? (
          <p className="vektor-learning-error" role="alert">
            No se pudieron cargar los aprendizajes: {learningState.error}
          </p>
        ) : (
          <p>Aún no hay suficientes registros para detectar patrones fiables.</p>
        )}
      </section>

      <section className="vektor-energy-impact" aria-labelledby="vektor-energy-impact-title">
        <h2 id="vektor-energy-impact-title">⚡ Impacto Energético</h2>
        {energyImpactState.loading ? (
          <p role="status">Analizando el impacto de tus actividades…</p>
        ) : energyImpactState.error ? (
          <p role="alert">No se pudieron cargar los impactos: {energyImpactState.error}</p>
        ) : energyImpactState.summaries.length ? (
          <ul>
            {energyImpactState.summaries.slice(0, 5).map((summary) => {
              const classification = summary.classification === 'recovery'
                ? 'Actividad recuperadora'
                : summary.classification === 'drain'
                  ? 'Actividad drenante'
                  : 'Impacto neutro'
              const trend = summary.trend === 'improving'
                ? 'Mejorando'
                : summary.trend === 'worsening'
                  ? 'Empeorando'
                  : summary.trend === 'stable'
                    ? 'Estable'
                    : null
              return (
                <li key={`${summary.impactType}:${summary.activityId}`}>
                  <strong>{getImpactActivityLabel(summary, taskById, habitById, entries, learningState.patterns)}</strong>
                  <p>Impacto medio: {formatSignedImpact(summary.averageImpact)}</p>
                  <span>{classification} · Confianza {summary.confidence >= 0.75 ? 'alta' : 'media'}</span>
                  {trend && <span className="vektor-energy-impact-trend">Tendencia: {trend}</span>}
                  {summary.previousAverage !== null && summary.recentAverage !== null && (
                    <span className="vektor-energy-impact-trend">
                      Periodo anterior {formatSignedImpact(summary.previousAverage)} · reciente {formatSignedImpact(summary.recentAverage)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p>Registra energía antes y después de una actividad para descubrir su impacto.</p>
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

      <section className="vektor-energy-insights" aria-labelledby="vektor-energy-insights-title">
        <h2 id="vektor-energy-insights-title">⚡ Patrón energético</h2>
        {energyInsights.loading ? (
          <p role="status">Analizando registros de energía…</p>
        ) : energyInsights.error ? (
          <p role="alert">No se pudo cargar el patrón energético: {energyInsights.error}</p>
        ) : energyInsights.bestWindow && energyInsights.worstWindow ? (
          <dl>
            <div>
              <dt>Mejor franja</dt>
              <dd>{formatEnergyHour(energyInsights.bestWindow.startHour)} - {formatEnergyHour(energyInsights.bestWindow.endHour)}</dd>
            </div>
            <div>
              <dt>Peor franja</dt>
              <dd>{formatEnergyHour(energyInsights.worstWindow.startHour)} - {formatEnergyHour(energyInsights.worstWindow.endHour)}</dd>
            </div>
            <div>
              <dt>Número de muestras</dt>
              <dd>{energyInsights.sampleCount}</dd>
            </div>
            <div>
              <dt>Confianza</dt>
              <dd>{energyInsights.confidence === 'high'
                ? 'Alta'
                : energyInsights.confidence === 'medium'
                  ? 'Media'
                  : 'Baja'}</dd>
            </div>
          </dl>
        ) : (
          <p>Aún no hay suficientes muestras (mínimo 3 por hora) para identificar franjas de 4 horas.</p>
        )}
      </section>

      <section className="vektor-sleep" aria-labelledby="vektor-sleep-title">
        <h2 id="vektor-sleep-title">Descanso</h2>
        <button type="button" className="primary-button" onClick={() => setSleepModalOpen(true)} disabled={!userId}>
          Registrar sueño
        </button>
      </section>

      {lowEnergyDay.error && (
        <p className="vektor-low-energy-error" role="alert">
          No se pudo comprobar el nivel de energía de hoy: {lowEnergyDay.error}
        </p>
      )}
      {!lowEnergyDay.loading && showLowEnergyNotice && (
        <section className="vektor-low-energy" aria-labelledby="low-energy-title">
          <h2 id="low-energy-title">⚠ Día de energía baja detectado</h2>
          <ul>
            {lowEnergyDay.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          {suggestionsShown ? (
            <div className="vektor-low-energy-suggestions" role="status">
              <p>Para hoy, puedes:</p>
              <ul>
                <li>Dividir tareas grandes</li>
                <li>Reducir la carga cognitiva</li>
                <li>Priorizar tareas ligeras</li>
              </ul>
              <button type="button" onClick={() => setDismissedDate(today)}>Ignorar</button>
            </div>
          ) : (
            <div className="vektor-low-energy-actions">
              <button type="button" onClick={() => setSuggestionsDate(today)}>Aplicar sugerencias</button>
              <button type="button" onClick={() => setDismissedDate(today)}>Ignorar</button>
            </div>
          )}
        </section>
      )}

      <section className="vektor-reflection" aria-labelledby="vektor-reflection-title">
        <h2 id="vektor-reflection-title">Vektor observa</h2>
        {totalActivities ? (
          <p>
            Has completado <strong>{progress.completed}</strong> de <strong>{totalActivities}</strong> actividades esta semana.
            {' '}{progress.completionRate >= 80
              ? 'La constancia está creando resultados.'
              : progress.completionRate >= 50
                ? 'Vas avanzando; mantén un ritmo sostenible.'
                : 'Cada avance cuenta.'}
          </p>
        ) : (
          <p>Aún no hay actividad registrada esta semana. Puedes empezar con un solo bloque.</p>
        )}
      </section>

      <p className="vektor-motivational-phrase">{MOTIVATIONAL_PHRASE}</p>
      {sleepModalOpen && (
        <SleepRecordModal
          isOpen={sleepModalOpen}
          onClose={() => setSleepModalOpen(false)}
          userId={userId}
          onSaved={() => {
            void lowEnergyDay.reload()
            void recommendationState.reload()
            void learningState.reload()
          }}
        />
      )}
    </aside>
  )
}
