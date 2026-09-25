import HourSlot from './HourSlot'
import TaskBlock from './TaskBlock'
import HabitBlock from './HabitBlock'

const HOURS = Array.from({ length: 19 }, (_, index) => index + 5)

export default function DayColumn({ date, entries, taskById, habitById, sessions, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClearDay }) {
  return (
    <section className="weekly-day-column" aria-labelledby={`day-${date}`}>
      <header className="weekly-day-header"><strong id={`day-${date}`}>{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</strong><span>{date.slice(8, 10)}/{date.slice(5, 7)}</span><button type="button" onClick={() => onClearDay(date)}>Limpiar día</button></header>
      <div className="weekly-day-body">
        {HOURS.map((hour) => <HourSlot key={hour} date={date} hour={hour} onDropTask={onDropTask} />)}
        {entries.filter((entry) => entry.task_id).map((entry) => <TaskBlock key={entry.id} entry={entry} task={taskById[entry.task_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} />)}
        {entries.filter((entry) => entry.habit_id).map((entry) => <HabitBlock key={entry.id} entry={entry} habit={habitById[entry.habit_id]} onStatusChange={onStatusChange} onDragStart={onDragStart} onDurationChange={onDurationChange} onDelete={onDelete} />)}
        {sessions.map((session) => <div key={`focus-${session.id}`} className="weekly-focus-marker" title="Sesión de enfoque completada">Enfoque {session.duration ? `${session.duration} min` : 'completado'}</div>)}
      </div>
    </section>
  )
}