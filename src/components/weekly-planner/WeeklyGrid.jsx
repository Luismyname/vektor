import DayColumn from './DayColumn'

// Compone las 24 horas y siete columnas conectadas a las acciones del padre.
export default function WeeklyGrid({ dates, currentTime, today, entries, taskById, habitById, focusSessions, energyByDayHour, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClearDay, onClickSlot }) {
  return (
    <div className="weekly-grid-wrap">
      <div className="weekly-grid-spacer" aria-hidden="true" />
      <div className="weekly-header">
        {dates.map((date) => {
          const energy = Object.values(energyByDayHour?.[date] || {}).filter(Number.isFinite)
          const average = energy.length ? Math.round(energy.reduce((sum, value) => sum + value, 0) / energy.length * 10) : null

          return (
            <div className="weekly-day-header" key={date}>
              <div className="weekly-day-date">
                <strong>{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</strong>
                <span>{date.slice(8, 10)}/{date.slice(5, 7)}</span>
              </div>
              <div className="weekly-day-energy" role="img" aria-label={`${average === null ? 'Sin registros de energía' : `Energía ${average}%`}`}>
                <span className="weekly-day-energy-track" aria-hidden="true">
                  <span style={{ width: `${average === null ? 0 : average}%` }} />
                </span>
                <span>{average === null ? '—' : `${average}%`}</span>
              </div>
              <button type="button" onClick={() => onClearDay(date)}>Limpiar día</button>
            </div>
          )
        })}
      </div>
      <div className="weekly-time-axis" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <span key={index}>{String(index).padStart(2, '0')}:00</span>)}</div>
      <div className="weekly-grid">
        {dates.map((date) => <DayColumn key={date} date={date} today={today} currentTime={currentTime} entries={entries.filter((entry) => entry.date === date)} taskById={taskById} habitById={habitById} sessions={focusSessions.filter((session) => session.started_at?.slice(0, 10) === date)} onDropTask={onDropTask} onDragStart={onDragStart} onStatusChange={onStatusChange} onDurationChange={onDurationChange} onAutoReschedule={onAutoReschedule} onDelete={onDelete} onTaskUpdate={onTaskUpdate} onClickSlot={onClickSlot} />)}
      </div>
    </div>
  )
}