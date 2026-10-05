import { supabase } from './supabase'
import { createActivityEntry, getInProgressActivity, hideActivityFromDashboard } from './activity'

// Inserta actividad y reintenta sin duración si el esquema remoto no acepta ese campo.
async function insertActivityEntry(entry) {
  const payload = {
    user_id: entry.user_id,
    type: entry.type,
    task_id: entry.task_id,
    title: entry.title,
    ...(Number.isFinite(Number(entry.duration)) ? { duration: Number(entry.duration) } : {}),
  }

  const { error } = await supabase.from('activity').insert(payload)
  if (!error) return { error: null }

  const errorText = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  if (errorText.includes('duration')) {
    const { error: retryError } = await supabase.from('activity').insert({
      user_id: entry.user_id,
      type: entry.type,
      task_id: entry.task_id,
      title: entry.title,
    })
    return { error: retryError }
  }

  return { error }
}

// Lista las tareas del usuario en orden de creación descendente.
export async function getTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, user_id, title, description, priority, status, related_value, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { tasks: data || [], error }
}

// Crea una tarea pendiente y su entrada inicial en el historial de actividad.
export async function createTask(data) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      ...data,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      related_value: data.related_value || null,
    })
    .select('id, user_id, title, description, priority, status, related_value, created_at, completed_at')
    .single()

  if (error) return { task, error }

  const { error: activityError } = await supabase.from('activity').insert({
    user_id: task.user_id,
    type: 'pending',
    task_id: task.id,
    title: task.title,
    duration: null,
  })

  return { task, error: activityError }
}

// Aplica cambios a una tarea y devuelve el registro actualizado.
export async function updateTask(id, data) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select('id, user_id, title, description, priority, status, related_value, created_at, completed_at')
    .single()

  return { task, error }
}

// Marca la actividad de una tarea como iniciada o crea la entrada si aún no existe.
export async function startTask(task, duration, userId) {
  const { data, error } = await supabase
    .from('activity')
    .update({ type: 'in_progress', duration })
    .eq('task_id', task.id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()

  if (error || data) return { error }
  return insertActivityEntry({ user_id: userId, type: 'in_progress', task_id: task.id, title: task.title, duration })
}

// Suma minutos a la duración registrada de la sesión activa de una tarea.
export async function extendTask(task, duration, userId) {
  const { data: currentActivity, error: readError } = await supabase
    .from('activity')
    .select('duration')
    .eq('task_id', task.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) return { error: readError }

  const totalDuration = (Number(currentActivity?.duration) || 0) + duration
  const { error } = await supabase
    .from('activity')
    .update({ type: 'in_progress', duration: totalDuration })
    .eq('task_id', task.id)
    .eq('user_id', userId)
  return { error }
}

// Devuelve la actividad de la tarea a pendiente y elimina su duración en curso.
export async function stopTask(task, userId) {
  const { error } = await supabase
    .from('activity')
    .update({ type: 'pending', duration: null })
    .eq('task_id', task.id)
    .eq('user_id', userId)

  return { error }
}

// Completa la tarea, registra su actividad y revierte el estado si falla ese registro.
export async function completeTask(task, userId, fallbackDuration = 0) {
  const taskDetails = typeof task === 'object' && task !== null ? task : null
  const taskId = taskDetails?.id || task
  if (!taskId || !userId) return { task: null, error: new Error('Falta la tarea o el usuario para finalizar la sesión.') }

  const { activity: activeActivity, error: readActivityError } = await getInProgressActivity(taskId, userId)
  if (readActivityError) return { task: null, error: readActivityError }

  const recordedDuration = Number(activeActivity?.duration ?? fallbackDuration)
  const duration = Math.max(0, Math.round(Number.isFinite(recordedDuration) ? recordedDuration : 0))
  const completedAt = new Date().toISOString()
  const { task: completedTask, error: taskError } = await updateTask(taskId, { status: 'completed', completed_at: completedAt })
  if (taskError) return { task: null, error: taskError }

  const { error: activityError } = await createActivityEntry({
    user_id: userId,
    type: 'completed',
    task_id: taskId,
    title: taskDetails?.title || completedTask.title,
    duration,
  })

  if (activityError) {
    await updateTask(taskId, {
      status: taskDetails?.status || 'pending',
      completed_at: taskDetails?.completed_at || null,
    })
    return { task: null, error: activityError }
  }

  if (activeActivity?.id) await hideActivityFromDashboard(activeActivity.id)

  return { task: completedTask, error: null }
}

// Elimina una tarea por identificador.
export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  return { error }
}

// Elimina en una sola consulta el conjunto de tareas indicado.
export async function deleteTasks(ids) {
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  return { error }
}