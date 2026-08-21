import { supabase } from './supabase'

const ACTIVITY_TYPES = ['task_started', 'task_extended', 'task_completed']

export async function getRecentActivity(userId) {
  const { data, error } = await supabase
    .from('activity')
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard')
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
    .select('id, user_id, type, task_id, title, duration, created_at, hidden_in_dashboard')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
  if (filters.day) query = query.eq('created_at', new Date(`${filters.year || new Date().getFullYear()}-${String(filters.month || new Date().getMonth() + 1).padStart(2, '0')}-${String(filters.day).padStart(2, '0')}T00:00:00Z`).toISOString())
  if (filters.month && !filters.day) query = query.gte('created_at', new Date(`${filters.year || new Date().getFullYear()}-${String(filters.month).padStart(2, '0')}-01T00:00:00Z`).toISOString()).lt('created_at', new Date(`${filters.year || new Date().getFullYear()}-${String(Number(filters.month) + 1).padStart(2, '0')}-01T00:00:00Z`).toISOString())
  if (filters.year && !filters.month && !filters.day) query = query.gte('created_at', new Date(`${filters.year}-01-01T00:00:00Z`).toISOString()).lt('created_at', new Date(`${Number(filters.year) + 1}-01-01T00:00:00Z`).toISOString())

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
