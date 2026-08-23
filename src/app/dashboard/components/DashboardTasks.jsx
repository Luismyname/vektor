export default function DashboardTasks({ tasks = [], onStart = () => {}, activeTaskId = null }) {
  const pendingTasks = tasks.filter((task) => task.status !== 'completed')

  return (
    <section id="dashboard-tasks" className="dashboard-card" aria-labelledby="dashboard-tasks-title">
      <h2 id="dashboard-tasks-title" className="dashboard-section-title">Tareas futuras</h2>
      {pendingTasks.length ? (
        <ul className="dashboard-task-summary">
          {pendingTasks.slice(0, 5).map((task) => {
            const isActive = task.id === activeTaskId
            const statusLabel = isActive || task.status === 'in_progress' ? 'Tarea en curso' : 'Tarea pendiente'
            return (
              <li key={task.id} className={`dashboard-task-row ${isActive ? 'is-active-task' : ''}`}>
                <div className="dashboard-task-copy">
                  <strong>{task.title}</strong>
                  <span className="task-related-value">{statusLabel}</span>
                  {task.priority && <span className={`task-priority task-priority-${task.priority}`}>{task.priority}</span>}
                </div>
                <button type="button" className="primary-button small-button" onClick={() => onStart(task)}>
                  {isActive ? 'Modificar' : 'Iniciar tarea'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : <p className="dashboard-empty">No tienes tareas pendientes.</p>}
    </section>
  )
}
