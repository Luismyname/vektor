import { useCallback, useEffect, useRef, useState } from 'react'

// Gestiona cuenta atrás, pausa/reanudación y recuperación del temporizador persistido.
export function useTaskTimer({ durationMinutes = 25, isActive = false, onExpire }) {
  const [durationSeconds, setDurationSeconds] = useState(() => readTimer()?.durationSeconds || durationMinutes * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemaining(readTimer(), durationMinutes * 60))
  const [isStopped, setIsStopped] = useState(() => Boolean(readTimer()?.isPaused))
  const onExpireRef = useRef(onExpire)
  const isRunning = Boolean(isActive) && !isStopped && remainingSeconds > 0

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!isRunning) return undefined

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setIsStopped(true)
          localStorage.removeItem('vektor-active-timer')
          onExpireRef.current?.()
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isRunning])

  const start = useCallback((nextDuration = durationMinutes) => {
    const nextSeconds = Math.max(nextDuration * 60, 0)
    setDurationSeconds(nextSeconds)
    setRemainingSeconds(nextSeconds)
    setIsStopped(false)
    localStorage.setItem('vektor-active-timer', JSON.stringify({
      durationSeconds: nextSeconds,
      remainingSeconds: nextSeconds,
      startedAt: Date.now(),
      isPaused: false,
    }))
  }, [durationMinutes])

  const pause = useCallback(() => {
    setIsStopped(true)
    localStorage.setItem('vektor-active-timer', JSON.stringify({
      durationSeconds,
      remainingSeconds,
      isPaused: true,
    }))
  }, [durationSeconds, remainingSeconds])

  const resume = useCallback(() => {
    if (remainingSeconds <= 0) return
    setIsStopped(false)
    localStorage.setItem('vektor-active-timer', JSON.stringify({
      durationSeconds,
      remainingSeconds,
      startedAt: Date.now(),
      isPaused: false,
    }))
  }, [durationSeconds, remainingSeconds])

  const reset = useCallback((nextDuration = durationMinutes) => {
    const nextSeconds = Math.max(nextDuration * 60, 0)
    setDurationSeconds(nextSeconds)
    setRemainingSeconds(nextSeconds)
    setIsStopped(true)
    localStorage.removeItem('vektor-active-timer')
  }, [durationMinutes])

  const hydrate = useCallback(() => {
    const savedTimer = readTimer()
    if (!savedTimer) return
    setDurationSeconds(savedTimer.durationSeconds)
    setRemainingSeconds(getRemaining(savedTimer, savedTimer.durationSeconds))
    setIsStopped(Boolean(savedTimer.isPaused))
  }, [])

  return {
    durationSeconds,
    remainingSeconds,
    isRunning,
    start,
    pause,
    resume,
    reset,
    hydrate,
  }
}

// Lee el temporizador guardado y devuelve null ante ausencia o JSON inválido.
function readTimer() {
  try {
    return JSON.parse(localStorage.getItem('vektor-active-timer') || 'null')
  } catch {
    return null
  }
}

// Reconstruye el tiempo restante descontando el tiempo transcurrido desde el inicio.
function getRemaining(savedTimer, fallbackSeconds) {
  if (savedTimer?.isPaused && Number.isFinite(savedTimer.remainingSeconds)) {
    return savedTimer.remainingSeconds
  }
  if (!savedTimer?.startedAt) return fallbackSeconds
  const remainingSeconds = savedTimer.remainingSeconds ?? savedTimer.durationSeconds
  return Math.max(remainingSeconds - Math.floor((Date.now() - savedTimer.startedAt) / 1000), 0)
}
