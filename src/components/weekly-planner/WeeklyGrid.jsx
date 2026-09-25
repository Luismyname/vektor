import DayColumn from './DayColumn'

export default function WeeklyGrid({ dates, currentTime, today, entries, taskById, habitById, focusSessions, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClearDay }) {
  return (
    <div className="weekly-grid-wrap">
      <div className="weekly-grid-spacer" aria-hidden="true" />
      <div className="weekly-header">
        {dates.map((date) => <div className="weekly-day-header" key={date}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</strong><span>{date.slice(8, 10)}/{date.slice(5, 7)}</span><button type="button" onClick={() => onClearDay(date)}>Limpiar día</button></div>)}
      </div>
      <div className="weekly-time-axis" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <span key={index}>{String(index + 5).padStart(2, '0')}:00</span>)}</div>
      <div className="weekly-grid">
        {dates.map((date) => <DayColumn key={date} date={date} today={today} currentTime={currentTime} entries={entries.filter((entry) => entry.date === date)} taskById={taskById} habitById={habitById} sessions={focusSessions.filter((session) => session.started_at?.slice(0, 10) === date)} onDropTask={onDropTask} onDragStart={onDragStart} onStatusChange={onStatusChange} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} />)}
      </div>
    </div>
  )
}