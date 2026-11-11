import { useState, useEffect, useRef } from 'react'
import CreateTaskForm from './forms/CreateTaskForm'
import CreateHabitForm from './forms/CreateHabitForm'
import CreateReminderForm from './forms/CreateReminderForm'
import ExistingTaskSelector from './forms/ExistingTaskSelector'
import ExistingHabitSelector from './forms/ExistingHabitSelector'
import ObligationForm, { type ObligationFormData } from './forms/ObligationForm'
import type { Habit, Task } from '../../types'

interface WeeklySlotAction {
  type: string
  [key: string]: unknown
}

interface WeeklyTimeSlotModalProps {
  isOpen: boolean
  onClose: () => void
  startTime?: string | null
  defaultDuration?: number
  onSubmit: (action: WeeklySlotAction) => void
  tasks?: Task[]
  habits?: Habit[]
  plannedTaskIds?: Set<string>
  date?: string
  endTime?: string
  onCancel?: () => void
  user?: unknown
}

// Selector por pestañas para añadir tareas, hábitos, recordatorios u obligaciones.
export default function WeeklyTimeSlotModal({
  isOpen,
  onClose,
  startTime,
  endTime,
  date,
  defaultDuration = 30,
  onSubmit,
  tasks = [],
  habits = [],
  plannedTaskIds = new Set(),
}: WeeklyTimeSlotModalProps) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [taskMode, setTaskMode] = useState<'existing' | 'new'>('existing')
  const [habitMode, setHabitMode] = useState<'existing' | 'new'>('existing')
  const modalRef = useRef<HTMLDivElement>(null)

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
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCreateTask = (taskData: Record<string, unknown>) => {
    onSubmit({ type: 'new-task', ...taskData })
    onClose()
  }

  const handleCreateHabit = (habitData: Record<string, unknown>) => {
    onSubmit({ type: 'new-habit', ...habitData })
    onClose()
  }

  const handleCreateReminder = (reminderData: Record<string, unknown>) => {
    onSubmit({ type: 'reminder', ...reminderData })
    onClose()
  }

  const handleCreateObligation = (obligationData: ObligationFormData) => {
    onSubmit({ type: 'obligation', ...obligationData })
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
            aria-selected={activeTab === 'tasks'}
            aria-controls="panel-tasks"
            id="tab-tasks"
            className={`modal-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tareas
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'habits'}
            aria-controls="panel-habits"
            id="tab-habits"
            className={`modal-tab ${activeTab === 'habits' ? 'active' : ''}`}
            onClick={() => setActiveTab('habits')}
          >
            Hábitos
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
          <button
            role="tab"
            aria-selected={activeTab === 'obligation'}
            aria-controls="panel-obligation"
            id="tab-obligation"
            className={`modal-tab ${activeTab === 'obligation' ? 'active' : ''}`}
            onClick={() => setActiveTab('obligation')}
          >
            Obligaciones
          </button>
        </div>

        <div className="tab-panels">
          <div
            role="tabpanel"
            id="panel-tasks"
            aria-labelledby="tab-tasks"
            hidden={activeTab !== 'tasks'}
          >
            {taskMode === 'existing' ? (
              <>
                <ExistingTaskSelector
                  tasks={tasks}
                  plannedTaskIds={plannedTaskIds}
                  onSelect={(task) => onSubmit({ type: 'task', task })}
                  onClose={onClose}
                />
                <button type="button" className="primary-button" onClick={() => setTaskMode('new')}>Crear nueva tarea</button>
              </>
            ) : (
              <CreateTaskForm
                onSubmit={handleCreateTask}
                onCancel={() => setTaskMode('existing')}
                initialDuration={defaultDuration}
                initialStartTime={startTime || '09:00'}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-habits"
            aria-labelledby="tab-habits"
            hidden={activeTab !== 'habits'}
          >
            {habitMode === 'existing' ? (
              <>
                <ExistingHabitSelector
                  habits={habits}
                  onSelect={(habit) => onSubmit({ type: 'habit', habit })}
                  onClose={onClose}
                />
                <button type="button" className="primary-button" onClick={() => setHabitMode('new')}>Crear nuevo hábito</button>
              </>
            ) : (
              <CreateHabitForm
                onSubmit={handleCreateHabit}
                onCancel={() => setHabitMode('existing')}
                initialDuration={defaultDuration}
                initialStartTime={startTime || '09:00'}
              />
            )}
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

          <div
            role="tabpanel"
            id="panel-obligation"
            aria-labelledby="tab-obligation"
            hidden={activeTab !== 'obligation'}
          >
            {date && (
              <ObligationForm
                date={date}
                startTime={startTime || '09:00'}
                endTime={endTime || '09:30'}
                onSubmit={handleCreateObligation}
                onCancel={onClose}
              />
            )}
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