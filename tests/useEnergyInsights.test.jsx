import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getEnergyHistory } = vi.hoisted(() => ({ getEnergyHistory: vi.fn() }))

vi.mock('../src/services/energy-insights', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getEnergyHistory }
})

import { useEnergyInsights } from '../src/hooks/useEnergyInsights'

const samples = [6, 7, 8, 9, 12, 13, 14, 15].flatMap((hour) =>
  Array.from({ length: 3 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    hour,
    energy_level: hour < 10 ? 2 : 8,
  })),
)

describe('useEnergyInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getEnergyHistory.mockResolvedValue({ data: samples, error: null })
  })

  it('loads all samples and exposes the calculated profile, windows, and confidence', async () => {
    const { result } = renderHook(() => useEnergyInsights('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getEnergyHistory).toHaveBeenCalledWith('user-1')
    expect(result.current).toMatchObject({
      bestWindow: { startHour: 12, endHour: 16, average: 8 },
      worstWindow: { startHour: 6, endHour: 10, average: 2 },
      sampleCount: 24,
      confidence: 'low',
      error: '',
    })
    expect(result.current.hourlyProfile[10]).toEqual({ hour: 10, average: null, sampleCount: 0 })
  })

  it('reloads and surfaces data loading errors without retaining stale windows', async () => {
    const { result } = renderHook(() => useEnergyInsights('user-1'))
    await waitFor(() => expect(result.current.bestWindow).not.toBeNull())

    getEnergyHistory.mockResolvedValue({ data: [], error: new Error('No se pudo leer el historial') })
    await act(async () => result.current.reload())

    expect(result.current.bestWindow).toBeNull()
    expect(result.current.worstWindow).toBeNull()
    expect(result.current.error).toBe('No se pudo leer el historial')
  })
})
