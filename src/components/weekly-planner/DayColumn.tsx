import type { DragEvent } from 'react'
import type { Habit, Task } from '../../types'
import HourSlot from './HourSlot'
import TaskBlock from './TaskBlock'
import HabitBlock from './HabitBlock'
import ReminderBlock from './ReminderBlock'
import ObligationBlock from './ObligationBlock'
import { getObligationSegments } from '../../services/weekly-planner'
import type { PlannerObligation } from '../../services/weekly-planner'

type PlannerTask = Pick<Task, 'id' | 'title'> & Partial<Task>

interface PlannerEntry {
  id: string
  date: string
  start_time: string
  end_time: string
  task_id: string | null
  habit_id: string | null
  obligation_id?: string | null
  obligation_occurrence_date?: string | null
  obligation?: Pick<PlannerObligation, 'id' | 'title' | 'obligation_type'> | null
  status: string
  notes?: string | null
  energy_level?: number | null
  is_creative_block?: boolean
}

interface FocusSession {
  id: string
  status: string
  duration_minutes?: number
}

type ObligationEntry = PlannerEntry & {
  obligation_id: string
  obligation_occurrence_date: string
  obligation: Pick<PlannerObligation, 'id' | 'title' | 'obligation_type'>
}

function isObligationEntry(entry: PlannerEntry): entry is ObligationEntry {
  return entry.task_id === null
    && entry.habit_id === null
    && Boolean(entry.obligation_id && entry.obligation_occurrence_date && entry.obligation)
}

interface DayColumnProps {
  date: string
  today: string
  currentTime: Date
  entries: PlannerEntry[]
  taskById: Record<string, PlannerTask | undefined>
  habitById: Record<string, Habit | undefined>
  sessions: FocusSession[]
  onDropTask: (itemId: string, entryId: string, itemType: 'task' | 'habit' | 'obligation', date: string, startTime: string, endTime: string) => void
  onDragStart: (event: DragEvent<HTMLElement>, entry: PlannerEntry) => void
  onStatusChange: (entry: PlannerEntry, status: string) => void
  onDurationChange: (entry: PlannerEntry, duration: number) => void
  onAutoReschedule: (taskId: string) => void
  onDelete: (entryId: string) => void
  onTaskUpdate: (taskId: string, changes: Partial<Task>) => void | Promise<void>
  onClickSlot: (date: string, startTime: string, endTime: string) => void
  userId: string
  onStartTask: (taskId: string) => void
  onObligationUpdate: (id: string, changes: { title: string }) => Promise<boolean>
  onObligationOccurrenceUpdate: (entry: PlannerEntry, changes: { start_time: string; end_time: string }) => Promise<unknown>
}

// Horas visibles de cada columna, desde las 00:00 hasta las 23:00.
const HOURS = Array.from({ length: 24 }, (_, index) => index)

// Traduce el estado de una sesión enfocada al rótulo del marcador semanal.
function getFocusLabel(session: FocusSession) {
  if (session.status === 'running') return 'Enfoque en curso'
  if (session.status === 'paused') return 'Enfoque en pausa'
  if (session.status === 'interrupted') return `Enfoque interrumpido${session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}`
  return `Enfoque ${session.duration_minutes ? `${session.duration_minutes} min` : 'completado'}`
}

// Renderiza slots y bloques de un día junto al indicador de hora actual.
export default function DayColumn({ date, today, currentTime, entries, taskById, habitById, sessions, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClickSlot, userId, onStartTask, onObligationUpdate, onObligationOccurrenceUpdate }: DayColumnProps) {
  const startHour = 0
  const endHour = 24
  const totalHours = endHour - startHour
  const hours = currentTime.getHours() + currentTime.getMinutes() / 60
  const relative = Math.max(0, Math.min(hours - startHour, totalHours))
  const percent = (relative / totalHours) * 100

  return (
    <section className="weekly-day-column" aria-label={date}>
      <div className="weekly-day-body">
        {HOURS.map((hour) => <HourSlot key={hour} date={date} hour={hour} onDropTask={onDropTask} onClick={onClickSlot} />)}
        {date === today && <div className="current-time-line" style={{ top: `${percent}%` }} />}
        {entries.filter((entry) => entry.task_id).map((entry) => <TaskBlock key={entry.id} entry={entry} task={taskById[entry.task_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} userId={userId} onStartTask={onStartTask} />)}
        {entries.filter((entry) => entry.habit_id).map((entry) => <HabitBlock key={entry.id} entry={entry} habit={habitById[entry.habit_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onDelete={onDelete} />)}
        {entries.filter((entry) => !entry.task_id && !entry.habit_id && !entry.obligation_id && !entry.is_creative_block).map((entry) => <ReminderBlock key={entry.id} entry={entry} reminder={{ title: entry.notes?.trim() || 'Evento fijo' }} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onDelete={onDelete} />)}
        {entries.filter(isObligationEntry).flatMap((entry) =>
          getObligationSegments(entry)
            .filter((segment) => segment.date === date)
            .map((segment) => (
              <ObligationBlock
                key={`${entry.id}-${segment.segment}`}
                entry={entry}
                segment={segment}
                onDragStart={onDragStart}
                onDurationChange={onDurationChange}
                onOccurrenceUpdate={onObligationOccurrenceUpdate}
                onObligationUpdate={onObligationUpdate}
              />
            )),
        )}
        {sessions.map((session) => <div key={`focus-${session.id}`} className="weekly-focus-marker" title={getFocusLabel(session)}>{getFocusLabel(session)}</div>)}
      </div>
    </section>
  )
}