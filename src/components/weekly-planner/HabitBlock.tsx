import { useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ChangeEvent, type RefObject } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useEnergyPopover } from '../../hooks/useEnergyPopover'
import { saveEnergyAtHabitCompletion, saveEnergyAtMoment } from '../../services/energy'
import { recordHabitImpact } from '../../services/energy-impact-engine'
import ActivityContextMenu from './ActivityContextMenu'
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
  const articleRef = useRef<HTMLElement>(null)
  const statusTriggerRef = useRef<HTMLSelectElement>(null)
  const impactIdRef = useRef<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  if (!habit) return null
  const startTime = parseTime(entry.start_time)
  const endTime = parseTime(entry.end_time)
  const startMinutes = startTime.hours * 60 + startTime.minutes
  const endMinutes = endTime.hours * 60 + endTime.minutes
  const duration = Math.max(endMinutes - startMinutes, 30)
  const openEnergyCapture = (
    phase: 'start' | 'finish',
    triggerRef = articleRef,
    recordCompletedImpact = entry.status === 'completed',
  ) => {
    if (!user?.id) return
    openEnergyPopover({
      value: entry.energy_level,
      label: phase === 'start' ? 'Energía inicial' : 'Energía al finalizar',
      triggerRef,
      onSave: async (energy) => {
        const { error } = phase === 'start'
          ? await saveEnergyAtMoment(user.id, energy, 'habit_start')
          : await saveEnergyAtHabitCompletion(user.id, energy)
        if (error) throw error
        if (phase === 'start') {
          const impact = await recordHabitImpact(user.id, habit.id, 'start', energy)
          if (impact.error) throw impact.error
          impactIdRef.current = impact.data?.id || null
        } else if (recordCompletedImpact) {
          const impact = await recordHabitImpact(user.id, habit.id, 'finish', energy, impactIdRef.current || undefined)
          if (impact.error) throw impact.error
          impactIdRef.current = null
        }
      },
    })
  }
  const changeStatus = (status: string, triggerRef: RefObject<HTMLElement | null> = articleRef) => {
    onStatusChange(entry, status)
    if (!['completed', 'failed', 'moved'].includes(status)) return
    openEnergyCapture('finish', triggerRef, status === 'completed')
  }
  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation()
    changeStatus(event.target.value)
  }
  const handleActivityKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setShowContextMenu(true)
    }
  }
  return (
    <>
      <article ref={articleRef} style={{ '--start-hour': startMinutes / 60, '--block-height': `${Math.round(duration / 60 * 48)}px` } as CSSProperties & { '--start-hour': number; '--block-height': string }} className={`weekly-block weekly-habit-block status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)} onClick={() => setShowContextMenu(true)} onKeyDown={handleActivityKeyDown} role="button" tabIndex={0} aria-label={`Acciones de hábito ${habit.title}`} aria-haspopup="menu" aria-expanded={showContextMenu}>
        <strong>{habit.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      </article>
      <ActivityContextMenu
        open={showContextMenu}
        label={habit.title}
        anchorRef={articleRef}
        completeLabel="Marcar como completado"
        onClose={() => setShowContextMenu(false)}
        onComplete={() => changeStatus('completed', articleRef)}
        onEnergy={() => openEnergyCapture(entry.status === 'scheduled' ? 'start' : 'finish')}
        onEdit={() => setShowModal(true)}
        onDelete={() => onDelete(entry.id)}
      />
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