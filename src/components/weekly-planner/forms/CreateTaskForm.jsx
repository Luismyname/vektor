import { useState } from 'react'
import { getTimeRange } from '../../../services/weekly-planner'

// Recoge datos de una tarea nueva y calcula el intervalo que ocupará en la agenda.
export default function CreateTaskForm({ onSubmit, onCancel, initialDuration = 30, initialStartTime = '09:00' }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [startTime, setStartTime] = useState(initialStartTime)
  const [endTime, setEndTime] = useState(getTimeRange(initialStartTime, initialDuration).endTime)
  const [error, setError] = useState('')

  const priorities = [
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Media' },
    { value: 'low', label: 'Baja' }
  ]

  const intervalError = startTime && endTime
    ? endTime < startTime
      ? 'Las tareas deben finalizar dentro del mismo día.'
      : endTime <= startTime
        ? 'La hora de fin debe ser posterior a la hora de inicio.'
        : ''
    : ''
  const durationMinutes = startTime && endTime && !intervalError
    ? (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3, 5)))
      - (Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5)))
    : null

  // Valida el título y el intervalo antes de devolver el horario al padre.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    if (intervalError || !startTime || !endTime) {
      setError(intervalError || 'Selecciona una hora de inicio y una hora de fin.')
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
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
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
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
        <label htmlFor="task-priority">Prioridad</label>
        <select
          id="task-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="form-select"
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="task-start-time">Hora de inicio</label>
        <input
          id="task-start-time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="form-input"
          required
          min="00:00"
          max="23:59"
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-end-time">Hora de fin</label>
        <input
          id="task-end-time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="form-input"
          required
          aria-invalid={Boolean(intervalError)}
        />
      </div>

      <p className="form-note">
        Duración estimada: {durationMinutes === null ? '—' : `${durationMinutes} minutos`}
      </p>

      {(intervalError || error) && <p className="form-error" role="alert">{intervalError || error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="primary-button" disabled={!title.trim() || !durationMinutes}>
          Crear tarea y agendar
        </button>
      </div>
    </form>
  )
}