export default function DashboardSummary({ dominantValue, secondaryValue }) {
  return (
    <section className="dashboard-summary" aria-label="Resumen de valores">
      <article className="dashboard-card">
        <p className="dashboard-card-label">Valor dominante</p>
        <h2>{dominantValue || 'Sin definir'}</h2>
      </article>
      <article className="dashboard-card">
        <p className="dashboard-card-label">Valor secundario</p>
        <h2>{secondaryValue || 'Sin definir'}</h2>
      </article>
    </section>
  )
}
