function formatTime(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function TaskTimer({ task, durationMinutes, remainingSeconds, isRunning, onClick }) {
  if (!task) {
    return (
      <section className="dashboard-card task-timer-card">
        <h2 className="dashboard-section-title">Temporizador</h2>
        <p className="dashboard-empty">No hay ninguna tarea activa en este momento.</p>
      </section>
    )
  }

  return (
    <button type="button" className="dashboard-card task-timer-card task-timer-button" aria-live="polite" onClick={onClick}>
      <div className="task-timer-header">
        <div>
          <p className="task-timer-kicker">Tarea activa</p>
          <h2>{task.title}</h2>
        </div>
        <span className="task-timer-badge">{durationMinutes} min</span>
      </div>

      <div className="task-timer-value">{formatTime(remainingSeconds)}</div>
      <p className="task-timer-status">{isRunning ? 'Cuenta regresiva en curso' : 'Pausa'}</p>
    </button>
  )
}
