import { useState, useEffect, useRef } from 'react'

// Modal que aparece al terminar una sesión de enfoque para calificar la calidad
export default function FocusQualityModal({
  isOpen,
  onClose,
  onSubmit,
  durationMinutes,
  taskTitle,
}) {
  const [qualityScore, setQualityScore] = useState(5)
  const [interruptions, setInterruptions] = useState(0)
  const [notes, setNotes] = useState('')
  const modalRef = useRef(null)

  // Focus trap and close on Escape
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      modalRef.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      qualityScore: Number(qualityScore),
      interruptions: Number(interruptions),
      notes,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-panel focus-quality-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-quality-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">VEKTOR / SESIÓN COMPLETADA</p>
            <h3 id="focus-quality-title">¡Sesión completada! 🎉</h3>
            <p className="modal-subtitle">
              {taskTitle} — {durationMinutes} min completados
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <form className="focus-quality-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="quality-score">¿Cómo fue la sesión? (1-10)</label>
            <div className="quality-score-slider">
              <input
                id="quality-score"
                type="range"
                min="1"
                max="10"
                value={qualityScore}
                onChange={(e) => setQualityScore(Number(e.target.value))}
                className="quality-slider"
              />
              <div className="quality-labels">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <span key={n} className={qualityScore === n ? 'active' : ''}>
                    {n}
                  </span>
                ))}
              </div>
              <output className="quality-value">{qualityScore}/10</output>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="interruptions">Interrupciones</label>
            <input
              id="interruptions"
              type="number"
              min="0"
              max="20"
              value={interruptions}
              onChange={(e) => setInterruptions(Number(e.target.value))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notas (opcional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              rows={3}
              placeholder="¿Qué funcionó bien? ¿Qué mejorar?..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Omitir
            </button>
            <button type="submit" className="primary-button">
              Guardar calidad
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}