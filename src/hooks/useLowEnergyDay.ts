import { useCallback, useEffect, useRef, useState } from 'react'
import { detectLowEnergyDay } from '../lib/lowEnergyDay'
import { getInitialEnergyCheckIn } from '../services/low-energy-day'
import { getSleepRecord } from '../services/sleep'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudieron consultar los datos de energía y sueño.'
}

export function useLowEnergyDay(userId: string | undefined, date: string) {
  const [result, setResult] = useState({ isLowEnergy: false, reasons: [] as string[] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setResult({ isLowEnergy: false, reasons: [] })
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [sleepResult, energyResult] = await Promise.all([
        getSleepRecord(userId, date),
        getInitialEnergyCheckIn(userId, date),
      ])
      if (sleepResult.error) throw sleepResult.error
      if (energyResult.error) throw energyResult.error

      if (currentRequestId === requestId.current) {
        setResult(detectLowEnergyDay(sleepResult.data, energyResult.data))
      }
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setResult({ isLowEnergy: false, reasons: [] })
        setError(getErrorMessage(loadError))
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [date, userId])

  useEffect(() => {
    void reload()
    return () => {
      requestId.current += 1
    }
  }, [reload])

  return { ...result, loading, error, reload }
}
