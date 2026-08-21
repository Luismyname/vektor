import { useEffect, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import { completeTask, createTask, deleteTask, getTasks } from '../../services/tasks'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'

export default function Tasks() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function loadTasks() {
      const { user: authenticatedUser, error: userError } = await getAuthenticatedUser()
      if (userError || !authenticatedUser) return active && setError('No se pudo cargar la sesión.')
      const [{ profile: currentProfile }, { tasks: userTasks, error: tasksError }] = await Promise.all([
        getCurrentProfile(authenticatedUser.id),
        getTasks(authenticatedUser.id),
      ])
      if (!active) return
      if (tasksError) return setError('No se pudieron cargar tus tareas. Aplica supabase/tasks.sql.')
      setUser(authenticatedUser)
      setProfile(currentProfile)
      setTasks(userTasks)
    }
    loadTasks()
    return () => { active = false }
  }, [])

  async function handleCreate(data) {
    setIsSubmitting(true)
    setMessage('')
    const { task, error: createError } = await createTask(data)
    setIsSubmitting(false)
    if (createError) {
      setError('No se pudo crear la tarea.')
      return false
    }
    setTasks((current) => [task, ...current])
    setMessage('Tarea creada.')
    return true
  }

  async function handleComplete(id) {
    const { task, error: completeError } = await completeTask(id)
    if (completeError) return setError('La tarea se completó, pero no se pudo registrar la actividad.')
    setTasks((current) => current.map((item) => item.id === id ? task : item))
    setMessage('Tarea completada y registrada en actividad.')
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteTask(id)
    if (deleteError) return setError('No se pudo eliminar la tarea.')
    setTasks((current) => current.filter((task) => task.id !== id))
    setMessage('Tarea eliminada.')
  }

  if (error) return <div className="route-loading">{error}</div>
  if (!user || !profile) return <div className="route-loading">Cargando tus tareas...</div>

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-intro">
          <p className="auth-kicker">VEKTOR / TAREAS</p>
          <h1>Tareas futuras</h1>
          <p>Organiza aquí los próximos pasos que quieres completar.</p>
        </section>
        <section className="dashboard-card task-create-card" aria-labelledby="task-form-title">
          <h2 id="task-form-title" className="dashboard-section-title">Nueva tarea</h2>
          <TaskForm userId={user.id} dominantValue={profile.dominant_value} onCreate={handleCreate} isSubmitting={isSubmitting} />
        </section>
        <section className="dashboard-card tasks-list-card" aria-labelledby="tasks-list-title">
          <div className="tasks-list-heading">
            <h2 id="tasks-list-title" className="dashboard-section-title">Todas tus tareas</h2>
            <span className="tasks-count">{tasks.filter((task) => task.status !== 'completed').length} pendientes</span>
          </div>
          <TaskList tasks={tasks} onComplete={handleComplete} onDelete={handleDelete} />
          {message && <p className="form-message form-message-success" role="status">{message}</p>}
        </section>
      </div>
    </main>
  )
}