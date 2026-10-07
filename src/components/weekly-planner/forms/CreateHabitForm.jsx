import { useState } from 'react'
import { getTimeRange } from '../../../services/weekly-planner'

// Construye un hábito nuevo junto con su duración e intervalo horario.
export default function CreateHabitForm({ onSubmit, onCancel, initialDuration = 30, initialStartTime = '09:00' }) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(initialDuration)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [error, setError] = useState('')

  const durations = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480]

  // Rechaza nombres vacíos y envía el hábito listo para ser persistido y agendado.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El nombre del hábito es obligatorio')
      return
    }

    const { endTime } = getTimeRange(startTime, Number(duration))

    onSubmit({
      title: title.trim(),
      duration: Number(duration),
      active: true,
      startTime,
      endTime
    })
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="habit-title">Nombre del hábito *</label>
        <input
          id="habit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Meditar, Ejercicio, Lectura..."
          autoFocus
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="habit-start-time">Hora de inicio</label>
        <input
          id="habit-start-time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="form-input"
          min="05:00"
          max="23:00"
        />
      </div>

      <div className="form-group">
        <label htmlFor="habit-duration">Duración (minutos)</label>
        <select
          id="habit-duration"
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
          Crear hábito y agendar
        </button>
      </div>
    </form>
  )
}