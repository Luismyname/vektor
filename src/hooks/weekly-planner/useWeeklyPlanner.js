import { useCallback, useEffect, useMemo, useState } from 'react'
import { deletePlannerDay, deletePlannerEntry, deletePlannerWeek, getFocusSessions, getPlannerContext, getWeeklyPlanner, getWeekStart, movePlannerEntry, resizePlannerEntry, scheduleHabit, scheduleTask, updatePlannerEntry } from '../../services/weekly-planner'

export function useWeeklyPlanner(userId, initialWeek = getWeekStart()) {
  const [weekStart, setWeekStart] = useState(initialWeek)
  const [entries, setEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [habits, setHabits] = useState([])
  const [focusSessions, setFocusSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    const [{ entries: plannerEntries, error: plannerError }, { tasks: currentTasks, habits: currentHabits, error: contextError }, { sessions }] = await Promise.all([
      getWeeklyPlanner(userId, weekStart),
      getPlannerContext(userId),
      getFocusSessions(userId, weekStart),
    ])
    setEntries(plannerEntries)
    setTasks(currentTasks)
    setHabits([...(currentHabits?.recommended || []), ...(currentHabits?.custom || [])].filter((habit) => habit.active !== false))
    setFocusSessions(sessions)
    setError(plannerError || contextError ? 'No se pudo cargar el planificador. Revisa que hayas aplicado supabase/weekly_planner.sql.' : '')
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
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
  }

  async function clearDay(date) {
    const { error: operationError } = await deletePlannerDay(userId, date)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar el día.')
    setEntries((current) => current.filter((entry) => entry.date !== date))
  }

  async function clearWeek() {
    const { error: operationError } = await deletePlannerWeek(userId, weekStart)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar la semana.')
    setEntries([])
  }

  const taskById = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks])
  const habitById = useMemo(() => Object.fromEntries(habits.flatMap((habit) => [[habit.id, habit], [habit.title, habit]])), [habits])

  return { weekStart, setWeekStart, entries, tasks, habits, focusSessions, taskById, habitById, loading, error, reload: load, scheduleTask: schedule, scheduleHabit: scheduleExistingHabit, moveTask: move, resizeEntry: resize, updateStatus, updateTaskData, removeEntry, clearDay, clearWeek }
}