import { useState } from 'react'
import { autoReschedule } from '../../services/weekly-planner'

export function useTaskAutoReschedule(userId, weekStart, onSuccess) {
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [error, setError] = useState('')

  async function reschedule(taskId) {
    setIsRescheduling(true)
    setError('')
    const result = await autoReschedule(taskId, userId, weekStart)
    setIsRescheduling(false)
    if (result.error) {
      setError(result.error.message || 'No se pudo reprogramar la tarea.')
      return null
    }
    onSuccess?.(result.entry)
    return result.entry
  }

  return { autoReschedule: reschedule, isRescheduling, error }
}