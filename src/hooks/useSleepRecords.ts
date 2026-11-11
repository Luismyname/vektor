import { useCallback, useEffect, useState } from 'react'
import {
  getSleepHistory,
  getSleepRecord,
  saveSleepRecord,
  updateSleepRecord,
} from '../services/sleep'
import type { SleepRecord, SleepRecordInput } from '../services/sleep'

function getLocalDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación de sueño.'
}

export function useSleepRecords(userId: string | undefined) {
  const [record, setRecord] = useState<SleepRecord | null>(null)
  const [history, setHistory] = useState<SleepRecord[]>([])
  const [loadingRecord, setLoadingRecord] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recordLoadError, setRecordLoadError] = useState(false)
  const [error, setError] = useState('')

  const loadRecord = useCallback(async (sleepDate: string) => {
    if (!userId) {
      setRecord(null)
      setLoadingRecord(false)
      return null
    }

    setLoadingRecord(true)
    setRecord(null)
    setRecordLoadError(false)
    setError('')
    try {
      const result = await getSleepRecord(userId, sleepDate)
      if (result.error) {
        setRecordLoadError(true)
        setError(result.error.message || 'No se pudo cargar el registro de sueño.')
        return null
      }
      setRecord(result.data)
      return result.data
    } catch (loadError) {
      setRecordLoadError(true)
      setError(errorMessage(loadError))
      return null
    } finally {
      setLoadingRecord(false)
    }
  }, [userId])

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setHistory([])
      setLoadingHistory(false)
      return []
    }

    setLoadingHistory(true)
    try {
      const result = await getSleepHistory(userId)
      if (result.error) {
        setError(result.error.message || 'No se pudo cargar el historial de sueño.')
        return []
      }
      setHistory(result.data)
      return result.data
    } catch (loadError) {
      setError(errorMessage(loadError))
      return []
    } finally {
      setLoadingHistory(false)
    }
  }, [userId])

  useEffect(() => {
    void loadRecord(getLocalDate())
    void loadHistory()
  }, [loadHistory, loadRecord])

  const persist = useCallback(async (
    operation: () => Promise<{ data: SleepRecord | null; error: Error | null }>,
  ) => {
    setSaving(true)
    setError('')
    try {
      const result = await operation()
      if (result.error || !result.data) {
        setError(result.error?.message || 'No se pudo guardar el registro de sueño.')
        return null
      }

      setRecord(result.data)
      await loadHistory()
      return result.data
    } catch (saveError) {
      setError(errorMessage(saveError))
      return null
    } finally {
      setSaving(false)
    }
  }, [loadHistory])

  const saveRecord = useCallback((input: SleepRecordInput) => {
    if (!userId) {
      setError('Inicia sesión para guardar un registro de sueño.')
      return Promise.resolve(null)
    }
    return persist(() => saveSleepRecord(userId, input))
  }, [persist, userId])

  const updateRecord = useCallback((id: string, input: SleepRecordInput) => {
    if (!userId) {
      setError('Inicia sesión para editar un registro de sueño.')
      return Promise.resolve(null)
    }
    return persist(() => updateSleepRecord(userId, id, input))
  }, [persist, userId])

  return {
    record,
    history,
    loadingRecord,
    loadingHistory,
    saving,
    recordLoadError,
    error,
    loadRecord,
    saveRecord,
    updateRecord,
  }
}
