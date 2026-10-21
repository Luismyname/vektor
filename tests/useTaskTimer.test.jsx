import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFocusSessionRemainingSeconds, useTaskTimer } from '../src/hooks/useTaskTimer'

function createSession(overrides = {}) {
  const startedAt = new Date(Date.now() - 10000).toISOString()
  return {
    id: 'session-1',
    user_id: 'user-1',
    task_id: 'task-1',
    status: 'running',
    started_at: startedAt,
    paused_at: null,
    paused_seconds: 0,
    planned_duration_seconds: 60,
    ...overrides,
  }
}

describe('useTaskTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-21T08:00:00.000Z'))
    localStorage.clear()
  })

  it('calcula el tiempo restante desde focus_sessions e ignora la caché local', () => {
    localStorage.setItem('vektor-active-timer', JSON.stringify({
      durationSeconds: 3600,
      remainingSeconds: 3500,
      isPaused: true,
    }))
    const session = createSession()
    const { result } = renderHook(() => useTaskTimer({ session }))

    expect(result.current.durationSeconds).toBe(60)
    expect(result.current.remainingSeconds).toBe(50)
    expect(result.current.isRunning).toBe(true)
    expect(localStorage.getItem('vektor-active-timer')).not.toBeNull()
  })

  it('mantiene el tiempo correcto mientras la sesión está pausada', () => {
    const session = createSession({
      status: 'paused',
      started_at: new Date(Date.now() - 40000).toISOString(),
      paused_at: new Date(Date.now() - 10000).toISOString(),
      paused_seconds: 5,
    })
    const { result } = renderHook(() => useTaskTimer({ session }))

    expect(result.current.remainingSeconds).toBe(35)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.isPaused).toBe(true)
  })

  it('recalcula el contador a partir de timestamps y no acumula ticks locales', () => {
    const session = createSession()
    const { result } = renderHook(() => useTaskTimer({ session }))

    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.remainingSeconds).toBe(47)
  })

  it('notifica una sola vez al expirar una sesión en ejecución', () => {
    const onExpire = vi.fn()
    const session = createSession({
      started_at: new Date(Date.now() - 59000).toISOString(),
      planned_duration_seconds: 60,
    })
    renderHook(() => useTaskTimer({ session, onExpire }))

    act(() => vi.advanceTimersByTime(3000))

    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('no expira una sesión pausada aunque su duración restante sea cero', () => {
    const onExpire = vi.fn()
    const session = createSession({
      status: 'paused',
      started_at: new Date(Date.now() - 60000).toISOString(),
      paused_at: new Date(Date.now() - 1000).toISOString(),
      planned_duration_seconds: 1,
    })
    renderHook(() => useTaskTimer({ session, onExpire }))

    expect(onExpire).not.toHaveBeenCalled()
  })

  it('no inicia el timer cuando no hay sesión autorizada', () => {
    const { result } = renderHook(() => useTaskTimer({ session: null }))

    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.isRunning).toBe(false)
  })

  it('conserva un modo local efímero para la demostración sin usar localStorage', () => {
    const { result } = renderHook(() => useTaskTimer({}))

    act(() => result.current.start(1))
    act(() => vi.advanceTimersByTime(2000))

    expect(result.current.remainingSeconds).toBe(58)
    expect(localStorage.getItem('vektor-active-timer')).toBeNull()
  })

  it('calcula el tiempo pausado con el intervalo activo antes de la pausa', () => {
    const session = createSession({
      status: 'paused',
      started_at: new Date(Date.now() - 40000).toISOString(),
      paused_at: new Date(Date.now() - 10000).toISOString(),
      paused_seconds: 5,
    })

    expect(getFocusSessionRemainingSeconds(session)).toBe(35)
  })
})
