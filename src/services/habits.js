import { supabase } from './supabase'

/**
                                                                 * Obtiene los hábitos del usuario desde la tabla habits
 */
export async function getUserHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return { habits: { recommended: [], custom: [] }, error }

  const habits = { recommended: [], custom: [] }
  data.forEach(habit => {
    if (habit.source === 'recommended') habits.recommended.push(habit)
    else habits.custom.push(habit)
  })
  return { habits, error: null }
}

/**
 * Agrega un nuevo hábito a la tabla habits
 */
export async function addHabit(userId, habit) {
  const newHabit = {
    title: habit.title,
    description: habit.description || '',
    duration_minutes: habit.duration || 30,
    color: habit.color || '#6366f1',
    frequency: habit.frequency || 'daily',
    active: true,
    source: 'custom',
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, ...newHabit })
    .select()
    .single()

  return { habit: data, error }
}

/**
 * Actualiza un hábito existente
 */
export async function updateHabit(userId, habitId, updates) {
  const { data, error } = await supabase
    .from('habits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', habitId)
    .eq('user_id', userId)
    .select()
    .single()

  return { habit: data, error }
}

/**
 * Elimina un hábito
 */
export async function deleteHabit(userId, habitId) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId)

  return { error }
}

/**
 * Alterna estado activo/inactivo de un hábito
 */
export async function toggleHabitActive(userId, habitId, active) {
  return updateHabit(userId, habitId, { active })
}

/**
 * Obtiene hábitos para el planificador (incluye inactivos para el backlog)
 */
export async function getPlannerHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { habits: { recommended: [], custom: [] }, error }

  const habits = { recommended: [], custom: [] }
  data.forEach(habit => {
    if (habit.source === 'recommended') habits.recommended.push(habit)
    else habits.custom.push(habit)
  })
  return { habits, error: null }
}