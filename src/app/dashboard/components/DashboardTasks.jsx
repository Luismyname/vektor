export default function DashboardTasks({ tasks = [] }) {
  const pendingTasks = tasks.filter((task) => task.status !== 'completed')

  return (
    <section id="dashboard-tasks" className="dashboard-card" aria-labelledby="dashboard-tasks-title">
      <h2 id="dashboard-tasks-title" className="dashboard-section-title">Tareas futuras</h2>
      {pendingTasks.length ? (
        <ul className="dashboard-task-summary">
          {pendingTasks.slice(0, 3).map((task) => <li key={task.id}>{task.title}</li>)}
        </ul>
      ) : <p className="dashboard-empty">No tienes tareas pendientes.</p>}
    </section>
  )
}
