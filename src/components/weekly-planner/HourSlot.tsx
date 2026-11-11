import type { DragEvent } from 'react'

interface HourSlotProps {
  date: string
  hour: number
  onDropTask: (itemId: string, entryId: string, itemType: 'task' | 'habit' | 'obligation', date: string, startTime: string, endTime: string) => void
  onClick?: (date: string, startTime: string, endTime: string) => void
}

// Franja horaria que recibe elementos arrastrados y permite abrir el modal de agenda.
export default function HourSlot({ date, hour, onDropTask, onClick }: HourSlotProps) {
  const startTime = `${String(hour).padStart(2, '0')}:00`
  const endTime = hour === 23 ? '23:59' : `${String(hour + 1).padStart(2, '0')}:00`

  // Interpreta el elemento arrastrado y lo agenda en el intervalo de una hora.
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/task')
    const habitId = event.dataTransfer.getData('text/habit')
    const obligationId = event.dataTransfer.getData('text/obligation')
    const entryId = event.dataTransfer.getData('text/planner-entry')
    const itemId = taskId || habitId || obligationId
    const itemType = taskId ? 'task' : habitId ? 'habit' : obligationId ? 'obligation' : 'habit'
    if (entryId || itemId) onDropTask(itemId, entryId, itemType, date, startTime, endTime)
  }

  // Solicita al padre crear un bloque en la franja seleccionada.
  function handleClick() {
    if (onClick) {
      onClick(date, startTime, endTime)
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