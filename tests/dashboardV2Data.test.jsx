import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { state, mocks } = vi.hoisted(() => ({
  state: {
    currentUser: null,
    users: {},
    authCallback: null,
  },
  mocks: {
    getAuthenticatedUser: vi.fn(),
    getCurrentProfile: vi.fn(),
    getRecentActivity: vi.fn(),
    getTasks: vi.fn(),
    getActiveFocusSession: vi.fn(),
    getWeeklyPlanner: vi.fn(),
    completeHabitOccurrence: vi.fn(),
    getPlannerHabits: vi.fn(),
    getWeekStart: vi.fn(() => '2026-10-19'),
    getWeeklyEnergyLevels: vi.fn(),
    getUserChronotype: vi.fn(),
    formatDate: vi.fn(() => '2026-10-21'),
  },
}))

vi.mock('../src/services/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
  getCurrentProfile: mocks.getCurrentProfile,
}))
vi.mock('../src/services/activity', () => ({
  getRecentActivity: mocks.getRecentActivity,
}))
vi.mock('../src/services/tasks', () => ({
  getTasks: mocks.getTasks,
}))
vi.mock('../src/services/focus-sessions', () => ({
  getActiveFocusSession: mocks.getActiveFocusSession,
}))
vi.mock('../src/services/weekly-planner', () => ({
  completeHabitOccurrence: mocks.completeHabitOccurrence,
  formatDate: mocks.formatDate,
  getWeeklyPlanner: mocks.getWeeklyPlanner,
  getWeekStart: mocks.getWeekStart,
}))
vi.mock('../src/services/energy', () => ({
  getUserChronotype: mocks.getUserChronotype,
  getWeeklyEnergyLevels: mocks.getWeeklyEnergyLevels,
}))
vi.mock('../src/services/habits', () => ({
  getPlannerHabits: mocks.getPlannerHabits,
}))
vi.mock('../src/lib/habits', () => ({
  normalizeHabits: vi.fn(habits => ({
    recommended: Array.isArray(habits?.recommended) ? habits.recommended : [],
    custom: Array.isArray(habits?.custom) ? habits.custom : [],
  })),
}))
vi.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(callback => {
        state.authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
  },
}))

import { useDashboardV2Data } from '../src/app/dashboard-v2/hooks/useDashboardV2Data'

function userData(userId, session = null) {
  const task = { id: `task-${userId}`, title: `Task ${userId}`, status: 'pending' }
  return {
    tasks: [task],
    activities: [{
      user_id: userId,
      task_id: `activity-task-${userId}`,
      type: 'in_progress',
      duration: 90,
    }],
    session,
    profile: { user_id: userId, full_name: `User ${userId}`, habits: [] },
  }
}

function activeSession(userId) {
  return {
    id: `session-${userId}`,
    user_id: userId,
    task_id: `task-${userId}`,
    status: 'paused',
    started_at: '2026-10-21T07:00:00.000Z',
    paused_at: '2026-10-21T07:10:00.000Z',
    paused_seconds: 120,
    planned_duration_seconds: 1500,
  }
}

describe('useDashboardV2Data focus session recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.currentUser = { id: 'user-a' }
    state.users = {
      'user-a': userData('user-a', activeSession('user-a')),
      'user-b': userData('user-b', activeSession('user-b')),
    }
    state.authCallback = null

    mocks.getAuthenticatedUser.mockImplementation(async () => ({ user: state.currentUser, error: null }))
    mocks.getCurrentProfile.mockImplementation(async userId => ({
      profile: state.users[userId].profile,
      error: null,
    }))
    mocks.getTasks.mockImplementation(async userId => ({ tasks: state.users[userId].tasks, error: null }))
    mocks.getRecentActivity.mockImplementation(async userId => ({ activities: state.users[userId].activities, error: null }))
    mocks.getActiveFocusSession.mockImplementation(async userId => ({
      session: state.users[userId].session,
      error: null,
    }))
    mocks.getWeeklyPlanner.mockResolvedValue({ entries: [], error: null })
    mocks.completeHabitOccurrence.mockReset()
    mocks.getPlannerHabits.mockResolvedValue({ habits: { recommended: [], custom: [] }, error: null })
    mocks.getWeeklyEnergyLevels.mockResolvedValue({ data: [], error: null })
    mocks.getUserChronotype.mockResolvedValue({ data: null, error: null })
  })

  it('recupera la tarea y el timer desde focus_sessions, no desde activity', async () => {
    const { result } = renderHook(() => useDashboardV2Data())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activeFocusSession.id).toBe('session-user-a')
    expect(result.current.activeTask.id).toBe('task-user-a')
    expect(result.current.activeTask.duration).toBe(25)
    expect(result.current.activeTask.id).not.toBe('activity-task-user-a')
    expect(mocks.getActiveFocusSession).toHaveBeenCalledWith('user-a')
  })

  it('limpia el estado al cerrar sesión y vuelve a hidratar solo la cuenta siguiente', async () => {
    const { result } = renderHook(() => useDashboardV2Data())
    await waitFor(() => expect(result.current.activeFocusSession?.user_id).toBe('user-a'))

    act(() => state.authCallback('SIGNED_OUT', null))
    expect(result.current.user).toBeNull()
    expect(result.current.activeTask).toBeNull()
    expect(result.current.activeFocusSession).toBeNull()

    state.currentUser = { id: 'user-b' }
    act(() => state.authCallback('SIGNED_IN', { user: state.currentUser }))
    await waitFor(() => expect(result.current.activeFocusSession?.user_id).toBe('user-b'))

    expect(result.current.activeTask.id).toBe('task-user-b')
    expect(result.current.activeTask.id).not.toBe('task-user-a')
  })

  it('actualiza la ocurrencia solo tras confirmar y la recupera en una nueva carga', async () => {
    const occurrence = {
      id: 'planner-entry-1',
      user_id: 'user-a',
      habit_id: 'habit-1',
      date: '2026-10-21',
      status: 'scheduled',
    }
    mocks.getWeeklyPlanner.mockResolvedValue({ entries: [occurrence], error: null })

    let resolveCompletion
    mocks.completeHabitOccurrence.mockImplementation(() => new Promise(resolve => {
      resolveCompletion = resolve
    }))

    const { result, unmount } = renderHook(() => useDashboardV2Data())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let completion
    act(() => {
      completion = result.current.completeHabit(occurrence.id)
    })
    expect(result.current.weeklyEntries[0].status).toBe('scheduled')

    await act(async () => {
      resolveCompletion({ entry: { ...occurrence, status: 'completed' }, error: null })
      await completion
    })
    expect(result.current.weeklyEntries[0].status).toBe('completed')
    expect(mocks.completeHabitOccurrence).toHaveBeenCalledWith(occurrence.id, 'user-a')

    unmount()
    mocks.getWeeklyPlanner.mockResolvedValue({
      entries: [{ ...occurrence, status: 'completed' }],
      error: null,
    })
    const reloaded = renderHook(() => useDashboardV2Data())
    await waitFor(() => expect(reloaded.result.current.loading).toBe(false))
    expect(reloaded.result.current.weeklyEntries[0].status).toBe('completed')
    reloaded.unmount()
  })
})
