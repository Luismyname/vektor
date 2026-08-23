import { supabase } from './supabase'

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

export async function getTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, user_id, title, description, priority, status, related_value, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { tasks: data || [], error }
}

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

export async function updateTask(id, data) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .select('id, user_id, title, description, priority, status, related_value, created_at, completed_at')
    .single()

  return { task, error }
}

export async function startTask(task, duration, userId) {
  const { error: taskError } = await updateTask(task.id, { status: 'in_progress' })
  if (taskError) return { error: taskError }

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

export async function completeTask(id) {
  const completedAt = new Date().toISOString()
  const { data: task, error: taskError } = await updateTask(id, { status: 'completed', completed_at: completedAt })
  if (taskError) return { task: null, error: taskError }

  const { error: activityError } = await supabase
    .from('activity')
    .update({ type: 'completed' })
    .eq('task_id', task.id)
    .eq('user_id', task.user_id)

  return { task, error: activityError || null }
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  return { error }
}

export async function deleteTasks(ids) {
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  return { error }
}