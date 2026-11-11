import { describe, expect, it } from 'vitest'
import { detectLowEnergyDay } from '../src/lib/lowEnergyDay'

describe('detectLowEnergyDay', () => {
  it('detects every applicable reason without duplicate entries', () => {
    expect(detectLowEnergyDay(
      { hours_slept: 5.5, sleep_quality: 4 },
      { energy_level: 3 },
    )).toEqual({
      isLowEnergy: true,
      reasons: [
        'Has dormido menos de 6 horas',
        'Tu calidad de sueño es baja',
        'Tu check-in energético inicial es bajo',
      ],
    })
  })

  it('treats threshold boundaries as healthy and does not report a false positive', () => {
    expect(detectLowEnergyDay(
      { hours_slept: 6, sleep_quality: 5 },
      { energy_level: 5 },
    )).toEqual({ isLowEnergy: false, reasons: [] })
  })

  it('detects a low value from any single source', () => {
    expect(detectLowEnergyDay({ hours_slept: 5.9 })).toMatchObject({ isLowEnergy: true })
    expect(detectLowEnergyDay({ sleep_quality: 4 })).toMatchObject({ isLowEnergy: true })
    expect(detectLowEnergyDay(null, { energy_level: 4 })).toMatchObject({ isLowEnergy: true })
  })

  it('ignores missing, null, and non-finite values', () => {
    expect(detectLowEnergyDay(
      { hours_slept: null, sleep_quality: Number.NaN },
      { energy_level: Number.POSITIVE_INFINITY },
    )).toEqual({ isLowEnergy: false, reasons: [] })
    expect(detectLowEnergyDay()).toEqual({ isLowEnergy: false, reasons: [] })
  })

  it('ignores values outside the stored data ranges', () => {
    expect(detectLowEnergyDay(
      { hours_slept: 0, sleep_quality: 0 },
      { energy_level: 0 },
    )).toEqual({ isLowEnergy: false, reasons: [] })
  })
})
