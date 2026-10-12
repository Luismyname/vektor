import { useMemo, useCallback, useState, useEffect, useRef } from 'react'

/**
 * Calcula la fricción cognitiva de un item individual
 */
export function getItemFriction(item) {
  const load = String(item.cognitive_load || item.cognitiveLoad || item.priority || 'medium').toUpperCase()
  const loadScore = { HIGH: 3, MEDIUM: 2, LOW: 1 }[load] || 2
  const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 }[String(item.priority || 'medium').toUpperCase()] || 2
  // Peso 60% carga cognitiva, 40% prioridad
  return Math.round(loadScore * 0.6 + priorityScore * 0.4)
}

/**
 * Calcula la carga cognitiva promedio de una lista de items
 */
export function getAverageFriction(items) {
  if (!items.length) return 2
  const total = items.reduce((sum, item) => sum + getItemFriction(item), 0)
  return Math.round(total / items.length)
}

/**
 * Detecta puntos de fricción en la semana
 */
export function detectFrictionPoints(entries, tasks, _habits) {
  // eslint-disable-next-line no-unused-vars
  const _unused = _habits
  const points = []

  // Detectar días con alta densidad de tareas de alta carga
  const tasksByDate = {}
  entries.filter(e => e.task_id).forEach(entry => {
    const task = tasks.find(t => t.id === entry.task_id)
    if (task) {
      const friction = getItemFriction(task)
      if (!tasksByDate[entry.date]) tasksByDate[entry.date] = []
      tasksByDate[entry.date].push({ task, friction })
    }
  })

  Object.entries(tasksByDate).forEach(([date, tasks]) => {
    const highFrictionTasks = tasks.filter(t => t.friction >= 3)
    if (highFrictionTasks.length >= 2) {
      points.push({
        type: 'high_density',
        date,
        severity: highFrictionTasks.length >= 3 ? 'high' : 'medium',
        message: `${highFrictionTasks.length} tareas de alta carga el ${formatDateShort(date)}`,
        tasks: highFrictionTasks.map(t => t.task.title)
      })
    }
  })

  return points
}

/**
 * Calcula la fricción promedio ponderada por tiempo
 */
export function getWeightedFriction(items, timeWeight = 0.5) {
  if (!items.length) return 2
  
  // Items más cercanos en tiempo tienen más peso
  const weightedSum = items.reduce((sum, item) => {
    const friction = getItemFriction(item)
    // Si el item tiene fecha, calcular peso temporal
    let tw = 1
    if (item.date) {
      const diffDays = Math.abs(new Date(item.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      tw = Math.max(0.3, 1 - diffDays / 14 * timeWeight) // Decae en 2 semanas
    }
    return sum + friction * tw
  }, 0)
  
  const totalWeight = items.reduce((sum, item) => {
    let tw = 1
    if (item.date) {
      const diffDays = Math.abs(new Date(item.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      tw = Math.max(0.3, 1 - diffDays / 14 * 0.5)
    }
    return sum + tw
  }, 0)

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 2
}

/**
 * Hook principal para gestión de carga cognitiva
 */
export function useCognitiveLoad(userId, entries = [], tasks = [], habits = []) {
  const historyRef = useRef([])

  // Calcular fricción promedio actual
  const allItems = useMemo(() => [...tasks, ...habits], [tasks, habits])
  const avgFriction = useMemo(() => getAverageFriction(allItems), [allItems])
  const weightedFriction = useMemo(() => getWeightedFriction(allItems), [allItems])

  // Detectar puntos de fricción
  const frictionPoints = useMemo(() => detectFrictionPoints(
    entries || [], 
    tasks || [], 
    habits || []
  ), [entries, tasks, habits])

  // Detectar patrones de fricción histórica (usar ref para evitar setState en effect)
  useEffect(() => {
    const newEntry = { timestamp: Date.now(), friction: getAverageFriction(allItems) }
    historyRef.current = [...historyRef.current.slice(-49), newEntry]
  }, [allItems])

  // Sugerencias basadas en fricción
  const suggestions = useMemo(() => {
    const suggestions = []
    const avg = getAverageFriction(allItems)

    if (avg >= 3) {
      suggestions.push({
        type: 'reduce_load',
        priority: 'high',
        title: 'Carga cognitiva alta',
        message: 'Considera reprogramar tareas de baja prioridad o dividir tareas grandes.'
      })
    }

    // Sugerir reagrupar tareas similares
    const tasksByValue = {}
    tasks?.forEach(t => {
      const v = t.related_value || 'sin_valor'
      if (!tasksByValue[v]) tasksByValue[v] = []
      tasksByValue[v].push(t)
    })

    Object.entries(tasksByValue).forEach(([value, tasks]) => {
      if (tasks.length >= 3) {
        suggestions.push({
          type: 'batch_similar',
          priority: 'medium',
          title: `Agrupar tareas de "${value}"`,
          message: `${tasks.length} tareas comparten este valor. Considera agruparlas en bloques.`
        })
      }
    })

    return suggestions
  }, [allItems, tasks])

  // Función helper para obtener items por página según fricción
  const getItemsPerPage = useCallback(() => {
    const avg = getAverageFriction(allItems)
    if (avg >= 3) return 2
    if (avg >= 2) return 3
    return 4
  }, [allItems])

  // Sincronizar historial desde ref a estado
  const [frictionHistory, setFrictionHistory] = useState([])
  useEffect(() => {
    setFrictionHistory(historyRef.current)
  }, [])

  return {
    // Estado actual
    avgFriction,
    weightedFriction,
    frictionPoints,
    frictionHistory,
    
    // Utilidades
    getItemFriction,
    getAverageFriction,
    getItemsPerPage,
    suggestions,
    
    // Patrones detectados
    patterns: {
      highDensityDays: frictionPoints.filter(p => p.type === 'high_density'),
      recurringFrictions: frictionPoints.filter(p => p.type === 'recurring'),
    }
  }
}

// Helper para formatear fecha corta
function formatDateShort(date) {
  if (!date) return ''
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}