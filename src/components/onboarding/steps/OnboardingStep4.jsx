import { useState, useEffect } from 'react'

/**
 * Paso 4: Check-in de energía base (mañana)
 */
export default function OnboardingStep4({ data, onUpdate, onNext, onPrev, user }) {
  const [energy, setEnergy] = useState(data.energyCheckIn || 5)
  const [hour, setHour] = useState(new Date().getHours())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user?.id) {
      import('../../../services/energy').then(({ getTodayEnergyCheckIn }) => {
        getTodayEnergyCheckIn(user.id).then(({ data: checkIn }) => {
          if (checkIn) {
            setEnergy(checkIn.energy_level)
            setHour(checkIn.hour)
            setSaved(true)
          }
        })
      })
    }
  }, [user])

  const handleSave = async () => {
    try {
      const { saveEnergyCheckIn } = await import('../../../services/energy')
      const today = new Date().toISOString().split('T')[0]
      const { error } = await saveEnergyCheckIn(user.id, today, hour, energy, 'onboarding')
      if (error) throw error
      onUpdate('energyCheckIn', energy)
      setSaved(true)
    } catch (err) {
      console.error('Error saving energy check-in:', err)
    }
  }

  const getEnergyLabel = (level) => {
    if (level <= 2) return 'Muy baja 🔴'
    if (level <= 4) return 'Baja 🟠'
    if (level <= 6) return 'Media 🟡'
    if (level <= 8) return 'Alta 🟢'
    return 'Muy alta 🟢'
  }

  return (
    <div className="onboarding-step energy-step">
      <div className="step-icon">⚡</div>
      <h2>Check-in de energía matutino</h2>
      <p className="step-description">
        Registra tu nivel actual. Esto calibra tu mapa de energía y sugiere cuándo hacer deep work.
      </p>

      <div className="energy-slider-container">
        <div className="energy-visual">
          <div className="energy-ring" style={{ '--energy': `${energy * 10}%` }}>
            <span className="energy-value">{energy}</span>
            <span className="energy-label">{getEnergyLabel(energy)}</span>
          </div>
        </div>

        <div className="energy-slider-wrapper">
          <input
            type="range"
            min="1"
            max="10"
            value={energy}
            onChange={e => setEnergy(Number(e.target.value))}
            className="energy-slider"
            aria-label="Nivel de energía"
          />
          <div className="slider-labels">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <span key={n} className={energy === n ? 'active' : ''}>{n}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="time-selector">
        <label>Hora del check-in:</label>
        <input
          type="time"
          value={String(hour).padStart(2, '0') + ':00'}
          onChange={e => setHour(Number(e.target.value.split(':')[0]))}
        />
      </div>

      <div className="energy-context">
        <h4>¿Qué significa tu nivel?</h4>
        <div className="context-grid">
          <div className="context-item">
            <span className="ctx-level">1-2</span>
            <span className="ctx-desc">Descansa, tareas ligeras, admin</span>
          </div>
          <div className="context-item">
            <span className="ctx-level">3-4</span>
            <span className="ctx-desc">Tareas rutinarias, email, reuniones</span>
          </div>
          <div className="context-item">
            <span className="ctx-level">5-6</span>
            <span className="ctx-desc">Trabajo estándar, progreso constante</span>
          </div>
          <div className="context-item">
            <span className="ctx-level">7-8</span>
            <span className="ctx-desc">Deep work, creatividad, decisiones</span>
          </div>
          <div className="context-item">
            <span className="ctx-level">9-10</span>
            <span className="ctx-desc">Flow state, trabajo más exigente</span>
          </div>
        </div>
      </div>

      {saved ? (
        <p className="saved-message">✓ Check-in guardado. Se repetirá cada mañana.</p>
      ) : (
        <button className="btn-primary full-width" onClick={handleSave}>
          Guardar check-in inicial
        </button>
      )}

      <div className="step-actions">
        <button className="btn-ghost" onClick={onPrev}>← Volver</button>
        <button className="btn-primary" onClick={onNext} disabled={!saved}>
          Continuar →
        </button>
      </div>
    </div>
  )
}