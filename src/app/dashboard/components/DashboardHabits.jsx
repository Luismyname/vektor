export default function DashboardHabits({ habits }) {
  const habitList = Array.isArray(habits) ? habits : []

  return (
    <section id="dashboard-habits" className="dashboard-card dashboard-habits" aria-labelledby="dashboard-habits-title">
      <h2 id="dashboard-habits-title" className="dashboard-section-title">Hábitos iniciales</h2>
      {habitList.length ? (
        <ul className="dashboard-habit-list">
          {habitList.map((habit, index) => {
            const text = typeof habit === 'string' ? habit : habit.title || habit.value || 'Hábito sin nombre'
            return (
              <li className="dashboard-habit" key={`${text}-${index}`}>
                <span className="dashboard-habit-mark" aria-hidden="true" />
                <span>{text}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="dashboard-empty">Todavía no hay hábitos iniciales.</p>
      )}
    </section>
  )
}
