import { useEffect, useState } from 'react'
import { getAuthenticatedUser, getCurrentProfile } from '../../services/auth'
import { createTask, deleteTask, deleteTasks, getTasks, updateTask } from '../../services/tasks'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'

export default function Tasks() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])

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

  function showSuccessMessage(message) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  async function handleCreate(data) {
    setIsSubmitting(true)
    const { task, error: createError } = await createTask(data)
    setIsSubmitting(false)
    if (createError) {
      setError('No se pudo crear la tarea.')
      return false
    }
    setTasks((current) => [task, ...current])
    showSuccessMessage('Tarea agregada')
    return true
  }

  function toggleTaskSelection(id) {
    setSelectedTasks((current) => current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id])
  }

  function toggleSelectAll() {
    setSelectedTasks((current) => current.length === tasks.length ? [] : tasks.map((task) => task.id))
  }

  async function deleteSelectedTasks() {
    const ids = selectedTasks
    const { error: deleteError } = await deleteTasks(ids)
    if (deleteError) return setError('No se pudieron eliminar las tareas seleccionadas.')
    setTasks((current) => current.filter((task) => !ids.includes(task.id)))
    setSelectedTasks([])
  }

  async function handleUpdate(id, data) {
    setIsSubmitting(true)
    const { task, error: updateError } = await updateTask(id, data)
    setIsSubmitting(false)
    if (updateError) {
      setError('No se pudo actualizar la tarea.')
      return false
    }
    setTasks((current) => current.map((item) => item.id === id ? task : item))
    showSuccessMessage('Tarea actualizada')
    return true
  }

  async function handleDelete(id) {
    const { error: deleteError } = await deleteTask(id)
    if (deleteError) return setError('No se pudo eliminar la tarea.')
    setTasks((current) => current.filter((task) => task.id !== id))
    setSelectedTasks((current) => current.filter((taskId) => taskId !== id))
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
          <h2 id="task-form-title" className="dashboard-section-title">{editingTask ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <TaskForm key={editingTask?.id || 'new'} userId={user.id} dominantValue={profile.dominant_value} task={editingTask} onCreate={handleCreate} onUpdate={handleUpdate} onCancel={() => setEditingTask(null)} isSubmitting={isSubmitting} />
          {successMessage && <div className="task-success-banner" role="status">{successMessage}</div>}
        </section>
        <section className="dashboard-card tasks-list-card" aria-labelledby="tasks-list-title">
          <div className="tasks-list-heading">
            <h2 id="tasks-list-title" className="dashboard-section-title">Todas tus tareas</h2>
            <span className="tasks-count">{tasks.filter((task) => task.status !== 'completed').length} pendientes</span>
          </div>
          <TaskList tasks={tasks} selectedTasks={selectedTasks} onToggleSelection={toggleTaskSelection} onToggleSelectAll={toggleSelectAll} onDeleteSelected={deleteSelectedTasks} onDelete={handleDelete} onEdit={setEditingTask} />
        </section>
      </div>
    </main>
  )
}