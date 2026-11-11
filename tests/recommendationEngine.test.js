import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, supabase } = vi.hoisted(() => {
  const state = { responses: {}, queries: [] }
  const supabase = {
    from: vi.fn((table) => {
      state.queries.push({ table, methods: [] })
      const current = state.queries[state.queries.length - 1]
      const query = {}
      for (const method of ['select', 'eq', 'gte', 'lte', 'not']) {
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
  ])('supports %s confidence for reliable energy-based recommendations', (energyConfidence, expected) => {
    const [recommendation] = generateTaskRecommendations(
      [makeTask()],
      makeContext({ confidence: energyConfidence }),
    )

    expect(recommendation.confidence).toBe(expected)
    expect(recommendation.recommendedWindow).toEqual({ start: '00:00', end: '04:00' })
  })

  it('recommends only pending, high-priority or high-energy tasks', () => {
    const recommendations = generateTaskRecommendations([
      makeTask(),
      makeTask({ id: 'completed', status: 'completed' }),
      makeTask({ id: 'in-progress', status: 'in_progress' }),
      makeTask({ id: 'medium-energy', priority: 'medium', energy_cost: 3 }),
      makeTask({ id: 'high-cost', priority: 'medium', energy_cost: 4 }),
    ], makeContext())

    expect(recommendations.map(({ id }) => id)).toEqual(['task-task-1', 'task-high-cost'])
    expect(recommendations[0].reason).toContain('requiere mucha energía')
    expect(recommendations[0].recommendedWindow).toEqual({ start: '00:00', end: '04:00' })
  })

  it('does not recommend high-energy tasks on low-energy days and explains task splitting', () => {
    const recommendations = [
      ...generateTaskRecommendations([
        makeTask(),
        makeTask({ id: 'light', priority: 'high', energy_cost: 2 }),
      ], makeContext({ isLowEnergy: true })),
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

  it('respects recurring obligations and existing planner occurrences when selecting a window', () => {
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

    const [recommendation] = generateTaskRecommendations([makeTask()], makeContext({
      hourlyProfile: profile,
      obligations: [weeklyWork],
    }))
    expect(recommendation.recommendedWindow).toEqual({ start: '12:00', end: '16:00' })

    const blockedPlannerWindow = generateTaskRecommendations([makeTask()], makeContext({
      hourlyProfile: profile,
      plannerEntries: [{
        date: today,
        start_time: '12:00',
        end_time: '16:00',
        obligation_id: 'appointment',
        obligation_occurrence_date: today,
      }],
      obligations: [
        weeklyWork,
        {
          id: 'appointment',
          active: true,
          obligation_type: 'appointment',
          recurrence_rule: { frequency: 'once', startsOn: today, startTime: '12:00', endTime: '16:00', byDay: [] },
        },
      ],
    }))
    expect(blockedPlannerWindow[0].recommendedWindow).toEqual({ start: '16:00', end: '20:00' })
  })

  it('recommends active habits only with reliable profile data and an obligation-free window', () => {
    const recommendations = generateHabitRecommendations([
      { id: 'active', title: 'Leer', active: true },
      { id: 'inactive', title: 'Meditar', active: false },
    ], makeContext())

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({
      id: 'habit-active',
      type: 'habit',
      confidence: 'medium',
      recommendedWindow: { start: '00:00', end: '04:00' },
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
    expect(state.queries.map(({ table }) => table).sort()).toEqual(['obligations', 'weekly_planner'])
    expect(state.queries.flatMap(({ methods }) => methods).some(([method]) => method === 'insert' || method === 'update' || method === 'delete')).toBe(false)
  })
})
