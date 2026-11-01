import { useState, useRef, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent, type ChangeEvent } from 'react'
import { useEnergyPopover } from '../../hooks/useEnergyPopover'
import { saveEnergyAtTaskStart } from '../../services/energy'
import { parseTime } from '../../services/weekly-planner'
import type { Task } from '../../types'
import WeeklyBlockModal from './WeeklyBlockModal'

interface PlannerEntry {
  id: string
  start_time: string
  end_time: string
  status: string
  energy_level?: number | null
}

type PlannerTask = Pick<Task, 'id' | 'title'> & Partial<Task>

interface TaskBlockProps {
  entry: PlannerEntry
  task?: PlannerTask
  onStatusChange: (entry: PlannerEntry, status: string) => void
  onDragStart: (event: DragEvent<HTMLElement>, entry: PlannerEntry) => void
  onAutoReschedule: (taskId: string) => void
  onDurationChange: (entry: PlannerEntry, duration: number) => void
  onDelete: (entryId: string) => void
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void | Promise<void>
  userId: string
  onStartTask?: (taskId: string) => void
}

// Nombres visibles para los estados posibles de una tarea planificada.
const STATUS_LABELS: Record<string, string> = { scheduled: 'Programada', completed: 'Completada', failed: 'Fallida', moved: 'Pospuesta' }

// Renderiza una tarea posicionada por horario y habilita edición en un modal.
export default function TaskBlock({ entry, task, onStatusChange, onDragStart, onAutoReschedule, onDurationChange, onDelete, onTaskUpdate, userId }: TaskBlockProps) {
  const { openEnergyPopover } = useEnergyPopover()
  const energyTriggerRef = useRef<HTMLButtonElement>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  
  if (!task) return null
  
  const startTime = parseTime(entry.start_time)
  const endTime = parseTime(entry.end_time)
  const startHour = startTime.hours
  const duration = Math.max((endTime.hours * 60 + endTime.minutes) - (startHour * 60 + startTime.minutes), 30)

  // Valida el título y persiste los campos editables de la tarea.
  async function saveTask() {
    const nextTitle = title.trim()
    if (!nextTitle) return
    await onTaskUpdate(task.id, { title: nextTitle, description: description.trim() })
    setIsEditing(false)
  }

  const handleOpenEnergyPopover = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (entry.status !== 'scheduled') return
    openEnergyPopover({
      value: entry.energy_level ?? 5,
      label: 'Energía inicial',
      triggerRef: energyTriggerRef,
      onSave: async (energy) => {
        const { error } = await saveEnergyAtTaskStart(userId, energy)
        if (error) throw error
      },
      disabled: entry.status !== 'scheduled',
    })
  }

  return (
    <>
      <article style={{ '--start-hour': startHour, '--block-height': `${Math.round(duration / 60 * 48)}px` } as CSSProperties & { '--start-hour': number; '--block-height': string }} className={`weekly-block weekly-task-block priority-${task.priority || 'medium'} status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)} onClick={() => setShowModal(true)} onKeyDown={(event: KeyboardEvent<HTMLElement>) => { if (event.key === 'Enter' || event.key === ' ') setShowModal(true) }} role="button" tabIndex={0} aria-label={`Abrir tarea ${task.title}`}>
        <strong>{task.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
        {entry.status === 'scheduled' && (
          <button
            ref={energyTriggerRef}
            type="button"
            className="task-energy-trigger"
            onClick={handleOpenEnergyPopover}
            disabled={entry.status !== 'scheduled'}
            aria-label="Registrar energía inicial"
            title="Registrar energía inicial"
          >
            ⚡
          </button>
        )}
      </article>
      {showModal && <WeeklyBlockModal title={task.title} description={task.description} start={entry.start_time.slice(0, 5)} end={entry.end_time.slice(0, 5)} status={entry.status} statusLabel={STATUS_LABELS[entry.status]} onClose={() => setShowModal(false)}>
        {isEditing ? <div className="weekly-task-edit">
          <input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} aria-label="Título de la tarea" />
          <textarea value={description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)} rows={3} aria-label="Descripción de la tarea" />
          <div className="weekly-modal-actions"><button type="button" onClick={saveTask}>Guardar</button><button type="button" onClick={() => setIsEditing(false)}>Cancelar</button></div>
        </div> : <div className="weekly-modal-actions"><button type="button" onClick={() => setIsEditing(true)}>Editar</button></div>}
        <label className="weekly-modal-field">Duración
          <select value={duration} onChange={(event: ChangeEvent<HTMLSelectElement>) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${task.title}`}>
            <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
          </select>
        </label>
        <label className="weekly-modal-field">Estado
          <select value={entry.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => onStatusChange(entry, event.target.value)} aria-label={`Estado de ${task.title}`}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {entry.status === 'failed' || entry.status === 'moved' ? <button type="button" onClick={() => onAutoReschedule(task.id)}>Reubicar</button> : null}
        <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar tarea</button>
      </WeeklyBlockModal>}
    </>
  )
}