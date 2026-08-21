export default function TaskStartModal({ task, isOpen, onClose, onConfirm, selectedDuration, onSelectDuration }) {
  if (!isOpen || !task) return null

  const durations = [10, 25, 45]

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-start-modal-title">
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Iniciar tarea</p>
            <h3 id="task-start-modal-title">{task.title}</h3>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">×</button>
        </div>

        <div className="duration-selector">
          {durations.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`duration-option ${selectedDuration === minutes ? 'is-selected' : ''}`}
              onClick={() => onSelectDuration(minutes)}
            >
              {minutes} min
            </button>
          ))}

          <label className="custom-duration">
            <span>Personalizado</span>
            <input
              type="number"
              min="5"
              max="180"
              value={selectedDuration || ''}
              onChange={(event) => onSelectDuration(Number(event.target.value) || 0)}
              placeholder="min"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary-button" onClick={onConfirm} disabled={!selectedDuration || selectedDuration < 5}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
