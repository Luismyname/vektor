import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ENERGY_IMPACT_UPDATED_EVENT,
  getEnergyImpactHistoryStart,
  getEnergyImpacts,
  summarizeEnergyImpacts,
} from '../services/energy-impact-engine'
import type { EnergyImpactSummary } from '../services/energy-impact-engine'

interface UseEnergyImpactsOptions {
  userId?: string
  refreshKey?: number
}

export function useEnergyImpacts({ userId, refreshKey = 0 }: UseEnergyImpactsOptions) {
  const [summaries, setSummaries] = useState<EnergyImpactSummary[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setSummaries([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: loadError } = await getEnergyImpacts(
        userId,
        getEnergyImpactHistoryStart(),
      )
      if (currentRequestId !== requestId.current) return
      if (loadError) {
        setError(loadError.message || 'No se pudieron cargar los impactos energéticos.')
      } else {
        setSummaries(summarizeEnergyImpacts(data))
      }
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los impactos energéticos.')
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
    if (typeof window === 'undefined') return undefined
    window.addEventListener(ENERGY_IMPACT_UPDATED_EVENT, reload)
    return () => {
      window.removeEventListener(ENERGY_IMPACT_UPDATED_EVENT, reload)
      requestId.current += 1
    }
  }, [refreshKey, reload])

  return { summaries, loading, error, reload }
}
