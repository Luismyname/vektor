import { Pause, Play, Square, CheckCircle, RotateCcw } from 'lucide-react';

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FocusTimerV2({
  task,
  session,
  remainingSeconds,
  isBusy,
  onPause,
  onResume,
  onStop,
  onFinishTask,
  onContinue,
}) {
  if (!session || !task) return null;

  const isRunning = session.status === 'running';
  const isPaused = session.status === 'paused';
  const isActive = isRunning || isPaused;
  const status = isRunning ? 'En curso' : isPaused ? 'En pausa' : 'Sesión finalizada';

  return (
    <section className="focus-timer-v2" aria-labelledby="focus-timer-title" aria-live="polite">
      <div className="focus-timer-v2-heading">
        <div>
          <p className="focus-timer-v2-kicker">SESIÓN DE ENFOQUE</p>
          <h2 id="focus-timer-title">{task.title}</h2>
        </div>
        <span className={`focus-timer-v2-status${isRunning ? ' is-running' : ''}`}>
          <span aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="focus-timer-v2-clock" role="timer" aria-label={`Tiempo restante ${formatTime(remainingSeconds)}`}>
        {formatTime(remainingSeconds)}
      </div>

      <div className="focus-timer-v2-actions">
        {isRunning && (
          <button type="button" className="btn-secondary" onClick={onPause} disabled={isBusy}>
            <Pause aria-hidden="true" />
            Pausar
          </button>
        )}
        {isPaused && (
          <button type="button" className="btn-secondary" onClick={onResume} disabled={isBusy}>
            <Play aria-hidden="true" />
            Reanudar
          </button>
        )}
        {isActive && (
          <button type="button" className="btn-secondary" onClick={onStop} disabled={isBusy}>
            <Square aria-hidden="true" />
            Stop
          </button>
        )}
        {!isActive && session.status === 'completed' && (
          <button type="button" className="btn-secondary" onClick={onContinue} disabled={isBusy}>
            <RotateCcw aria-hidden="true" />
            Continuar
          </button>
        )}
        <button type="button" className="btn-primary" onClick={onFinishTask} disabled={isBusy}>
          <CheckCircle aria-hidden="true" />
          Finalizar tarea
        </button>
      </div>
    </section>
  );
}
