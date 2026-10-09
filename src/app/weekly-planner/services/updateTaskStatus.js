import { supabase } from '../../../services/supabase'

export async function updateTaskStatus(entryId, status) {
  const { data, error } = await supabase
    .from('weekly_planner')
    .update({ status })
    .eq('id', entryId)
    .select('id, status')
    .single()

  return { entry: data, error }
}
