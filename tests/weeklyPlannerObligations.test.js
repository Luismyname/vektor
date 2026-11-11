import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabaseMock, state } = vi.hoisted(() => {
  const state = { calls: [], inserts: [], responses: {} }
  const supabase = {
    from: vi.fn((table) => {
      const query = {}
      for (const method of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'not', 'is', 'update', 'delete']) {
        query[method] = vi.fn((...args) => {
          state.calls.push([table, method, ...args])
          return query
        })
      }
      query.insert = vi.fn((payload) => {
        state.inserts.push([table, payload])
        return query
      })
      query.single = vi.fn(() => Promise.resolve(state.responses[table]?.shift() || { data: null, error: null }))
      query.then = (resolve, reject) => Promise.resolve(state.responses[table]?.shift() || { data: [], error: null }).then(resolve, reject)
      return query
    }),
  }
  return { supabaseMock: supabase, state }
})

vi.mock('../src/services/supabase', () => ({ supabase: supabaseMock }))
vi.mock('../src/services/auth', () => ({ getCurrentProfile: vi.fn(async () => ({ profile: {}, error: null })) }))

import {
  createObligation,
  findObligationConflicts,
  getObligationOccurrenceDates,
  getObligationSegments,
  getWeeklyPlanner,
} from '../src/services/weekly-planner'

describe('obligaciones del planificador semanal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.calls = []
    state.inserts = []
    state.responses = {}
  })

  it('expande una regla semanal solo en los días elegidos y desde su fecha inicial', () => {
    const dates = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']
    expect(getObligationOccurrenceDates({
      frequency: 'weekly',
      startsOn: '2026-11-04',
      startTime: '09:00',
      endTime: '10:00',
      byDay: [1, 3],
    }, dates)).toEqual(['2026-11-04'])
  })

  it('divide el sueño nocturno en segmentos diarios y detecta solapamientos al cruzar medianoche', () => {
    const overnight = {
      id: 'sleep-1',
      date: '2026-11-09',
      start_time: '23:00:00',
      end_time: '07:00:00',
      obligation: { obligation_type: 'sleep' },
    }

    expect(getObligationSegments(overnight)).toEqual([
      { date: '2026-11-09', segment: 'start', startMinutes: 1380, endMinutes: 1440, label: '23:00 - 24:00' },
      { date: '2026-11-10', segment: 'end', startMinutes: 0, endMinutes: 420, label: '00:00 - 07:00' },
    ])
    expect(findObligationConflicts({
      date: '2026-11-10',
      start_time: '06:30',
      end_time: '07:30',
      obligation: { obligation_type: 'appointment' },
    }, [overnight])).toHaveLength(1)
  })

  it('crea el registro de definición y una ocurrencia que cruza medianoche', async () => {
    state.responses.obligations = [{
      data: { id: 'obligation-1', title: 'Dormir', obligation_type: 'sleep' },
      error: null,
    }]
    state.responses.weekly_planner = [{
      data: { id: 'entry-1', obligation_id: 'obligation-1', date: '2026-11-09' },
      error: null,
    }]

    const { entry, error } = await createObligation({
      title: 'Dormir',
      obligationType: 'sleep',
      startTime: '23:00',
      endTime: '07:00',
      recurrence: 'weekly',
      byDay: [1],
    }, '2026-11-09', 'user-1')

    expect(error).toBeNull()
    expect(entry.id).toBe('entry-1')
    expect(state.inserts).toEqual(expect.arrayContaining([
      ['obligations', expect.objectContaining({
        obligation_type: 'sleep',
        recurrence_rule: expect.objectContaining({ frequency: 'weekly', byDay: [1] }),
      })],
      ['weekly_planner', expect.objectContaining({
        date: '2026-11-09',
        start_time: '23:00',
        end_time: '07:00',
        obligation_id: 'obligation-1',
        obligation_occurrence_date: '2026-11-09',
      })],
    ]))
  })

  it('materializa recurrencias y devuelve la definición asociada al bloque', async () => {
    const obligation = {
      id: 'obligation-1',
      user_id: 'user-1',
      title: 'Sueño',
      obligation_type: 'sleep',
      active: true,
      timezone: 'Europe/Madrid',
      recurrence_rule: {
        frequency: 'weekly',
        startsOn: '2026-11-02',
        startTime: '23:00',
        endTime: '07:00',
        byDay: [1],
      },
    }
    state.responses.obligations = [{ data: [obligation], error: null }]
    state.responses.weekly_planner = [
      { data: [], error: null },
      { data: null, error: null },
      { data: [{ id: 'entry-1', date: '2026-11-09', start_time: '23:00', end_time: '07:00', obligation_id: 'obligation-1', obligation_occurrence_date: '2026-11-09' }], error: null },
      { data: [], error: null },
    ]

    const { entries, error } = await getWeeklyPlanner('user-1', '2026-11-09T12:00:00')

    expect(error).toBeNull()
    expect(state.inserts).toContainEqual(['weekly_planner', expect.objectContaining({
      obligation_id: 'obligation-1',
      obligation_occurrence_date: '2026-11-09',
    })])
    expect(entries).toHaveLength(1)
    expect(entries[0].obligation).toEqual(obligation)
  })
})
