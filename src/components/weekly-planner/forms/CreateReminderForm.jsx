import { useState, useEffect } from 'react'

export default function CreateReminderForm({ onSubmit, onCancel, initialDuration = 30 }) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [error, setError] = useState('')

  useEffect(() => {
    setDuration(initialDuration)
  }, [initialDuration])

  const durations = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El texto del recordatorio es obligatorio')
      return
    }
    onSubmit({
      title: title.trim(),
      duration: Number(duration)
    })
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="reminder-title">Recordatorio *</label>
        <input
          id="reminder-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Llamar a mamá, Tomar agua, Reunión equipo..."
          autoFocus
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="reminder-duration">Duración (minutos)</label>
        <select
          id="reminder-duration"
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

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="primary-button" disabled={!title.trim()}>
          Crear recordatorio
        </button>
      </div>
    </form>
  )
}