export interface LowEnergySleepData {
  hours_slept?: number | null
  sleep_quality?: number | null
}

export interface LowEnergyCheckIn {
  energy_level?: number | null
}

export interface LowEnergyDayResult {
  isLowEnergy: boolean
  reasons: string[]
}

export function detectLowEnergyDay(
  sleepRecord?: LowEnergySleepData | null,
  initialEnergyCheckIn?: LowEnergyCheckIn | null,
): LowEnergyDayResult {
  const reasons: string[] = []

  if (typeof sleepRecord?.hours_slept === 'number'
    && Number.isFinite(sleepRecord.hours_slept)
    && sleepRecord.hours_slept > 0
    && sleepRecord.hours_slept <= 24
    && sleepRecord.hours_slept < 6) {
    reasons.push('Has dormido menos de 6 horas')
  }

  if (typeof sleepRecord?.sleep_quality === 'number'
    && Number.isInteger(sleepRecord.sleep_quality)
    && sleepRecord.sleep_quality >= 1
    && sleepRecord.sleep_quality <= 10
    && sleepRecord.sleep_quality <= 4) {
    reasons.push('Tu calidad de sueño es baja')
  }

  if (typeof initialEnergyCheckIn?.energy_level === 'number'
    && Number.isInteger(initialEnergyCheckIn.energy_level)
    && initialEnergyCheckIn.energy_level >= 1
    && initialEnergyCheckIn.energy_level <= 10
    && initialEnergyCheckIn.energy_level <= 4) {
    reasons.push('Tu check-in energético inicial es bajo')
  }

  return { isLowEnergy: reasons.length > 0, reasons }
}
