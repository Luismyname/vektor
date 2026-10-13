import { X, Play, RotateCcw, CheckCircle } from 'lucide-react';

export function TaskStartModalV2({ task, isOpen, onClose, onConfirm, selectedDuration, onSelectDuration }) {
  if (!isOpen || !task) return null;

  const durations = [10, 25, 45, 60, 90];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="start-modal-title" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="modal-kicker">INICIAR TAREA</p>
            <h3 id="start-modal-title">{task.title}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="duration-selector">
          <p className="selector-label">Duración</p>
          <div className="duration-options">
            {durations.map(min => (
              <button
                key={min}
                type="button"
                className={`duration-btn ${selectedDuration === min ? 'selected' : ''}`}
                onClick={() => onSelectDuration(min)}
              >
                {min} min
              </button>
            ))}
            <label className="custom-duration">
              <input
                type="number"
                min="5"
                max="180"
                value={selectedDuration || ''}
                onChange={e => onSelectDuration(Number(e.target.value) || 0)}
                placeholder="Personalizado (min)"
                aria-label="Duración personalizada en minutos"
              />
            </label>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={!selectedDuration || selectedDuration < 5}
          >
            <Play className="btn-icon" aria-hidden="true" />
            Confirmar
          </button>
        </footer>
      </div>
    </div>
  );
}

export function TaskEndModalV2({ isOpen, onClose, onContinue, onFinish, priority, isFinishing, errorMessage }) {
  if (!isOpen) return null;

  const suggestionByPriority = {
    high: 'Sigue con la tarea y avanza un poco más.',
    medium: 'Planifica otro día para cerrar el ciclo sin presión.',
    low: 'Puedes delegar esta tarea o dejarla para más adelante.',
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-modal-title" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="modal-kicker">RESUMEN</p>
            <h3 id="end-modal-title">¿Has terminado la tarea?</h3>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isFinishing} aria-label="Cerrar">
            <X aria-hidden="true" />
          </button>
        </header>

        <p className="end-question">¿Quieres continuar?</p>
        <p className="end-suggestion">{suggestionByPriority[priority] || suggestionByPriority.medium}</p>
        {errorMessage && <p className="end-error" role="alert">{errorMessage}</p>}

        <footer className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onContinue}
            disabled={isFinishing}
          >
            <RotateCcw className="btn-icon" aria-hidden="true" />
            Continuar
          </button>
          <button
            className="btn-primary danger"
            onClick={onFinish}
            disabled={isFinishing}
            aria-busy={isFinishing}
          >
            {isFinishing ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="31.4" /></svg>
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="btn-icon" aria-hidden="true" />
                Terminar
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function DashboardV2Modals({
  showStartModal,
  showEndModal,
  selectedTask,
  selectedDuration,
  setSelectedDuration,
  defaultDuration,
  taskPriority,
  isFinishingTask,
  finishError,
  onStartConfirm,
  onContinueTimer,
  onFinishTask,
  onCloseStartModal,
  onCloseEndModal,
}) {
  return (
    <>
      <TaskStartModalV2
        task={selectedTask}
        isOpen={showStartModal}
        onClose={onCloseStartModal}
        onConfirm={onStartConfirm}
        selectedDuration={selectedDuration}
        onSelectDuration={setSelectedDuration}
        defaultDuration={defaultDuration}
      />
      <TaskEndModalV2
        isOpen={showEndModal}
        onClose={onCloseEndModal}
        onContinue={onContinueTimer}
        onFinish={onFinishTask}
        priority={taskPriority}
        isFinishing={isFinishingTask}
        errorMessage={finishError}
      />
    </>
  );
}