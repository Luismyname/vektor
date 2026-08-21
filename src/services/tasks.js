import { supabase } from './supabase'

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

  return { task, error }
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

export async function completeTask(id) {
  const completedAt = new Date().toISOString()
  const { data: task, error: taskError } = await updateTask(id, { status: 'completed', completed_at: completedAt })
  if (taskError) return { task: null, error: taskError }

  const { error: activityError } = await supabase.from('activity').insert({
    user_id: task.user_id,
    type: 'task_completed',
    task_id: task.id,
    title: task.title,
  })

  return { task, error: activityError || null }
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  return { error }
}