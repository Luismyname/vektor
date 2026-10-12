import { useEffect } from 'react'

/**
 * Paso 1: Bienvenida y explicación del sistema
 */
export default function OnboardingStep1({ onNext, isFirst }) {
  useEffect(() => {
    if (isFirst) onNext()
  }, [isFirst, onNext])

  return (
    <div className="onboarding-step welcome-step">
      <div className="step-icon">🎯</div>
      <h2>Bienvenido a Vektor</h2>
      <p className="step-description">
        Vektor no es una lista de tareas más. Es tu sistema de productividad basado en
        <strong>valores</strong>, <strong>energía</strong> y <strong>enfoque profundo</strong>.
      </p>

      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon">💎</span>
          <h4>Valores</h4>
          <p>Define qué importa y alinea tareas con tus principios</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">⚡</span>
          <h4>Energía</h4>
          <p>Registra tu energía y agenda deep work en tus horas pico</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🧠</span>
          <h4>Deep Work</h4>
          <p>Bloques creativos con quality score y sesión de enfoque automática</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📊</span>
          <h4>Insights</h4>
          <p>Patrones semanales: correlación energía×calidad, mejores días</p>
        </div>
      </div>

      <p className="step-hint">Configuraremos todo en 4 pasos rápidos (~2 min)</p>
    </div>
  )
}