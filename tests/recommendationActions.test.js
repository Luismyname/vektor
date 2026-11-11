import { beforeEach, describe, expect, it, vi } from 'vitest'

const { movePlannerEntry, scheduleTask, getRecommendationAvailability } = vi.hoisted(() => ({
  movePlannerEntry: vi.fn(),
  scheduleTask: vi.fn(),
  getRecommendationAvailability: vi.fn(),
}))

vi.mock('../src/services/weekly-planner', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, movePlannerEntry, scheduleTask }
})
vi.mock('../src/services/recommendation-engine', () => ({ getRecommendationAvailability }))

import {
  applyRecommendation,
  findRecommendedSlot,
  validateRecommendedSlot,
} from '../src/services/recommendation-actions'

const today = '2026-11-11'
const task = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'Preparar propuesta',
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
}
const recommendation = {
  id: 'task-task-1',
  type: 'task',
  taskId: 'task-1',
  title: 'Preparar propuesta',
  reason: 'Prioritaria y tu mejor franja energética es 08:00-12:00.',
  confidence: 'high',
  priority: 100,
  recommendedWindow: { start: '08:00', end: '12:00' },
}
const currentEntry = {
  id: 'entry-task-1',
  date: today,
  start_time: '15:00',
  end_time: '16:00',
  task_id: 'task-1',
  habit_id: null,
  obligation_id: null,
  status: 'scheduled',
}
const weeklyWork = {
  id: 'work',
  active: true,
  obligation_type: 'work',
  recurrence_rule: {
    frequency: 'weekly',
    startsOn: today,
    startTime: '08:00',
    endTime: '12:00',
    byDay: [1, 2, 3, 4, 5, 6, 7],
  },
}

function slotOptions(overrides = {}) {
  return {
    entries: [currentEntry],
    obligations: [],
    today,
    now: new Date(`${today}T07:00:00`),
    task,
    isLowEnergy: false,
    ...overrides,
  }
}

function makeAction(overrides = {}) {
  return {
    recommendationId: recommendation.id,
    taskId: task.id,
    suggestedDate: today,
    suggestedStartTime: '08:00',
    suggestedEndTime: '09:00',
    confidence: 'high',
    reason: recommendation.reason,
    plannerEntryId: currentEntry.id,
    currentDate: currentEntry.date,
    currentStartTime: currentEntry.start_time,
    currentEndTime: currentEntry.end_time,
    durationMinutes: 60,
    windowStart: '08:00',
    windowEnd: '12:00',
    ...overrides,
  }
}

describe('assisted recommendation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRecommendationAvailability.mockResolvedValue({
      obligations: [],
      plannerEntries: [currentEntry],
      error: null,
    })
    movePlannerEntry.mockResolvedValue({ entry: { ...currentEntry, start_time: '08:00', end_time: '09:00' }, error: null })
    scheduleTask.mockResolvedValue({ entry: { id: 'new-entry' }, error: null })
  })

  it('finds an applicable task slot while preserving its current planned duration', () => {
    const action = findRecommendedSlot(recommendation, slotOptions())

    expect(action).toMatchObject({
      taskId: task.id,
      plannerEntryId: currentEntry.id,
      suggestedDate: today,
      suggestedStartTime: '08:00',
      suggestedEndTime: '09:00',
      durationMinutes: 60,
    })
  })

  it('skips occupied task and habit intervals and finds the next available time', () => {
    const action = findRecommendedSlot(recommendation, slotOptions({
      entries: [
        currentEntry,
        {
          id: 'busy',
          date: today,
          start_time: '08:00',
          end_time: '09:00',
          task_id: 'other-task',
          status: 'scheduled',
        },
      ],
    }))

    expect(action).toMatchObject({ suggestedStartTime: '09:00', suggestedEndTime: '10:00' })
  })

  it('does not return a slot that overlaps a recurring obligation', () => {
    const action = findRecommendedSlot(recommendation, slotOptions({
      obligations: [weeklyWork],
    }))

    expect(action).toBeNull()
  })

  it('keeps recommendations informational when the task cannot fit or a low-energy rule blocks it', () => {
    expect(findRecommendedSlot(recommendation, slotOptions({
      task: { ...task, estimated_duration: 300 },
      entries: [],
    }))).toBeNull()
    expect(findRecommendedSlot(recommendation, slotOptions({
      entries: [],
      isLowEnergy: true,
    }))).toBeNull()
    expect(findRecommendedSlot({
      ...recommendation,
      confidence: 'low',
    }, slotOptions())).toBeNull()
  })

  it('does not change a habit definition and only returns an action for a planned occurrence', () => {
    const habitRecommendation = {
      id: 'habit-habit-1',
      type: 'habit',
      habitId: 'habit-1',
      title: 'Leer',
      reason: 'Tu franja disponible.',
      confidence: 'medium',
      priority: 30,
      recommendedWindow: { start: '08:00', end: '12:00' },
    }

    expect(findRecommendedSlot(habitRecommendation, slotOptions({ entries: [] }))).toBeNull()
    const action = findRecommendedSlot(habitRecommendation, slotOptions({
      habit: { id: 'habit-1', title: 'Leer', active: true },
      entries: [{
        id: 'habit-occurrence',
        date: today,
        start_time: '15:00',
        end_time: '15:30',
        habit_id: 'habit-1',
        status: 'scheduled',
      }],
    }))
    expect(action).toMatchObject({
      habitId: 'habit-1',
      plannerEntryId: 'habit-occurrence',
      durationMinutes: 30,
    })
  })

  it('validates clashes with planner entries and obligation occurrences', () => {
    const action = makeAction()
    const busy = {
      id: 'busy',
      date: today,
      start_time: '08:30',
      end_time: '09:30',
      habit_id: 'habit-2',
      status: 'scheduled',
    }
    expect(validateRecommendedSlot(action, slotOptions({ entries: [currentEntry, busy] }))).toMatchObject({
      valid: false,
      reason: expect.stringContaining('solapa'),
    })

    const obligationAction = makeAction({ suggestedDate: '2026-11-12' })
    expect(validateRecommendedSlot(obligationAction, slotOptions({
      entries: [currentEntry],
      obligations: [weeklyWork],
    }))).toMatchObject({ valid: false, reason: expect.stringContaining('solapa') })
  })

  it('moves an existing planner entry only when application is explicitly requested', async () => {
    const action = makeAction()
    expect(movePlannerEntry).not.toHaveBeenCalled()

    const result = await applyRecommendation(action, {
      userId: 'user-1',
      today,
      task,
      isLowEnergy: false,
    })

    expect(result.error).toBeNull()
    expect(movePlannerEntry).toHaveBeenCalledWith(
      currentEntry.id,
      today,
      '08:00',
      '09:00',
    )
    expect(scheduleTask).not.toHaveBeenCalled()
  })

  it('does not invoke planner mutations when the confirmed slot is occupied', async () => {
    getRecommendationAvailability.mockResolvedValue({
      obligations: [],
      plannerEntries: [
        currentEntry,
        {
          id: 'busy',
          date: today,
          start_time: '08:30',
          end_time: '09:30',
          task_id: 'other-task',
          status: 'scheduled',
        },
      ],
      error: null,
    })

    const result = await applyRecommendation(makeAction(), {
      userId: 'user-1',
      today,
      task,
      isLowEnergy: false,
    })

    expect(result.error?.message).toContain('solapa')
    expect(movePlannerEntry).not.toHaveBeenCalled()
    expect(scheduleTask).not.toHaveBeenCalled()
  })

  it('schedules an unplanned task through the existing planner service', async () => {
    getRecommendationAvailability.mockResolvedValue({
      obligations: [],
      plannerEntries: [],
      error: null,
    })
    const action = makeAction({ plannerEntryId: undefined, currentDate: undefined, currentStartTime: undefined, currentEndTime: undefined })

    const result = await applyRecommendation(action, {
      userId: 'user-1',
      today,
      task,
      isLowEnergy: false,
    })

    expect(result.error).toBeNull()
    expect(scheduleTask).toHaveBeenCalledWith(task, today, '08:00', '09:00', 'user-1')
    expect(movePlannerEntry).not.toHaveBeenCalled()
  })
})
