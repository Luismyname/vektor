import { supabase } from './supabase'

const FOCUS_SESSION_FIELDS = 'id, user_id, task_id, planned_duration_seconds, started_at, paused_at, paused_seconds, ended_at, duration_seconds, status, created_at'

export async function startFocusSession(userId, taskId, plannedDurationMinutes) {
  const payload = {
    user_id: userId,
    task_id: taskId,
    planned_duration_seconds: Math.max(0, Math.round(Number(plannedDurationMinutes) * 60)),
  }
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert(payload)
    .select(FOCUS_SESSION_FIELDS)
    .single()

  return { session: data, error }
}

export async function transitionFocusSession(sessionId, status) {
  const { data, error } = await supabase
    .from('focus_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select(FOCUS_SESSION_FIELDS)
    .single()

  return { session: data, error }
}

export async function getActiveFocusSession(userId) {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select(FOCUS_SESSION_FIELDS)
    .eq('user_id', userId)
    .in('status', ['running', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { session: data, error }
}