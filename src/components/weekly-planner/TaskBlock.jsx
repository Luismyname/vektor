import { useState } from 'react'

const STATUS_LABELS = { scheduled: 'Programada', completed: 'Completada', failed: 'Fallida', moved: 'Pospuesta' }

export default function TaskBlock({ entry, task, onStatusChange, onDragStart, onAutoReschedule, onDurationChange, onDelete, onTaskUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  if (!task) return null
  const startHour = Number(entry.start_time.slice(0, 2))
  const duration = Math.max((Number(entry.end_time.slice(0, 2)) * 60 + Number(entry.end_time.slice(3, 5))) - (startHour * 60 + Number(entry.start_time.slice(3, 5))), 30)

  async function saveTask() {
    const nextTitle = title.trim()
    if (!nextTitle) return
    await onTaskUpdate(task.id, { title: nextTitle, description: description.trim() })
    setIsEditing(false)
  }

  return (
    <article style={{ '--start-hour': startHour, '--block-height': `${Math.round(duration / 60 * 48)}px` }} className={`weekly-block weekly-task-block priority-${task.priority || 'medium'} status-${entry.status}`} draggable onDragStart={(event) => onDragStart(event, entry)}>
      {isEditing ? <div className="weekly-task-edit" onClick={(event) => event.stopPropagation()}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Título de la tarea" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows="2" aria-label="Descripción de la tarea" />
        <div className="weekly-block-actions"><button type="button" onClick={saveTask}>Guardar</button><button type="button" onClick={() => setIsEditing(false)}>Cancelar</button></div>
      </div> : <><strong>{task.title}</strong>{task.description && <small className="weekly-task-description">{task.description}</small>}</>}
      <span>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
      <div className="weekly-block-actions">
        <select value={duration} onChange={(event) => onDurationChange(entry, Number(event.target.value))} aria-label={`Duración de ${task.title}`}>
          <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
        </select>
        <select value={entry.status} onChange={(event) => onStatusChange(entry, event.target.value)} aria-label={`Estado de ${task.title}`}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" onClick={() => setIsEditing(true)}>Editar</button>
        {entry.status === 'failed' || entry.status === 'moved' ? <button type="button" onClick={() => onAutoReschedule(task.id)}>Reubicar</button> : null}
      </div>
      <button type="button" className="weekly-clear-button" onClick={() => onDelete(entry.id)}>Limpiar tarea</button>
    </article>
  )
}