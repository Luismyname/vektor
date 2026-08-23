import { useEffect, useMemo, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import { updateHiddenAnswers } from '../../services/users'
import { questions } from '../survey/questions'
import { getRecentActivity, hideActivityFromDashboard } from '../../services/activity'
import { completeTask, extendTask, getTasks, startTask } from '../../services/tasks'
import RecentActivityPanel from './components/RecentActivityPanel'
import DashboardHabits from './components/DashboardHabits'
import DashboardSummary from './components/DashboardSummary'
import DashboardTasks from './components/DashboardTasks'
import TaskEndModal from './components/TaskEndModal'
import TaskStartModal from './components/TaskStartModal'
import TaskTimer from './components/TaskTimer'
import { useTaskTimer } from '../../hooks/useTaskTimer'

const DEFAULT_DURATION = 25

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [error, setError] = useState('')
  const [activeTask, setActiveTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [hiddenAnswers, setHiddenAnswers] = useState({})

  const activeTimer = useTaskTimer({
    durationMinutes: activeTask ? (activeTask.duration || DEFAULT_DURATION) : DEFAULT_DURATION,
    isActive: Boolean(activeTask),
    onExpire: () => setShowEndModal(true),
  })

  const taskPriority = activeTask?.priority || 'medium'

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser()
      if (userError || !authenticatedUser) {
        if (active) setError('No se pudo cargar la sesión.')
        return
      }

      const { profile: currentProfile, error: profileError } = await getCurrentProfile(authenticatedUser.id)
      if (!active) return

      if (profileError || !currentProfile) {
        setError('No se pudo cargar tu perfil.')
        return
      }

      const [{ tasks: currentTasks }, { activities: currentActivities }] = await Promise.all([
        getTasks(authenticatedUser.id),
        getRecentActivity(authenticatedUser.id),
      ])

      if (!active) return
      const activeActivity = currentActivities.find((activity) => activity.type === 'in_progress')
      const persistedActiveTask = currentTasks.find((task) => task.id === activeActivity?.task_id)
      setUser(authenticatedUser)
      setProfile(currentProfile)
      setHiddenAnswers(currentProfile.hidden_answers && typeof currentProfile.hidden_answers === 'object' ? currentProfile.hidden_answers : {})
      setTasks(currentTasks)
      setActivities(currentActivities)
      if (persistedActiveTask) setActiveTask({ ...persistedActiveTask, duration: activeActivity.duration || DEFAULT_DURATION })
    }

    loadDashboard()
    return () => { active = false }
  }, [])

  const refreshDashboard = async (userId) => {
    const [{ tasks: currentTasks }, { activities: currentActivities }] = await Promise.all([
      getTasks(userId),
      getRecentActivity(userId),
    ])
    setTasks(currentTasks)
    setActivities(currentActivities)
  }

  const openStartTaskModal = (task) => {
    if (!task) return
    setSelectedTask(task)
    setSelectedDuration(Number(task?.duration) || DEFAULT_DURATION)
    setShowStartModal(true)
  }

  const handleTaskSelection = (task) => {
    if (!task) return
    setActiveTask(task)
    setSelectedTask(task)
    setSelectedDuration(Number(task?.duration) || DEFAULT_DURATION)
    setShowStartModal(true)
  }

  const handleStartConfirm = async () => {
    if (!selectedTask || !user) return

    const duration = Number(selectedDuration)
    const { error } = await startTask(selectedTask, duration, user.id)

    if (error) {
      console.error('Start task failed:', error)
      setError(`No se pudo iniciar la tarea. ${error?.message || 'Revisa la tabla activity y la política RLS.'}`)
      return
    }

    setTasks((current) => current.map((task) => task.id === selectedTask.id ? { ...task, duration } : task))
    setActiveTask({ ...selectedTask, duration })
    setShowStartModal(false)
    setSelectedTask(null)
    setSelectedDuration(DEFAULT_DURATION)
    activeTimer.start(duration)
    await refreshDashboard(user.id)
  }

  const handleContinueTimer = async () => {
    if (!activeTask || !user) return

    const duration = Number(activeTask.duration || DEFAULT_DURATION)
    const { error } = await extendTask(activeTask, duration, user.id)

    if (error) {
      setError('No se pudo registrar la extensión del tiempo.')
      return
    }

    setShowEndModal(false)
    activeTimer.start(duration)
    await refreshDashboard(user.id)
  }

  const handleFinishTask = async () => {
    if (!activeTask || !user) return

    const { error } = await completeTask(activeTask.id)
    if (error) {
      console.error('Finish task failed:', error)
      setError(`No se pudo completar la tarea. ${error?.message || 'Revisa la actualización en tasks y la actividad.'}`)
      return
    }

    setShowEndModal(false)
    setActiveTask(null)
    setSelectedTask(null)
    activeTimer.reset(DEFAULT_DURATION)
    await refreshDashboard(user.id)
  }

  const answers = useMemo(() => questions.map(([question], index) => ({
    key: String(index + 1),
    question,
    answer: profile?.answers?.[index + 1] ?? 'Sin respuesta',
  })), [profile])

  const hideAnswer = async (questionKey) => {
    if (!user) return
    const nextHiddenAnswers = { ...hiddenAnswers, [questionKey]: true }
    const { error } = await updateHiddenAnswers(user.id, nextHiddenAnswers)
    if (error) {
      setError('No se pudo ocultar la respuesta.')
      return
    }
    setHiddenAnswers(nextHiddenAnswers)
  }

  const showAnswer = async (questionKey) => {
    if (!user) return
    const nextHiddenAnswers = { ...hiddenAnswers }
    delete nextHiddenAnswers[questionKey]
    const { error } = await updateHiddenAnswers(user.id, nextHiddenAnswers)
    if (error) {
      setError('No se pudo mostrar la respuesta.')
      return
    }
    setHiddenAnswers(nextHiddenAnswers)
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

        <DashboardSummary
          dominantValue={profile.dominant_value}
          secondaryValue={profile.secondary_value}
        />
        <DashboardHabits habits={profile.habits} />

        <TaskTimer
          task={activeTask}
          durationMinutes={activeTask?.duration || DEFAULT_DURATION}
          remainingSeconds={activeTimer.remainingSeconds}
          isRunning={activeTimer.isRunning}
          onClick={() => activeTask && handleTaskSelection(activeTask)}
        />

        <div className="dashboard-lower-grid">
          <DashboardTasks tasks={tasks} onStart={openStartTaskModal} activeTaskId={activeTask?.id} />
          <RecentActivityPanel activities={activities} onHide={async (activityId) => {
            if (!user) return
            await hideActivityFromDashboard(activityId)
            await refreshDashboard(user.id)
          }} />
        </div>

        <section className="dashboard-card dashboard-answers" aria-labelledby="dashboard-answers-title">
          <h2 id="dashboard-answers-title" className="dashboard-section-title">Tus respuestas</h2>
          {answers.length ? (
            <dl className="dashboard-answer-list">
              {answers.map(({ key, question, answer }) => {
                const isHidden = hiddenAnswers[key] === true
                return <div className={`dashboard-answer${isHidden ? ' dashboard-answer-hidden' : ''}`} key={key}>
                  <dt>{question}</dt>
                  <dd>{isHidden ? 'Respuesta oculta' : String(answer)}</dd>
                  <button className="dashboard-answer-hide" type="button" onClick={() => isHidden ? showAnswer(key) : hideAnswer(key)}>{isHidden ? 'Mostrar' : 'Ocultar'}</button>
                </div>
              })}
            </dl>
          ) : (
            <p className="dashboard-empty">No hay respuestas disponibles.</p>
          )}
        </section>
      </div>

      <TaskStartModal
        task={selectedTask}
        isOpen={showStartModal}
        onClose={() => {
          setShowStartModal(false)
          setSelectedTask(null)
          setSelectedDuration(DEFAULT_DURATION)
        }}
        onConfirm={handleStartConfirm}
        selectedDuration={selectedDuration}
        onSelectDuration={setSelectedDuration}
      />

      <TaskEndModal
        isOpen={showEndModal}
        priority={taskPriority}
        onContinue={handleContinueTimer}
        onFinish={handleFinishTask}
        onClose={() => setShowEndModal(false)}
      />
    </main>
  )
}
