import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { saveHabits } from '../../services/users'
import { createObligation, createTaskAndSchedule, createHabitAndSchedule, createReminder, deletePlannerDay, deletePlannerEntry, deletePlannerWeek, dismissPlannerConflict, getFocusSessions, getPlannerConflicts, getPlannerContext, getWeeklyPlanner, getWeekStart, movePlannerEntry, resolvePlannerConflict, resizePlannerEntry, scheduleCreativeBlock, scheduleHabit, scheduleTask, updateObligation, updatePlannerEntry } from '../../services/weekly-planner'
import type { PlannerObligation } from '../../services/weekly-planner'
import type { Habit, Task } from '../../types'

type PlannerTask = Pick<Task, 'id' | 'user_id'> & Partial<Task>

interface PlannerEntry {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  task_id: string | null
  habit_id: string | null
  obligation_id?: string | null
  obligation_occurrence_date?: string | null
  obligation?: Pick<PlannerObligation, 'id' | 'title' | 'obligation_type'> | null
  status: string
  notes?: string | null
}

interface PlannerFocusSession {
  id: string
  user_id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  duration_seconds?: number | null
  duration_minutes?: number
  status: string
}

interface SaveResult {
  entry: PlannerEntry
  error: { message?: string } | null
}

interface PlannerConflict {
  id: string
  user_id: string
  source_entry_id: string
  conflicting_entry_id: string | null
  source_title: string
  source_type: string
  conflicting_title: string
  conflicting_type: string
  status: 'pending' | 'manual' | 'automatic' | 'resolved' | 'backlog' | 'unscheduled' | 'dismissed'
  detected_at: string
  grace_until: string | null
  resolution_message: string | null
}

// Coordina datos, mutaciones y operaciones de agenda que consume la vista semanal.
export function useWeeklyPlanner(userId: string, initialWeek: Date | string = getWeekStart()) {
  const [weekStart, setWeekStart] = useState(initialWeek)
  const [entries, setEntries] = useState<PlannerEntry[]>([])
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [selectedHabits, setSelectedHabits] = useState<Habit[]>([])
  const [plannedTaskIds, setPlannedTaskIds] = useState<Set<string>>(() => new Set())
  const [focusSessions, setFocusSessions] = useState<PlannerFocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<PlannerConflict[]>([])
  const [conflictError, setConflictError] = useState('')
  const [resolvingConflictId, setResolvingConflictId] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    const [
      { entries: plannerEntries, error: plannerError },
      { tasks: currentTasks, habits: currentHabits, selectedHabits: currentSelectedHabits, plannedTaskIds: currentPlannedTaskIds, error: contextError },
      { sessions },
      { conflicts: currentConflicts, error: conflictsLoadError },
    ] = await Promise.all([
      getWeeklyPlanner(userId, weekStart),
      getPlannerContext(userId),
      getFocusSessions(userId, weekStart),
      getPlannerConflicts(userId),
    ])
    setEntries(plannerEntries)
    setTasks(currentPlannedTaskIds === null ? [] : currentTasks)
    setHabits([...(currentHabits?.recommended || []), ...(currentHabits?.custom || [])].filter((habit) => habit.active === true))
    setSelectedHabits(currentSelectedHabits || [])
    setPlannedTaskIds(new Set(currentPlannedTaskIds || []))
    setFocusSessions(sessions)
    setConflicts(currentConflicts as PlannerConflict[])
    setConflictError(conflictsLoadError
      ? 'No se pudieron cargar los conflictos. Aplica la migración planner_automation.sql y verifica los permisos de Supabase.'
      : '')
    setError(plannerError || contextError ? 'No se pudo cargar el planificador. Revisa tu conexión y los permisos de acceso.' : '')
    setLoading(false)
  }, [userId, weekStart])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!conflicts.some((conflict) => ['pending', 'manual', 'automatic'].includes(conflict.status))) return undefined
    const timer = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(timer)
  }, [conflicts, load])

  async function resolveConflict(conflictId: string, mode: 'manual' | 'automatic') {
    setResolvingConflictId(conflictId)
    setConflictError('')
    const result = await resolvePlannerConflict(conflictId, mode)
    if (result.error) {
      setConflictError(result.error.message || 'No se pudo iniciar la resolución del conflicto.')
      setResolvingConflictId('')
      return false
    }
    await load()
    setResolvingConflictId('')
    return true
  }

  async function dismissConflict(conflictId: string) {
    setResolvingConflictId(conflictId)
    setConflictError('')
    const result = await dismissPlannerConflict(conflictId)
    if (result.error) {
      setConflictError(result.error.message || 'No se pudo cerrar el aviso de conflicto.')
      setResolvingConflictId('')
      return false
    }
    await load()
    setResolvingConflictId('')
    return true
  }

  const save = async (operation: () => Promise<SaveResult>) => {
    const { entry, error: operationError } = await operation()
    if (operationError) {
      setError(operationError.message || 'No se pudo guardar el cambio.')
      return null
    }
    setEntries((current) => {
      const exists = current.some((item) => item.id === entry.id)
      return exists
        ? current.map((item) => item.id === entry.id ? { ...item, ...entry, obligation: entry.obligation || item.obligation } : item)
        : [...current, entry]
    })
    if (entry.task_id) {
      setPlannedTaskIds((current) => new Set(current).add(entry.task_id))
    }
    return entry
  }

  const schedule = (task: PlannerTask, date: Date | string, start: string, end: string) => save(() => scheduleTask(task, date, start, end, userId))
  const scheduleExistingHabit = (habit: Habit, date: Date | string, start: string, end: string) => save(() => scheduleHabit(habit, date, start, end, userId))
  const move = (entry: PlannerEntry, date: Date | string, start: string, end: string) => save(() => movePlannerEntry(entry.id, date, start, end))
  const resize = (entry: PlannerEntry, start: string, end: string) => save(() => resizePlannerEntry(entry.id, start, end))
  const updateStatus = (entryId: string, status: string, notes: string = '') => save(() => updatePlannerEntry(entryId, { status, notes }))
  const updateTaskData = (taskId: string, changes: Partial<PlannerTask>) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, ...changes } : task))
  }

  async function removeEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId)
    if (entry?.obligation_id) {
      await updateObligation(entry.obligation_id, { active: false })
    }
    setEntries((current) => current.filter((item) => item.id !== entryId))
    const { error: operationError } = await deletePlannerEntry(entryId)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar el bloque.')
    await load()
  }

  async function clearDay(date: Date | string) {
    setEntries((current) => current.filter((item) => item.date !== date))
    const { error: operationError } = await deletePlannerDay(userId, date)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar el día.')
    await load()
  }

  function isSameWeek(dateA: string | Date, dateB: string | Date) {
    const d1 = new Date(dateA)
    const d2 = new Date(dateB)
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)
    const diff = d1.getTime() - d2.getTime()
    return Math.abs(diff) < 7 * 24 * 60 * 60 * 1000
  }

  async function clearWeek() {
    setEntries((current) => current.filter((item) => !isSameWeek(item.date, weekStart)))
    const { error: operationError } = await deletePlannerWeek(userId, weekStart)
    if (operationError) return setError(operationError.message || 'No se pudo limpiar la semana.')
    await load()
  }

  // Wrapper functions for new modal operations
  const createTaskAndScheduleWrapper = async (
    taskData: Parameters<typeof createTaskAndSchedule>[0],
    date: Date | string,
    startTime: string,
    endTime: string
  ) => {
    const result = await createTaskAndSchedule(taskData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear la tarea.')
      return null
    }
    await load()
    return result.entry
  }

  const createHabitAndScheduleWrapper = async (
    habitData: Parameters<typeof createHabitAndSchedule>[0],
    date: Date | string,
    startTime: string,
    endTime: string
  ) => {
    const result = await createHabitAndSchedule(habitData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear el hábito.')
      return null
    }

    const habit = (result as { habit: { id: string; title: string; duration: number } }).habit
    if (!habit) {
      setError('No se pudo crear el hábito.')
      return null
    }

    // Agregar el hábito a profile.habits.custom para que aparezca en la página de Hábitos
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('habits')
        .eq('user_id', userId)
        .single()

      if (profile) {
        const currentHabits = profile.habits || { recommended: [], custom: [] }
        const newHabit = {
          id: habit.id,
          title: habitData.title,
          duration: habitData.duration,
          active: true,
          source: 'custom'
        }
        const updatedHabits = {
          ...currentHabits,
          custom: [...(currentHabits.custom || []), newHabit]
        }
        await saveHabits(userId, updatedHabits)
      }
    } catch (err) {
      console.error('Error saving habit to profile:', err)
      // No fallar por esto, el hábito ya se creó y se agendó
    }

    await load()
    return result.entry
  }

  const createReminderWrapper = async (
    reminderData: Parameters<typeof createReminder>[0],
    date: Date | string,
    startTime: string,
    endTime: string
  ) => {
    const result = await createReminder(reminderData, date, startTime, endTime, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear el recordatorio.')
      return null
    }
    await load()
    return result.entry
  }

  const createObligationWrapper = async (
    obligationData: Parameters<typeof createObligation>[0],
    date: Date | string
  ) => {
    const result = await createObligation(obligationData, date, userId)
    if (result.error) {
      setError(result.error.message || 'No se pudo crear la obligación.')
      return null
    }
    await load()
    return result.entry
  }

  const updateObligationWrapper = async (
    obligationId: string,
    changes: { title: string }
  ) => {
    const result = await updateObligation(obligationId, changes)
    if (result.error || !result.obligation) {
      setError(result.error?.message || 'No se pudo actualizar la obligación.')
      return false
    }
    setEntries((current) => current.map((entry) => entry.obligation_id === obligationId
      ? { ...entry, obligation: result.obligation }
      : entry))
    return true
  }

  const updateObligationOccurrence = (entryId: string, changes: Record<string, unknown>) => save(
    () => updatePlannerEntry(entryId, changes),
  )

  const createCreativeBlockWrapper = async (
    blockData: Parameters<typeof scheduleCreativeBlock>[0],
    date: Date | string,
    startTime: string,
    endTime: string
  ) => {
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
    conflicts,
    conflictError,
    resolvingConflictId,
    resolveConflict,
    dismissConflict,
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
    createObligation: createObligationWrapper,
    updateObligation: updateObligationWrapper,
    updateObligationOccurrence,
    createCreativeBlock: createCreativeBlockWrapper,
  }
}