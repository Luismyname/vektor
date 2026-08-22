import TaskItem from './TaskItem'

export default function TaskList({ tasks, selectedTasks, onToggleSelection, onToggleSelectAll, onDeleteSelected, onDelete, onEdit }) {
  if (!tasks.length) return <p className="dashboard-empty">Todavía no tienes tareas.</p>

  const allSelected = selectedTasks.length === tasks.length

  return (
    <>
      <div className="task-list-toolbar">
        <label className="task-select-all">
          <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} aria-label="Seleccionar todas las tareas" />
          <span>Seleccionar todas</span>
        </label>
        {selectedTasks.length > 0 && <button className="task-delete-selected" type="button" onClick={onDeleteSelected}>Eliminar seleccionadas</button>}
      </div>
      <ul className="task-list">
        {tasks.map((task) => <TaskItem key={task.id} task={task} selected={selectedTasks.includes(task.id)} onToggleSelection={onToggleSelection} onDelete={onDelete} onEdit={onEdit} />)}
      </ul>
    </>
  )
}