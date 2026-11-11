import { useState, type FormEvent } from 'react'
import type { ObligationType } from '../../../services/weekly-planner'

export interface ObligationFormData {
  title: string
  obligationType: ObligationType
  startTime: string
  endTime: string
  recurrence: 'once' | 'weekly'
  byDay: number[]
  date: string
}

interface ObligationFormProps {
  date: string
  startTime: string
  endTime: string
  onSubmit: (data: ObligationFormData) => void
  onCancel: () => void
}

const WEEKDAYS = [
  ['L', 'Lunes'],
  ['M', 'Martes'],
  ['X', 'Miércoles'],
  ['J', 'Jueves'],
  ['V', 'Viernes'],
  ['S', 'Sábado'],
  ['D', 'Domingo'],
] as const

function getIsoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

export default function ObligationForm({ date, startTime, endTime, onSubmit, onCancel }: ObligationFormProps) {
  const [title, setTitle] = useState('')
  const [obligationType, setObligationType] = useState<ObligationType>('work')
  const [start, setStart] = useState(startTime)
  const [end, setEnd] = useState(endTime)
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('once')
  const [byDay, setByDay] = useState([getIsoWeekday(date)])
  const [error, setError] = useState('')
  const isOvernight = end <= start

  function toggleDay(day: number) {
    setByDay((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((left, right) => left - right))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    if (start === end || (isOvernight && obligationType !== 'sleep')) {
      setError('Solo el horario de sueño puede cruzar la medianoche.')
      return
    }
    if (recurrence === 'weekly' && byDay.length === 0) {
      setError('Selecciona al menos un día para repetir.')
      return
    }
    onSubmit({
      title: title.trim(),
      obligationType,
      startTime: start,
      endTime: end,
      recurrence,
      byDay: recurrence === 'weekly' ? byDay : [],
      date,
    })
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="obligation-title">Nombre de la obligación</label>
        <input id="obligation-title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej.: Trabajo, clase de matemáticas" required />
      </div>
      <div className="form-group">
        <label htmlFor="obligation-type">Tipo</label>
        <select id="obligation-type" className="form-select" value={obligationType} onChange={(event) => setObligationType(event.target.value as ObligationType)}>
          <option value="work">Trabajo</option>
          <option value="class">Clase</option>
          <option value="sleep">Dormir</option>
          <option value="appointment">Cita fija</option>
        </select>
      </div>
      <div className="form-group obligation-time-fields">
        <label htmlFor="obligation-start">Desde</label>
        <input id="obligation-start" className="form-input" type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
        <label htmlFor="obligation-end">Hasta</label>
        <input id="obligation-end" className="form-input" type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
        {isOvernight && obligationType === 'sleep' && <span>El bloque continúa al día siguiente.</span>}
      </div>
      <div className="form-group">
        <label htmlFor="obligation-recurrence">Repetición</label>
        <select id="obligation-recurrence" className="form-select" value={recurrence} onChange={(event) => setRecurrence(event.target.value as 'once' | 'weekly')}>
          <option value="once">No repetir</option>
          <option value="weekly">Cada semana</option>
        </select>
      </div>
      {recurrence === 'weekly' && (
        <fieldset className="obligation-weekdays">
          <legend>Repetir los días</legend>
          {WEEKDAYS.map(([shortLabel, label], index) => {
            const day = index + 1
            return (
              <label key={day}>
                <input type="checkbox" checked={byDay.includes(day)} onChange={() => toggleDay(day)} />
                <span aria-label={label}>{shortLabel}</span>
              </label>
            )
          })}
        </fieldset>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary-button">Crear obligación</button>
      </div>
    </form>
  )
}
