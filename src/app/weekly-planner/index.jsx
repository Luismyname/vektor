import { useEffect, useMemo, useState } from 'react'
import { getAuthenticatedUser } from '../../services/auth'
import { updateTask } from '../../services/tasks'
import { formatDate, getHabitConsistency, getWeekDates, getWeekStart, getWeeklyProgress } from '../../services/weekly-planner'
import { useTaskAutoReschedule } from '../../hooks/weekly-planner/useTaskAutoReschedule'
import { useWeeklyPlanner } from '../../hooks/weekly-planner/useWeeklyPlanner'
import { useWeeklyReview } from '../../hooks/weekly-planner/useWeeklyReview'
import WeeklyGrid from '../../components/weekly-planner/WeeklyGrid'
import WeeklyReview from '../../components/weekly-planner/WeeklyReview'
import '../../styles/weekly-planner.css'

function shiftWeek(weekStart, amount) {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + amount * 7)
  return getWeekStart(date)
}

export default function WeeklyPlannerPage() {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const planner = useWeeklyPlanner(user?.id)
  const review = useWeeklyReview(user?.id, planner.weekStart)
  const [progress, setProgress] = useState(null)
  const [habitConsistency, setHabitConsistency] = useState([])
  const dates = useMemo(() => getWeekDates(planner.weekStart), [planner.weekStart])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    getAuthenticatedUser().then(({ user: authenticatedUser, error }) => {
      if (!active) return
      if (error || !authenticatedUser) setAuthError('No se pudo cargar la sesión.')
      else setUser(authenticatedUser)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return
    Promise.all([getWeeklyProgress(user.id, planner.weekStart), getHabitConsistency(user.id, planner.weekStart)]).then(([nextProgress, nextConsistency]) => {
      setProgress(nextProgress.progress)
      setHabitConsistency(nextConsistency.consistency)
    })
  }, [user, planner.weekStart, planner.entries.length])

  const { autoReschedule, isRescheduling } = useTaskAutoReschedule(user?.id, planner.weekStart, planner.reload)

  function handleDragStart(event, entry) {
    event.dataTransfer.setData('text/planner-entry', entry.id)
    event.dataTransfer.setData(entry.task_id ? 'text/task' : 'text/habit', entry.task_id || entry.habit_id)
  }

  async function handleDropTask(itemId, entryId, itemType, date, start, end) {
    if (entryId) {
      const entry = planner.entries.find((item) => item.id === entryId)
      if (entry) await planner.moveTask(entry, date, start, end)
      return
    }
    if (itemType === 'task' && planner.taskById[itemId]) await planner.scheduleTask(planner.taskById[itemId], date, start, end)
    if (itemType === 'habit' && planner.habitById[itemId]) await planner.scheduleHabit(planner.habitById[itemId], date, start, end)
  }

  function handleBacklogDragStart(event, task) {
    event.dataTransfer.setData('text/task', task.id)
  }

  function handleHabitDragStart(event, habit) {
    event.dataTransfer.setData('text/habit', habit.id)
  }

  function addMinutes(time, amount) {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
    const total = Math.min(hours * 60 + minutes + amount, 23 * 60)
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  async function handleDurationChange(entry, duration) {
    await planner.resizeEntry(entry, entry.start_time, addMinutes(entry.start_time, duration))
  }

  async function handleStatusChange(entry, status) {
    await planner.updateStatus(entry.id, status)
  }

  async function handleTaskUpdate(taskId, changes) {
    const { task, error } = await updateTask(taskId, changes)
    if (error) return
    planner.updateTaskData(taskId, task)
  }

  async function handleAutoReschedule(taskId) {
    await autoReschedule(taskId)
  }

  async function scheduleHabit(habit) {
    const day = dates[Math.min(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 6)]
    await planner.scheduleHabit(habit, day, '07:00', '07:30')
  }

  if (authError) return <div className="route-loading">{authError}</div>
  if (!user || planner.loading) return <div className="route-loading">Cargando tu semana...</div>

  return (
    <main className="weekly-planner-page">
      <div className="weekly-planner-shell">
        <header className="weekly-planner-header">
          <div><p className="auth-kicker">VEKTOR / WEEKLY PLANNER</p><h1>Tu semana, con espacio para lo importante</h1><p>Planifica con precisión y deja que el calendario aprenda de tus decisiones.</p></div>
          <div className="weekly-week-controls"><button type="button" onClick={() => planner.setWeekStart(shiftWeek(planner.weekStart, -1))}>Anterior</button><button type="button" onClick={() => planner.setWeekStart(getWeekStart())}>Hoy</button><button type="button" onClick={() => planner.setWeekStart(shiftWeek(planner.weekStart, 1))}>Siguiente</button><button type="button" className="weekly-clear-week-button" onClick={planner.clearWeek}>Limpiar semana</button></div>
        </header>
        {planner.error && <p className="weekly-error" role="alert">{planner.error}</p>}
        <section className="weekly-metrics" aria-label="Resumen semanal"><div><span>Completadas</span><strong>{progress?.completed || 0}</strong></div><div><span>Progreso</span><strong>{progress?.completionRate || 0}%</strong></div><div><span>Enfoques</span><strong>{progress?.focusSessions || 0}</strong></div><div><span>Hábitos activos</span><strong>{habitConsistency.filter((habit) => habit.completed > 0).length}</strong></div></section>
        <div className="weekly-workspace">
          <aside className="weekly-sidebar">
            <section><h2>Por colocar</h2><p>Arrastra una tarea a cualquier hora.</p>{planner.tasks.filter((task) => task.status !== 'completed' && !planner.entries.some((entry) => entry.task_id === task.id)).map((task) => <div key={task.id} className={`weekly-backlog-task priority-${task.priority || 'medium'}`} draggable onDragStart={(event) => handleBacklogDragStart(event, task)}><strong>{task.title}</strong><span>{task.priority || 'medium'}</span></div>)}</section>
            <section><h2>Hábitos</h2>{planner.habits.map((habit) => <button key={habit.id} type="button" draggable className="weekly-habit-picker" onDragStart={(event) => handleHabitDragStart(event, habit)} onClick={() => scheduleHabit(habit)}><span>{habit.title}</span><small>Arrastra o +07:00</small></button>)}</section>
            {isRescheduling && <p className="weekly-muted">Buscando el siguiente hueco...</p>}
          </aside>
          <WeeklyGrid dates={dates} currentTime={currentTime} today={formatDate(currentTime)} entries={planner.entries} taskById={planner.taskById} habitById={planner.habitById} focusSessions={planner.focusSessions} onDropTask={handleDropTask} onDragStart={handleDragStart} onStatusChange={handleStatusChange} onDurationChange={handleDurationChange} onAutoReschedule={handleAutoReschedule} onDelete={planner.removeEntry} onTaskUpdate={handleTaskUpdate} onClearDay={planner.clearDay} />
        </div>
        <WeeklyReview key={planner.weekStart} questions={review.questions} review={review.review} onSave={review.saveReview} saving={review.saving} saved={review.saved} />
      </div>
    </main>
  )
}