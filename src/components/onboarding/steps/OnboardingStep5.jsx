import { useState, useEffect, useRef } from 'react'

const DEFAULT_HABITS = {
  health: [
    { id: 'h1', title: 'Ejercicio 30 min', duration: 30, frequency: 'daily', color: '#ef4444' },
    { id: 'h2', title: 'Caminar 10k pasos', duration: 45, frequency: 'daily', color: '#f97316' },
    { id: 'h3', title: 'Dormir 7-8h', duration: 480, frequency: 'daily', color: '#8b5cf6' },
    { id: 'h4', title: 'Beber 2L agua', duration: 5, frequency: 'daily', color: '#06b6d4' },
  ],
  growth: [
    { id: 'g1', title: 'Leer 30 min', duration: 30, frequency: 'daily', color: '#22c55e' },
    { id: 'g2', title: 'Curso online 1h', duration: 60, frequency: 'weekly', color: '#3b82f6' },
    { id: 'g3', title: 'Repaso notas/Anki', duration: 15, frequency: 'daily', color: '#8b5cf6' },
    { id: 'g4', title: 'Proyecto lado 2h', duration: 120, frequency: 'weekly', color: '#ec4899' },
  ],
  career: [
    { id: 'c1', title: 'Deep work 2h', duration: 120, frequency: 'daily', color: '#6366f1' },
    { id: 'c2', title: 'Planificar día 10 min', duration: 10, frequency: 'daily', color: '#06b6d4' },
    { id: 'c3', title: 'Networking 1h', duration: 60, frequency: 'weekly', color: '#8b5cf6' },
    { id: 'c4', title: 'Revisar métricas 30 min', duration: 30, frequency: 'weekly', color: '#ec4899' },
  ],
  relationships: [
    { id: 'r1', title: 'Llamada familiar 15 min', duration: 15, frequency: 'daily', color: '#ec4899' },
    { id: 'r2', title: 'Cita semanal pareja/amigos', duration: 120, frequency: 'weekly', color: '#ef4444' },
    { id: 'r3', title: 'Escucha activa 20 min', duration: 20, frequency: 'daily', color: '#f97316' },
    { id: 'r4', title: 'Gratitud 5 min', duration: 5, frequency: 'daily', color: '#22c55e' },
  ],
  creativity: [
    { id: 'cr1', title: 'Escribir/dibujar 30 min', duration: 30, frequency: 'daily', color: '#ec4899' },
    { id: 'cr2', title: 'Proyecto creativo 2h', duration: 120, frequency: 'weekly', color: '#8b5cf6' },
    { id: 'cr3', title: 'Inspiración/referencias 20 min', duration: 20, frequency: 'daily', color: '#06b6d4' },
    { id: 'cr4', title: 'Experimentar técnica nueva 1h', duration: 60, frequency: 'weekly', color: '#f97316' },
  ],
  finance: [
    { id: 'f1', title: 'Revisar gastos 10 min', duration: 10, frequency: 'daily', color: '#22c55e' },
    { id: 'f2', title: 'Presupuesto semanal 30 min', duration: 30, frequency: 'weekly', color: '#06b6d4' },
    { id: 'f3', title: 'Inversión automática', duration: 5, frequency: 'monthly', color: '#8b5cf6' },
    { id: 'f4', title: 'Leer finanzas 20 min', duration: 20, frequency: 'weekly', color: '#ec4899' },
  ],
  mindfulness: [
    { id: 'm1', title: 'Meditación 10 min', duration: 10, frequency: 'daily', color: '#8b5cf6' },
    { id: 'm2', title: 'Respiración 4-7-8 x3', duration: 5, frequency: 'daily', color: '#06b6d4' },
    { id: 'm3', title: 'Journaling 15 min', duration: 15, frequency: 'daily', color: '#ec4899' },
    { id: 'm4', title: 'Digital sunset 1h antes dormir', duration: 60, frequency: 'daily', color: '#6366f1' },
  ],
  contribution: [
    { id: 'co1', title: 'Mentoría/ayuda 30 min', duration: 30, frequency: 'weekly', color: '#22c55e' },
    { id: 'co2', title: 'Voluntariado 2h', duration: 120, frequency: 'monthly', color: '#3b82f6' },
    { id: 'co3', title: 'Donar/reciclar 15 min', duration: 15, frequency: 'weekly', color: '#ec4899' },
    { id: 'co4', title: 'Compartir conocimiento 20 min', duration: 20, frequency: 'weekly', color: '#f97316' },
  ],
}

export default function OnboardingStep5({ data, onUpdate, onNext, onPrev }) {
  const [allHabits, setAllHabits] = useState([])
  const [selected, setSelected] = useState(data.selectedHabits || [])
  const [loading, setLoading] = useState(true)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      // Combine default habits for user's dominant value + all values
      const values = data.values || []
      let combined = []
      values.forEach(v => {
        if (DEFAULT_HABITS[v]) combined.push(...DEFAULT_HABITS[v])
      })
      // If no values, show all
      if (combined.length === 0) {
        Object.values(DEFAULT_HABITS).forEach(arr => combined.push(...arr))
      }
      // Add active: true to all habits
      setAllHabits(combined.map(h => ({ ...h, active: true })))
      setLoading(false)
    }
  }, [data.values])

  const toggleHabit = (habit) => {
    const next = selected.some(h => h.id === habit.id)
      ? selected.filter(h => h.id !== habit.id)
      : [...selected, { ...habit, active: true }]
    setSelected(next)
    onUpdate('selectedHabits', next)
  }

  const isSelected = (habitId) => selected.some(h => h.id === habitId)

  const formatDuration = (min) => {
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  return (
    <div className="onboarding-step habits-step">
      <div className="step-icon">🌱</div>
      <h2>Hábitos sugeridos para ti</h2>
      <p className="step-description">
        Basado en tu valor dominante <strong>{data.dominantValue ? data.dominantValue : 'tus valores'}</strong>,
        te sugerimos estos hábitos. Selecciona los que quieras empezar a trackear.
      </p>

      {loading ? (
        <div className="loading-habits">Cargando sugerencias...</div>
      ) : (
        <div className="habits-grid" role="listbox" aria-label="Hábitos sugeridos">
          {allHabits.map(habit => (
            <button
              key={habit.id}
              className={`habit-card ${isSelected(habit.id) ? 'selected' : ''}`}
              onClick={() => toggleHabit(habit)}
              role="option"
              aria-selected={isSelected(habit.id)}
              style={{ '--habit-color': habit.color }}
            >
              <div className="habit-header">
                <span className="habit-title">{habit.title}</span>
                <span className="habit-duration">{formatDuration(habit.duration)}</span>
              </div>
              <div className="habit-meta">
                <span className="habit-frequency">{habit.frequency === 'daily' ? 'Diario' : habit.frequency === 'weekly' ? 'Semanal' : 'Mensual'}</span>
              </div>
              {isSelected(habit.id) && <span className="habit-check">✓</span>}
            </button>
          ))}
        </div>
      )}

      <div className="selection-summary">
        <span>{selected.length} hábitos seleccionados</span>
        {selected.length > 0 && (
          <span className="weekly-total">
            ≈ {selected.reduce((sum, h) => sum + (h.frequency === 'daily' ? h.duration * 7 : h.frequency === 'weekly' ? h.duration : h.duration / 4), 0)} min/semana
          </span>
        )}
      </div>

      <p className="step-hint">
        {selected.length === 0 ? 'Selecciona al menos 1 hábito (puedes añadir más después)' : '¡Listo! Se crearán activos en tu planner'}
      </p>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onPrev}>← Volver</button>
        <button className="btn-primary" onClick={onNext} disabled={selected.length === 0}>
          Comenzar con Vektor →
        </button>
      </div>
    </div>
  )
}