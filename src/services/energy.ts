import { supabase } from './supabase'

interface EnergyLevelRecord {
  hour: number
  energy_level: number
}

/**
 * Guarda un check-in de energía matutino
 */
export async function saveEnergyCheckIn(
  userId: string,
  date: string,
  hour: number,
  energyLevel: number,
  source: string = 'manual'
) {
  if (!userId || !date || !Number.isInteger(hour) || hour < 0 || hour > 23
    || !Number.isInteger(energyLevel) || energyLevel < 1 || energyLevel > 10) {
    return { data: null, error: new Error('El usuario, la fecha, la hora o el nivel de energía no son válidos.') }
  }
  const { data, error } = await supabase
    .from('energy_levels')
    .upsert({
      user_id: userId,
      date,
      hour,
      energy_level: energyLevel,
      source: normalizeEnergySource(source),
    }, { onConflict: 'user_id,date,hour' })
    .select()
    .single()

  return { data, error }
}

/**
 * Obtiene los niveles de energía de una semana
 */
export async function getWeeklyEnergyLevels(userId: string, weekStart: string) {
  const dates = []
  const start = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const { data, error } = await supabase
    .from('energy_levels')
    .select('*')
    .eq('user_id', userId)
    .in('date', dates)
    .order('date')
    .order('hour')

  return { data: data || [], error }
}

/**
 * Obtiene el check-in de hoy (si existe)
 */
export async function getTodayEnergyCheckIn(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('energy_levels')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('hour', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data, error }
}

/**
 * Obtiene el cronotipo del usuario desde profiles
 */
export async function getUserChronotype(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('chronotype, peak_hours')
    .eq('user_id', userId)
    .maybeSingle()

  return { data, error }
}

/**
 * Actualiza el cronotipo del usuario
 */
export async function updateUserChronotype(userId: string, chronotype: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ chronotype })
    .eq('user_id', userId)
    .select()
    .single()

  return { data, error }
}

/**
 * Actualiza las horas pico del usuario
 */
export async function updateUserPeakHours(userId: string, peakHours: Record<string, number[]>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ peak_hours: peakHours })
    .eq('user_id', userId)
    .select()
    .single()

  return { data, error }
}

/**
 * Calcula el cronotipo basado en los niveles de energía históricos
 */
export function detectChronotype(energyLevels: EnergyLevelRecord[]) {
  if (!energyLevels.length) return null

  // Agrupar por hora y promediar
  const byHour: Record<number, number[]> = {}
  energyLevels.forEach(e => {
    if (!byHour[e.hour]) byHour[e.hour] = []
    byHour[e.hour].push(e.energy_level)
  })

  const avgByHour: Record<string, number> = {}
  Object.entries(byHour).forEach(([h, vals]) => {
    avgByHour[h] = vals.reduce((a, b) => a + b, 0) / vals.length
  })

  const morning = (avgByHour[7] || 0 + avgByHour[8] || 0 + avgByHour[9] || 0) / 3
  const afternoon = (avgByHour[12] || 0 + avgByHour[13] || 0 + avgByHour[14] || 0) / 3
  const evening = (avgByHour[18] || 0 + avgByHour[19] || 0 + avgByHour[20] || 0) / 3

  const max = Math.max(morning, afternoon, evening)
  if (max === morning) return 'morning'
  if (max === afternoon) return 'afternoon'
  if (max === evening) return 'evening'
  return 'night'
}

/**
 * Obtiene las horas pico del usuario (basado en cronotipo o datos)
 */
export function getUserPeakHours(
  chronotype: string | null | undefined,
  peakHours: Record<string, number[]> | null | undefined
) {
  if (peakHours && Object.keys(peakHours).length) return peakHours

  // Defaults por cronotipo
  const defaults = {
    morning: { morning: [7, 8, 9, 10], afternoon: [], evening: [] },
    afternoon: { morning: [], afternoon: [12, 13, 14, 15], evening: [] },
    evening: { morning: [], afternoon: [], evening: [18, 19, 20, 21] },
    night: { morning: [], afternoon: [], evening: [20, 21, 22] },
  }
  return defaults[chronotype] || defaults.afternoon
}

/**
 * Guarda un check-in de energía en un momento específico (inicio/fin tarea, foco, hábito)
 */
export async function saveEnergyAtMoment(userId: string, energyLevel: number, source: string) {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const hour = now.getHours()

  return saveEnergyCheckIn(userId, date, hour, energyLevel, source)
}

/**
 * Guarda energía al iniciar una tarea/foco
 */
export async function saveEnergyAtTaskStart(userId: string, energyLevel: number) {
  return saveEnergyAtMoment(userId, energyLevel, 'task_start')
}

/**
 * Guarda energía al completar una tarea/foco
 */
export async function saveEnergyAtTaskEnd(userId: string, energyLevel: number) {
  return saveEnergyAtMoment(userId, energyLevel, 'task_end')
}

/**
 * Guarda energía al completar un hábito
 */
export async function saveEnergyAtHabitCompletion(userId: string, energyLevel: number) {
  return saveEnergyAtMoment(userId, energyLevel, 'habit_completion')
}

function normalizeEnergySource(source: string) {
  if (['task_start', 'task_end', 'habit_completion', 'onboarding'].includes(source)) return 'checkin'
  if (['manual', 'inferred', 'checkin'].includes(source)) return source
  throw new Error(`Origen de energía no permitido: ${source}`)
}