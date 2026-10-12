import { useState, useEffect } from 'react'
import { getUserPeakHours } from '../../../services/energy'

const CHRONOTYPES = [
  { id: 'morning', label: '🌅 Mañanero', desc: 'Energía peak 6-11h. Mejor deep work temprano.', hours: { morning: [6,7,8,9,10], afternoon: [], evening: [] } },
  { id: 'afternoon', label: '☀️ Vespertino', desc: 'Energía peak 12-17h. Mejor deep work mediodía/tarde.', hours: { morning: [], afternoon: [11,12,13,14,15,16], evening: [] } },
  { id: 'evening', label: '🌆 Nocturno', desc: 'Energía peak 18-22h. Mejor deep work tarde/noche.', hours: { morning: [], afternoon: [], evening: [17,18,19,20,21] } },
  { id: 'night', label: '🦉 Búho', desc: 'Energía peak 20-24h. Deep work nocturno.', hours: { morning: [], afternoon: [], evening: [20,21,22,23] } },
]

const QUESTIONS = [
  { key: 'wake', text: '¿A qué hora te despiertas naturalmente sin alarma?', options: ['Antes 6am', '6-7am', '7-8am', '8-9am', 'Después 9am'] },
  { key: 'sleep', text: '¿Cuándo te sientes con sueño naturalmente?', options: ['Antes 10pm', '10-11pm', '11pm-12am', '12-1am', 'Después 1am'] },
  { key: 'peak', text: '¿Cuándo te sientes más enfocado y productivo?', options: ['Mañana temprano', 'Media mañana', 'Mediodía', 'Tarde', 'Noche'] },
  { key: 'nap', text: '¿Necesitas siesta o bajón post-comida?', options: ['Nunca', 'A veces', 'Siempre', 'Solo si duermo mal'] },
]

export default function OnboardingStep3({ data, onUpdate, onNext, onPrev, user }) {
  const [answers, setAnswers] = useState({})
  const [detected, setDetected] = useState(null)
  const [manualChoice, setManualChoice] = useState(data.chronotype || null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (user?.id) {
      // Try to detect from existing energy data
      import('../../../services/energy').then(({ getWeeklyEnergyLevels, detectChronotype }) => {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
        getWeeklyEnergyLevels(user.id, weekStart).then(({ data }) => {
          if (data?.length > 10) {
            const d = detectChronotype(data)
            if (d) setDetected(d)
          }
        })
      })
    }
  }, [user])

  const handleAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
    // Simple scoring for detection
    const scores = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    Object.entries(answers).forEach(([k, v]) => {
      if (k === 'wake') { if (v <= 1) scores.morning += 2; else if (v === 2) scores.morning += 1; }
      if (k === 'sleep') { if (v <= 1) scores.evening += 2; else if (v === 2) scores.evening += 1; }
      if (k === 'peak') { scores[v] = (scores[v] || 0) + 2; }
      if (k === 'nap') { if (v >= 2) scores.afternoon += 1; }
    })
    const max = Math.max(...Object.values(scores))
    const type = Object.keys(scores).find(k => scores[k] === max)
    setDetected(type)
  }

  const confirmChronotype = (type) => {
    setManualChoice(type)
    onUpdate('chronotype', type)
    onUpdate('peakHours', CHRONOTYPES.find(c => c.id === type)?.hours || { morning: [], afternoon: [], evening: [] })
  }

  const effectiveType = manualChoice || detected || 'afternoon'
  const effectiveHours = getUserPeakHours(effectiveType, {})

  return (
    <div className="onboarding-step chronotype-step">
      <div className="step-icon">🦉</div>
      <h2>¿Cuál es tu cronotipo?</h2>
      <p className="step-description">
        Tu cronotipo define tus horas pico de energía. Lo detectamos automáticamente o eliges manualmente.
      </p>

      {!showManual && (
        <div className="detection-card">
          {detected && (
            <div className="detected-result">
              <h3>Detectado: <span className="detected-type">{CHRONOTYPES.find(c => c.id === detected)?.label}</span></h3>
              <p>Basado en {Object.keys(answers).length} respuestas</p>
              <div className="detection-actions">
                <button className="btn-primary" onClick={() => confirmChronotype(detected)}>Confirmar</button>
                <button className="btn-secondary" onClick={() => setShowManual(true)}>Elegir otro</button>
              </div>
            </div>
          )}
          {Object.keys(answers).length < QUESTIONS.length && (
            <div className="quiz-questions">
              {QUESTIONS.map((q, i) => (
                <div key={q.key} className="quiz-question">
                  <h4>{i + 1}. {q.text}</h4>
                  <div className="quiz-options" role="radiogroup" aria-label={q.text}>
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        className={`quiz-option ${answers[q.key] === oi ? 'selected' : ''}`}
                        onClick={() => handleAnswer(q.key, oi)}
                        role="radio"
                        aria-checked={answers[q.key] === oi}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showManual && (
        <div className="manual-selection">
          <h3>Elige tu cronotipo:</h3>
          <div className="chronotype-grid">
            {CHRONOTYPES.map(c => (
              <button
                key={c.id}
                className={`chronotype-card ${manualChoice === c.id ? 'selected' : ''}`}
                onClick={() => confirmChronotype(c.id)}
              >
                <span className="chrono-label">{c.label}</span>
                <p className="chrono-desc">{c.desc}</p>
                <div className="chrono-hours">
                  {c.hours.morning.map(h => <span key={h} className="hour-tag">{h}:00</span>)}
                  {c.hours.afternoon.map(h => <span key={h} className="hour-tag">{h}:00</span>)}
                  {c.hours.evening.map(h => <span key={h} className="hour-tag">{h}:00</span>)}
                </div>
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => setShowManual(false)}>← Auto-detectar</button>
        </div>
      )}

      <div className="preview-hours">
        <h4>Horas pico configuradas:</h4>
        <div className="hours-preview">
          {effectiveHours.morning.map(h => <span key={h} className="hour-chip morning">{h}:00</span>)}
          {effectiveHours.afternoon.map(h => <span key={h} className="hour-chip afternoon">{h}:00</span>)}
          {effectiveHours.evening.map(h => <span key={h} className="hour-chip evening">{h}:00</span>)}
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onPrev}>← Volver</button>
        <button className="btn-primary" onClick={onNext} disabled={!manualChoice && !detected}>
          Continuar →
        </button>
      </div>
    </div>
  )
}