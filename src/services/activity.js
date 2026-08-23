import { supabase } from './supabase'

const ACTIVITY_TYPES = ['pending', 'in_progress', 'completed']

function getDateRange(filters) {
  const now = new Date()
  const year = Number(filters.year) || now.getFullYear()
  const month = Number(filters.month)
  const day = Number(filters.day)

  if (filters.day && (!Number.isInteger(day) || day < 1 || day > 31)) return null
  if (filters.month && (!Number.isInteger(month) || month < 1 || month > 12)) return null
  if (filters.year && (!Number.isInteger(year) || year < 1)) return null

  let start
  let end
  if (filters.day) {
    start = new Date(year, (month || now.getMonth() + 1) - 1, day)
    if (start.getFullYear() !== year || start.getMonth() !== (month || now.getMonth() + 1) - 1 || start.getDate() !== day) return null
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  } else if (filters.month) {
    start = new Date(year, month - 1, 1)
    end = new Date(year, month, 1)
  } else if (filters.year) {
    start = new Date(year, 0, 1)
    end = new Date(year + 1, 0, 1)
  }

  return start && end ? { start: start.toISOString(), end: end.toISOString() } : null
}

export async function getRecentActivity(userId) {
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard, tasks(status)')
    .eq('user_id', userId)
    .in('type', ACTIVITY_TYPES)
    .eq('hidden_in_dashboard', false)
    .order('created_at', { ascending: false })

  return { activities: data || [], error }
}

export async function hideActivityFromDashboard(activityId) {
  const { data, error } = await supabase
    .from('activity')
    .update({ hidden_in_dashboard: true })
    .eq('id', activityId)
    .select('id, hidden_in_dashboard')
    .single()

  return { activity: data, error }
}

export async function getActivityHistory(userId, filters = {}) {
  let query = supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard, tasks(status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)

  const dateRange = getDateRange(filters)
  if (dateRange) {
    query = query.gte('created_at', dateRange.start).lt('created_at', dateRange.end)
  }

  const { data, error } = await query
  return { activities: data || [], error }
}

export async function searchActivity(userId, queryText) {
  const normalized = queryText.trim()
  if (!normalized) {
    const { activities, error } = await getActivityHistory(userId)
    return { activities, error }
  }

  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard')
    .eq('user_id', userId)
    .or(`title.ilike.%${normalized}%,created_at.eq.${new Date(normalized).toISOString()}`)
    .order('created_at', { ascending: false })

  return { activities: data || [], error }
}

export async function getActivity(userId) {
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { activities: data || [], error }
}

export async function getActivityById(activityId) {
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard, tasks(status, description, priority, related_value)')
    .eq('id', activityId)
    .single()
  return { activity: data, error }
}

export async function finalizeActivity(activityId, taskId) {
  const { error: activityError } = await supabase
    .from('activity')
    .update({ type: 'completed' })
    .eq('id', activityId)
  if (activityError) return { error: activityError }

  const { error: taskError } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', taskId)
  return { error: taskError }
}

export async function createActivityEntry(entry) {
  const { data, error } = await supabase
    .from('activity')
    .insert({
      ...entry,
      duration: entry.duration ?? null,
      hidden_in_dashboard: entry.hidden_in_dashboard ?? false,
    })
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard')
    .single()

  return { activity: data, error }
}
