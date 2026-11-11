import { supabase } from './supabase'
import type { Habit, Task } from '../types'
import type { LowEnergyDayResult } from '../lib/lowEnergyDay'
import type { SleepRecord } from './sleep'
import {
  ENERGY_WINDOW_HOURS,
  MINIMUM_HOURLY_SAMPLES,
} from './energy-insights'
import type {
  EnergyConfidence,
  EnergyWindow,
  HourlyEnergyProfileEntry,
} from './energy-insights'
import type { ObligationRecurrenceRule, PlannerObligation } from './weekly-planner'

export interface Recommendation {
  id: string
  type: 'task' | 'habit' | 'energy' | 'sleep'
  taskId?: string
  habitId?: string
  title: string
  reason: string
  confidence: 'medium' | 'high'
  priority: number
  recommendedWindow?: {
    start: string
    end: string
  }
}

export interface RecommendationPlannerEntry {
  id?: string
  date: string
  start_time: string
  end_time: string
  task_id?: string | null
  habit_id?: string | null
  obligation_id?: string | null
  obligation_occurrence_date?: string | null
  status?: string
  obligation?: Pick<PlannerObligation, 'obligation_type'> | null
}

export type RecommendationObligation = Pick<PlannerObligation, 'id' | 'obligation_type' | 'active' | 'recurrence_rule'>

interface EnergyWindowContext {
  hourlyProfile: HourlyEnergyProfileEntry[]
  confidence: EnergyConfidence
  obligations: RecommendationObligation[]
  plannerEntries: RecommendationPlannerEntry[]
  today: string
}

interface TaskRecommendationContext extends EnergyWindowContext {
  isLowEnergy: boolean
}

interface RecommendationConfidenceInput {
  energyConfidence?: EnergyConfidence
  evidenceCount?: number
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function offsetDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getIsoWeekday(value: string) {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay()
  return day === 0 ? 7 : day
}

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function formatTime(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

export function calculateRecommendationConfidence({
  energyConfidence,
  evidenceCount = 0,
}: RecommendationConfidenceInput): Recommendation['confidence'] | null {
  if (energyConfidence === 'high') return 'high'
  if (energyConfidence === 'medium') return 'medium'
  if (energyConfidence === 'low' || energyConfidence === 'insufficient') return null
  if (!Number.isInteger(evidenceCount) || evidenceCount < 1) return null
  return evidenceCount >= 2 ? 'high' : 'medium'
}

function getObligationOccurrenceDates(obligation: RecommendationObligation, dates: string[]) {
  const rule = obligation.recurrence_rule as ObligationRecurrenceRule | null
  if (!rule || !isValidDate(rule.startsOn)) return []

  return dates.filter((date) => {
    if (date < rule.startsOn) return false
    if (rule.frequency === 'once') return date === rule.startsOn
    return rule.frequency === 'weekly'
      && Array.isArray(rule.byDay)
      && rule.byDay.includes(getIsoWeekday(date))
  })
}

function addInterval(
  intervalsByDate: Map<string, Array<{ start: number; end: number }>>,
  date: string,
  startTime: string,
  endTime: string,
) {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  if (start === null || end === null || start === end) return

  const intervals = intervalsByDate.get(date) || []
  if (end > start) {
    intervals.push({ start, end })
  } else {
    intervals.push({ start, end: 1440 })
    const nextDateIntervals = intervalsByDate.get(offsetDate(date, 1)) || []
    nextDateIntervals.push({ start: 0, end })
    intervalsByDate.set(offsetDate(date, 1), nextDateIntervals)
  }
  intervalsByDate.set(date, intervals)
}

function getBlockedObligationIntervals(
  obligations: RecommendationObligation[],
  plannerEntries: RecommendationPlannerEntry[],
  dates: string[],
) {
  const intervalsByDate = new Map<string, Array<{ start: number; end: number }>>()
  const activeObligations = obligations.filter((obligation) => obligation.active)
  const activeIds = new Set(activeObligations.map((obligation) => obligation.id))
  const entriesByOccurrence = new Map<string, RecommendationPlannerEntry[]>()

  for (const entry of plannerEntries) {
    if (!entry.obligation_id || !activeIds.has(entry.obligation_id)) continue
    const key = `${entry.obligation_id}:${entry.obligation_occurrence_date || entry.date}`
    const entries = entriesByOccurrence.get(key) || []
    entries.push(entry)
    entriesByOccurrence.set(key, entries)
    addInterval(intervalsByDate, entry.date, entry.start_time, entry.end_time)
  }

  for (const obligation of activeObligations) {
    const rule = obligation.recurrence_rule
    for (const occurrenceDate of getObligationOccurrenceDates(obligation, dates)) {
      const occurrenceEntries = entriesByOccurrence.get(`${obligation.id}:${occurrenceDate}`)
      if (occurrenceEntries?.length) continue
      addInterval(intervalsByDate, occurrenceDate, rule.startTime, rule.endTime)
    }
  }

  return intervalsByDate
}

function overlapsObligation(
  startHour: number,
  duration: number,
  dates: string[],
  intervalsByDate: Map<string, Array<{ start: number; end: number }>>,
) {
  const candidateRanges: Array<{ dayOffset: number; start: number; end: number }> = []
  const start = startHour * 60
  const end = start + duration * 60
  if (end <= 1440) {
    candidateRanges.push({ dayOffset: 0, start, end })
  } else {
    candidateRanges.push({ dayOffset: 0, start, end: 1440 })
    candidateRanges.push({ dayOffset: 1, start: 0, end: end - 1440 })
  }

  return dates.some((date) => candidateRanges.some((range) => {
    const targetDate = offsetDate(date, range.dayOffset)
    return (intervalsByDate.get(targetDate) || []).some((interval) =>
      range.start < interval.end && interval.start < range.end,
    )
  }))
}

function getBestUnobstructedWindow(context: EnergyWindowContext): EnergyWindow | null {
  if (context.confidence !== 'medium' && context.confidence !== 'high') return null
  if (context.hourlyProfile.length !== 24 || !isValidDate(context.today)) return null

  const upcomingDates = Array.from({ length: 7 }, (_, index) => offsetDate(context.today, index))
  const recurrenceDates = [offsetDate(context.today, -1), ...upcomingDates]
  const blockedIntervals = getBlockedObligationIntervals(
    context.obligations,
    context.plannerEntries,
    recurrenceDates,
  )

  const windows: EnergyWindow[] = []
  for (let startHour = 0; startHour < 24; startHour += 1) {
    const entries = Array.from(
      { length: ENERGY_WINDOW_HOURS },
      (_, offset) => context.hourlyProfile[(startHour + offset) % 24],
    )
    if (entries.some((entry) =>
      !Number.isFinite(entry.average)
      || entry.average === null
      || entry.sampleCount < MINIMUM_HOURLY_SAMPLES,
    )) continue
    if (overlapsObligation(startHour, ENERGY_WINDOW_HOURS, upcomingDates, blockedIntervals)) continue

    windows.push({
      startHour,
      endHour: (startHour + ENERGY_WINDOW_HOURS) % 24,
      average: entries.reduce((sum, entry) => sum + (entry.average || 0), 0) / ENERGY_WINDOW_HOURS,
      sampleCount: entries.reduce((sum, entry) => sum + entry.sampleCount, 0),
      minimumSamples: Math.min(...entries.map((entry) => entry.sampleCount)),
    })
  }

  return windows.reduce<EnergyWindow | null>(
    (best, window) => !best || window.average > best.average ? window : best,
    null,
  )
}

function toRecommendedWindow(window: EnergyWindow) {
  return { start: formatTime(window.startHour), end: formatTime(window.endHour) }
}

export function generateTaskRecommendations(
  tasks: Task[],
  context: TaskRecommendationContext,
): Recommendation[] {
  const confidence = calculateRecommendationConfidence({ energyConfidence: context.confidence })
  const window = getBestUnobstructedWindow(context)
  if (!confidence || !window) return []

  return tasks
    .filter((task) => task.status === 'pending')
    .filter((task) => task.priority === 'high' || (Number.isFinite(task.energy_cost) && task.energy_cost >= 4))
    .filter((task) => !(context.isLowEnergy && Number.isFinite(task.energy_cost) && task.energy_cost >= 4))
    .map((task) => {
      const highEnergy = Number.isFinite(task.energy_cost) && task.energy_cost >= 4
      const reason = highEnergy
        ? `La tarea requiere mucha energía y tu mejor franja histórica disponible es ${formatTime(window.startHour)}-${formatTime(window.endHour)}.`
        : `La tarea es prioritaria y tu mejor franja energética histórica disponible es ${formatTime(window.startHour)}-${formatTime(window.endHour)}.`
      return {
        id: `task-${task.id}`,
        type: 'task' as const,
        taskId: task.id,
        title: task.title,
        reason,
        confidence,
        priority: (task.priority === 'high' ? 80 : 50) + (highEnergy ? 20 : 0) + (Number(task.energy_cost) || 0),
        recommendedWindow: toRecommendedWindow(window),
      }
    })
}

export function generateHabitRecommendations(
  habits: Habit[],
  context: EnergyWindowContext,
): Recommendation[] {
  const confidence = calculateRecommendationConfidence({ energyConfidence: context.confidence })
  const window = getBestUnobstructedWindow(context)
  if (!confidence || !window) return []

  return habits
    .filter((habit) => habit.active)
    .map((habit) => ({
      id: `habit-${habit.id}`,
      type: 'habit' as const,
      habitId: habit.id,
      title: `Reserva tu mejor franja para ${habit.title}`,
      reason: `Tu perfil energético registrado es más alto entre ${formatTime(window.startHour)} y ${formatTime(window.endHour)}.`,
      confidence,
      priority: 30,
      recommendedWindow: toRecommendedWindow(window),
    }))
}

export function generateLowEnergyRecommendations(
  lowEnergyDay: LowEnergyDayResult,
  sleepRecord: Pick<SleepRecord, 'hours_slept' | 'sleep_quality'> | null,
): Recommendation[] {
  const recommendations: Recommendation[] = []
  const lowEnergyConfidence = calculateRecommendationConfidence({
    evidenceCount: lowEnergyDay.isLowEnergy ? lowEnergyDay.reasons.length : 0,
  })

  if (lowEnergyDay.isLowEnergy && lowEnergyConfidence && lowEnergyDay.reasons.length) {
    recommendations.push({
      id: 'low-energy-day',
      type: 'energy',
      title: 'Divide las tareas complejas en bloques más pequeños',
      reason: lowEnergyDay.reasons.join('. '),
      confidence: lowEnergyConfidence,
      priority: 100,
    })
  }

  const lowSleepHours = typeof sleepRecord?.hours_slept === 'number'
    && Number.isFinite(sleepRecord.hours_slept)
    && sleepRecord.hours_slept > 0
    && sleepRecord.hours_slept < 6
  const lowSleepQuality = Number.isInteger(sleepRecord?.sleep_quality)
    && Number(sleepRecord?.sleep_quality) >= 1
    && Number(sleepRecord?.sleep_quality) <= 4
  const sleepConfidence = calculateRecommendationConfidence({
    evidenceCount: Number(lowSleepHours) + Number(lowSleepQuality),
  })

  if (sleepConfidence) {
    const reasons = []
    if (lowSleepHours) reasons.push(`Registraste ${sleepRecord.hours_slept} horas de sueño`)
    if (lowSleepQuality) reasons.push(`Registraste una calidad de sueño de ${sleepRecord.sleep_quality}/10`)
    recommendations.push({
      id: 'sleep-load',
      type: 'sleep',
      title: 'Evita tareas de alta carga cognitiva durante las próximas horas',
      reason: reasons.join('. '),
      confidence: sleepConfidence,
      priority: 90,
    })
  }

  return recommendations
}

export async function getRecommendationAvailability(userId: string, today: string) {
  if (!userId || !isValidDate(today)) {
    return { obligations: [], plannerEntries: [], error: new Error('El usuario o la fecha para verificar obligaciones no son válidos.') }
  }

  const lastDate = offsetDate(today, 6)
  const previousDate = offsetDate(today, -1)
  const [{ data: obligations, error: obligationsError }, { data: plannerEntries, error: plannerError }] = await Promise.all([
    supabase
      .from('obligations')
      .select('id, obligation_type, active, recurrence_rule')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('weekly_planner')
      .select('id, date, start_time, end_time, task_id, habit_id, obligation_id, obligation_occurrence_date, status')
      .eq('user_id', userId)
      .gte('date', previousDate)
      .lte('date', lastDate),
  ])

  return {
    obligations: (obligations || []) as RecommendationObligation[],
    plannerEntries: (plannerEntries || []) as RecommendationPlannerEntry[],
    error: obligationsError || plannerError,
  }
}

export function sortAndLimitRecommendations(recommendations: Recommendation[]) {
  return [...recommendations]
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .slice(0, 3)
}
