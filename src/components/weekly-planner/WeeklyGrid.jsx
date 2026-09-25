import DayColumn from './DayColumn'

export default function WeeklyGrid({ dates, entries, taskById, habitById, focusSessions, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClearDay }) {
  return (
    <div className="weekly-grid-wrap">
      <div className="weekly-time-axis" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <span key={index}>{String(index + 5).padStart(2, '0')}:00</span>)}</div>
      <div className="weekly-grid">
        {dates.map((date) => <DayColumn key={date} date={date} entries={entries.filter((entry) => entry.date === date)} taskById={taskById} habitById={habitById} sessions={focusSessions.filter((session) => session.started_at?.slice(0, 10) === date)} onDropTask={onDropTask} onDragStart={onDragStart} onStatusChange={onStatusChange} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} onClearDay={onClearDay} />)}
      </div>
    </div>
  )
}