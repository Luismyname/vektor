import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, state, supabase } = vi.hoisted(() => {
  const state = { records: [], calls: [], error: null }
  const query = {}
  for (const method of ['select', 'eq', 'order', 'range']) {
    query[method] = vi.fn((...args) => {
      state.calls.push([method, ...args])
      return query
    })
  }
  query.then = (resolve, reject) => {
    const range = [...state.calls].reverse().find(([method]) => method === 'range')
    const start = range?.[1] || 0
    const end = range?.[2] ?? 999
    return Promise.resolve({
      data: state.records.slice(start, end + 1),
      error: state.error,
    }).then(resolve, reject)
  }
  return { query, state, supabase: { from: vi.fn(() => query) } }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  calculateHourlyEnergyProfile,
  getBestEnergyWindow,
  getEnergyHistory,
  getEnergyProfileConfidence,
  getWorstEnergyWindow,
} from '../src/services/energy-insights'

function makeSamples(hourValues, count = 3) {
  return Object.entries(hourValues).flatMap(([hour, values]) =>
    Array.from({ length: count }, (_, index) => ({
      date: `2026-11-${String(index + 1).padStart(2, '0')}`,
      hour: Number(hour),
      energy_level: Array.isArray(values) ? values[index % values.length] : values,
    })),
  )
}

describe('energy insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.records = []
    state.calls = []
    state.error = null
  })

  it('averages real observations and suppresses hours below the sample threshold', () => {
    const samples = [
      ...makeSamples({ 8: [4, 6, 8] }),
      { date: '2026-11-04', hour: 9, energy_level: 9 },
      { date: '2026-11-04', hour: 24, energy_level: 10 },
      { date: '2026-11-04', hour: 10, energy_level: 0 },
    ]

    const profile = calculateHourlyEnergyProfile(samples)

    expect(profile).toHaveLength(24)
    expect(profile[8]).toEqual({ hour: 8, average: 6, sampleCount: 3 })
    expect(profile[9]).toEqual({ hour: 9, average: null, sampleCount: 1 })
    expect(profile[24]).toBeUndefined()
    expect(profile[10]).toEqual({ hour: 10, average: null, sampleCount: 0 })
  })

  it('selects the highest and lowest consecutive four-hour windows from populated hours only', () => {
    const profile = calculateHourlyEnergyProfile(makeSamples({
      6: 2,
      7: 2,
      8: 2,
      9: 2,
      13: 9,
      14: 9,
      15: 9,
      16: 9,
    }))

    expect(getBestEnergyWindow(profile)).toMatchObject({
      startHour: 13,
      endHour: 17,
      average: 9,
      sampleCount: 12,
      minimumSamples: 3,
    })
    expect(getWorstEnergyWindow(profile)).toMatchObject({
      startHour: 6,
      endHour: 10,
      average: 2,
    })
    expect(getEnergyProfileConfidence(getBestEnergyWindow(profile), getWorstEnergyWindow(profile))).toBe('low')
  })

  it('does not fill missing hours or return windows when the data has gaps', () => {
    const profile = calculateHourlyEnergyProfile(makeSamples({ 8: 7, 9: 7, 10: 7 }))

    expect(profile[11].average).toBeNull()
    expect(getBestEnergyWindow(profile)).toBeNull()
    expect(getWorstEnergyWindow(profile)).toBeNull()
    expect(getEnergyProfileConfidence(null, null)).toBe('insufficient')
  })

  it('uses the earliest start to resolve tied windows', () => {
    const profile = calculateHourlyEnergyProfile(makeSamples({
      8: 8,
      9: 8,
      10: 8,
      11: 8,
      12: 8,
    }))

    expect(getBestEnergyWindow(profile)?.startHour).toBe(8)
  })

  it('loads all real user samples in pages and propagates database errors', async () => {
    state.records = Array.from({ length: 1001 }, (_, index) => ({
      date: '2026-11-11',
      hour: index % 24,
      energy_level: 8,
    }))

    const result = await getEnergyHistory('user-1')

    expect(supabase.from).toHaveBeenCalledWith('energy_levels')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.select).toHaveBeenCalledWith('date, hour, energy_level')
    expect(result.data).toHaveLength(1001)
    expect(query.range.mock.calls).toEqual([[0, 999], [1000, 1999]])

    state.error = new Error('read failed')
    const failedResult = await getEnergyHistory('user-1')
    expect(failedResult.error).toBe(state.error)
  })
})
