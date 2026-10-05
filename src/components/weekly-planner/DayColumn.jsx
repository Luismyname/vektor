import HourSlot from './HourSlot'
import TaskBlock from './TaskBlock'
import HabitBlock from './HabitBlock'

// Horas visibles de cada columna, desde las 05:00 hasta las 22:00.
const HOURS = Array.from({ length: 18 }, (_, index) => index + 5)

// Traduce el estado de una sesión enfocada al rótulo del marcador semanal.
function getFocusLabel(session) {
  if (session.status === 'running') return 'Enfoque en curso'
  if (session.status === 'paused') return 'Enfoque en pausa'
  if (session.status === 'interrupted') return `Enfoque interrumpido${session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}`
  return `Enfoque ${session.duration_minutes ? `${session.duration_minutes} min` : 'completado'}`
}

// Renderiza slots y bloques de un día junto al indicador de hora actual.
export default function DayColumn({ date, today, currentTime, entries, taskById, habitById, sessions, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClickSlot }) {
  const startHour = 5
  const endHour = 23
  const totalHours = endHour - startHour
  const hours = currentTime.getHours() + currentTime.getMinutes() / 60
  const relative = Math.max(0, Math.min(hours - startHour, totalHours))
  const percent = (relative / totalHours) * 100

  return (
    <section className="weekly-day-column" aria-label={date}>
      <div className="weekly-day-body">
        {HOURS.map((hour) => <HourSlot key={hour} date={date} hour={hour} onDropTask={onDropTask} onClick={onClickSlot} />)}
        {date === today && <div className="current-time-line" style={{ top: `${percent}%` }} />}
        {entries.filter((entry) => entry.task_id).map((entry) => <TaskBlock key={entry.id} entry={entry} task={taskById[entry.task_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} />)}
        {entries.filter((entry) => entry.habit_id).map((entry) => <HabitBlock key={entry.id} entry={entry} habit={habitById[entry.habit_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onDelete={onDelete} />)}
        {sessions.map((session) => <div key={`focus-${session.id}`} className="weekly-focus-marker" title={getFocusLabel(session)}>{getFocusLabel(session)}</div>)}
      </div>
    </section>
  )
}