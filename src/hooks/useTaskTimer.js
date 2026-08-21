import { useCallback, useEffect, useState } from 'react'

export function useTaskTimer({ durationMinutes = 25, isActive = false, onExpire }) {
  const [durationSeconds, setDurationSeconds] = useState(durationMinutes * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60)
  const [isRunning, setIsRunning] = useState(isActive)

  useEffect(() => {
    const nextDurationSeconds = Math.max(durationMinutes * 60, 0)
    setDurationSeconds(nextDurationSeconds)
    setRemainingSeconds(nextDurationSeconds)
  }, [durationMinutes])

  useEffect(() => {
    setIsRunning(Boolean(isActive))
  }, [isActive])

  useEffect(() => {
    if (!isRunning) return undefined

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setIsRunning(false)
          onExpire?.()
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRunning, onExpire])

  const start = useCallback((nextDuration = durationMinutes) => {
    const nextSeconds = Math.max(nextDuration * 60, 0)
    setDurationSeconds(nextSeconds)
    setRemainingSeconds(nextSeconds)
    setIsRunning(true)
  }, [durationMinutes])

  const stop = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback((nextDuration = durationMinutes) => {
    const nextSeconds = Math.max(nextDuration * 60, 0)
    setDurationSeconds(nextSeconds)
    setRemainingSeconds(nextSeconds)
    setIsRunning(false)
  }, [durationMinutes])

  return {
    durationSeconds,
    remainingSeconds,
    isRunning,
    start,
    stop,
    reset,
  }
}
