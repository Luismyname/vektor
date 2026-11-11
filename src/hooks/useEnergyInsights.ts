import { useCallback, useEffect, useRef, useState } from 'react'
import {
  calculateHourlyEnergyProfile,
  getBestEnergyWindow,
  getEnergyHistory,
  getEnergyProfileConfidence,
  getWorstEnergyWindow,
} from '../services/energy-insights'
import type {
  EnergyConfidence,
  EnergyLevelSample,
  EnergyWindow,
  HourlyEnergyProfileEntry,
} from '../services/energy-insights'

interface EnergyInsightsResult {
  bestWindow: EnergyWindow | null
  worstWindow: EnergyWindow | null
  hourlyProfile: HourlyEnergyProfileEntry[]
  sampleCount: number
  confidence: EnergyConfidence
}

const EMPTY_RESULT: EnergyInsightsResult = {
  bestWindow: null,
  worstWindow: null,
  hourlyProfile: calculateHourlyEnergyProfile([]),
  sampleCount: 0,
  confidence: 'insufficient',
}

function buildInsights(samples: EnergyLevelSample[]): EnergyInsightsResult {
  const validSamples = samples.filter((sample) =>
    Number.isInteger(sample.hour)
    && sample.hour >= 0
    && sample.hour <= 23
    && Number.isFinite(sample.energy_level)
    && sample.energy_level >= 1
    && sample.energy_level <= 10,
  )
  const hourlyProfile = calculateHourlyEnergyProfile(validSamples)
  const bestWindow = getBestEnergyWindow(hourlyProfile)
  const worstWindow = getWorstEnergyWindow(hourlyProfile)

  return {
    bestWindow,
    worstWindow,
    hourlyProfile,
    sampleCount: validSamples.length,
    confidence: getEnergyProfileConfidence(bestWindow, worstWindow),
  }
}

export function useEnergyInsights(userId?: string) {
  const [insights, setInsights] = useState(EMPTY_RESULT)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setInsights(EMPTY_RESULT)
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: loadError } = await getEnergyHistory(userId)
      if (loadError) throw loadError
      if (currentRequestId === requestId.current) setInsights(buildInsights(data))
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setInsights(EMPTY_RESULT)
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial energético.')
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  return { ...insights, loading, error, reload }
}
