import { useState } from 'react'
import { updateHiddenAnswers } from '../../services/users'
import { hideActivityFromDashboard } from '../../services/activity'
import { completeTask, extendTask, startTask, stopTask } from '../../services/tasks'
import RecentActivityPanel from './components/RecentActivityPanel'
import DashboardHabits from './components/DashboardHabits'
import DashboardSummary from './components/DashboardSummary'
import DashboardTasks from './components/DashboardTasks'
import TaskEndModal from './components/TaskEndModal'
import TaskStartModal from './components/TaskStartModal'
import TaskTimer from './components/TaskTimer'
import DashboardAnswers from './components/DashboardAnswers'
import { useDashboardData } from './hooks/useDashboardData'
import { useTaskTimer } from '../../hooks/useTaskTimer'
import { usePreferences } from '../../hooks/usePreferences'
import WeeklyPreview from '../../components/dashboard/WeeklyPreview'

const DEFAULT_DURATION = 25

export default function Dashboard() {
  const { preferences } = usePreferences()
  const defaultDuration = preferences.timerMinutes || DEFAULT_DURATION

  const {
    user,
    profile,
    tasks,
    setTasks,
    activities,
    error,
    hiddenAnswers,
    setHiddenAnswers,
    refreshDashboard,
    activeTask,
    setActiveTask,
  } = useDashboardData(defaultDuration)

  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [isFinishingTask, setIsFinishingTask] = useState(false)
  const [finishError, setFinishError] = useState('')

  const activeTimer = useTaskTimer({
    durationMinutes: activeTask ? (activeTask.duration || defaultDuration) : defaultDuration,
    isActive: Boolean(activeTask),
    onExpire: () => {
      setFinishError('')
      setShowEndModal(true)
    },
  })

  const taskPriority = activeTask?.priority || 'medium'

  // Handlers de tareas
  const openStartTaskModal = (task) => {
    if (!task) return
    setSelectedTask(task)
    setSelectedDuration(Number(task?.duration) || defaultDuration)
    setShowStartModal(true)
  }

  const handleTaskSelection = (task) => {
    if (!task) return
    setActiveTask(task)
    setSelectedTask(task)
    setSelectedDuration(Number(task?.duration) || defaultDuration)
    setShowStartModal(true)
  }

  const handleStartConfirm = async () => {
    if (!selectedTask || !user) return

    const duration = Number(selectedDuration)
    const { error } = await startTask(selectedTask, duration, user.id)

    if (error) {
      console.error('Start task failed:', error)
      return
    }

    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, duration } : task))
    setActiveTask({ ...selectedTask, duration })
    setShowStartModal(false)
    setSelectedTask(null)
    setSelectedDuration(defaultDuration)
    activeTimer.start(duration)
    await refreshDashboard(user.id)
  }

  const handleContinueTimer = async () => {
    if (!activeTask || !user) return

    const duration = Number(activeTask.duration || defaultDuration)
    const { error } = await extendTask(activeTask, duration, user.id)

    if (error) return

    setShowEndModal(false)
    activeTimer.start(duration)
    await refreshDashboard(user.id)
  }

  const handlePauseTimer = () => activeTimer.pause()
  const handleResumeTimer = () => activeTimer.resume()

  const handleStopTimer = async () => {
    if (!activeTask || !user) return

    const { error } = await stopTask(activeTask, user.id)
    if (error) return

    setActiveTask(null)
    setSelectedTask(null)
    setShowStartModal(false)
    activeTimer.reset(0)
    await refreshDashboard(user.id)
  }

  const handleFinishTask = async () => {
    if (isFinishingTask) return
    if (!activeTask) {
      setShowEndModal(false)
      activeTimer.reset(0)
      return
    }
    if (!user) {
      setFinishError('No se pudo identificar tu sesión. Inténtalo de nuevo.')
      return
    }

    setIsFinishingTask(true)
    setFinishError('')
    try {
      const fallbackDuration = Math.ceil(activeTimer.durationSeconds / 60)
      const { error } = await completeTask(activeTask, user.id, fallbackDuration)
      if (error) {
        console.error('Finish task failed:', error)
        setFinishError('No se pudo registrar la sesión. Comprueba tu conexión e inténtalo de nuevo.')
        return
      }

      setShowEndModal(false)
      setActiveTask(null)
      setSelectedTask(null)
      setShowStartModal(false)
      activeTimer.reset(0)
      await refreshDashboard(user.id)
    } catch (error) {
      console.error('Finish task failed:', error)
      setFinishError('No se pudo registrar la sesión. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setIsFinishingTask(false)
    }
  }

  // Handlers de respuestas
  const hideAnswer = async (questionKey) => {
    if (!user) return
    const nextHiddenAnswers = { ...hiddenAnswers, [questionKey]: true }
    const { error } = await updateHiddenAnswers(user.id, nextHiddenAnswers)
    if (!error) setHiddenAnswers(nextHiddenAnswers)
  }

  const showAnswer = async (questionKey) => {
    if (!user) return
    const nextHiddenAnswers = { ...hiddenAnswers }
    delete nextHiddenAnswers[questionKey]
    const { error } = await updateHiddenAnswers(user.id, nextHiddenAnswers)
    if (!error) setHiddenAnswers(nextHiddenAnswers)
  }

  if (error) return <div className="route-loading">{error}</div>
  if (!user || !profile) return <div className="route-loading">Cargando tu dashboard...</div>

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / DASHBOARD</p>
          <h1>Tu dirección empieza aquí</h1>
          <p>Este es el resumen de lo que descubrimos en tu onboarding.</p>
        </section>

        {preferences.showValues && (
          <DashboardSummary
            dominantValue={profile.dominant_value}
            secondaryValue={profile.secondary_value}
          />
        )}
        <DashboardHabits habits={profile.habits} />
        <WeeklyPreview userId={user.id} />

        <TaskTimer
          task={activeTask}
          durationMinutes={activeTask?.duration || defaultDuration}
          remainingSeconds={activeTimer.remainingSeconds}
          isRunning={activeTimer.isRunning}
          onClick={() => activeTask && handleTaskSelection(activeTask)}
          onPause={handlePauseTimer}
          onResume={handleResumeTimer}
          onStop={handleStopTimer}
        />

        <div className="dashboard-lower-grid">
          <DashboardTasks tasks={tasks} onStart={openStartTaskModal} activeTaskId={activeTask?.id} />
          <RecentActivityPanel activities={activities} onHide={async (activityId) => {
            if (!user) return
            await hideActivityFromDashboard(activityId)
            await refreshDashboard(user.id)
          }} />
        </div>

        <DashboardAnswers
          profile={profile}
          hiddenAnswers={hiddenAnswers}
          onHide={hideAnswer}
          onShow={showAnswer}
        />
      </div>

      <TaskStartModal
        task={selectedTask}
        isOpen={showStartModal}
        onClose={() => {
          setShowStartModal(false)
          setSelectedTask(null)
          setSelectedDuration(defaultDuration)
        }}
        onConfirm={handleStartConfirm}
        selectedDuration={selectedDuration}
        onSelectDuration={setSelectedDuration}
      />

      <TaskEndModal
        isOpen={showEndModal}
        priority={taskPriority}
        isFinishing={isFinishingTask}
        errorMessage={finishError}
        onContinue={handleContinueTimer}
        onFinish={handleFinishTask}
        onClose={() => setShowEndModal(false)}
      />
    </main>
  )
}
