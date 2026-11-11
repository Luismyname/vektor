import { supabase } from './supabase'

export const MINIMUM_HOURLY_SAMPLES = 3
export const ENERGY_WINDOW_HOURS = 4
const ENERGY_HISTORY_PAGE_SIZE = 1000

export interface EnergyLevelSample {
  date: string
  hour: number
  energy_level: number
}

export interface HourlyEnergyProfileEntry {
  hour: number
  average: number | null
  sampleCount: number
}

export interface EnergyWindow {
  startHour: number
  endHour: number
  average: number
  sampleCount: number
  minimumSamples: number
}

export type EnergyConfidence = 'insufficient' | 'low' | 'medium' | 'high'

export function calculateHourlyEnergyProfile(
  samples: EnergyLevelSample[],
): HourlyEnergyProfileEntry[] {
  const grouped: number[][] = Array.from({ length: 24 }, () => [])

  for (const sample of samples) {
    if (!Number.isInteger(sample.hour) || sample.hour < 0 || sample.hour > 23
      || !Number.isFinite(sample.energy_level)
      || sample.energy_level < 1 || sample.energy_level > 10) continue
    grouped[sample.hour].push(sample.energy_level)
  }

  return grouped.map((values, hour) => ({
    hour,
    average: values.length >= MINIMUM_HOURLY_SAMPLES
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null,
    sampleCount: values.length,
  }))
}

function getEnergyWindows(profile: HourlyEnergyProfileEntry[], duration: number) {
  if (!Number.isInteger(duration) || duration < 1 || duration > 24
    || profile.length !== 24) return []

  const windows: EnergyWindow[] = []
  for (let startHour = 0; startHour < 24; startHour += 1) {
    const hours = Array.from(
      { length: duration },
      (_, offset) => profile[(startHour + offset) % 24],
    )
    const averages = hours
      .map((entry) => entry.average)
      .filter((average): average is number => average !== null && Number.isFinite(average))
    if (averages.length !== duration) continue

    windows.push({
      startHour,
      endHour: (startHour + duration) % 24,
      average: averages.reduce((sum, value) => sum + value, 0) / duration,
      sampleCount: hours.reduce((sum, entry) => sum + entry.sampleCount, 0),
      minimumSamples: Math.min(...hours.map((entry) => entry.sampleCount)),
    })
  }
  return windows
}

export function getBestEnergyWindow(
  profile: HourlyEnergyProfileEntry[],
  duration = ENERGY_WINDOW_HOURS,
): EnergyWindow | null {
  return getEnergyWindows(profile, duration)
    .reduce<EnergyWindow | null>((best, window) => !best || window.average > best.average ? window : best, null)
}

export function getWorstEnergyWindow(
  profile: HourlyEnergyProfileEntry[],
  duration = ENERGY_WINDOW_HOURS,
): EnergyWindow | null {
  return getEnergyWindows(profile, duration)
    .reduce<EnergyWindow | null>((worst, window) => !worst || window.average < worst.average ? window : worst, null)
}

export function getEnergyProfileConfidence(
  bestWindow: EnergyWindow | null,
  worstWindow: EnergyWindow | null,
): EnergyConfidence {
  if (!bestWindow || !worstWindow) return 'insufficient'
  const minimumSamples = Math.min(bestWindow.minimumSamples, worstWindow.minimumSamples)
  if (minimumSamples >= 10) return 'high'
  if (minimumSamples >= 5) return 'medium'
  return 'low'
}

export async function getEnergyHistory(userId: string) {
  if (!userId) return { data: [], error: new Error('El usuario es obligatorio para consultar el historial energético.') }

  const records: EnergyLevelSample[] = []
  for (let offset = 0; ; offset += ENERGY_HISTORY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('energy_levels')
      .select('date, hour, energy_level')
      .eq('user_id', userId)
      .order('date')
      .order('hour')
      .range(offset, offset + ENERGY_HISTORY_PAGE_SIZE - 1)

    if (error) return { data: [], error }
    records.push(...((data || []) as EnergyLevelSample[]))
    if (!data || data.length < ENERGY_HISTORY_PAGE_SIZE) break
  }

  return { data: records, error: null }
}
