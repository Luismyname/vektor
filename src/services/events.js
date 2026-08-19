import { supabase } from './supabase'

export async function getEvents(limit = 10) {
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
