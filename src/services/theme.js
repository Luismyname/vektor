import { supabase } from './supabase'

// Lee el tema persistido en el perfil de Supabase.
/**
 * Obtiene la preferencia de tema del usuario desde Supabase
 * @param {string} userId - ID del usuario
 * @returns {Promise<{theme: string|null, error: object|null}>}
 */
export async function getUserTheme(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('theme')
    .eq('user_id', userId)
    .single()

  return { theme: data?.theme, error }
}

// Actualiza el tema del perfil del usuario.
/**
 * Actualiza la preferencia de tema del usuario en Supabase
 * @param {string} userId - ID del usuario
 * @param {string} theme - Tema a guardar ('dark' o 'light')
 * @returns {Promise<{error: object|null}>}
 */
export async function updateUserTheme(userId, theme) {
  const { error } = await supabase
    .from('profiles')
    .update({ theme })
    .eq('user_id', userId)

  return { error }
}
