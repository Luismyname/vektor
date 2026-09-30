import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createActivityEntryMock,
  getInProgressActivityMock,
  hideActivityFromDashboardMock,
  supabaseFromMock,
  taskUpdateMock,
} = vi.hoisted(() => ({
  createActivityEntryMock: vi.fn(),
  getInProgressActivityMock: vi.fn(),
  hideActivityFromDashboardMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  taskUpdateMock: vi.fn(),
}))

vi.mock('../src/services/supabase', () => ({
  supabase: { from: supabaseFromMock },
}))

vi.mock('../src/services/activity', () => ({
  createActivityEntry: createActivityEntryMock,
  getInProgressActivity: getInProgressActivityMock,
  hideActivityFromDashboard: hideActivityFromDashboardMock,
}))

import { completeTask } from '../src/services/tasks'

describe('completeTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const updateQuery = {
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'task-1', user_id: 'user-1', title: 'Leer', status: 'completed' },
        error: null,
      }),
    }
    updateQuery.eq.mockReturnValue(updateQuery)
    updateQuery.select.mockReturnValue(updateQuery)
    supabaseFromMock.mockReturnValue({ update: taskUpdateMock.mockReturnValue(updateQuery) })
    getInProgressActivityMock.mockResolvedValue({ activity: { id: 'activity-1', duration: 50 }, error: null })
    createActivityEntryMock.mockResolvedValue({ activity: { id: 'completed-activity-1' }, error: null })
    hideActivityFromDashboardMock.mockResolvedValue({ activity: { id: 'activity-1' }, error: null })
  })

  it('completa la tarea e inserta una actividad con la duración acumulada', async () => {
    const task = { id: 'task-1', user_id: 'user-1', title: 'Leer', status: 'pending' }

    const result = await completeTask(task, 'user-1', 25)

    expect(supabaseFromMock).toHaveBeenCalledWith('tasks')
    expect(taskUpdateMock).toHaveBeenCalledWith({
      status: 'completed',
      completed_at: expect.any(String),
    })
    expect(createActivityEntryMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'completed',
      task_id: 'task-1',
      title: 'Leer',
      duration: 50,
    })
    expect(hideActivityFromDashboardMock).toHaveBeenCalledWith('activity-1')
    expect(result.error).toBeNull()
  })
})
