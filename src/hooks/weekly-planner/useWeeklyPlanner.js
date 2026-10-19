import { useCallback, useEffect, useMemo, useState } from 'react'
import { deletePlannerDay, deletePlannerEntry, deletePlannerWeek, getFocusSessions, getPlannerContext, getWeeklyPlanner, getWeekStart, movePlannerEntry, resizePlannerEntry, scheduleHabit, scheduleTask, updatePlannerEntry, createTaskAndSchedule, createHabitAndSchedule, createReminder, scheduleCreativeBlock } from '../../services/weekly-planner'

// Coordina datos, mutaciones y operaciones de agenda que consume la vista semanal.
export function useWeeklyPlanner(userId, initialWeek = getWeekStart()) {
  const [weekStart, setWeekStart] = useState(initialWeek)
  const [entries, setEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [habits, setHabits] = useState([])
  const [selectedHabits, setSelectedHabits] = useState([])
  const [plannedTaskIds, setPlannedTaskIds] = useState(() => new Set())
  const [focusSessions, setFocusSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    const [
      { entries: plannerEntries, error: plannerError },
      { tasks: currentTasks, habits: currentHabits, selectedHabits: currentSelectedHabits, plannedTaskIds: currentPlannedTaskIds, error: contextError },
      { sessions },
    ] = await Promise.all([
      getWeeklyPlanner(userId, weekStart),
      getPlannerContext(userId),
      getFocusSessions(userId, weekStart),
    ])
    setEntries(plannerEntries)
    setTasks(currentPlannedTaskIds === null ? [] : currentTasks)
    setHabits([...(currentHabits?.recommended || []), ...(currentHabits?.custom || [])].filter((habit) => habit.active === true))
    setSelectedHabits(currentSelectedHabits || [])
    setPlannedTaskIds(new Set(currentPlannedTaskIds || []))
    setFocusSessions(sessions)
    setError(plannerError || contextError ? 'No se pudo cargar el planificador. Revisa tu conexión y los permisos de acceso.' : '')
    setLoading(false)
  }, [userId, weekStart])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  const save = async (operation) => {
    const { entry, error: operationError } = await operation()
    if (operationError) {
      setError(operationError.message || 'No se pudo guardar el cambio.')
      return null
    }
    setEntries((current) => {
      const exists = current.some((item) => item.id === entry.id)
      return exists ? current.map((item) => item.id === entry.id ? entry : item) : [...current, entry]
    })
    if (entry.task_id) {
      setPlannedTaskIds((current) => new Set(current).add(entry.task_id))
    }
    return entry
  }

  const schedule = (task, date, start, end) => save(() => scheduleTask(task, date, start, end, userId))
  const scheduleExistingHabit = (habit, date, start, end) => save(() => scheduleHabit(habit, date, start, end, userId))
  const move = (entry, date, start, end) => save(() => movePlannerEntry(entry.id, date, start, end))
  const resize = (entry, start, end) => save(() => resizePlannerEntry(entry.id, start, end))
  const updateStatus = (entryId, status, notes = '') => save(() => updatePlannerEntry(entryId, { status, notes }))
  const updateTaskData = (taskId, changes) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...changes } : task))
  }

  async function removeEntry(entryId) {
    const { error: operationError } = await deletePlannerEntry(entryId)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar el bloque.')
    await load()
  }

  async function clearDay(date) {
    const { error: operationError } = await deletePlannerDay(userId, date)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar el día.')
    await load()
  }

  async function clearWeek() {
    const { error: operationError } = await deletePlannerWeek(userId, weekStart)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar la semana.')
    await load()
  }

  // Wrapper functions for new modal operations
  const createTaskAndScheduleWrapper = async (taskData, date, startTime, endTime) => {
    const result = await createTaskAndSchedule(taskData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear la tarea.')
      return null
    }
    await load()
    return result.entry
  }

  const createHabitAndScheduleWrapper = async (habitData, date, startTime, endTime) => {
    const result = await createHabitAndSchedule(habitData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear el hábito.')
      return null
    }
    await load()
    return result.entry
  }

  const createReminderWrapper = async (reminderData, date, startTime, endTime) => {
    const result = await createReminder(reminderData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear el recordatorio.')
      return null
    }
    await load()
    return result.entry
  }

  const createCreativeBlockWrapper = async (blockData, date, startTime, endTime) => {
    const result = await scheduleCreativeBlock(blockData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear el bloque creativo.')
      return null
    }
    await load()
    return result.entry
  }

  const taskById = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks])
  const habitById = useMemo(() => Object.fromEntries(
    [...habits, ...selectedHabits].map((habit) => [habit.id, habit]),
  ), [habits, selectedHabits])

  return {
    weekStart,
    setWeekStart,
    entries,
    tasks,
    habits,
    selectedHabits,
    plannedTaskIds,
    focusSessions,
    loading,
    error,
    reload: load,
    schedule,
    scheduleExistingHabit,
    scheduleTask: schedule,
    scheduleHabit: scheduleExistingHabit,
    moveTask: move,
    movePlannerEntry: move,
    resizeEntry: resize,
    updateStatus,
    updateTaskData,
    removeEntry,
    clearDay,
    clearWeek,
    taskById,
    habitById,
    createTaskAndSchedule: createTaskAndScheduleWrapper,
    createHabitAndSchedule: createHabitAndScheduleWrapper,
    createReminder: createReminderWrapper,
    createCreativeBlock: createCreativeBlockWrapper,
  }
}