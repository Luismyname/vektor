export default function HourSlot({ date, hour, onDropTask }) {
  function handleDrop(event) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/task')
    const habitId = event.dataTransfer.getData('text/habit')
    const entryId = event.dataTransfer.getData('text/planner-entry')
    const itemId = taskId || habitId
    if (itemId) onDropTask(itemId, entryId, taskId ? 'task' : 'habit', date, `${String(hour).padStart(2, '0')}:00`, `${String(hour + 1).padStart(2, '0')}:00`)
  }

  return <div className="weekly-hour-slot" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} aria-label={`${date} a las ${hour}:00`} />
}