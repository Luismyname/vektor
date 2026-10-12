import { useState } from 'react'

/**
 * Paso 2: Selección de valores personales
 */
const VALUES = [
  { id: 'health', label: 'Salud y Vitalidad', icon: '💪', description: 'Ejercicio, nutrición, sueño, bienestar físico' },
  { id: 'growth', label: 'Crecimiento y Aprendizaje', icon: '📚', description: 'Leer, cursos, habilidades, desarrollo personal' },
  { id: 'career', label: 'Carrera y Propósito', icon: '🚀', description: 'Proyectos, impacto, maestría, legado profesional' },
  { id: 'relationships', label: 'Relaciones y Familia', icon: '❤️', description: 'Tiempo de calidad, conexión, apoyo, amor' },
  { id: 'creativity', label: 'Creatividad y Expresión', icon: '🎨', description: 'Arte, escritura, música, proyectos creativos' },
  { id: 'finance', label: 'Finanzas y Seguridad', icon: '💰', description: 'Ahorro, inversión, planificación, libertad financiera' },
  { id: 'mindfulness', label: 'Mindfulness y Paz', icon: '🧘', description: 'Meditación, presencia, equilibrio, claridad mental' },
  { id: 'contribution', label: 'Contribución y Servicio', icon: '🤝', description: 'Voluntariado, mentoría, comunidad, impacto social' },
]

export default function OnboardingStep2({ data, onUpdate, onNext, onPrev }) {
  const [selected, setSelected] = useState(data.values || [])

  const toggleValue = (valueId) => {
    const next = selected.includes(valueId)
      ? selected.filter(v => v !== valueId)
      : [...selected, valueId]
    setSelected(next)
    onUpdate('values', next)
    if (next.length === 1) onUpdate('dominantValue', next[0])
  }

  const isDominant = (valueId) => data.dominantValue === valueId

  const handleDominant = (valueId) => {
    onUpdate('dominantValue', valueId)
  }

  return (
    <div className="onboarding-step values-step">
      <div className="step-icon">💎</div>
      <h2>¿Qué valores guían tu vida?</h2>
      <p className="step-description">
        Selecciona <strong>3–5 valores</strong> que sean tu brújula. El primero será tu valor dominante.
      </p>

      <div className="values-grid" role="listbox" aria-label="Valores personales">
        {VALUES.map(v => (
          <button
            key={v.id}
            className={`value-card ${selected.includes(v.id) ? 'selected' : ''} ${isDominant(v.id) ? 'dominant' : ''}`}
            onClick={() => toggleValue(v.id)}
            role="option"
            aria-selected={selected.includes(v.id)}
          >
            <span className="value-icon">{v.icon}</span>
            <div className="value-info">
              <h4>{v.label}</h4>
              <p>{v.description}</p>
            </div>
            {selected.includes(v.id) && (
              <span className="check-mark">✓</span>
            )}
            {isDominant(v.id) && (
              <span className="dominant-badge" title="Valor dominante">★</span>
            )}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="dominant-selector">
          <label>Valor dominante (estrella):</label>
          <div className="dominant-options">
            {selected.map(v => {
              const val = VALUES.find(x => x.id === v)
              return (
                <button
                  key={v}
                  className={`dominant-option ${isDominant(v) ? 'active' : ''}`}
                  onClick={() => handleDominant(v)}
                >
                  {val?.icon} {val?.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="step-hint">
        {selected.length === 0 ? 'Selecciona al menos 1 valor' :
         selected.length < 3 ? `Selecciona ${3 - selected.length} más (recomendado 3-5)` :
         '¡Perfecto! Valor dominante: ' + (VALUES.find(v => v.id === data.dominantValue)?.label || '—')
        }
      </p>

      <div className="step-actions">
        <button className="btn-ghost" onClick={onPrev}>← Volver</button>
        <button className="btn-primary" onClick={onNext} disabled={selected.length === 0}>
          Continuar →
        </button>
      </div>
    </div>
  )
}