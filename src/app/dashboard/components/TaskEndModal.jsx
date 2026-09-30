export default function TaskEndModal({ isOpen, onContinue, onFinish, onClose, priority, isFinishing = false, errorMessage = '' }) {
  if (!isOpen) return null

  const suggestionByPriority = {
    high: 'Sigue con la tarea y avanza un poco más.',
    medium: 'Planifica otro día para cerrar el ciclo sin presión.',
    low: 'Puedes delegar esta tarea o dejarla para más adelante.',
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-end-modal-title">
      <div className="modal-panel task-end-panel">
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Resumen</p>
            <h3 id="task-end-modal-title">¿Has terminado la tarea?</h3>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar modal" disabled={isFinishing}>×</button>
        </div>

        <p className="task-end-question">¿Quieres continuar?</p>
        <p className="task-end-suggestion">{suggestionByPriority[priority] || suggestionByPriority.medium}</p>
        {errorMessage && <p className="task-end-error" role="alert">{errorMessage}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onContinue} disabled={isFinishing}>Continuar</button>
          <button type="button" className="primary-button danger" onClick={onFinish} disabled={isFinishing} aria-busy={isFinishing}>
            {isFinishing ? 'Finalizando...' : 'Terminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
