import DashboardTasks from '../dashboard/components/DashboardTasks'

export default function Tasks() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / TAREAS</p>
          <h1>Tareas futuras</h1>
          <p>Organiza aquí los próximos pasos que quieres completar.</p>
        </section>
        <DashboardTasks />
      </div>
    </main>
  )
}