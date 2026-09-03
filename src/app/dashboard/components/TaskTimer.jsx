function formatTime(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function TaskTimer({ task, durationMinutes, remainingSeconds, isRunning, onClick, onPause, onResume, onStop }) {
  if (!task) {
    return (
      <section className="dashboard-card task-timer-card">
        <h2 className="dashboard-section-title">Temporizador</h2>
        <p className="dashboard-empty">No hay ninguna tarea activa en este momento.</p>
      </section>
    )
  }

  return (
    <section className="dashboard-card task-timer-card" aria-live="polite">
      <div className="task-timer-header">
        <div>
          <p className="task-timer-kicker">Tarea activa</p>
          <h2>{task.title}</h2>
        </div>
        <span className="task-timer-badge">{durationMinutes} min</span>
      </div>

      <div className="task-timer-value">{formatTime(remainingSeconds)}</div>
      <p className="task-timer-status">{isRunning ? 'Cuenta regresiva en curso' : 'Pausa'}</p>

      <div className="task-timer-actions">
        <button type="button" className="secondary-button" onClick={isRunning ? onPause : onResume} disabled={remainingSeconds <= 0}>
          {isRunning ? 'Pausar' : 'Reanudar'}
        </button>
        <button type="button" className="primary-button danger" onClick={onStop}>
          Stop
        </button>
        <button type="button" className="timer-edit-button" onClick={onClick}>
          Modificar duración
        </button>
      </div>
    </section>
  )
}
