import TaskItem from './TaskItem'

export default function TaskList({ tasks, onComplete, onDelete }) {
  if (!tasks.length) return <p className="dashboard-empty">Todavía no tienes tareas.</p>

  return (
    <ul className="task-list">
      {tasks.map((task) => <TaskItem key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />)}
    </ul>
  )
}