import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, state } = vi.hoisted(() => {
  const state = { calls: [], result: { data: [], error: null } }
  const supabaseMock = {
    from: vi.fn((table) => {
      state.table = table
      const query = {}
      for (const method of ['select', 'eq', 'gte', 'lte', 'order']) {
        query[method] = vi.fn((...args) => {
          state.calls.push([method, ...args])
          return query
        })
      }
      query.then = (resolve, reject) => Promise.resolve(state.result).then(resolve, reject)
      return query
    }),
  }
  return { supabaseMock, state }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { getHabitStatusHistory, getWeeklyPlanner } from '../src/services/weekly-planner'

describe('consultas del planificador semanal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.table = null
    state.result = { data: [], error: null }
  })

  it('consulta el rango completo usando fechas ISO válidas', async () => {
    const { entries, error } = await getWeeklyPlanner('user-1', new Date(2026, 8, 28, 0, 0, 0))

    expect(state.table).toBe('weekly_planner')
    expect(state.calls).toContainEqual(['gte', 'date', '2026-09-28'])
    expect(state.calls).toContainEqual(['lte', 'date', '2026-10-04'])
    expect(entries).toEqual([])
    expect(error).toBeNull()
  })

  it('consulta el historial de hábitos por usuario y fecha planeada', async () => {
    const { events, error } = await getHabitStatusHistory('user-1', '2026-09-28', '2026-10-04')

    expect(state.table).toBe('habit_status_history')
    expect(state.calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(state.calls).toContainEqual(['gte', 'planned_date', '2026-09-28'])
    expect(state.calls).toContainEqual(['lte', 'planned_date', '2026-10-04'])
    expect(events).toEqual([])
    expect(error).toBeNull()
  })
})