import { supabase } from './supabase'

export async function getUsersCount() {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
  return count
}
