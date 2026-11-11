import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getEnergyImpactHistoryStart,
  getEnergyImpacts,
  summarizeEnergyImpacts,
} = vi.hoisted(() => ({
  getEnergyImpactHistoryStart: vi.fn(() => '2026-05-15T12:00:00.000Z'),
  getEnergyImpacts: vi.fn(),
  summarizeEnergyImpacts: vi.fn(),
}))

vi.mock('../src/services/energy-impact-engine', () => ({
  ENERGY_IMPACT_UPDATED_EVENT: 'vektor:energy-impact-updated',
  getEnergyImpactHistoryStart,
  getEnergyImpacts,
  summarizeEnergyImpacts,
}))

import { useEnergyImpacts } from '../src/hooks/useEnergyImpacts'

describe('useEnergyImpacts', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    getEnergyImpacts.mockResolvedValue({ data: [{ id: 'impact-1' }], error: null })
    summarizeEnergyImpacts.mockReturnValue([{ activityId: 'task-1', averageImpact: -2 }])
  })

  it('loads real impact history and refreshes after a capture is completed', async () => {
    const { result } = renderHook(() => useEnergyImpacts({ userId: 'user-1' }))

    await waitFor(() => expect(result.current.summaries).toEqual([
      { activityId: 'task-1', averageImpact: -2 },
    ]))
    expect(getEnergyImpacts).toHaveBeenCalledWith('user-1', '2026-05-15T12:00:00.000Z')

    await act(async () => {
      window.dispatchEvent(new Event('vektor:energy-impact-updated'))
    })
    await waitFor(() => expect(getEnergyImpacts).toHaveBeenCalledTimes(2))
  })

  it('exposes loading errors instead of falling back to fabricated summaries', async () => {
    getEnergyImpacts.mockResolvedValue({
      data: [],
      error: { message: 'energy_impacts unavailable' },
    })
    const { result } = renderHook(() => useEnergyImpacts({ userId: 'user-1' }))

    await waitFor(() => expect(result.current.error).toBe('energy_impacts unavailable'))
    expect(result.current.summaries).toEqual([])
    expect(summarizeEnergyImpacts).not.toHaveBeenCalled()
  })
})
