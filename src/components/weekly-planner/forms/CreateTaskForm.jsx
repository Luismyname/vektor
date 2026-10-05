import { useState, useEffect } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { getTimeRange } from '../../../services/weekly-planner'

// Recoge datos de una tarea nueva y calcula el intervalo que ocupará en la agenda.
export default function CreateTaskForm({ onSubmit, onCancel, initialDuration = 30, initialStartTime = '09:00' }) {
  const { theme } = useTheme()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [duration, setDuration] = useState(30)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [error, setError] = useState('')

  useEffect(() => {
    setDuration(initialDuration)
  }, [initialDuration])

  useEffect(() => {
    setStartTime(initialStartTime)
  }, [initialStartTime])

  const priorities = [
    { value: 'high', label: 'Alta', color: 'var(--color-danger)' },
    { value: 'medium', label: 'Media', color: 'var(--accent)' },
    { value: 'low', label: 'Baja', color: 'var(--color-success)' }
  ]

  const durations = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480]

  // Valida el título y devuelve tarea, prioridad, duración y horario al padre.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    const { endTime } = getTimeRange(startTime, Number(duration))

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      duration: Number(duration),
      startTime,
      endTime
    })
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="task-title">Título *</label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué necesitas hacer?"
          autoFocus
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-description">Descripción</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles adicionales (opcional)"
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label>Prioridad</label>
        <div className="priority-options" role="radiogroup" aria-label="Prioridad">
          {priorities.map((p) => (
            <label
              key={p.value}
              className={`priority-option ${priority === p.value ? 'selected' : ''}`}
              style={{ borderColor: priority === p.value ? p.color : 'transparent' }}
            >
              <input
                type="radio"
                name="priority"
                value={p.value}
                checked={priority === p.value}
                onChange={() => setPriority(p.value)}
                className="sr-only"
              />
              <span style={{ color: p.color }}>{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="task-start-time">Hora de inicio</label>
        <input
          id="task-start-time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="form-input"
          min="05:00"
          max="23:00"
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-duration">Duración (minutos)</label>
        <select
          id="task-duration"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="form-select"
        >
          {durations.map((d) => (
            <option key={d} value={d}>
              {d === 60 ? '1 hora' : d < 60 ? `${d} min` : `${d / 60}h`}
            </option>
          ))}
        </select>
      </div>

      {startTime && <p className="form-note">Rango estimado: {startTime} - {getTimeRange(startTime, Number(duration)).endTime}</p>}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="primary-button" disabled={!title.trim()}>
          Crear tarea y agendar
        </button>
      </div>
    </form>
  )
}