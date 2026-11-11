import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, state, supabase } = vi.hoisted(() => {
  const state = { calls: [], payloads: [], responses: [] }
  const query = {}
  for (const method of ['insert', 'update', 'select', 'eq', 'order', 'limit']) {
    query[method] = vi.fn((...args) => {
      state.calls.push([method, ...args])
      if (method === 'insert' || method === 'update') state.payloads.push([method, ...args])
      return query
    })
  }
  query.single = vi.fn(() => Promise.resolve(state.responses.shift() || { data: null, error: null }))
  query.maybeSingle = vi.fn(() => Promise.resolve(state.responses.shift() || { data: null, error: null }))
  query.then = (resolve, reject) => Promise.resolve(state.responses.shift() || { data: [], error: null }).then(resolve, reject)
  return {
    query,
    state,
    supabase: { from: vi.fn(() => query) },
  }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  getSleepHistory,
  getSleepRecord,
  saveSleepRecord,
  updateSleepRecord,
} from '../src/services/sleep'

const input = {
  sleep_date: '2026-11-10',
  hours_slept: 7.5,
  sleep_quality: 8,
  sleep_medication: false,
  notes: '  Descanso tranquilo  ',
  sleep_start: '23:00',
  sleep_end: '06:30',
}

describe('sleep record service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.payloads = []
    state.responses = []
  })

  it('creates a record with normalized optional fields in sleep_records', async () => {
    state.responses.push({ data: { id: 'sleep-1', ...input }, error: null })

    const result = await saveSleepRecord('user-1', input)

    expect(supabase.from).toHaveBeenCalledWith('sleep_records')
    expect(query.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      ...input,
      notes: 'Descanso tranquilo',
      sleep_start: null,
      sleep_end: null,
    })
    expect(result.data.id).toBe('sleep-1')
    expect(result.error).toBeNull()
  })

  it('updates only the selected user-owned record', async () => {
    state.responses.push({ data: { id: 'sleep-1' }, error: null })

    await updateSleepRecord('user-1', 'sleep-1', input)

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      sleep_date: input.sleep_date,
      hours_slept: input.hours_slept,
      sleep_quality: input.sleep_quality,
      sleep_medication: input.sleep_medication,
      notes: 'Descanso tranquilo',
      sleep_start: null,
      sleep_end: null,
    }))
    expect(query.eq).toHaveBeenCalledWith('id', 'sleep-1')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('loads one date and an ordered, bounded user history', async () => {
    state.responses.push(
      { data: { id: 'sleep-1' }, error: null },
      { data: [{ id: 'sleep-1' }], error: null },
    )

    expect((await getSleepRecord('user-1', input.sleep_date)).data.id).toBe('sleep-1')
    expect((await getSleepHistory('user-1', 10)).data).toHaveLength(1)
    expect(query.eq).toHaveBeenCalledWith('sleep_date', input.sleep_date)
    expect(query.order).toHaveBeenCalledWith('sleep_date', { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(10)
  })

  it('rejects invalid values before issuing a database request', async () => {
    const result = await saveSleepRecord('user-1', { ...input, sleep_quality: 11 })

    expect(result.error).toBeInstanceOf(Error)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
