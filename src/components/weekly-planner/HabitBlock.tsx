import { useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ChangeEvent, type MouseEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useEnergyPopover } from '../../hooks/useEnergyPopover'
import { saveEnergyAtHabitCompletion, saveEnergyAtMoment } from '../../services/energy'
import { recordHabitImpact } from '../../services/energy-impact-engine'
import WeeklyBlockModal from './WeeklyBlockModal'
import { parseTime } from '../../services/weekly-planner'
import type { Habit } from '../../types'

interface PlannerEntry {
  id: string
  start_time: string
  end_time: string
  status: string
  energy_level?: number | null
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
  const { user } = useAuth()
  const { openEnergyPopover } = useEnergyPopover()
  const energyTriggerRef = useRef<HTMLButtonElement>(null)
  const statusTriggerRef = useRef<HTMLSelectElement>(null)
  const impactIdRef = useRef<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  if (!habit) return null
  const startTime = parseTime(entry.start_time)
  const endTime = parseTime(entry.end_time)
  const startMinutes = startTime.hours * 60 + startTime.minutes
  const endMinutes = endTime.hours * 60 + endTime.minutes
  const duration = Math.max(endMinutes - startMinutes, 30)
  const handleOpenEnergyPopover = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (entry.status !== 'scheduled' || !user?.id) return
    openEnergyPopover({
      value: entry.energy_level ?? 5,
      label: 'Energía inicial',
      triggerRef: energyTriggerRef,
      onSave: async (energy) => {
        const { error } = await saveEnergyAtMoment(user.id, energy, 'habit_start')
        if (error) throw error
        const impact = await recordHabitImpact(user.id, habit.id, 'start', energy)
        if (impact.error) throw impact.error
        impactIdRef.current = impact.data?.id || null
      },
    })
  }
  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation()
    const status = event.target.value
    onStatusChange(entry, status)
    if (!['completed', 'failed', 'moved'].includes(status) || !user?.id) return
    openEnergyPopover({
      value: entry.energy_level ?? 5,
      label: 'Energía al finalizar',
      triggerRef: statusTriggerRef,
      onSave: async (energy) => {
        const { error } = await saveEnergyAtHabitCompletion(user.id, energy)
        if (error) throw error
        if (status === 'completed') {
          const impact = await recordHabitImpact(user.id, habit.id, 'finish', energy, impactIdRef.current || undefined)
          if (impact.error) throw impact.error
          impactIdRef.current = null
        }
      },
    })
  }
  return (
    <>
      <article style={{ '--start-hour': startMinutes / 60, '--block-height': `${Math.round(duration / 60 * 48)}px` } as CSSProperties & { '--start-hour': number; '--block-height': string }} className={`weekly-block weekly-habit-block status-${entry.status}`} draggable onDragStart={(event) => {
        if (energyTriggerRef.current?.contains(event.target as Node)) {
          event.preventDefault()
          return
        }
        onDragStart(event, entry)
      }} onClick={() => setShowModal(true)} onKeyDown={(event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Enter' || event.key === ' ') setShowModal(true) }} role="button" tabIndex={0} aria-label={`Abrir hábito ${habit.title}`}>
        <strong>{habit.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
        {entry.status === 'scheduled' && (
          <button
            ref={energyTriggerRef}
            type="button"
            className="task-energy-trigger"
            onClick={handleOpenEnergyPopover}
            aria-label="Registrar energía inicial"
            title="Registrar energía inicial"
          >
            ⚡
          </button>
        )}
      </article>
      {showModal && <WeeklyBlockModal title={habit.title} description={habit.description} start={entry.start_time.slice(0, 5)} end={entry.end_time.slice(0, 5)} status={entry.status} statusLabel={STATUS_LABELS[entry.status]} onClose={() => setShowModal(false)}>
        <label className="weekly-modal-field">Duración
          <select value={duration} onChange={(event: ChangeEvent<HTMLSelectElement>) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${habit.title}`}>
            <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
          </select>
        </label>
        <label className="weekly-modal-field">Estado
          <select ref={statusTriggerRef} value={entry.status} onChange={handleStatusChange} aria-label={`Estado de ${habit.title}`}>
            <option value="scheduled">Programado</option><option value="completed">Completado</option><option value="failed">Fallido</option><option value="moved">Movido</option>
          </select>
        </label>
        <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar hábito</button>
      </WeeklyBlockModal>}
    </>
  )
}