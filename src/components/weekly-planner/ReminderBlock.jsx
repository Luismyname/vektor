import { useState } from 'react'
import WeeklyBlockModal from './WeeklyBlockModal'

// Etiquetas para los estados de recordatorios
const STATUS_LABELS = { scheduled: 'Programado', completed: 'Completado', failed: 'Fallido', moved: 'Movido' }

// Renderiza un bloque de recordatorio (evento fijo) con indicador de candado
export default function ReminderBlock({ entry, reminder, onStatusChange, onDragStart, onDurationChange, onDelete }) {
  const [showModal, setShowModal] = useState(false)
  if (!reminder) return null
  
  const startMinutes = Number(entry.start_time.slice(0, 2)) * 60 + Number(entry.start_time.slice(3, 5))
  const endMinutes = Number(entry.end_time.slice(0, 2)) * 60 + Number(entry.end_time.slice(3, 5))
  const duration = Math.max(endMinutes - startMinutes, 30)
  
  return (
    <>
      <article 
        style={{ 
          '--start-hour': startMinutes / 60, 
          '--block-height': `${Math.round(duration / 60 * 70)}px`
        }} 
        className={`weekly-block weekly-reminder-block status-${entry.status}`}
        draggable 
        onDragStart={(event) => onDragStart(event, entry)} 
        onClick={() => setShowModal(true)} 
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setShowModal(true) }} 
        role="button" 
        tabIndex={0} 
        aria-label={`Abrir recordatorio ${reminder.title} (evento fijo)`}
      >
        <strong>{reminder.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      </article>
      {showModal && <WeeklyBlockModal 
        title={reminder.title} 
        description={reminder.description} 
        start={entry.start_time.slice(0, 5)} 
        end={entry.end_time.slice(0, 5)} 
        status={entry.status} 
        statusLabel={STATUS_LABELS[entry.status]} 
        onClose={() => setShowModal(false)}
      >
        <label className="weekly-modal-field">Duración
          <select value={duration} onChange={(event) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${reminder.title}`}>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </label>
        <label className="weekly-modal-field">Estado
          <select value={entry.status} onChange={(event) => onStatusChange(entry, event.target.value)} aria-label={`Estado de ${reminder.title}`}>
            <option value="scheduled">Programado</option>
            <option value="completed">Completado</option>
            <option value="failed">Fallido</option>
            <option value="moved">Movido</option>
          </select>
        </label>
        <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Eliminar recordatorio</button>
      </WeeklyBlockModal>}
    </>
  )
}