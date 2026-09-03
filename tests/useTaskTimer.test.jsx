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

  it('pausa sin perder el tiempo restante y conserva la sesión persistida', () => {
    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 1, isActive: true }))

    act(() => vi.advanceTimersByTime(2000))
    const remainingBeforePause = result.current.remainingSeconds

    act(() => result.current.pause())
    act(() => vi.advanceTimersByTime(5000))

    expect(result.current.remainingSeconds).toBe(remainingBeforePause)
    expect(result.current.isRunning).toBe(false)
    expect(JSON.parse(localStorage.getItem('vektor-active-timer'))).toMatchObject({
      durationSeconds: 60,
      remainingSeconds: remainingBeforePause,
      isPaused: true,
    })
  })

  it('restaura una sesión pausada al volver al dashboard', () => {
    localStorage.setItem('vektor-active-timer', JSON.stringify({
      durationSeconds: 45 * 60,
      remainingSeconds: 41 * 60 + 12,
      isPaused: true,
    }))

    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 25, isActive: true }))
    expect(result.current.durationSeconds).toBe(45 * 60)
    expect(result.current.remainingSeconds).toBe(41 * 60 + 12)
    expect(result.current.isRunning).toBe(false)
  })

  it('reanuda desde el tiempo pausado sin reiniciar la duración', () => {
    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 1, isActive: true }))

    act(() => vi.advanceTimersByTime(2000))
    const remainingBeforePause = result.current.remainingSeconds
    act(() => result.current.pause())
    act(() => result.current.resume())
    act(() => vi.advanceTimersByTime(1000))

    expect(result.current.remainingSeconds).toBe(remainingBeforePause - 1)
    expect(result.current.durationSeconds).toBe(60)
    expect(result.current.isRunning).toBe(true)
  })

  it('reinicia el contador a cero sin persistir una sesión', () => {
    const { result } = renderHook(() => useTaskTimer({ durationMinutes: 1, isActive: true }))

    act(() => result.current.reset(0))

    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.isRunning).toBe(false)
    expect(localStorage.getItem('vektor-active-timer')).toBeNull()
  })
})