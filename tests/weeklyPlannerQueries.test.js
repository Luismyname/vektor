import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, getCurrentProfileMock, state } = vi.hoisted(() => {
  const state = {
    calls: [],
    tableCalls: [],
    inserted: [],
    result: { data: [], error: null },
    profile: { habits: { recommended: [], custom: [] } },
  }
  const getCurrentProfileMock = vi.fn(async () => ({ profile: state.profile, error: null }))
  const supabaseMock = {
    from: vi.fn((table) => {
      state.table = table
      const query = {}
      for (const method of ['select', 'eq', 'gte', 'lte', 'order', 'not', 'neq', 'update']) {
        query[method] = vi.fn((...args) => {
          state.calls.push([method, ...args])
          state.tableCalls.push([table, method, ...args])
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
  return { supabaseMock, getCurrentProfileMock, state }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))
vi.mock('../src/services/auth', () => ({ getCurrentProfile: getCurrentProfileMock }))

import {
  completeHabitOccurrence,
  createReminder,
  getHabitStatusHistory,
  getPlannerContext,
  getWeeklyPlanner,
} from '../src/services/weekly-planner'

describe('consultas del planificador semanal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.tableCalls = []
    state.inserted = []
    state.table = null
    state.result = { data: [], error: null }
    state.profile = { habits: { recommended: [], custom: [] } }
  })

  it('consulta IDs de tareas planificadas en cualquier semana', async () => {
    state.result = { data: [{ task_id: 'task-15' }], error: null }
    const { plannedTaskIds, error } = await getPlannerContext('user-1')

    expect(state.tableCalls).toContainEqual(['weekly_planner', 'select', 'task_id'])
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'eq', 'user_id', 'user-1'])
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'not', 'task_id', 'is', null])
    expect(state.tableCalls).not.toContainEqual(['weekly_planner', 'gte', 'date', expect.any(String)])
    expect(state.tableCalls).not.toContainEqual(['weekly_planner', 'lte', 'date', expect.any(String)])
    expect(plannedTaskIds).toEqual(['task-15'])
    expect(error).toBeNull()
  })

  it('devuelve únicamente los hábitos activos seleccionados en el perfil', async () => {
    state.profile = {
      habits: {
        recommended: [
          { id: 'chosen-recommended', title: 'Aprender 10 minutos al día', active: true },
          { id: 'unchosen-recommended', title: 'Leer 10 páginas', active: false },
        ],
        custom: [
          { id: 'chosen-custom', title: 'Estudiar', active: true },
        ],
      },
    }

    const { selectedHabits, error } = await getPlannerContext('user-1')

    expect(getCurrentProfileMock).toHaveBeenCalledWith('user-1')
    expect(selectedHabits.map(({ id }) => id)).toEqual(['chosen-recommended', 'chosen-custom'])
    expect(error).toBeNull()
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

  it('completa una ocurrencia de hábito del usuario en weekly_planner', async () => {
    const completedEntry = {
      id: 'planner-habit-1',
      user_id: 'user-1',
      habit_id: 'habit-1',
      status: 'completed',
    }
    state.result = { data: completedEntry, error: null }

    const result = await completeHabitOccurrence('planner-habit-1', 'user-1')

    expect(state.table).toBe('weekly_planner')
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'eq', 'id', 'planner-habit-1'])
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'eq', 'user_id', 'user-1'])
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'not', 'habit_id', 'is', null])
    expect(state.tableCalls).toContainEqual(['weekly_planner', 'neq', 'status', 'completed'])
    expect(result).toEqual({ entry: completedEntry, error: null })
  })

  it('no intenta completar una ocurrencia sin entrada o usuario', async () => {
    const result = await completeHabitOccurrence(null, 'user-1')

    expect(supabaseMock.from).not.toHaveBeenCalled()
    expect(result.entry).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })
})