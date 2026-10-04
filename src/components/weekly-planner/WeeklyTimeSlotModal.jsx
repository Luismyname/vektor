import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../../hooks/useTheme'
import CreateTaskForm from './forms/CreateTaskForm'
import CreateHabitForm from './forms/CreateHabitForm'
import CreateReminderForm from './forms/CreateReminderForm'
import ExistingTaskSelector from './forms/ExistingTaskSelector'
import ExistingHabitSelector from './forms/ExistingHabitSelector'

export default function WeeklyTimeSlotModal({
  isOpen,
  onClose,
  date,
  startTime,
  endTime,
  defaultDuration = 30,
  onSubmit,
  onCancel,
  tasks = [],
  habits = [],
  user
}) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('existing-task')
  const modalRef = useRef(null)

  // Focus trap and close on Escape
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      modalRef.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCreateTask = (taskData) => {
    onSubmit({ type: 'new-task', ...taskData })
    onClose()
  }

  const handleCreateHabit = (habitData) => {
    onSubmit({ type: 'new-habit', ...habitData })
    onClose()
  }

  const handleCreateReminder = (reminderData) => {
    onSubmit({ type: 'reminder', ...reminderData })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-panel weekly-time-slot-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">VEKTOR / PLANIFICAR</p>
            <h3 id="modal-title">¿Qué quieres colocar en esta franja?</h3>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Tipo de elemento a agendar">
          <button
            role="tab"
            aria-selected={activeTab === 'existing-task'}
            aria-controls="panel-existing-task"
            id="tab-existing-task"
            className={`modal-tab ${activeTab === 'existing-task' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing-task')}
          >
            Tarea existente
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'existing-habit'}
            aria-controls="panel-existing-habit"
            id="tab-existing-habit"
            className={`modal-tab ${activeTab === 'existing-habit' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing-habit')}
          >
            Hábito existente
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'new-task'}
            aria-controls="panel-new-task"
            id="tab-new-task"
            className={`modal-tab ${activeTab === 'new-task' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-task')}
          >
            Nueva tarea
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'new-habit'}
            aria-controls="panel-new-habit"
            id="tab-new-habit"
            className={`modal-tab ${activeTab === 'new-habit' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-habit')}
          >
            Nuevo hábito
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'reminder'}
            aria-controls="panel-reminder"
            id="tab-reminder"
            className={`modal-tab ${activeTab === 'reminder' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminder')}
          >
            Recordatorio
          </button>
        </div>

        <div className="tab-panels">
          <div
            role="tabpanel"
            id="panel-existing-task"
            aria-labelledby="tab-existing-task"
            hidden={activeTab !== 'existing-task'}
          >
            <ExistingTaskSelector
              tasks={tasks}
              onSelect={(task) => onSubmit({ type: 'task', task })}
              onClose={onClose}
            />
          </div>

          <div
            role="tabpanel"
            id="panel-existing-habit"
            aria-labelledby="tab-existing-habit"
            hidden={activeTab !== 'existing-habit'}
          >
            <ExistingHabitSelector
              habits={habits}
              onSelect={(habit) => onSubmit({ type: 'habit', habit })}
              onClose={onClose}
            />
          </div>

          <div
            role="tabpanel"
            id="panel-new-task"
            aria-labelledby="tab-new-task"
            hidden={activeTab !== 'new-task'}
          >
            <CreateTaskForm
              onSubmit={handleCreateTask}
              onCancel={onClose}
              initialDuration={defaultDuration}
              initialStartTime={startTime || '09:00'}
            />
          </div>

          <div
            role="tabpanel"
            id="panel-new-habit"
            aria-labelledby="tab-new-habit"
            hidden={activeTab !== 'new-habit'}
          >
            <CreateHabitForm
              onSubmit={handleCreateHabit}
              onCancel={onClose}
              initialDuration={defaultDuration}
              initialStartTime={startTime || '09:00'}
            />
          </div>

          <div
            role="tabpanel"
            id="panel-reminder"
            aria-labelledby="tab-reminder"
            hidden={activeTab !== 'reminder'}
          >
            <CreateReminderForm
              onSubmit={handleCreateReminder}
              onCancel={onClose}
              initialDuration={defaultDuration}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}