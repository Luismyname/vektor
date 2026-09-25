export default function HabitBlock({ entry, habit, onStatusChange, onDragStart, onDurationChange, onDelete }) {
  if (!habit) return null
  const startMinutes = Number(entry.start_time.slice(0, 2)) * 60 + Number(entry.start_time.slice(3, 5))
  const endMinutes = Number(entry.end_time.slice(0, 2)) * 60 + Number(entry.end_time.slice(3, 5))
  const duration = Math.max(endMinutes - startMinutes, 30)
  return (
    <article style={{ '--start-hour': startMinutes / 60, '--block-height': `${Math.round(duration / 60 * 48)}px` }} className={`weekly-block weekly-habit-block status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)}>
      <strong>{habit.title}</strong>
      <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      <div className="weekly-block-actions">
        <select value={duration} onChange={(event) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${habit.title}`}>
          <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
        </select>
        <select value={entry.status} onChange={(event) => onStatusChange(entry, event.target.value)} aria-label={`Estado de ${habit.title}`}>
          <option value="scheduled">Programado</option><option value="completed">Completado</option><option value="failed">Fallido</option><option value="moved">Movido</option>
        </select>
      </div>
      <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar tarea</button>
    </article>
  )
}