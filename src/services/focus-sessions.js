import { supabase } from './supabase'

// Columnas compartidas por las consultas de sesiones de enfoque.
const FOCUS_SESSION_FIELDS = 'id, user_id, task_id, planned_duration_seconds, started_at, paused_at, paused_seconds, ended_at, duration_seconds, status, created_at'

// Registra una sesión y convierte la duración planificada de minutos a segundos.
export async function startFocusSession(userId, taskId, plannedDurationMinutes) {
  if (!userId || !taskId || !Number.isFinite(Number(plannedDurationMinutes)) || Number(plannedDurationMinutes) <= 0) {
    return { session: null, error: new Error('Falta un usuario, una tarea o una duración válida para iniciar el enfoque.') }
  }

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

  if (!error && (!data || data.user_id !== userId || data.task_id !== taskId)) {
    return { session: null, error: new Error('La sesión creada no coincide con el usuario o la tarea solicitados.') }
  }

  return { session: data, error }
}

// Cambia el estado de una sesión existente y devuelve su registro actualizado.
export async function transitionFocusSession(sessionId, status, userId) {
  if (!sessionId || !userId || !['running', 'paused', 'completed', 'interrupted'].includes(status)) {
    return { session: null, error: new Error('Falta la sesión o el usuario para actualizar el enfoque.') }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({ status })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select(FOCUS_SESSION_FIELDS)
    .single()

  if (!error && (!data || data.user_id !== userId)) {
    return { session: null, error: new Error('La sesión actualizada no coincide con el usuario autenticado.') }
  }

  return { session: data, error }
}

// Recupera la sesión activa más reciente del usuario, tanto si corre como si está pausada.
export async function getActiveFocusSession(userId) {
  if (!userId) {
    return { session: null, error: new Error('Falta el usuario para recuperar la sesión de enfoque.') }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select(FOCUS_SESSION_FIELDS)
    .eq('user_id', userId)
    .in('status', ['running', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!error && data && data.user_id !== userId) {
    return { session: null, error: new Error('La sesión recuperada no pertenece al usuario autenticado.') }
  }

  return { session: data, error }
}

export async function getCompletedFocusDurationSeconds(userId, taskId) {
  if (!userId || !taskId) {
    return { durationSeconds: null, error: new Error('Falta el usuario o la tarea para calcular el enfoque registrado.') }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('duration_seconds')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .eq('status', 'completed')

  if (error) return { durationSeconds: null, error }

  const durationSeconds = (data || []).reduce((total, item) => {
    const seconds = Number(item.duration_seconds)
    return total + (Number.isFinite(seconds) ? Math.max(seconds, 0) : 0)
  }, 0)

  return { durationSeconds, error: null }
}

// Actualiza la calidad de una sesión de enfoque completada.
export async function updateFocusSessionQuality(sessionId, qualityScore, interruptions, notes) {
  const payload = {
    quality_score: qualityScore,
    interruptions: interruptions,
    notes: notes,
    status: 'completed',
    ended_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('focus_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select(FOCUS_SESSION_FIELDS)
    .single()

  return { session: data, error }
}