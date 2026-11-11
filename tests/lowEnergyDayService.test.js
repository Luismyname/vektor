import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, state, supabase } = vi.hoisted(() => {
  const state = { calls: [] }
  const query = {}
  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method] = vi.fn((...args) => {
      state.calls.push([method, ...args])
      return query
    })
  }
  query.maybeSingle = vi.fn(() => Promise.resolve({ data: { date: '2026-11-11', hour: 7, energy_level: 3 }, error: null }))
  return { query, state, supabase: { from: vi.fn(() => query) } }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import { getInitialEnergyCheckIn } from '../src/services/low-energy-day'

describe('initial low-energy check-in query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
  })

  it('only reads the earliest checkin for the requested user and date', async () => {
    const result = await getInitialEnergyCheckIn('user-1', '2026-11-11')

    expect(supabase.from).toHaveBeenCalledWith('energy_levels')
    expect(query.select).toHaveBeenCalledWith('date, hour, energy_level')
    expect(state.calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(state.calls).toContainEqual(['eq', 'date', '2026-11-11'])
    expect(state.calls).toContainEqual(['eq', 'source', 'checkin'])
    expect(query.order).toHaveBeenCalledWith('hour', { ascending: true })
    expect(query.limit).toHaveBeenCalledWith(1)
    expect(result.data).toEqual({ date: '2026-11-11', hour: 7, energy_level: 3 })
  })

  it('rejects invalid input without querying Supabase', async () => {
    const result = await getInitialEnergyCheckIn('', 'not-a-date')

    expect(result.error).toBeInstanceOf(Error)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
