import { supabase } from './supabase'
import type { Habit, HabitGroups } from '../types'

interface NewHabitInput {
  title: string
  description?: string
  duration?: number
  color?: string
  frequency?: string
}

/**
                                                                 * Obtiene los hábitos del usuario desde la tabla habits
 */
export async function getUserHabits(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return { habits: { recommended: [], custom: [] }, error }

  const habits: HabitGroups = { recommended: [], custom: [] }
  data.forEach(habit => {
    if (habit.source === 'recommended') habits.recommended.push(habit)
    else habits.custom.push(habit)
  })
  return { habits, error: null }
}

/**
 * Agrega un nuevo hábito a la tabla habits
 */
export async function addHabit(userId: string, habit: NewHabitInput) {
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
export async function updateHabit(userId: string, habitId: string, updates: Partial<Habit>) {
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
export async function deleteHabit(userId: string, habitId: string) {
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
export async function toggleHabitActive(userId: string, habitId: string, active: boolean) {
  return updateHabit(userId, habitId, { active })
}

/**
 * Obtiene hábitos para el planificador (incluye inactivos para el backlog)
 */
export async function getPlannerHabits(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { habits: { recommended: [], custom: [] }, error }

  const habits: HabitGroups = { recommended: [], custom: [] }
  data.forEach(habit => {
    if (habit.source === 'recommended') habits.recommended.push(habit)
    else habits.custom.push(habit)
  })
  return { habits, error: null }
}