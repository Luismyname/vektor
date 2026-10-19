import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, state } = vi.hoisted(() => {
  const state = { calls: [], inserted: [], result: { data: [], error: null } }
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
      query.insert = vi.fn((...args) => {
        state.inserted.push(...args)
        return query
      })
      query.single = vi.fn(() => Promise.resolve(state.result))
      query.then = (resolve, reject) => Promise.resolve(state.result).then(resolve, reject)
      return query
    }),
  }
  return { supabaseMock, state }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))

import { createReminder, getHabitStatusHistory, getWeeklyPlanner } from '../src/services/weekly-planner'

describe('consultas del planificador semanal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.inserted = []
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

  it('persiste el título de un recordatorio en el campo de notas existente', async () => {
    state.result = { data: { id: 'reminder-1', notes: 'Llamar al equipo' }, error: null }

    const { entry, error } = await createReminder(
      { title: 'Llamar al equipo' },
      '2026-10-19',
      '23:00',
      '23:59',
      'user-1',
    )

    expect(state.table).toBe('weekly_planner')
    expect(state.inserted[0]).toMatchObject({
      user_id: 'user-1',
      date: '2026-10-19',
      start_time: '23:00',
      end_time: '23:59',
      task_id: null,
      habit_id: null,
      status: 'scheduled',
      notes: 'Llamar al equipo',
    })
    expect(entry.notes).toBe('Llamar al equipo')
    expect(error).toBeNull()
  })
})