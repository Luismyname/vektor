import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSleepRecords } from '../../../hooks/useSleepRecords'
import type { SleepRecordInput } from '../../../services/sleep'

interface SleepRecordModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
}

function getLocalDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatSleepDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function SleepRecordModal({ isOpen, onClose, userId }: SleepRecordModalProps) {
  const [sleepDate, setSleepDate] = useState(getLocalDate)
  const [hoursSlept, setHoursSlept] = useState('')
  const [sleepQuality, setSleepQuality] = useState('7')
  const [sleepMedication, setSleepMedication] = useState('false')
  const [notes, setNotes] = useState('')
  const [sleepStart, setSleepStart] = useState('')
  const [sleepEnd, setSleepEnd] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const {
    record,
    history,
    loadingRecord,
    loadingHistory,
    saving,
    recordLoadError,
    error,
    loadRecord,
    saveRecord,
    updateRecord,
  } = useSleepRecords(userId)

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
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setHoursSlept(record ? String(record.hours_slept) : '')
    setSleepQuality(record ? String(record.sleep_quality) : '7')
    setSleepMedication(record ? String(record.sleep_medication) : 'false')
    setNotes(record?.notes || '')
    setSleepStart(record?.sleep_start?.slice(0, 5) || '')
    setSleepEnd(record?.sleep_end?.slice(0, 5) || '')
  }, [record, sleepDate])

  if (!isOpen) return null

  async function handleDateChange(date: string) {
    setSleepDate(date)
    await loadRecord(date)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: SleepRecordInput = {
      sleep_date: sleepDate,
      hours_slept: Number(hoursSlept),
      sleep_quality: Number(sleepQuality),
      sleep_medication: sleepMedication === 'true',
      notes,
      sleep_start: sleepStart || null,
      sleep_end: sleepEnd || null,
    }

    if (record?.sleep_date === sleepDate) {
      await updateRecord(record.id, input)
    } else {
      await saveRecord(input)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-panel weekly-time-slot-modal sleep-record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sleep-record-title"
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">VEKTOR / DESCANSO</p>
            <h3 id="sleep-record-title">Registrar sueño</h3>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <form className="create-form" aria-label="Registro de sueño" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sleep-date">Fecha del sueño</label>
            <input
              id="sleep-date"
              className="form-input"
              type="date"
              value={sleepDate}
              disabled={loadingRecord}
              onChange={(event) => void handleDateChange(event.target.value)}
              required
            />
          </div>

          {loadingRecord ? (
            <p role="status">Cargando registro…</p>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="sleep-hours">Horas dormidas</label>
                <input
                  id="sleep-hours"
                  className="form-input"
                  type="number"
                  min="0.1"
                  max="24"
                  step="0.1"
                  value={hoursSlept}
                  onChange={(event) => setHoursSlept(event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sleep-quality">Calidad del sueño (1-10)</label>
                <select
                  id="sleep-quality"
                  className="form-select"
                  value={sleepQuality}
                  onChange={(event) => setSleepQuality(event.target.value)}
                  required
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1)
                    .map((quality) => <option key={quality} value={quality}>{quality}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sleep-medication">¿Tomaste medicación para dormir?</label>
                <select
                  id="sleep-medication"
                  className="form-select"
                  value={sleepMedication}
                  onChange={(event) => setSleepMedication(event.target.value)}
                  required
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sleep-start">Hora de inicio (opcional)</label>
                <input id="sleep-start" className="form-input" type="time" value={sleepStart} onChange={(event) => setSleepStart(event.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="sleep-end">Hora de fin (opcional)</label>
                <input id="sleep-end" className="form-input" type="time" value={sleepEnd} onChange={(event) => setSleepEnd(event.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="sleep-notes">Notas (opcional)</label>
                <textarea id="sleep-notes" className="form-textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </>
          )}

          {recordLoadError && (
            <div>
              <p role="alert">No se pudo comprobar si ya existe un registro para esta fecha. Reintenta antes de guardar.</p>
              <button type="button" className="secondary-button" onClick={() => void loadRecord(sleepDate)}>
                Reintentar consulta
              </button>
            </div>
          )}
          {error && !recordLoadError && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cerrar</button>
            <button type="submit" className="primary-button" disabled={saving || loadingRecord || recordLoadError || !userId}>
              {saving ? 'Guardando…' : record?.sleep_date === sleepDate ? 'Actualizar registro' : 'Guardar registro'}
            </button>
          </div>
        </form>

        <section className="sleep-record-history" aria-labelledby="sleep-history-title">
          <h4 id="sleep-history-title">Historial reciente</h4>
          {loadingHistory ? (
            <p role="status">Cargando historial…</p>
          ) : history.length ? (
            <ul>
              {history.map((item) => (
                <li key={item.id}>
                  <button type="button" disabled={loadingRecord} onClick={() => void handleDateChange(item.sleep_date)}>
                    {formatSleepDate(item.sleep_date)} · {item.hours_slept} h
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aún no hay registros de sueño.</p>
          )}
        </section>
      </div>
    </div>
  )
}
