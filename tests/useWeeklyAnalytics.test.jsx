import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyticsServices = vi.hoisted(() => ({
  getWeeklyEnergyLevels: vi.fn(),
  detectChronotype: vi.fn(),
  getUserPeakHours: vi.fn(),
  getWeeklyCreativeBlocks: vi.fn(),
  getCreativeBlocksStats: vi.fn(),
  getWeeklyProgress: vi.fn(),
  getHabitConsistency: vi.fn(),
  getWeekDates: vi.fn(),
}))

vi.mock('../src/services/energy', () => ({
  getWeeklyEnergyLevels: analyticsServices.getWeeklyEnergyLevels,
  detectChronotype: analyticsServices.detectChronotype,
  getUserPeakHours: analyticsServices.getUserPeakHours,
}))

vi.mock('../src/services/creative', () => ({
  getWeeklyCreativeBlocks: analyticsServices.getWeeklyCreativeBlocks,
  getCreativeBlocksStats: analyticsServices.getCreativeBlocksStats,
}))

vi.mock('../src/services/weekly-planner', () => ({
  getWeeklyProgress: analyticsServices.getWeeklyProgress,
  getHabitConsistency: analyticsServices.getHabitConsistency,
  getWeekDates: analyticsServices.getWeekDates,
}))

import { useWeeklyAnalytics } from '../src/hooks/weekly-planner/useWeeklyAnalytics'

describe('useWeeklyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analyticsServices.getWeeklyEnergyLevels.mockResolvedValue({ data: [], error: null })
    analyticsServices.getWeeklyCreativeBlocks.mockResolvedValue({ data: [], error: null })
    analyticsServices.getCreativeBlocksStats.mockResolvedValue({ stats: null, error: null })
    analyticsServices.getWeeklyProgress.mockResolvedValue({
      progress: { scheduled: 0, completed: 0, failed: 0, moved: 0, completionRate: 0 },
      error: null,
    })
    analyticsServices.getHabitConsistency.mockResolvedValue({ consistency: [], error: null })
    analyticsServices.detectChronotype.mockReturnValue(null)
    analyticsServices.getUserPeakHours.mockReturnValue([])
    analyticsServices.getWeekDates.mockReturnValue([])
  })

  it('loads analytics when the authenticated user becomes available and when the week changes', async () => {
    const { rerender } = renderHook(
      ({ userId, weekStart }) => useWeeklyAnalytics(userId, weekStart),
      { initialProps: { userId: null, weekStart: '2026-10-19' } },
    )

    expect(analyticsServices.getWeeklyEnergyLevels).not.toHaveBeenCalled()

    rerender({ userId: 'user-1', weekStart: '2026-10-19' })
    await waitFor(() => expect(analyticsServices.getWeeklyEnergyLevels).toHaveBeenCalledTimes(1))

    await act(async () => {
      rerender({ userId: 'user-1', weekStart: '2026-10-26' })
    })
    await waitFor(() => expect(analyticsServices.getWeeklyEnergyLevels).toHaveBeenCalledTimes(2))
    expect(analyticsServices.getWeeklyEnergyLevels).toHaveBeenLastCalledWith('user-1', '2026-10-26')
  })
})
