import { supabase } from './supabase'

export interface InitialEnergyCheckIn {
  date: string
  hour: number
  energy_level: number
}

export async function getInitialEnergyCheckIn(userId: string, date: string) {
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { data: null, error: new Error('El usuario o la fecha del check-in energético no son válidos.') }
  }

  const { data, error } = await supabase
    .from('energy_levels')
    .select('date, hour, energy_level')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('source', 'checkin')
    .order('hour', { ascending: true })
    .limit(1)
    .maybeSingle()

  return { data: data as InitialEnergyCheckIn | null, error }
}
