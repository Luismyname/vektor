import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getLearningPatterns, refreshUserPatterns } = vi.hoisted(() => ({
  getLearningPatterns: vi.fn(),
  refreshUserPatterns: vi.fn(),
}))

vi.mock('../src/services/learning-engine', () => ({
  getLearningPatterns,
  refreshUserPatterns,
}))
vi.mock('../src/services/energy-impact-engine', () => ({
  ENERGY_IMPACT_UPDATED_EVENT: 'vektor:energy-impact-updated',
}))

import { useLearningPatterns } from '../src/hooks/useLearningPatterns'

describe('useLearningPatterns', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    refreshUserPatterns.mockResolvedValue({
      patterns: [{ id: 'pattern-1', confidence: 0.7 }],
      error: null,
    })
    getLearningPatterns.mockResolvedValue({ patterns: [], error: null })
  })

  it('updates persisted patterns when Vektor opens and after task completion refreshes', async () => {
    const { result, rerender } = renderHook(
      ({ refreshKey }) => useLearningPatterns({
        userId: 'user-1',
        today: '2026-11-11',
        refreshKey,
      }),
      { initialProps: { refreshKey: 0 } },
    )

    await waitFor(() => expect(result.current.patterns).toEqual([
      { id: 'pattern-1', confidence: 0.7 },
    ]))
    expect(refreshUserPatterns).toHaveBeenCalledTimes(1)

    rerender({ refreshKey: 1 })

    await waitFor(() => expect(refreshUserPatterns).toHaveBeenCalledTimes(2))
  })

  it('does not access Supabase when there is no user', async () => {
    const { result } = renderHook(() => useLearningPatterns({
      today: '2026-11-11',
    }))

    await act(async () => {})

    expect(result.current.patterns).toEqual([])
    expect(refreshUserPatterns).not.toHaveBeenCalled()
  })

  it('refreshes persisted learning patterns after an energy impact is completed', async () => {
    renderHook(() => useLearningPatterns({
      userId: 'user-1',
      today: '2026-11-11',
    }))
    await waitFor(() => expect(refreshUserPatterns).toHaveBeenCalledTimes(1))

    await act(async () => {
      window.dispatchEvent(new Event('vektor:energy-impact-updated'))
    })

    await waitFor(() => expect(refreshUserPatterns).toHaveBeenCalledTimes(2))
  })
})
