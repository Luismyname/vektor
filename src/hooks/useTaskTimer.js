import { useCallback, useEffect, useRef, useState } from 'react'

export function getFocusSessionRemainingSeconds(session, now = Date.now()) {
  if (!session || !['running', 'paused'].includes(session.status)) return 0

  const plannedSeconds = Number(session.planned_duration_seconds)
  const startedAt = Date.parse(session.started_at)
  const pausedSeconds = Number(session.paused_seconds)
  const pausedAt = session.status === 'paused' ? Date.parse(session.paused_at) : now

  if (
    !Number.isFinite(plannedSeconds)
    || !Number.isFinite(startedAt)
    || !Number.isFinite(pausedSeconds)
    || !Number.isFinite(pausedAt)
  ) return 0

  const elapsedSeconds = Math.max(0, Math.floor((pausedAt - startedAt) / 1000) - pausedSeconds)
  return Math.max(0, Math.floor(plannedSeconds) - elapsedSeconds)
}

export function useTaskTimer({ session, onExpire }) {
  const isSessionControlled = session !== undefined
  const [localTimer, setLocalTimer] = useState({
    durationSeconds: 0,
    remainingSeconds: 0,
    startedAt: null,
    paused: true,
  })
  const [now, setNow] = useState(Date.now)
  const onExpireRef = useRef(onExpire)
  const expiredSessionIds = useRef(new Set())

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const sessionRunning = isSessionControlled && session?.status === 'running'
  const localRunning = !isSessionControlled && Boolean(localTimer.startedAt) && !localTimer.paused
  const isRunning = sessionRunning
    ? getFocusSessionRemainingSeconds(session, now) > 0
    : localRunning && getLocalRemainingSeconds(localTimer, now) > 0

  useEffect(() => {
    if (!isRunning) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [isRunning])

  const durationSeconds = isSessionControlled
    ? Math.max(0, Number(session?.planned_duration_seconds) || 0)
    : localTimer.durationSeconds
  const remainingSeconds = isSessionControlled
    ? getFocusSessionRemainingSeconds(session, now)
    : getLocalRemainingSeconds(localTimer, now)

  useEffect(() => {
    if (remainingSeconds !== 0) return
    if (sessionRunning) {
      if (
        !Number.isFinite(Date.parse(session.started_at))
        || !Number.isFinite(Number(session.planned_duration_seconds))
        || !Number.isFinite(Number(session.paused_seconds))
      ) return
      if (expiredSessionIds.current.has(session.id)) return
      expiredSessionIds.current.add(session.id)
      onExpireRef.current?.()
    } else if (localRunning && localTimer.startedAt) {
      const localSessionId = `local-${localTimer.startedAt}`
      if (expiredSessionIds.current.has(localSessionId)) return
      expiredSessionIds.current.add(localSessionId)
      onExpireRef.current?.()
    }
  }, [
    localRunning,
    localTimer.startedAt,
    remainingSeconds,
    session?.id,
    session?.paused_seconds,
    session?.planned_duration_seconds,
    session?.started_at,
    sessionRunning,
  ])

  const start = useCallback((durationMinutes) => {
    if (isSessionControlled) return
    const duration = Math.max(0, Math.round(Number(durationMinutes) * 60) || 0)
    setNow(Date.now())
    setLocalTimer({
      durationSeconds: duration,
      remainingSeconds: duration,
      startedAt: Date.now(),
      paused: false,
    })
  }, [isSessionControlled])

  const pause = useCallback(() => {
    if (isSessionControlled) return
    const currentTime = Date.now()
    setNow(currentTime)
    setLocalTimer(current => ({
      ...current,
      remainingSeconds: getLocalRemainingSeconds(current, currentTime),
      startedAt: null,
      paused: true,
    }))
  }, [isSessionControlled])

  const resume = useCallback(() => {
    if (isSessionControlled) return
    setNow(Date.now())
    setLocalTimer(current => ({
      ...current,
      startedAt: Date.now(),
      paused: false,
    }))
  }, [isSessionControlled])

  const reset = useCallback((durationMinutes = 0) => {
    if (isSessionControlled) return
    const duration = Math.max(0, Math.round(Number(durationMinutes) * 60) || 0)
    setLocalTimer({
      durationSeconds: duration,
      remainingSeconds: duration,
      startedAt: null,
      paused: true,
    })
  }, [isSessionControlled])

  return {
    durationSeconds,
    remainingSeconds,
    isRunning,
    isPaused: session?.status === 'paused' || (!isSessionControlled && localTimer.paused),
    start,
    pause,
    resume,
    reset,
  }
}

function getLocalRemainingSeconds(timer, now) {
  if (!timer.startedAt) return Math.max(0, timer.remainingSeconds)
  return Math.max(0, timer.remainingSeconds - Math.floor((now - timer.startedAt) / 1000))
}
