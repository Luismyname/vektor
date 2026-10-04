import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, state } = vi.hoisted(() => {
  const state = { results: {}, tables: [], calls: [] }
  const supabaseMock = {
    from: vi.fn((table) => {
      state.tables.push(table)
      const query = {}
      for (const method of ['select', 'eq', 'gte', 'lte']) {
        query[method] = vi.fn((...args) => {
          state.calls.push({ table, method, args })
          return query
        })
      }
      query.then = (resolve, reject) => Promise.resolve(state.results[table]).then(resolve, reject)
      return query
    }),
  }
  return { supabaseMock, state }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { getFocusSessions } from '../src/services/weekly-planner'

describe('getFocusSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.tables = []
    state.calls = []
    state.results = {}
  })

  it('lee sesiones guardadas y convierte segundos a minutos', async () => {
    state.results.focus_sessions = {
      data: [{
        id: 'focus-1',
        user_id: 'user-1',
        task_id: 'task-1',
        started_at: '2026-09-29T10:00:00.000Z',
        ended_at: '2026-09-29T10:25:00.000Z',
        duration_seconds: 1500,
        status: 'completed',
      }],
      error: null,
    }

    const { sessions, error } = await getFocusSessions('user-1', new Date(2026, 8, 28, 0, 0, 0))

    expect(state.tables).toEqual(['focus_sessions'])
    expect(state.calls).toContainEqual({
      table: 'focus_sessions',
      method: 'gte',
      args: ['started_at', new Date('2026-09-28T00:00:00').toISOString()],
    })
    expect(state.calls).toContainEqual({
      table: 'focus_sessions',
      method: 'lte',
      args: ['started_at', new Date('2026-10-04T23:59:59.999').toISOString()],
    })
    expect(sessions[0]).toMatchObject({ id: 'focus-1', duration_minutes: 25, status: 'completed' })
    expect(error).toBeNull()
  })

  it('usa activity como alternativa si focus_sessions devuelve 404', async () => {
    state.results.focus_sessions = { data: null, error: { status: 404 } }
    state.results.activity = {
      data: [{ id: 'activity-1', created_at: '2026-09-29T10:00:00.000Z' }],
      error: null,
    }

    const { sessions, error } = await getFocusSessions('user-1', new Date(2026, 8, 28, 0, 0, 0))

    expect(state.tables).toEqual(['focus_sessions', 'activity'])
    expect(error).toBeNull()
    expect(sessions).toEqual([{
      id: 'activity-1',
      created_at: '2026-09-29T10:00:00.000Z',
      started_at: '2026-09-29T10:00:00.000Z',
      ended_at: '2026-09-29T10:00:00.000Z',
      duration_minutes: 0,
      status: 'completed',
    }])
  })
})