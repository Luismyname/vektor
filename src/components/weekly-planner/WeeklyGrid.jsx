import { useEffect, useRef } from 'react'
import DayColumn from './DayColumn'

// Compone las 24 horas y siete columnas conectadas a las acciones del padre.
export default function WeeklyGrid({ dates, currentTime, today, entries, taskById, habitById, focusSessions, energyByDayHour, onDropTask, onDragStart, onStatusChange, onDurationChange, onAutoReschedule, onDelete, onTaskUpdate, onClearDay, onClickSlot }) {
  const gridRef = useRef(null)
  const currentHour = currentTime.getHours()
  const weekStart = dates[0]

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (gridRef.current) gridRef.current.scrollTop = Math.max(currentHour - 1, 0) * 70
    })

    return () => cancelAnimationFrame(frame)
  }, [currentHour, weekStart])

  return (
    <div className="weekly-grid-wrap" ref={gridRef} aria-label="Agenda semanal, desplázate para ver todas las horas">
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