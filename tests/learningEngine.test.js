import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, supabase } = vi.hoisted(() => {
  const state = { responses: {}, calls: [] }
  const supabase = {
    from: vi.fn((table) => {
      state.calls.push({ table, methods: [] })
      const current = state.calls[state.calls.length - 1]
      const query = {}
      for (const method of [
        'select',
        'eq',
        'gte',
        'lte',
        'order',
        'range',
        'update',
        'insert',
        'delete',
      ]) {
        query[method] = vi.fn((...args) => {
          current.methods.push([method, ...args])
          return query
        })
      }
      query.single = vi.fn(() => Promise.resolve(
        state.responses[table]?.shift() || { data: null, error: null },
      ))
      query.then = (resolve, reject) => Promise.resolve(
        state.responses[table]?.shift() || { data: [], error: null },
      ).then(resolve, reject)
      return query
    }),
  }
  return { state, supabase }
})

vi.mock('../src/services/supabase', () => ({ supabase }))

import {
  detectCompletionPatterns,
  detectDurationPreferences,
  detectEnergyImpactPatterns,
  detectEnergyCorrelation,
  detectFrictionPoints,
  detectLearningPatterns,
  detectTimePreferences,
  getLearningPatterns,
  loadLearningData,
  savePatterns,
} from '../src/services/learning-engine'

const userId = 'user-1'
const today = '2026-11-11'

function makePlannerEntry(index, overrides = {}) {
  return {
    id: `entry-${index}`,
    date: `2026-11-${String(1 + index).padStart(2, '0')}`,
    start_time: '09:00',
    end_time: '09:30',
    task_id: `task-${index}`,
    status: 'completed',
    ...overrides,
  }
}

function makeData(overrides = {}) {
  const plannerEntries = Array.from({ length: 10 }, (_, index) => makePlannerEntry(index))
  const tasks = plannerEntries.map((entry) => ({
    id: entry.task_id,
    status: entry.status,
    priority: 'high',
    energy_cost: 5,
    cognitive_load: 'high',
    estimated_duration: 30,
    actual_duration: 30,
  }))
  const correlations = plannerEntries.map((entry, index) => ({
    id: `correlation-${index}`,
    task_id: entry.task_id,
    energy_level_at_completion: index < 5 ? 8 : 3,
    duration_minutes: index < 5 ? 45 : 30,
    completed_at: `${entry.date}T10:00:00.000Z`,
  }))
  return {
    plannerEntries,
    tasks,
    correlations,
    energySamples: Array.from({ length: 24 }, (_, hour) => ({
      date: today,
      hour,
      energy_level: hour >= 8 && hour < 12 ? 8 : 3,
    })).flatMap((sample) => Array.from({ length: 3 }, () => sample)),
    sleepRecords: [],
    energyImpacts: [],
    habits: [],
    obligations: [],
    ...overrides,
  }
}

describe('learning engine pattern detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.responses = {}
    state.calls = []
  })

  it('detects a time preference from completed planner tasks and real hourly energy', () => {
    const data = makeData({
      tasks: Array.from({ length: 8 }, (_, index) => ({
        id: `task-${index}`,
        status: 'pending',
      })),
      plannerEntries: Array.from({ length: 8 }, (_, index) => makePlannerEntry(index, {
        start_time: '09:00',
      })),
    })

    expect(detectTimePreferences(data)[0]).toMatchObject({
      pattern_type: 'time_preference',
      confidence: expect.any(Number),
      pattern_data: {
        key: 'completed-task-window',
        start_time: '08:00',
        end_time: '12:00',
        completed_count: 8,
      },
    })
  })

  it('detects the duration bucket with the best observed completion rate', () => {
    const data = makeData({
      plannerEntries: [
        ...Array.from({ length: 6 }, (_, index) => makePlannerEntry(index, {
          end_time: '09:45',
        })),
        ...Array.from({ length: 4 }, (_, index) => makePlannerEntry(index + 6, {
          end_time: '09:30',
          status: 'failed',
        })),
      ],
      correlations: Array.from({ length: 6 }, (_, index) => ({
        id: `duration-${index}`,
        task_id: `task-${index}`,
        energy_level_at_completion: 7,
        duration_minutes: 45,
        completed_at: `2026-11-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
      })),
    })

    expect(detectDurationPreferences(data)[0]).toMatchObject({
      pattern_type: 'duration_preference',
      pattern_data: {
        key: 'successful-task-duration',
        duration_minutes: 45,
        completion_rate: 1,
      },
    })
  })

  it('detects completion energy and compares it with recorded sleep', () => {
    const data = makeData({
      sleepRecords: [
        ...Array.from({ length: 5 }, (_, index) => ({
          sleep_date: `2026-11-0${index + 1}`,
          hours_slept: 7,
          sleep_quality: 8,
        })),
        ...Array.from({ length: 5 }, (_, index) => ({
          sleep_date: `2026-11-${String(index + 6).padStart(2, '0')}`,
          hours_slept: 5,
          sleep_quality: 3,
        })),
      ],
    })
    const patterns = detectEnergyCorrelation(data)

    expect(patterns).toHaveLength(2)
    expect(patterns[0]).toMatchObject({
      pattern_type: 'energy_correlation',
      pattern_data: { key: 'energy-at-completion', completion_count: 10 },
    })
    expect(patterns[1].pattern_data).toMatchObject({
      key: 'sleep-and-completion-energy',
      rested_completion_count: 5,
      short_sleep_completion_count: 5,
    })
  })

  it('detects completion rates and recurring friction signals', () => {
    const entries = [
      ...Array.from({ length: 6 }, (_, index) => makePlannerEntry(index)),
      ...Array.from({ length: 5 }, (_, index) => makePlannerEntry(index + 6, {
        status: 'moved',
        start_time: '20:00',
      })),
      ...Array.from({ length: 5 }, (_, index) => makePlannerEntry(index + 11, {
        status: 'failed',
        start_time: '20:00',
      })),
    ]
    const tasks = entries.map((entry) => ({
      id: entry.task_id,
      status: entry.status === 'completed' ? 'completed' : 'pending',
      energy_cost: 5,
      cognitive_load: 'high',
    }))
    const energySamples = Array.from({ length: 3 }, (_, index) => ({
      date: `2026-11-0${index + 1}`,
      hour: 20,
      energy_level: 3,
    }))
    const data = makeData({ plannerEntries: entries, tasks, energySamples })

    expect(detectCompletionPatterns(data)[0]).toMatchObject({
      pattern_type: 'completion_rate',
      pattern_data: {
        completed_count: 6,
        failed_count: 5,
        moved_count: 5,
        outcome_count: 16,
      },
    })
    expect(detectFrictionPoints(data).map(({ pattern_data }) => pattern_data.key)).toEqual([
      'frequently-moved-tasks',
      'complex-task-failures',
      'low-energy-outcomes',
    ])
  })

  it('does not create patterns below the minimum evidence/confidence threshold', () => {
    const sparse = makeData({
      plannerEntries: [makePlannerEntry(0)],
      tasks: [{ id: 'task-0', status: 'completed' }],
      correlations: [{
        id: 'only-one',
        task_id: 'task-0',
        energy_level_at_completion: 9,
        duration_minutes: 30,
        completed_at: '2026-11-01T10:00:00.000Z',
      }],
    })

    expect(detectLearningPatterns(sparse)).toEqual([])
    expect(detectEnergyCorrelation(sparse)).toEqual([])
  })

  it('creates energy adaptation, recovery, drain, and neutral learning subtypes', () => {
    const now = new Date(`${today}T23:59:59.999Z`)
    const makeImpact = (index, delta, daysBefore, overrides = {}) => {
      const finishedAt = new Date(now)
      finishedAt.setUTCDate(finishedAt.getUTCDate() - daysBefore)
      return {
        id: `impact-${index}`,
        user_id: userId,
        task_id: 'task-adapting',
        habit_id: null,
        obligation_id: null,
        impact_type: 'task',
        energy_before: 5,
        energy_after: 5 + delta,
        energy_delta: delta,
        duration_minutes: 30,
        started_at: new Date(finishedAt.getTime() - 30 * 60000).toISOString(),
        finished_at: finishedAt.toISOString(),
        created_at: finishedAt.toISOString(),
        ...overrides,
      }
    }
    const impacts = [
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index, -4, 120)),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 5, -1, 30)),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 10, 2, 20, {
        task_id: 'task-recovery',
      })),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 15, -3, 20, {
        task_id: 'task-drain',
      })),
      ...Array.from({ length: 5 }, (_, index) => makeImpact(index + 20, 0, 20, {
        task_id: 'task-neutral',
      })),
    ]
    const data = makeData({
      tasks: [
        { id: 'task-adapting', title: 'Lectura técnica', status: 'completed' },
        { id: 'task-recovery', title: 'Pasear', status: 'completed' },
        { id: 'task-drain', title: 'Programación profunda', status: 'completed' },
        { id: 'task-neutral', title: 'Ordenar escritorio', status: 'completed' },
      ],
      energyImpacts: impacts,
    })

    expect(detectEnergyImpactPatterns(data, now)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pattern_type: 'energy_correlation',
        confidence: 2 / 3,
        pattern_data: expect.objectContaining({
          kind: 'energy_adaptation',
          activity: 'Lectura técnica',
          average_delta: -2.5,
          previous_average: -4,
          recent_average: -1,
        }),
      }),
      expect.objectContaining({
        pattern_data: expect.objectContaining({ kind: 'energy_recovery', activity: 'Pasear' }),
      }),
      expect.objectContaining({
        pattern_data: expect.objectContaining({ kind: 'energy_drain', activity: 'Programación profunda' }),
      }),
      expect.objectContaining({
        pattern_data: expect.objectContaining({ kind: 'energy_neutral', activity: 'Ordenar escritorio' }),
      }),
    ]))
  })
})

describe('learning engine persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.responses = {}
    state.calls = []
  })

  it('inserts a confident pattern and does not persist low-confidence candidates', async () => {
    state.responses.user_patterns = [
      { data: [], error: null },
      {
        data: {
          id: 'pattern-new',
          user_id: userId,
          pattern_type: 'time_preference',
          pattern_data: { key: 'completed-task-window', summary: 'Completas más tareas.' },
          confidence: 0.6,
        },
        error: null,
      },
    ]

    const { patterns, error } = await savePatterns(userId, [
      {
        pattern_type: 'time_preference',
        pattern_data: { key: 'completed-task-window', summary: 'Completas más tareas.' },
        confidence: 0.6,
      },
      {
        pattern_type: 'friction_point',
        pattern_data: { key: 'weak-signal', summary: 'Señal débil.' },
        confidence: 0.49,
      },
    ])

    expect(error).toBeNull()
    expect(patterns).toHaveLength(1)
    expect(state.calls.filter(({ table }) => table === 'user_patterns')).toHaveLength(2)
    expect(state.calls.some(({ table, methods }) =>
      table === 'user_patterns' && methods.some(([method]) => method === 'insert'),
    )).toBe(true)
  })

  it('persists energy impact subtypes under the schema-allowed energy_correlation type', async () => {
    state.responses.user_patterns = [
      { data: [], error: null },
      {
        data: {
          id: 'energy-pattern',
          user_id: userId,
          pattern_type: 'energy_correlation',
          pattern_data: {
            key: 'energy-impact:task:task-1',
            source: 'energy-impact-engine',
            kind: 'energy_adaptation',
          },
          confidence: 0.6,
        },
        error: null,
      },
    ]

    await savePatterns(userId, [{
      pattern_type: 'energy_correlation',
      pattern_data: {
        key: 'energy-impact:task:task-1',
        source: 'energy-impact-engine',
        kind: 'energy_adaptation',
        summary: 'Lectura técnica requiere menos energía que antes.',
      },
      confidence: 0.6,
    }])

    const insert = state.calls.find(({ table, methods }) =>
      table === 'user_patterns' && methods.some(([method]) => method === 'insert'))
    expect(insert.methods.find(([method]) => method === 'insert')[1]).toMatchObject({
      pattern_type: 'energy_correlation',
      pattern_data: expect.objectContaining({ kind: 'energy_adaptation' }),
    })
  })

  it('updates an existing pattern by its id instead of inserting a duplicate', async () => {
    state.responses.user_patterns = [
      {
        data: [{
          id: 'existing-pattern',
          user_id: userId,
          pattern_type: 'completion_rate',
          pattern_data: { key: 'task-completion-rate' },
          confidence: 0.6,
        }],
        error: null,
      },
      {
        data: {
          id: 'existing-pattern',
          user_id: userId,
          pattern_type: 'completion_rate',
          pattern_data: { key: 'task-completion-rate', summary: 'Has completado el 80%.' },
          confidence: 0.75,
        },
        error: null,
      },
    ]

    const { error } = await savePatterns(userId, [{
      pattern_type: 'completion_rate',
      pattern_data: { key: 'task-completion-rate', summary: 'Has completado el 80%.' },
      confidence: 0.75,
    }])

    expect(error).toBeNull()
    expect(state.calls.some(({ table, methods }) =>
      table === 'user_patterns' && methods.some(([method, ...args]) =>
        method === 'update' && args[0].confidence === 0.75,
      ),
    )).toBe(true)
    expect(state.calls.some(({ table, methods }) =>
      table === 'user_patterns' && methods.some(([method]) => method === 'insert'),
    )).toBe(false)
  })

  it('reads only persisted patterns whose confidence is at least 0.5', async () => {
    state.responses.user_patterns = [{
      data: [{
        id: 'pattern-1',
        user_id: userId,
        pattern_type: 'time_preference',
        pattern_data: { key: 'completed-task-window' },
        confidence: 0.8,
      }],
      error: null,
    }]

    const { patterns, error } = await getLearningPatterns(userId)

    expect(error).toBeNull()
    expect(patterns).toHaveLength(1)
    expect(state.calls[0].methods).toContainEqual(['gte', 'confidence', 0.5])
  })

  it('removes obsolete energy-impact subtypes when evidence no longer supports them', async () => {
    state.responses.user_patterns = [{
      data: [{
        id: 'old-energy-pattern',
        user_id: userId,
        pattern_type: 'energy_correlation',
        pattern_data: {
          key: 'energy-impact:task:task-1',
          source: 'energy-impact-engine',
        },
        confidence: 0.6,
      }],
      error: null,
    }]

    const { error } = await savePatterns(userId, [])

    expect(error).toBeNull()
    expect(state.calls.some(({ table, methods }) =>
      table === 'user_patterns' && methods.some(([method]) => method === 'delete'),
    )).toBe(true)
  })

  it('loads learning inputs from the existing tables only', async () => {
    for (const table of [
      'weekly_planner',
      'tasks',
      'energy_levels',
      'task_energy_correlation',
      'sleep_records',
      'energy_impacts',
      'habits',
      'obligations',
    ]) {
      state.responses[table] = [{ data: [], error: null }]
    }

    const { data, error } = await loadLearningData(userId, today)

    expect(error).toBeNull()
    expect(data).toMatchObject({
      plannerEntries: [],
      tasks: [],
      energySamples: [],
      correlations: [],
      sleepRecords: [],
      energyImpacts: [],
      habits: [],
      obligations: [],
    })
    expect(state.calls.map(({ table }) => table).sort()).toEqual([
      'energy_impacts',
      'energy_levels',
      'habits',
      'obligations',
      'sleep_records',
      'task_energy_correlation',
      'tasks',
      'weekly_planner',
    ])
  })
})
