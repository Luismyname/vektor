import { useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ChangeEvent } from 'react'
import WeeklyBlockModal from './WeeklyBlockModal'
import { parseTime } from '../../services/weekly-planner'
import type { Habit } from '../../types'

interface PlannerEntry {
  id: string
  start_time: string
  end_time: string
  status: string
}

interface HabitBlockProps {
  entry: PlannerEntry
  habit?: Habit
  onStatusChange: (entry: PlannerEntry, status: string) => void
  onDragStart: (event: DragEvent<HTMLElement>, entry: PlannerEntry) => void
  onDurationChange: (entry: PlannerEntry, duration: number) => void
  onDelete: (entryId: string) => void
}

// Etiquetas presentadas para los estados persistidos del bloque.
const STATUS_LABELS: Record<string, string> = { scheduled: 'Programado', completed: 'Completado', failed: 'Fallido', moved: 'Movido' }

// Dibuja el bloque de hábito y expone controles de duración, estado y borrado.
export default function HabitBlock({ entry, habit, onStatusChange, onDragStart, onDurationChange, onDelete }: HabitBlockProps) {
  const [showModal, setShowModal] = useState(false)
  if (!habit) return null
  const startTime = parseTime(entry.start_time)
  const endTime = parseTime(entry.end_time)
  const startMinutes = startTime.hours * 60 + startTime.minutes
  const endMinutes = endTime.hours * 60 + endTime.minutes
  const duration = Math.max(endMinutes - startMinutes, 30)
  return (
    <>
      <article style={{ '--start-hour': startMinutes / 60, '--block-height': `${Math.round(duration / 60 * 48)}px` } as CSSProperties & { '--start-hour': number; '--block-height': string }} className={`weekly-block weekly-habit-block status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)} onClick={() => setShowModal(true)} onKeyDown={(event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Enter' || event.key === ' ') setShowModal(true) }} role="button" tabIndex={0} aria-label={`Abrir hábito ${habit.title}`}>
        <strong>{habit.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      </article>
      {showModal && <WeeklyBlockModal title={habit.title} description={habit.description} start={entry.start_time.slice(0, 5)} end={entry.end_time.slice(0, 5)} status={entry.status} statusLabel={STATUS_LABELS[entry.status]} onClose={() => setShowModal(false)}>
        <label className="weekly-modal-field">Duración
          <select value={duration} onChange={(event: ChangeEvent<HTMLSelectElement>) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${habit.title}`}>
            <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
          </select>
        </label>
        <label className="weekly-modal-field">Estado
          <select value={entry.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => onStatusChange(entry, event.target.value)} aria-label={`Estado de ${habit.title}`}>
            <option value="scheduled">Programado</option><option value="completed">Completado</option><option value="failed">Fallido</option><option value="moved">Movido</option>
          </select>
        </label>
        <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar hábito</button>
      </WeeklyBlockModal>}
    </>
  )
}