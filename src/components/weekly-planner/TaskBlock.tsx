import { useState, useRef, type CSSProperties, type DragEvent, type KeyboardEvent, type ChangeEvent, type RefObject } from 'react'
import { useEnergyPopover } from '../../hooks/useEnergyPopover'
import { saveEnergyAtTaskEnd, saveEnergyAtTaskStart } from '../../services/energy'
import { recordTaskImpact } from '../../services/energy-impact-engine'
import { parseTime } from '../../services/weekly-planner'
import type { Task } from '../../types'
import ActivityContextMenu from './ActivityContextMenu'
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
  onStartTask?: (entry: PlannerEntry, task: PlannerTask) => void
}

// Nombres visibles para los estados posibles de una tarea planificada.
const STATUS_LABELS: Record<string, string> = { scheduled: 'Programada', completed: 'Completada', failed: 'Fallida', moved: 'Pospuesta' }

// Renderiza una tarea posicionada por horario y habilita edición en un modal.
export default function TaskBlock({ entry, task, onStatusChange, onDragStart, onAutoReschedule, onDurationChange, onDelete, onTaskUpdate, userId, onStartTask }: TaskBlockProps) {
  const { openEnergyPopover } = useEnergyPopover()
  const articleRef = useRef<HTMLElement>(null)
  const statusTriggerRef = useRef<HTMLSelectElement>(null)
  const impactIdRef = useRef<string | null>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
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

  const openEnergyCapture = (
    phase: 'start' | 'finish',
    triggerRef = articleRef,
    recordCompletedImpact = entry.status === 'completed',
  ) => {
    openEnergyPopover({
      value: entry.energy_level,
      label: phase === 'start' ? 'Energía inicial' : 'Energía al finalizar',
      triggerRef,
      onSave: async (energy) => {
        const { error } = phase === 'start'
          ? await saveEnergyAtTaskStart(userId, energy)
          : await saveEnergyAtTaskEnd(userId, energy)
        if (error) throw error
        if (phase === 'start') {
          const impact = await recordTaskImpact(userId, task.id, 'start', energy)
          if (impact.error) throw impact.error
          impactIdRef.current = impact.data?.id || null
        } else if (recordCompletedImpact) {
          const impact = await recordTaskImpact(userId, task.id, 'finish', energy, impactIdRef.current || undefined)
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
      <article ref={articleRef} style={{ '--start-hour': startHour, '--block-height': `${Math.round(duration / 60 * 48)}px` } as CSSProperties & { '--start-hour': number; '--block-height': string }} className={`weekly-block weekly-task-block priority-${task.priority || 'medium'} status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)} onClick={() => setShowContextMenu(true)} onKeyDown={handleActivityKeyDown} role="button" tabIndex={0} aria-label={`Acciones de tarea ${task.title}`} aria-haspopup="menu" aria-expanded={showContextMenu}>
        <strong>{task.title}</strong>
        <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      </article>
      <ActivityContextMenu
        open={showContextMenu}
        label={task.title}
        anchorRef={articleRef}
        showStartAction
        onClose={() => setShowContextMenu(false)}
        onStart={() => onStartTask?.(entry, task)}
        onComplete={() => changeStatus('completed', articleRef)}
        onEnergy={() => openEnergyCapture(entry.status === 'scheduled' ? 'start' : 'finish')}
        onEdit={() => setShowModal(true)}
        onDelete={() => onDelete(entry.id)}
      />
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
          <select ref={statusTriggerRef} value={entry.status} onChange={handleStatusChange} aria-label={`Estado de ${task.title}`}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {entry.status === 'failed' || entry.status === 'moved' ? <button type="button" onClick={() => onAutoReschedule(task.id)}>Reubicar</button> : null}
        <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar tarea</button>
      </WeeklyBlockModal>}
    </>
  )
}