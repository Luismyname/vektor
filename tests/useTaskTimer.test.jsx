import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskTimer } from '../src/hooks/useTaskTimer'

describe('useTaskTimer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  it('cuenta atrás y avisa al terminar', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 1, isActive: true, onExpire }))

    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.remainingSeconds).toBe(58)

    act(() => vi.advanceTimersByTime(58000))
    expect(result.current.remainingSeconds).toBe(0)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('recupera el tiempo transcurrido desde localStorage', () => {
    localStorage.setItem('vektor-active-timer', JSON.stringify({ durationSeconds: 60, startedAt: Date.now() - 10000 }))
    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 1, isActive: true }))
    expect(result.current.remainingSeconds).toBe(50)
  })
})