import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, supabase } = vi.hoisted(() => {
  const state = { responses: {}, queries: [] }
  const supabase = {
    from: vi.fn((table) => {
      state.queries.push({ table, methods: [] })
      const current = state.queries[state.queries.length - 1]
      const query = {}
      for (const method of ['select', 'eq', 'gte', 'lte', 'not', 'order', 'range']) {
        query[method] = vi.fn((...args) => {
          current.methods.push([method, ...args])
          return query
        })
      }
      query.then = (resolve, reject) => Promise.resolve(state.responses[table] || { data: [], error: null }).then(resolve, reject)
      return query
    }),
  }
  return { state, supabase }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  calculateRecommendationConfidence,
  generateHabitRecommendations,
  generateLowEnergyRecommendations,
  generateTaskRecommendations,
  getRecommendationAvailability,
  sortAndLimitRecommendations,
} from '../src/services/recommendation-engine'

const today = '2026-11-11'
const obligations = []
const plannerEntries = []

function makeProfile(value = 7) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    average: value,
    sampleCount: 3,
  }))
}

function makeContext(overrides = {}) {
  return {
    hourlyProfile: makeProfile(),
    confidence: 'medium',
    obligations,
    plannerEntries,
    today,
    isLowEnergy: false,
    ...overrides,
  }
}

function makeEvidence(activityId = 'task-1', activityType = 'task', overrides = {}) {
  return {
    activityId,
    activityType,
    attemptCount: 8,
    completedCount: 6,
    bestHour: 9,
    bestCompletionRate: 0.9,
    worstCompletionRate: 0.5,
    averageEnergyDelta: 1.5,
    energyImpactCount: 6,
    frictionCount: 2,
    adapted: true,
    sleepAverageHours: 7,
    ...overrides,
  }
}

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Preparar informe',
    description: '',
    priority: 'high',
    status: 'pending',
    related_value: null,
    created_at: '2026-11-01T10:00:00Z',
    completed_at: null,
    energy_cost: 5,
    cognitive_load: 'high',
    work_type: 'deep',
    estimated_duration: 60,
    actual_duration: null,
    ...overrides,
  }
}

describe('recommendation engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.responses = {}
    state.queries = []
  })

  it('does not recommend tasks when the user has no data or the profile confidence is low', () => {
    expect(generateTaskRecommendations([], makeContext())).toEqual([])
    expect(generateHabitRecommendations([], makeContext())).toEqual([])
    expect(generateTaskRecommendations([makeTask()], makeContext({
      confidence: 'low',
    }))).toEqual([])
    expect(calculateRecommendationConfidence({ energyConfidence: 'low' })).toBeNull()
  })

  it.each([
    ['medium', 'medium'],
    ['high', 'high'],
  ])('supports %s confidence when activity history supports the proposal', (energyConfidence, expected) => {
    const [recommendation] = generateTaskRecommendations(
      [makeTask()],
      makeContext({
        confidence: energyConfidence,
        activityEvidence: [makeEvidence()],
      }),
    )

    expect(recommendation.confidence).toBe(expected)
    expect(recommendation.recommendedWindow).toEqual({ start: '09:00', end: '10:00' })
  })

  it('requires activity-specific evidence and recommends only pending, high-priority or high-energy tasks', () => {
    expect(generateTaskRecommendations([makeTask()], makeContext())).toEqual([])
    const recommendations = generateTaskRecommendations([
      makeTask(),
      makeTask({ id: 'completed', status: 'completed' }),
      makeTask({ id: 'in-progress', status: 'in_progress' }),
      makeTask({ id: 'medium-energy', priority: 'medium', energy_cost: 3 }),
      makeTask({ id: 'high-cost', priority: 'medium', energy_cost: 4 }),
    ], makeContext({
      activityEvidence: [
        makeEvidence(),
        makeEvidence('high-cost'),
      ],
    }))

    expect(recommendations.map(({ id }) => id)).toEqual(['task-task-1', 'task-high-cost'])
    expect(recommendations[0].reason).toContain('alto coste energético')
    expect(recommendations[0].reason).toContain('impacto energético medio')
    expect(recommendations[0].reason).toContain('señales de fricción')
    expect(recommendations[0].reason).toContain('adaptación')
    expect(recommendations[0].recommendedWindow).toEqual({ start: '09:00', end: '10:00' })
  })

  it('does not recommend high-energy tasks on low-energy days and explains task splitting', () => {
    const recommendations = [
      ...generateTaskRecommendations([
        makeTask(),
        makeTask({ id: 'light', priority: 'high', energy_cost: 2 }),
      ], makeContext({
        isLowEnergy: true,
        activityEvidence: [makeEvidence('light')],
      })),
      ...generateLowEnergyRecommendations(
        { isLowEnergy: true, reasons: ['Has dormido menos de 6 horas'] },
        null,
      ),
    ]

    expect(recommendations.map(({ id }) => id)).toEqual(['task-light', 'low-energy-day'])
    expect(recommendations.find(({ id }) => id === 'low-energy-day').title).toContain('bloques más pequeños')
    expect(recommendations.some(({ id }) => id === 'task-task-1')).toBe(false)
  })

  it('recommends lighter cognitive load after poor sleep and grounds its reason in the record', () => {
    const [recommendation] = generateLowEnergyRecommendations(
      { isLowEnergy: false, reasons: [] },
      { hours_slept: 5, sleep_quality: 4 },
    )

    expect(recommendation).toMatchObject({
      id: 'sleep-load',
      type: 'sleep',
      confidence: 'high',
    })
    expect(recommendation.reason).toContain('5 horas de sueño')
    expect(recommendation.reason).toContain('4/10')
  })

  it('does not make a poor-sleep recommendation without a threshold-triggering record', () => {
    expect(generateLowEnergyRecommendations(
      { isLowEnergy: false, reasons: [] },
      { hours_slept: 6, sleep_quality: 5 },
    )).toEqual([])
    expect(generateLowEnergyRecommendations(
      { isLowEnergy: false, reasons: [] },
      null,
    )).toEqual([])
  })

  it('does not recommend an activity window blocked by recurring obligations or planner entries', () => {
    const profile = makeProfile(4).map((entry) => ({
      ...entry,
      average: entry.hour >= 8 && entry.hour < 12
        ? 10
        : entry.hour >= 12 && entry.hour < 16
          ? 8
          : entry.hour >= 16 && entry.hour < 20
            ? 6
            : 4,
    }))
    const weeklyWork = {
      id: 'work',
      active: true,
      obligation_type: 'work',
      recurrence_rule: {
        frequency: 'weekly',
        startsOn: '2026-11-09',
        startTime: '08:00',
        endTime: '12:00',
        byDay: [1, 2, 3, 4, 5, 6, 7],
      },
    }

    const recurringConflict = generateTaskRecommendations([makeTask()], makeContext({
      hourlyProfile: profile,
      obligations: [weeklyWork],
      activityEvidence: [makeEvidence()],
    }))
    expect(recurringConflict).toEqual([])

    const blockedPlannerWindow = generateTaskRecommendations([makeTask()], makeContext({
      hourlyProfile: profile,
      activityEvidence: [makeEvidence()],
      plannerEntries: [{
        date: today,
        start_time: '09:00',
        end_time: '10:00',
        obligation_id: 'appointment',
        obligation_occurrence_date: today,
      }],
      obligations: [],
    }))
    expect(blockedPlannerWindow).toEqual([])
  })

  it('recommends active habits only with activity history and reliable profile data', () => {
    const recommendations = generateHabitRecommendations([
      { id: 'active', title: 'Leer', active: true },
      { id: 'inactive', title: 'Meditar', active: false },
    ], makeContext({
      activityEvidence: [makeEvidence('active', 'habit')],
    }))

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({
      id: 'habit-active',
      type: 'habit',
      confidence: 'medium',
      recommendedWindow: { start: '09:00', end: '10:00' },
    })
  })

  it('limits combined recommendations to three in descending impact order', () => {
    const result = sortAndLimitRecommendations([
      { id: 'habit', type: 'habit', title: 'h', reason: 'r', confidence: 'medium', priority: 30 },
      { id: 'sleep', type: 'sleep', title: 's', reason: 'r', confidence: 'medium', priority: 90 },
      { id: 'task', type: 'task', title: 't', reason: 'r', confidence: 'high', priority: 80 },
      { id: 'energy', type: 'energy', title: 'e', reason: 'r', confidence: 'high', priority: 100 },
    ])

    expect(result.map(({ id }) => id)).toEqual(['energy', 'sleep', 'task'])
  })

  it('loads obligations and planner occurrences using read-only queries', async () => {
    const result = await getRecommendationAvailability('user-1', today)

    expect(result.error).toBeNull()
    expect(state.queries.map(({ table }) => table).sort()).toEqual([
      'energy_impacts',
      'habit_status_history',
      'obligations',
      'sleep_records',
      'user_patterns',
      'weekly_planner',
    ])
    expect(state.queries.flatMap(({ methods }) => methods).some(([method]) => method === 'insert' || method === 'update' || method === 'delete')).toBe(false)
  })
})
