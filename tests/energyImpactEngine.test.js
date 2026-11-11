import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, state, supabase } = vi.hoisted(() => {
  const state = { maybeSingleResult: null, singleResult: null, rows: [] }
  const query = {}
  for (const method of [
    'eq',
    'gte',
    'is',
    'not',
    'order',
    'limit',
    'range',
    'insert',
    'update',
    'select',
  ]) {
    query[method] = vi.fn(() => query)
  }
  query.single = vi.fn(() => Promise.resolve(state.singleResult))
  query.maybeSingle = vi.fn(() => Promise.resolve(state.maybeSingleResult))
  query.then = (resolve, reject) => Promise.resolve({
    data: state.rows,
    error: null,
  }).then(resolve, reject)
  return {
    query,
    state,
    supabase: { from: vi.fn(() => query) },
  }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  calculateAverageImpact,
  calculateImpactTrend,
  detectEnergyAdaptation,
  getEnergyImpactConfidence,
  recordHabitImpact,
  recordObligationImpact,
  recordTaskImpact,
  summarizeEnergyImpacts,
} from '../src/services/energy-impact-engine'

const now = new Date('2026-11-11T12:00:00.000Z')

function makeImpact(index, energyDelta, finishedAt, overrides = {}) {
  const energyBefore = 5
  const energyAfter = energyBefore + energyDelta
  return {
    id: `impact-${index}`,
    user_id: 'user-1',
    task_id: 'task-1',
    habit_id: null,
    obligation_id: null,
    impact_type: 'task',
    energy_before: energyBefore,
    energy_after: energyAfter,
    energy_delta: energyDelta,
    duration_minutes: 30,
    started_at: new Date(new Date(finishedAt).getTime() - 30 * 60000).toISOString(),
    finished_at: finishedAt,
    created_at: finishedAt,
    ...overrides,
  }
}

function datedImpacts(count, delta, daysBeforeNow, overrides = {}) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() - daysBeforeNow)
  return Array.from({ length: count }, (_, index) => makeImpact(
    `${daysBeforeNow}-${index}`,
    delta,
    new Date(date.getTime() + index * 60000).toISOString(),
    overrides,
  ))
}

describe('energy impact engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.maybeSingleResult = null
    state.singleResult = null
    state.rows = []
    for (const method of Object.keys(query)) {
      if (typeof query[method]?.mockClear === 'function') query[method].mockClear()
    }
  })

  it('records a task start with only the exact energy_impacts columns', async () => {
    state.singleResult = { data: { id: 'impact-1' }, error: null }

    await recordTaskImpact('user-1', 'task-1', 'start', 7)

    expect(supabase.from).toHaveBeenCalledWith('energy_impacts')
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      task_id: 'task-1',
      impact_type: 'task',
      energy_before: 7,
      energy_after: null,
      energy_delta: null,
      finished_at: null,
    }))
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty('planner_entry_id')
  })

  it.each([
    ['habit', recordHabitImpact, 'habit-1'],
    ['obligation', recordObligationImpact, 'obligation-1'],
  ])('records a %s start against its activity id', async (impactType, record, activityId) => {
    state.singleResult = { data: { id: 'impact-1' }, error: null }

    await record('user-1', activityId, 'start', 6)

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      [`${impactType}_id`]: activityId,
      impact_type: impactType,
      energy_before: 6,
    }))
  })

  it('calculates the delta and duration when completing a captured impact', async () => {
    state.maybeSingleResult = {
      data: {
        id: 'impact-1',
        energy_before: 4,
        started_at: new Date(Date.now() - 40 * 60000).toISOString(),
      },
      error: null,
    }
    state.singleResult = { data: { id: 'impact-1' }, error: null }

    await recordTaskImpact('user-1', 'task-1', 'finish', 8)

    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      energy_after: 8,
      energy_delta: 4,
      duration_minutes: expect.any(Number),
      finished_at: expect.any(String),
    }))
    expect(query.is).toHaveBeenCalledWith('finished_at', null)
  })

  it('does not fabricate an impact when no start capture exists', async () => {
    state.maybeSingleResult = { data: null, error: null }

    const result = await recordHabitImpact('user-1', 'habit-1', 'finish', 6)

    expect(result).toMatchObject({ data: null, error: null, skipped: true })
    expect(query.update).not.toHaveBeenCalled()
  })

  it('rejects invalid energy values before writing', async () => {
    const result = await recordObligationImpact('user-1', 'obligation-1', 'start', 11)

    expect(result.error).toBeInstanceOf(Error)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('calculates averages from completed, valid records only', () => {
    const impacts = [
      makeImpact(1, -4, now.toISOString()),
      makeImpact(2, 2, now.toISOString()),
      makeImpact(3, 5, null, { energy_after: null, energy_delta: null }),
    ]

    expect(calculateAverageImpact(impacts)).toBe(-1)
  })

  it('detects an improving impact trend across two sufficient periods', () => {
    const impacts = [
      ...datedImpacts(5, -4, 120),
      ...datedImpacts(5, -1, 30),
    ]

    expect(calculateImpactTrend(impacts, now)).toMatchObject({
      previousAverage: -4,
      recentAverage: -1,
      change: 3,
      direction: 'improving',
      confidence: 0.5,
    })
  })

  it('does not infer a trend without enough samples in each period', () => {
    expect(calculateImpactTrend([
      ...datedImpacts(4, -4, 120),
      ...datedImpacts(5, -1, 30),
    ], now)).toBeNull()
  })

  it('detects adaptation only when recent impact is meaningfully better', () => {
    const adapting = [
      ...datedImpacts(5, -4, 120),
      ...datedImpacts(5, -1, 30),
    ]
    const unchanged = [
      ...datedImpacts(5, -2, 120, { task_id: 'task-2' }),
      ...datedImpacts(5, -2, 30, { task_id: 'task-2' }),
    ]

    expect(detectEnergyAdaptation([...adapting, ...unchanged], now)).toEqual([
      expect.objectContaining({
        activityId: 'task-1',
        impactType: 'task',
        previousAverage: -4,
        recentAverage: -1,
        trend: 'improving',
      }),
    ])
  })

  it('classifies recovering, draining, and neutral activities using recorded deltas', () => {
    const impacts = [
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index, 2, now.toISOString())),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 5, -3, now.toISOString(), { task_id: 'task-2' })),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 10, 0, now.toISOString(), { task_id: 'task-3' })),
    ]

    expect(summarizeEnergyImpacts(impacts, now)).toEqual(expect.arrayContaining([
      expect.objectContaining({ activityId: 'task-1', classification: 'recovery', averageImpact: 2 }),
      expect.objectContaining({ activityId: 'task-2', classification: 'drain', averageImpact: -3 }),
      expect.objectContaining({ activityId: 'task-3', classification: 'neutral', averageImpact: 0 }),
    ]))
  })

  it('derives confidence from sample count and enforces the minimum evidence threshold', () => {
    expect(getEnergyImpactConfidence(4)).toBeLessThan(0.5)
    expect(getEnergyImpactConfidence(5)).toBe(0.5)
  })
})
