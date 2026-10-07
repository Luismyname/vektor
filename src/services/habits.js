import { supabase } from './supabase'

/**
 * Obtiene los hábitos del usuario desde profiles.habits (JSON)
 */
export async function getUserHabits(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('habits')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { habits: { recommended: [], custom: [] }, error }

  const habits = data?.habits || { recommended: [], custom: [] }
  return { habits, error: null }
}

/**
 * Agrega un nuevo hábito a profiles.habits (JSON)
 */
export async function addHabit(userId, habit) {
  // Primero obtener hábitos actuales
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('habits')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) return { habit: null, error: fetchError }

  const currentHabits = profile?.habits || { recommended: [], custom: [] }

  // Generar ID único para el nuevo hábito
  const newHabit = {
    id: crypto.randomUUID(),
    title: habit.title,
    duration: habit.duration || 30,
    active: true,
    created_at: new Date().toISOString(),
    ...habit
  }

  const updatedHabits = {
    recommended: currentHabits.recommended || [],
    custom: [...(currentHabits.custom || []), newHabit]
  }

  const { error } = await supabase
    .from('profiles')
    .update({ habits: updatedHabits })
    .eq('user_id', userId)

  if (error) return { habit: null, error }

  return { habit: { ...newHabit }, error: null }
}

/**
 * Actualiza un hábito existente
 */
export async function updateHabit(userId, habitId, updates) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('habits')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) return { habit: null, error: fetchError }

  const currentHabits = profile?.habits || { recommended: [], custom: [] }
  const customHabits = currentHabits.custom || []
  
  const habitIndex = customHabits.findIndex(h => h.id === habitId)
  if (habitIndex === -1) {
    return { habit: null, error: new Error('Hábito no encontrado') }
  }

  const updatedCustom = customHabits.map((habit, index) => 
    index === habitIndex ? { ...habit, ...updates } : habit
  )

  const updatedHabits = {
    ...currentHabits,
    custom: updatedCustom
  }

  const { error } = await supabase
    .from('profiles')
    .update({ habits: updatedHabits })
    .eq('user_id', userId)

  if (error) return { habit: null, error }

  // Encontrar el hábito actualizado
  const updatedHabit = updatedHabits.custom?.find(h => h.id === habitId) || updatedHabits.recommended?.find(h => h.id === habitId)
  return { habit: updatedHabit, error: null }
}

/**
 * Elimina un hábito
 */
export async function deleteHabit(userId, habitId) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('habits')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) return { error: fetchError }

  const currentHabits = profile?.habits || { recommended: [], custom: [] }
  const updatedCustom = (currentHabits.custom || []).filter(h => h.id !== habitId)
  
  const updatedHabits = {
    ...currentHabits,
    custom: updatedCustom
  }

  const { error } = await supabase
    .from('profiles')
    .update({ habits: updatedHabits })
    .eq('user_id', userId)

  return { error }
}

/**
 * Alterna estado activo/inactivo de un hábito
 */
export async function toggleHabitActive(userId, habitId, active) {
  return updateHabit(userId, habitId, { active })
}