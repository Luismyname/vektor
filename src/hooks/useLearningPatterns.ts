import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getLearningPatterns,
  refreshUserPatterns,
} from '../services/learning-engine'
import type { UserPattern } from '../services/learning-engine'
import { ENERGY_IMPACT_UPDATED_EVENT } from '../services/energy-impact-engine'

interface UseLearningPatternsOptions {
  userId?: string
  today: string
  refreshKey?: number
}

export function useLearningPatterns({ userId, today, refreshKey = 0 }: UseLearningPatternsOptions) {
  const [patterns, setPatterns] = useState<UserPattern[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setPatterns([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { patterns: learnedPatterns, error: learnError } =
        await refreshUserPatterns(userId, today)
      if (learnError) throw learnError
      if (currentRequestId === requestId.current) setPatterns(learnedPatterns)
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        const { patterns: persistedPatterns, error: readError } = await getLearningPatterns(userId)
        setPatterns(persistedPatterns)
        setError(loadError instanceof Error
          ? loadError.message
          : readError?.message || 'No se pudieron actualizar los aprendizajes.')
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [today, userId])

  useEffect(() => {
    void reload()
    if (typeof window !== 'undefined') {
      window.addEventListener(ENERGY_IMPACT_UPDATED_EVENT, reload)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(ENERGY_IMPACT_UPDATED_EVENT, reload)
      }
      requestId.current += 1
    }
  }, [reload, refreshKey])

  return { patterns, loading, error, reload }
}
