import DashboardActivity from '../dashboard/components/DashboardActivity'

export default function Activity() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / ACTIVIDAD</p>
          <h1>Actividad</h1>
          <p>Consulta el recorrido de tus avances y acciones recientes.</p>
        </section>
        <DashboardActivity />
      </div>
    </main>
  )
}