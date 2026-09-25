import { supabase } from './supabase'

const PLANNER_FIELDS = 'id, user_id, date, start_time, end_time, task_id, habit_id, status, notes, created_at'
const PRIORITY_SCORE = { high: 0, medium: 1, low: 2 }

function toDate(value) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`)
}

export function formatDate(value) {
  const date = toDate(value)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function getWeekStart(value = new Date()) {
  const date = toDate(value)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + mondayOffset)
  return formatDate(date)
}

export function getWeekDates(weekStart) {
  const start = toDate(weekStart)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return formatDate(date)
  })
}

export async function getWeeklyPlanner(userId, weekStart) {
  const dates = getWeekDates(weekStart)
  const { data, error } = await supabase
    .from('weekly_planner')
    .select(PLANNER_FIELDS)
    .eq('user_id', userId)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
    .order('date')
    .order('start_time')
  return { entries: data || [], error }
}

export async function getPlannerContext(userId) {
  const [{ data: tasks, error: tasksError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, completed_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('habits').eq('user_id', userId).maybeSingle(),
  ])
  return { tasks: tasks || [], habits: profile?.habits || { recommended: [], custom: [] }, error: tasksError || profileError }
}

export async function getFocusSessions(userId, weekStart) {
  const dates = getWeekDates(weekStart)
  const start = `${dates[0]}T00:00:00.000Z`
  const end = `${dates[dates.length - 1]}T23:59:59.999Z`
  const focusQuery = await supabase.from('focus_sessions').select('id, user_id, task_id, started_at, ended_at, duration').eq('user_id', userId).gte('started_at', start).lte('started_at', end)
  if (!focusQuery.error) return { sessions: focusQuery.data || [], error: null }

  const { data, error } = await supabase.from('activity').select('id, user_id, task_id, title, created_at, duration, type').eq('user_id', userId).eq('type', 'completed').gte('created_at', start).lte('created_at', end)
  return { sessions: (data || []).map((session) => ({ ...session, started_at: session.created_at, ended_at: session.created_at })), error }
}

export async function scheduleTask(task, date, startTime, endTime, userId = task.user_id, notes = '') {
  const payload = { user_id: userId, date: formatDate(date), start_time: startTime, end_time: endTime, task_id: task.id, habit_id: null, status: 'scheduled', notes }
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single()
  return { entry: data, error }
}

export async function scheduleHabit(habit, date, startTime, endTime, userId, notes = '') {
  const payload = { user_id: userId, date: formatDate(date), start_time: startTime, end_time: endTime, task_id: null, habit_id: habit.title, status: 'scheduled', notes }
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single()
  return { entry: data, error }
}

export async function updatePlannerEntry(id, changes) {
  const { data, error } = await supabase.from('weekly_planner').update(changes).eq('id', id).select(PLANNER_FIELDS).single()
  return { entry: data, error }
}

export async function moveTask(entryId, taskId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, task_id: taskId, status: 'moved' })
}

export async function movePlannerEntry(entryId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, status: 'moved' })
}

export async function resizePlannerEntry(entryId, newStart, newEnd) {
  return updatePlannerEntry(entryId, { start_time: newStart, end_time: newEnd })
}

export async function deletePlannerEntry(entryId) {
  const { error } = await supabase.from('weekly_planner').delete().eq('id', entryId)
  return { error }
}

export async function deletePlannerDay(userId, date) {
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).eq('date', formatDate(date))
  return { error }
}

export async function deletePlannerWeek(userId, weekStart) {
  const dates = getWeekDates(weekStart)
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).gte('date', dates[0]).lte('date', dates[dates.length - 1])
  return { error }
}

export async function getOpenTasks(userId) {
  const { data, error } = await supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, completed_at').eq('user_id', userId).neq('status', 'completed').order('created_at')
  return { tasks: data || [], error }
}

export async function autoReschedule(taskId, userId, weekStart = getWeekStart()) {
  const { tasks, error: tasksError } = await getOpenTasks(userId)
  if (tasksError) return { entry: null, error: tasksError }
  const task = tasks.find((item) => item.id === taskId)
  if (!task) return { entry: null, error: new Error('No se encontró la tarea pendiente.') }

  const dates = getWeekDates(weekStart).slice(1)
  const { entries, error: entriesError } = await getWeeklyPlanner(userId, weekStart)
  if (entriesError) return { entry: null, error: entriesError }
  const occupiedDates = new Set(entries.filter((entry) => entry.task_id).map((entry) => entry.date))
  const targetDate = dates.find((date) => !occupiedDates.has(date)) || dates[dates.length - 1]
  const durationMinutes = 60
  const startMinutes = task.priority === 'high' ? 9 * 60 : 11 * 60
  const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:00`
  const endTime = `${String(Math.floor((startMinutes + durationMinutes) / 60)).padStart(2, '0')}:00`
  return scheduleTask(task, targetDate, startTime, endTime, userId, `Reprogramada automáticamente por prioridad ${task.priority || 'medium'}.`)
}

export async function getWeeklySummary(userId, weekStart) {
  const [{ entries, error }, { sessions }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getFocusSessions(userId, weekStart)])
  const plannedEntries = entries.filter((entry) => entry.task_id || entry.habit_id)
  return { summary: { scheduled: plannedEntries.filter((entry) => entry.status === 'scheduled').length, completed: plannedEntries.filter((entry) => entry.status === 'completed').length, failed: plannedEntries.filter((entry) => entry.status === 'failed').length, moved: plannedEntries.filter((entry) => entry.status === 'moved').length, focusSessions: sessions.length }, error }
}

export async function getWeeklyProgress(userId, weekStart) {
  const { summary, error } = await getWeeklySummary(userId, weekStart)
  const total = summary.completed + summary.failed + summary.moved + summary.scheduled
  return { progress: { ...summary, completionRate: total ? Math.round((summary.completed / total) * 100) : 0 }, error }
}

export async function getHabitConsistency(userId, weekStart) {
  const [{ entries, error }, { habits }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getPlannerContext(userId)])
  const habitList = [...(habits?.recommended || []), ...(habits?.custom || [])].filter((habit) => habit.active !== false)
  const consistency = habitList.map((habit) => {
    const scheduled = entries.filter((entry) => entry.habit_id === habit.id || entry.habit_id === habit.title)
    return { ...habit, scheduled: scheduled.length, completed: scheduled.filter((entry) => entry.status === 'completed').length, failed: scheduled.filter((entry) => entry.status === 'failed').length }
  })
  return { consistency, error }
}

export function sortTasksByPriority(tasks) {
  return [...tasks].sort((left, right) => (PRIORITY_SCORE[left.priority] ?? 1) - (PRIORITY_SCORE[right.priority] ?? 1))
}