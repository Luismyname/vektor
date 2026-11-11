import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useEnergyPopover } from '../../hooks/useEnergyPopover'
import { recordObligationImpact } from '../../services/energy-impact-engine'
import { parseTime } from '../../services/weekly-planner'
import type { ObligationSegment, ObligationType } from '../../services/weekly-planner'
import ActivityContextMenu from './ActivityContextMenu'
import WeeklyBlockModal from './WeeklyBlockModal'

export interface ObligationDetails {
  id: string
  title: string
  obligation_type: ObligationType
}

export interface ObligationPlannerEntry {
  id: string
  date: string
  start_time: string
  end_time: string
  task_id: string | null
  habit_id: string | null
  status: string
  obligation_id: string
  obligation_occurrence_date: string
  obligation: ObligationDetails
}

interface ObligationBlockProps {
  entry: ObligationPlannerEntry
  segment: ObligationSegment
  onDragStart: (event: DragEvent<HTMLElement>, entry: ObligationPlannerEntry) => void
  onStatusChange: (entry: ObligationPlannerEntry, status: string) => void
  onDelete: (entryId: string) => void
  onDurationChange: (entry: ObligationPlannerEntry, duration: number) => void
  onOccurrenceUpdate: (entry: ObligationPlannerEntry, changes: { start_time: string; end_time: string }) => Promise<unknown>
  onObligationUpdate: (id: string, changes: { title: string }) => Promise<boolean>
}

const TYPE_LABELS: Record<ObligationType, string> = {
  work: 'Trabajo',
  class: 'Clase',
  sleep: 'Sueño',
  appointment: 'Cita fija',
}

function getDuration(start: string, end: string) {
  const startTime = parseTime(start)
  const endTime = parseTime(end)
  const startMinutes = startTime.hours * 60 + startTime.minutes
  const endMinutes = endTime.hours * 60 + endTime.minutes
  return Math.max((endMinutes - startMinutes + 1440) % 1440, 30)
}

function formatTime(time: string) {
  const { hours, minutes } = parseTime(time)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export default function ObligationBlock({ entry, segment, onDragStart, onStatusChange, onDelete, onDurationChange, onOccurrenceUpdate, onObligationUpdate }: ObligationBlockProps) {
  const { user } = useAuth()
  const { openEnergyPopover } = useEnergyPopover()
  const articleRef = useRef<HTMLElement>(null)
  const finishEnergyTriggerRef = useRef<HTMLButtonElement>(null)
  const impactIdRef = useRef<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [title, setTitle] = useState(entry.obligation.title)
  const [startTime, setStartTime] = useState(formatTime(entry.start_time))
  const [endTime, setEndTime] = useState(formatTime(entry.end_time))
  const [formError, setFormError] = useState('')
  const durationMinutes = getDuration(entry.start_time, entry.end_time)
  const visibleDuration = Math.max(segment.endMinutes - segment.startMinutes, 30)
  const segmentLabel = segment.label
  const style = {
    '--start-hour': segment.startMinutes / 60,
    '--block-height': `${Math.round(visibleDuration / 60 * 48)}px`,
  } as CSSProperties & { '--start-hour': number; '--block-height': string }

  useEffect(() => {
    setTitle(entry.obligation.title)
    setStartTime(formatTime(entry.start_time))
    setEndTime(formatTime(entry.end_time))
  }, [entry.obligation.title, entry.start_time, entry.end_time])

  function handleOpenEnergyPopover(phase: 'start' | 'finish', triggerRef = articleRef) {
    if (!user?.id) return
    openEnergyPopover({
      value: null,
      label: phase === 'start' ? 'Energía antes de la obligación' : 'Energía después de la obligación',
      triggerRef,
      onSave: async (energy) => {
        const result = await recordObligationImpact(
          user.id,
          entry.obligation_id,
          phase,
          energy,
          phase === 'finish' ? impactIdRef.current || undefined : undefined,
        )
        if (result.error) throw result.error
        if (phase === 'start') impactIdRef.current = result.data?.id || null
        else impactIdRef.current = null
      },
    })
  }

  async function handleSaveDetails() {
    const nextTitle = title.trim()
    if (!nextTitle || startTime === endTime || (endTime < startTime && entry.obligation.obligation_type !== 'sleep')) {
      setFormError('Revisa el nombre y el intervalo. Solo el sueño puede cruzar la medianoche.')
      return
    }
    setFormError('')
    const updated = await onObligationUpdate(entry.obligation_id, { title: nextTitle })
    if (!updated) return
    const savedEntry = await onOccurrenceUpdate(entry, { start_time: startTime, end_time: endTime })
    if (!savedEntry) return
    setShowModal(false)
  }

  function handleActivityKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setShowContextMenu(true)
    }
  }

  return (
    <>
      <article
        ref={articleRef}
        style={style}
        className={`weekly-block weekly-obligation-block obligation-${entry.obligation.obligation_type} obligation-segment-${segment.segment}`}
        draggable
        onDragStart={(event) => {
          onDragStart(event, entry)
        }}
        onClick={() => setShowContextMenu(true)}
        onKeyDown={handleActivityKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Acciones de obligación ${entry.obligation.title}, ${segmentLabel}`}
        aria-haspopup="menu"
        aria-expanded={showContextMenu}
      >
        <strong>{entry.obligation.title}</strong>
        <span>{segmentLabel}</span>
      </article>
      <ActivityContextMenu
        open={showContextMenu}
        label={entry.obligation.title}
        anchorRef={articleRef}
        completeLabel="Marcar como completada"
        onClose={() => setShowContextMenu(false)}
        onComplete={() => onStatusChange(entry, 'completed')}
        onEnergy={() => handleOpenEnergyPopover('start')}
        onEdit={() => setShowModal(true)}
        onDelete={() => onDelete(entry.id)}
      />
      {showModal && (
        <WeeklyBlockModal
          title={entry.obligation.title}
          start={formatTime(entry.start_time)}
          end={formatTime(entry.end_time)}
          status={entry.status}
          statusLabel={TYPE_LABELS[entry.obligation.obligation_type]}
          onClose={() => setShowModal(false)}
        >
          <label className="weekly-modal-field">Nombre
            <input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Nombre de la obligación" />
          </label>
          <label className="weekly-modal-field">Inicio
            <input className="form-input" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} aria-label="Hora de inicio" />
          </label>
          <label className="weekly-modal-field">Fin
            <input className="form-input" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} aria-label="Hora de finalización" />
          </label>
          <label className="weekly-modal-field">Duración
            <select value={durationMinutes} onChange={(event) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${entry.obligation.title}`}>
              {[30, 60, 90, 120, 240, 480].map((duration) => <option key={duration} value={duration}>{duration < 60 ? `${duration} min` : `${duration / 60} h`}</option>)}
            </select>
          </label>
          <button
            ref={finishEnergyTriggerRef}
            type="button"
            onClick={() => handleOpenEnergyPopover('finish', finishEnergyTriggerRef)}
            disabled={!user?.id}
          >
            Registrar energía final
          </button>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="weekly-modal-actions"><button type="button" onClick={handleSaveDetails}>Guardar cambios</button></div>
        </WeeklyBlockModal>
      )}
    </>
  )
}
