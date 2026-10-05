// Franja horaria que recibe elementos arrastrados y permite abrir el modal de agenda.
export default function HourSlot({ date, hour, onDropTask, onClick }) {
  // Interpreta el elemento arrastrado y lo agenda en el intervalo de una hora.
  function handleDrop(event) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/task')
    const habitId = event.dataTransfer.getData('text/habit')
    const entryId = event.dataTransfer.getData('text/planner-entry')
    const itemId = taskId || habitId
    if (itemId) onDropTask(itemId, entryId, taskId ? 'task' : 'habit', date, `${String(hour).padStart(2, '0')}:00`, `${String(hour + 1).padStart(2, '0')}:00`)
  }

  // Solicita al padre crear un bloque en la franja seleccionada.
  function handleClick() {
    if (onClick) {
      onClick(date, `${String(hour).padStart(2, '0')}:00`, `${String(hour + 1).padStart(2, '0')}:00`)
    }
  }

  return (
    <div
      className="weekly-hour-slot"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onClick={handleClick}
      aria-label={`${date} a las ${hour}:00`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }}}
    />
  )
}