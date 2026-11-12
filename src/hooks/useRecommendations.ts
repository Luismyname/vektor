import { useCallback, useEffect, useRef, useState } from 'react'
import { getTasks } from '../services/tasks'
import { getSleepRecord } from '../services/sleep'
import type { SleepRecord } from '../services/sleep'
import {
  generateHabitRecommendations,
  generateLowEnergyRecommendations,
  generateTaskRecommendations,
  getRecommendationAvailability,
  sortAndLimitRecommendations,
} from '../services/recommendation-engine'
import type { ActivityLearningEvidence, Recommendation } from '../services/recommendation-engine'
import {
  findRecommendedSlot,
  getRecommendationUnavailableReason,
} from '../services/recommendation-actions'
import type { ActionableRecommendation } from '../services/recommendation-actions'
import type { EnergyConfidence, HourlyEnergyProfileEntry } from '../services/energy-insights'
import type { LowEnergyDayResult } from '../lib/lowEnergyDay'
import type { Habit, Task } from '../types'

interface UseRecommendationsOptions {
  userId?: string
  today: string
  habits: Habit[]
  hourlyProfile: HourlyEnergyProfileEntry[]
  energyConfidence: EnergyConfidence
  lowEnergyDay: LowEnergyDayResult
  currentTime: Date
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudieron cargar los datos para las recomendaciones.'
}

export function useRecommendations({
  userId,
  today,
  habits,
  hourlyProfile,
  energyConfidence,
  lowEnergyDay,
  currentTime,
}: UseRecommendationsOptions) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [sleepRecord, setSleepRecord] = useState<SleepRecord | null>(null)
  const [obligations, setObligations] = useState([])
  const [plannerEntries, setPlannerEntries] = useState([])
  const [activityEvidence, setActivityEvidence] = useState<ActivityLearningEvidence[]>([])
  const [sleepRecords, setSleepRecords] = useState([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setTasks([])
      setSleepRecord(null)
      setObligations([])
      setPlannerEntries([])
      setActivityEvidence([])
      setSleepRecords([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [
        { tasks: taskData, error: taskError },
        { data: currentSleep, error: sleepError },
        availability,
      ] = await Promise.all([
        getTasks(userId),
        getSleepRecord(userId, today),
        getRecommendationAvailability(userId, today),
      ])
      if (taskError) throw taskError
      if (sleepError) throw sleepError
      if (availability.error) throw availability.error
      if (currentRequestId !== requestId.current) return
      setTasks(taskData as Task[])
      setSleepRecord(currentSleep)
      setObligations(availability.obligations)
      setPlannerEntries(availability.plannerEntries)
      setActivityEvidence(availability.activityEvidence)
      setSleepRecords(availability.sleepRecords)
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setTasks([])
        setSleepRecord(null)
        setObligations([])
        setPlannerEntries([])
        setActivityEvidence([])
        setSleepRecords([])
        setError(errorMessage(loadError))
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [today, userId])

  useEffect(() => {
    void load()
    return () => {
      requestId.current += 1
    }
  }, [load])

  const recommendations: Recommendation[] = error || !userId
    ? []
    : sortAndLimitRecommendations([
      ...generateTaskRecommendations(tasks, {
        hourlyProfile,
        confidence: energyConfidence,
        obligations,
        plannerEntries,
        today,
        isLowEnergy: lowEnergyDay.isLowEnergy,
        activityEvidence,
        sleepRecords,
      }),
      ...generateHabitRecommendations(
        [...new Map(habits.filter((habit) => habit.active).map((habit) => [habit.id, habit])).values()],
        {
        hourlyProfile,
        confidence: energyConfidence,
        obligations,
        plannerEntries,
        today,
        activityEvidence,
        sleepRecords,
        },
      ),
      ...generateLowEnergyRecommendations(lowEnergyDay, sleepRecord),
    ])

  const actionByRecommendationId: Record<string, ActionableRecommendation | null> = Object.fromEntries(
    recommendations.map((recommendation) => {
      const task = recommendation.taskId
        ? tasks.find((item) => item.id === recommendation.taskId)
        : undefined
      const habit = recommendation.habitId
        ? habits.find((item) => item.id === recommendation.habitId)
        : undefined
      return [
        recommendation.id,
        findRecommendedSlot(recommendation, {
          entries: plannerEntries,
          obligations,
          today,
          now: currentTime,
          task,
          habit,
          isLowEnergy: lowEnergyDay.isLowEnergy,
        }),
      ]
    }),
  )
  const unavailableReasonByRecommendationId = Object.fromEntries(
    recommendations
      .filter((recommendation) =>
        ['task', 'habit'].includes(recommendation.type)
        && !actionByRecommendationId[recommendation.id],
      )
      .map((recommendation) => {
        const task = recommendation.taskId
          ? tasks.find((item) => item.id === recommendation.taskId)
          : undefined
        const habit = recommendation.habitId
          ? habits.find((item) => item.id === recommendation.habitId)
          : undefined
        return [
          recommendation.id,
          getRecommendationUnavailableReason(recommendation, {
            entries: plannerEntries,
            obligations,
            today,
            now: currentTime,
            task,
            habit,
            isLowEnergy: lowEnergyDay.isLowEnergy,
          }),
        ]
      }),
  )

  return {
    recommendations,
    actionByRecommendationId,
    unavailableReasonByRecommendationId,
    loading,
    error,
    reload: load,
  }
}
