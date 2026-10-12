import { useState, useEffect, useRef } from 'react'
import { getTimeRange } from '../../../services/weekly-planner'

// Modal para configurar un bloque creativo (deep work)
export default function CreativeBlockModal({
  isOpen,
  onClose,
  startTime: initialStartTime,
  onSubmit,
  tasks = [],
}) {
  const [blockType, setBlockType] = useState('deep_work')
  const [duration, setDuration] = useState(60)
  const [startTime, setStartTime] = useState(initialStartTime || '09:00')
  const [qualityScore, setQualityScore] = useState(null)
  const [interruptions, setInterruptions] = useState(0)
  const [plannedTaskId, setPlannedTaskId] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const modalRef = useRef(null)

  const blockTypes = [
    { value: 'deep_work', label: 'Deep Work', description: 'Trabajo enfocado sin distracciones' },
    { value: 'shallow_work', label: 'Shallow Work', description: 'Tareas administrativas, emails, etc.' },
    { value: 'creative', label: 'Creativo', description: 'Diseño, escritura, brainstorming' },
    { value: 'learning', label: 'Aprendizaje', description: 'Estudio, cursos, lectura técnica' },
    { value: 'admin', label: 'Admin', description: 'Gestión, planificación, organización' },
  ]

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
    if (!startTime) {
      setError('La hora de inicio es obligatoria')
      return
    }
    getTimeRange(startTime, Number(duration))
    onSubmit({
      type: 'creative-block',
      blockType,
      duration: Number(duration),
      startTime,
      endTime: getTimeRange(startTime, Number(duration)).endTime,
      qualityScore: qualityScore ? Number(qualityScore) : null,
      interruptions: Number(interruptions),
      plannedTaskId: plannedTaskId || null,
      notes,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-panel creative-block-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="creative-block-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">VEKTOR / BLOQUE CREATIVO</p>
            <h3 id="creative-block-title">Configurar bloque de trabajo profundo</h3>
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

        <form className="creative-block-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="block-type">Tipo de bloque</label>
            <select
              id="block-type"
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className="form-select"
            >
              {blockTypes.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label}
                </option>
              ))}
            </select>
            <p className="form-note">El tipo define el color y el icono del bloque en el planner.</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="block-start-time">Hora de inicio</label>
              <input
                id="block-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
                min="05:00"
                max="23:00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="block-duration">Duración (minutos)</label>
              <select
                id="block-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="form-select"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1.5 horas</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="block-type-select">Tipo de bloque</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className="form-select"
            >
              {blockTypes.map((bt) => (
                <option key={bt.value} value={bt.value}>
                  {bt.label} — {bt.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="block-duration">Duración (minutos)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="form-select"
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1.5 horas</option>
              <option value={120}>2 horas</option>
              <option value={180}>3 horas</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="block-start-time">Hora de inicio</label>
            <input
              id="creative-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="form-input"
              min="05:00"
              max="23:00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="planned-task">Tarea relacionada (opcional)</label>
            <select
              id="planned-task"
              value={plannedTaskId}
              onChange={(e) => setPlannedTaskId(e.target.value)}
              className="form-select"
            >
              <option value="">Sin tarea vinculada</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} ({task.priority})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                id="auto-focus"
                checked={true}
                disabled
              />
              Iniciar sesión de enfoque (Pomodoro) automáticamente al iniciar el bloque
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="quality-score">Calidad esperada (1-10)</label>
            <input
              id="quality-score"
              type="number"
              min="1"
              max="10"
              value={qualityScore || ''}
              onChange={(e) => setQualityScore(e.target.value)}
              className="form-input"
              placeholder="Opcional: calidad esperada"
            />
          </div>

          <div className="form-group">
            <label htmlFor="interruptions">Interrupciones esperadas</label>
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
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              rows={3}
              placeholder="Objetivo del bloque, recordatorios..."
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={!blockType}>
              Crear bloque creativo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}