import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, supabaseMock } = vi.hoisted(() => {
  const state = { calls: [], result: { data: [], error: null } }
  const query = {}
  for (const method of ['select', 'eq', 'order']) {
    query[method] = vi.fn((...args) => {
      state.calls.push([method, ...args])
      return query
    })
  }
  query.then = (resolve, reject) => Promise.resolve(state.result).then(resolve, reject)
  const supabaseMock = { from: vi.fn(() => query) }
  return { state, supabaseMock }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { getRecentCompletedActivity } from '../src/services/activity'

describe('getRecentCompletedActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.result = { data: [], error: null }
  })

  it('filtra por usuario, completadas y visibles, ordenando de más reciente a más antigua', async () => {
    const { activities, error } = await getRecentCompletedActivity('user-1')

    expect(supabaseMock.from).toHaveBeenCalledWith('activity')
    expect(state.calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(state.calls).toContainEqual(['eq', 'type', 'completed'])
    expect(state.calls).toContainEqual(['eq', 'hidden_in_dashboard', false])
    expect(state.calls).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(activities).toEqual([])
    expect(error).toBeNull()
  })
})
