import { useState } from 'react'
import { useTaskTimer } from '../../hooks/useTaskTimer'

const demoQuestions = [
  '¿Qué quieres cuidar esta semana?',
  '¿Qué te gustaría aprender?',
  '¿Qué actividad te conecta con otras personas?',
]

const initialTasks = [
  { id: 1, title: 'Planificar la semana', status: 'pending' },
  { id: 2, title: 'Leer 10 páginas', status: 'completed' },
]

export default function Demo() {
  const [step, setStep] = useState('survey')
  const [answers, setAnswers] = useState({})
  const [tasks, setTasks] = useState(initialTasks)
  const [taskTitle, setTaskTitle] = useState('')
  const [activeTask, setActiveTask] = useState(null)
  const [history, setHistory] = useState([{ id: 1, title: 'Leer 10 páginas', type: 'completed' }])
  const timer = useTaskTimer({ durationMinutes: 1, isActive: Boolean(activeTask), onExpire: () => setStep('history') })

  function addTask(event) {
    event.preventDefault()
    const title = taskTitle.trim()
    if (!title) return
    setTasks((current) => [{ id: Date.now(), title, status: 'pending' }, ...current])
    setTaskTitle('')
  }

  function startTask(task) {
    setActiveTask(task)
    setStep('timer')
    timer.start(1)
  }

  function finishTask() {
    if (!activeTask) return
    setTasks((current) => current.map((task) => task.id === activeTask.id ? { ...task, status: 'completed' } : task))
    setHistory((current) => [{ id: Date.now(), title: activeTask.title, type: 'completed' }, ...current])
    setActiveTask(null)
    timer.reset(1)
    setStep('history')
  }

  return (
    <main className="demo-page">
      <div className="demo-shell">
        <header className="demo-header">
          <div><p className="auth-kicker">VEKTOR / DEMO</p><h1>Tu dirección, en práctica</h1></div>
          <span className="demo-badge">Sin registro</span>
        </header>
        <nav className="demo-nav" aria-label="Flujo de demostración">
          {['survey', 'dashboard', 'tasks', 'timer', 'history'].map((item) => <button key={item} type="button" className={step === item ? 'is-active' : ''} onClick={() => setStep(item)}>{item === 'survey' ? 'Encuesta' : item === 'dashboard' ? 'Dashboard' : item === 'tasks' ? 'Tareas' : item === 'timer' ? 'Temporizador' : 'Historial'}</button>)}
        </nav>

        {step === 'survey' && <section className="demo-panel"><p className="demo-step">01 / Orientación</p><h2>Descubre tu punto de partida</h2><p>Responde estas preguntas para ver cómo Vektor convierte tus respuestas en una dirección práctica.</p>{demoQuestions.map((question, index) => <label className="demo-field" key={question}>{question}<select value={answers[index] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}><option value="">Selecciona una opción</option><option value="salud">Cuidar mi energía</option><option value="crecimiento">Avanzar en mis metas</option><option value="conexion">Conectar con otros</option></select></label>)}<button className="onboarding-submit" type="button" onClick={() => setStep('dashboard')}>Ver mi dashboard</button></section>}

        {step === 'dashboard' && <section className="demo-panel"><p className="demo-step">02 / Dashboard</p><h2>Tu dirección empieza con claridad</h2><div className="demo-summary"><div><span>Valor dominante</span><strong>{answers[0] === 'salud' ? 'Salud' : answers[0] === 'conexion' ? 'Conexión' : 'Crecimiento'}</strong></div><div><span>Hábitos sugeridos</span><strong>3 activos</strong></div><div><span>Tareas pendientes</span><strong>{tasks.filter((task) => task.status !== 'completed').length}</strong></div></div><button className="onboarding-submit" type="button" onClick={() => setStep('tasks')}>Gestionar tareas</button></section>}

        {step === 'tasks' && <section className="demo-panel"><p className="demo-step">03 / Tareas</p><h2>Convierte intención en un siguiente paso</h2><form className="demo-task-form" onSubmit={addTask}><input aria-label="Nueva tarea" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Ej. Preparar la presentación" /><button type="submit">Añadir tarea</button></form><ul className="demo-list">{tasks.map((task) => <li key={task.id}><span className={task.status === 'completed' ? 'is-done' : ''}>{task.title}</span>{task.status !== 'completed' && <button type="button" onClick={() => startTask(task)}>Enfocar</button>}</li>)}</ul></section>}

        {step === 'timer' && <section className="demo-panel demo-timer"><p className="demo-step">04 / Enfoque</p><h2>{activeTask?.title || 'Sesión de enfoque'}</h2><strong className="demo-time">{String(Math.floor(timer.remainingSeconds / 60)).padStart(2, '0')}:{String(timer.remainingSeconds % 60).padStart(2, '0')}</strong><p>{timer.isRunning ? 'Una sola tarea. Toda tu atención.' : 'Sesión en pausa.'}</p><button className="onboarding-submit" type="button" onClick={finishTask}>Finalizar sesión</button></section>}

        {step === 'history' && <section className="demo-panel"><p className="demo-step">05 / Historial</p><h2>Observa tu avance</h2><p>La actividad de tus sesiones queda organizada para que puedas reconocer tus patrones.</p><ul className="demo-list">{history.map((item) => <li key={item.id}><span>{item.title}</span><small>{item.type === 'completed' ? 'Completada' : 'En curso'}</small></li>)}</ul><button className="onboarding-submit" type="button" onClick={() => setStep('survey')}>Repetir demo</button></section>}
      </div>
    </main>
  )
}