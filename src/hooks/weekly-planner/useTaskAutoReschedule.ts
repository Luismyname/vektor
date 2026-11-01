import { useState } from 'react'
import { autoReschedule } from '../../services/weekly-planner'

// Expone estado y errores de la reprogramación automática de una tarea.
export function useTaskAutoReschedule(
  userId: string,
  weekStart: Date | string,
  onSuccess?: (entry: Awaited<ReturnType<typeof autoReschedule>>['entry']) => void
) {
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [error, setError] = useState('')

  async function reschedule(taskId: string) {
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