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
import { getEnergyImpactHistoryStart, getEnergyImpacts } from './energy-impact-engine'
import type { EnergyImpact } from './energy-impact-engine'

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
  is_creative_block?: boolean
  notes?: string | null
  obligation?: Pick<PlannerObligation, 'obligation_type'> | null
}

export type RecommendationObligation = Pick<PlannerObligation, 'id' | 'obligation_type' | 'active' | 'recurrence_rule'>

export interface ActivityLearningEvidence {
  activityId: string
  activityType: 'task' | 'habit'
  attemptCount: number
  completedCount: number
  bestHour: number
  bestCompletionRate: number
  worstCompletionRate: number
  averageEnergyDelta: number
  energyImpactCount: number
  frictionCount: number
  adapted: boolean
  sleepAverageHours: number | null
}

interface HabitStatusHistoryRecord {
  habit_id: string
  planner_entry_id: string | null
  planned_date: string
  status: string
  event_type: string
}

interface LearningPatternRecord {
  pattern_type: string
  pattern_data: Record<string, unknown>
  confidence: number
}

interface RecommendationSleepRecord {
  sleep_date: string
  hours_slept: number
  sleep_quality: number
}

interface EnergyWindowContext {
  hourlyProfile: HourlyEnergyProfileEntry[]
  confidence: EnergyConfidence
  obligations: RecommendationObligation[]
  plannerEntries: RecommendationPlannerEntry[]
  today: string
  activityEvidence?: ActivityLearningEvidence[]
  sleepRecords?: RecommendationSleepRecord[]
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
    addInterval(intervalsByDate, entry.date, entry.start_time, entry.end_time)
    if (!entry.obligation_id || !activeIds.has(entry.obligation_id)) continue
    const key = `${entry.obligation_id}:${entry.obligation_occurrence_date || entry.date}`
    const entries = entriesByOccurrence.get(key) || []
    entries.push(entry)
    entriesByOccurrence.set(key, entries)
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

function getActivityEvidence(
  context: EnergyWindowContext,
  activityId: string,
  activityType: ActivityLearningEvidence['activityType'],
) {
  return context.activityEvidence?.find((item) =>
    item.activityId === activityId && item.activityType === activityType,
  )
}

function getEvidenceRecommendationWindow(evidence: ActivityLearningEvidence) {
  if (evidence.bestHour < 0 || evidence.bestHour >= 23) return null
  return { start: formatTime(evidence.bestHour), end: formatTime(evidence.bestHour + 1) }
}

function isEvidenceWindowAvailable(
  context: EnergyWindowContext,
  window: Pick<EnergyWindow, 'startHour' | 'endHour'>,
) {
  const upcomingDates = Array.from({ length: 7 }, (_, index) => offsetDate(context.today, index))
  const recurrenceDates = [offsetDate(context.today, -1), ...upcomingDates]
  const blockedIntervals = getBlockedObligationIntervals(
    context.obligations,
    context.plannerEntries,
    recurrenceDates,
  )
  return upcomingDates.every((date) =>
    !overlapsObligation(window.startHour, window.endHour - window.startHour, [date], blockedIntervals),
  )
}

function getEvidenceConfidence(
  evidence: ActivityLearningEvidence,
  energyConfidence: EnergyConfidence,
): Recommendation['confidence'] | null {
  const sampleCount = evidence.attemptCount + evidence.energyImpactCount
  return sampleCount < 4
    ? null
    : calculateRecommendationConfidence({ energyConfidence, evidenceCount: sampleCount })
}

function getEvidenceReason(evidence: ActivityLearningEvidence, sleepRecords: RecommendationSleepRecord[] = []) {
  const energyText = `${evidence.averageEnergyDelta > 0 ? '+' : ''}${evidence.averageEnergyDelta.toFixed(1)}`
  const frictionText = evidence.frictionCount
    ? ` Se registraron ${evidence.frictionCount} señales de fricción.`
    : ''
  const adaptationText = evidence.adapted ? ' La tendencia reciente muestra adaptación.' : ''
  const recentSleep = sleepRecords
    .filter((record) => Number.isFinite(record.hours_slept) && record.hours_slept > 0)
    .sort((left, right) => left.sleep_date.localeCompare(right.sleep_date))
    .slice(-7)
  const sleepAverage = recentSleep.length
    ? recentSleep.reduce((sum, record) => sum + record.hours_slept, 0) / recentSleep.length
    : evidence.sleepAverageHours
  const sleepText = sleepAverage === null
    ? ' No hay historial de sueño suficiente para ajustar la lectura.'
    : ` Sueño medio reciente: ${sleepAverage.toFixed(1)} h.`
  return `En ${evidence.attemptCount} bloques, el mejor horario registró ${Math.round(evidence.bestCompletionRate * 100)}% de cumplimiento frente a ${Math.round(evidence.worstCompletionRate * 100)}% en el menos favorable. El impacto energético medio fue ${energyText} (${evidence.energyImpactCount} registros).${frictionText}${adaptationText}${sleepText}`
}

export function generateTaskRecommendations(
  tasks: Task[],
  context: TaskRecommendationContext,
): Recommendation[] {
  const confidence = calculateRecommendationConfidence({ energyConfidence: context.confidence })
  if (!confidence || !getBestUnobstructedWindow(context)) return []

  return tasks
    .filter((task) => task.status === 'pending')
    .filter((task) => task.priority === 'high' || (Number.isFinite(task.energy_cost) && task.energy_cost >= 4))
    .filter((task) => !(context.isLowEnergy && Number.isFinite(task.energy_cost) && task.energy_cost >= 4))
    .flatMap((task) => {
      const evidence = getActivityEvidence(context, task.id, 'task')
      const evidenceConfidence = evidence && getEvidenceConfidence(evidence, context.confidence)
      const recommendedWindow = evidence && getEvidenceRecommendationWindow(evidence)
      if (!evidence || !evidenceConfidence || !recommendedWindow
        || !isEvidenceWindowAvailable(context, {
          startHour: evidence.bestHour,
          endHour: evidence.bestHour + 1,
        })
        || evidence.bestCompletionRate <= evidence.worstCompletionRate
        || evidence.energyImpactCount < 2) return []
      const highEnergy = Number.isFinite(task.energy_cost) && task.energy_cost >= 4
      const reason = `${task.priority === 'high' ? 'Tarea prioritaria' : 'Tarea'}${highEnergy ? ' de alto coste energético' : ''}. ${getEvidenceReason(evidence, context.sleepRecords)}`
      return [{
        id: `task-${task.id}`,
        type: 'task' as const,
        taskId: task.id,
        title: task.title,
        reason,
        confidence: evidenceConfidence,
        priority: (task.priority === 'high' ? 80 : 50) + (highEnergy ? 20 : 0) + (Number(task.energy_cost) || 0),
        recommendedWindow,
      }]
    })
}

export function generateHabitRecommendations(
  habits: Habit[],
  context: EnergyWindowContext,
): Recommendation[] {
  const confidence = calculateRecommendationConfidence({ energyConfidence: context.confidence })
  if (!confidence || !getBestUnobstructedWindow(context)) return []

  return habits
    .filter((habit) => habit.active)
    .flatMap((habit) => {
      const evidence = getActivityEvidence(context, habit.id, 'habit')
      const evidenceConfidence = evidence && getEvidenceConfidence(evidence, context.confidence)
      const recommendedWindow = evidence && getEvidenceRecommendationWindow(evidence)
      if (!evidence || !evidenceConfidence || !recommendedWindow
        || !isEvidenceWindowAvailable(context, {
          startHour: evidence.bestHour,
          endHour: evidence.bestHour + 1,
        })
        || evidence.bestCompletionRate <= evidence.worstCompletionRate
        || evidence.energyImpactCount < 2) return []
      return [{
        id: `habit-${habit.id}`,
        type: 'habit' as const,
        habitId: habit.id,
        title: `Propuesta de horario para ${habit.title}`,
        reason: getEvidenceReason(evidence, context.sleepRecords),
        confidence: evidenceConfidence,
        priority: 30 + Math.round((evidence.bestCompletionRate - evidence.worstCompletionRate) * 100),
        recommendedWindow,
      }]
    })
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

function getActivityLearningEvidence(
  plannerEntries: RecommendationPlannerEntry[],
  energyImpacts: EnergyImpact[],
  habitHistory: HabitStatusHistoryRecord[],
  userPatterns: LearningPatternRecord[],
  sleepRecords: RecommendationSleepRecord[],
): ActivityLearningEvidence[] {
  const grouped = new Map<string, {
    activityId: string
    activityType: 'task' | 'habit'
    attempts: Array<{ hour: number; completed: boolean }>
    impacts: EnergyImpact[]
    frictionCount: number
  }>()
  const getGroup = (activityId: string, activityType: 'task' | 'habit') => {
    const key = `${activityType}:${activityId}`
    const current = grouped.get(key) || {
      activityId,
      activityType,
      attempts: [],
      impacts: [],
      frictionCount: 0,
    }
    grouped.set(key, current)
    return current
  }

  for (const entry of plannerEntries) {
    if (!['completed', 'failed', 'moved'].includes(entry.status || '')) continue
    const activityType = entry.task_id ? 'task' : entry.habit_id ? 'habit' : null
    const activityId = entry.task_id || entry.habit_id
    const hour = parseTime(entry.start_time)
    if (!activityType || !activityId || hour === null) continue
    const group = getGroup(activityId, activityType)
    group.attempts.push({ hour: Math.floor(hour / 60), completed: entry.status === 'completed' })
  }

  const seenHistoricalHabitEvents = new Set<string>()
  for (const event of habitHistory) {
    if (event.planner_entry_id || !['completed', 'failed', 'moved'].includes(event.status)) continue
    const key = `${event.habit_id}:${event.planned_date}:${event.status}`
    if (seenHistoricalHabitEvents.has(key)) continue
    seenHistoricalHabitEvents.add(key)
    const group = getGroup(event.habit_id, 'habit')
    if (event.status === 'failed' || event.status === 'moved') group.frictionCount += 1
  }

  for (const impact of energyImpacts) {
    const activityId = impact.task_id || impact.habit_id
    if (!activityId || !['task', 'habit'].includes(impact.impact_type)
      || !Number.isFinite(impact.energy_delta)
      || impact.energy_before === null
      || impact.energy_after === null) continue
    getGroup(activityId, impact.impact_type as 'task' | 'habit').impacts.push(impact)
  }

  return [...grouped.values()].flatMap((group) => {
    const outcomeByHour = new Map<number, { completed: number; attempts: number; friction: number }>()
    for (const attempt of group.attempts) {
      const current = outcomeByHour.get(attempt.hour) || { completed: 0, attempts: 0, friction: 0 }
      current.attempts += 1
      if (attempt.completed) current.completed += 1
      else current.friction += 1
      outcomeByHour.set(attempt.hour, current)
    }
    const energyByHour = new Map<number, number[]>()
    for (const impact of group.impacts) {
      const hour = new Date(impact.started_at).getHours()
      const values = energyByHour.get(hour) || []
      values.push(Number(impact.energy_delta))
      energyByHour.set(hour, values)
    }
    const activityPattern = userPatterns.find((pattern) =>
      pattern.pattern_data.source === 'energy-impact-engine'
      && pattern.pattern_data.activity_id === group.activityId
      && pattern.pattern_data.activity_type === group.activityType,
    )
    const adapted = activityPattern?.pattern_data.kind === 'energy_adaptation'
    const recentAverage = Number(activityPattern?.pattern_data.recent_average)
    const candidates = [...outcomeByHour.entries()]
      .filter(([hour, outcomes]) => outcomes.attempts >= 2 && (energyByHour.get(hour)?.length || 0) > 0)
      .map(([hour, outcomes]) => {
        const hourlyEnergy = energyByHour.get(hour) || []
        const energyDelta = adapted && Number.isFinite(recentAverage)
          ? recentAverage
          : hourlyEnergy.reduce((sum, value) => sum + value, 0) / hourlyEnergy.length
        const completionRate = outcomes.completed / outcomes.attempts
        const energyScore = Math.max(0, Math.min(1, (energyDelta + 9) / 18))
        const frictionRate = (outcomes.friction + group.frictionCount) / Math.max(1, outcomes.attempts + group.frictionCount)
        const score = completionRate * 0.7 + energyScore * 0.3 - frictionRate * 0.1
        return { hour, outcomes, energyDelta, completionRate, score }
      })
    if (candidates.length < 2 || group.impacts.length < 2) return []

    const best = [...candidates].sort((left, right) =>
      right.score - left.score || left.hour - right.hour,
    )[0]
    const worst = [...candidates].sort((left, right) =>
      left.score - right.score || left.hour - right.hour,
    )[0]
    if (!best || !worst || best.hour === worst.hour || best.score <= worst.score) return []
    const sleepSamples = sleepRecords.filter((record) =>
      Number.isFinite(record.hours_slept) && record.hours_slept > 0,
    )
    const sleepAverageHours = sleepSamples.length
      ? sleepSamples.reduce((sum, record) => sum + record.hours_slept, 0) / sleepSamples.length
      : null
    return [{
      activityId: group.activityId,
      activityType: group.activityType,
      attemptCount: group.attempts.length + group.frictionCount,
      completedCount: group.attempts.filter((attempt) => attempt.completed).length,
      bestHour: best.hour,
      bestCompletionRate: best.completionRate,
      worstCompletionRate: worst.completionRate,
      averageEnergyDelta: best.energyDelta,
      energyImpactCount: group.impacts.length,
      frictionCount: group.frictionCount + best.outcomes.friction,
      adapted,
      sleepAverageHours,
    }]
  })
}

export async function getRecommendationAvailability(userId: string, today: string) {
  if (!userId || !isValidDate(today)) {
    return { obligations: [], plannerEntries: [], activityEvidence: [], sleepRecords: [], error: new Error('El usuario o la fecha para verificar obligaciones no son válidos.') }
  }

  const lastDate = offsetDate(today, 6)
  const historyStart = offsetDate(today, -90)
  const impactStart = getEnergyImpactHistoryStart(new Date(`${today}T12:00:00.000Z`))
  const [
    { data: obligations, error: obligationsError },
    { data: plannerEntries, error: plannerError },
    { data: habitHistory, error: habitHistoryError },
    { data: sleepRecords, error: sleepError },
    { data: userPatterns, error: patternsError },
    { data: energyImpacts, error: impactsError },
  ] = await Promise.all([
    supabase
      .from('obligations')
      .select('id, obligation_type, active, recurrence_rule')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('weekly_planner')
      .select('id, date, start_time, end_time, task_id, habit_id, obligation_id, obligation_occurrence_date, status')
      .eq('user_id', userId)
      .gte('date', historyStart)
      .lte('date', lastDate),
    supabase
      .from('habit_status_history')
      .select('planner_entry_id, habit_id, planned_date, status, event_type')
      .eq('user_id', userId)
      .gte('planned_date', historyStart)
      .lte('planned_date', today),
    supabase
      .from('sleep_records')
      .select('sleep_date, hours_slept, sleep_quality')
      .eq('user_id', userId)
      .gte('sleep_date', historyStart)
      .lte('sleep_date', today),
    supabase
      .from('user_patterns')
      .select('pattern_type, pattern_data, confidence')
      .eq('user_id', userId),
    getEnergyImpacts(userId, impactStart),
  ])

  const resolvedObligations = (obligations || []) as RecommendationObligation[]
  const obligationById = new Map(resolvedObligations.map((obligation) => [obligation.id, obligation]))
  const resolvedPlannerEntries = (plannerEntries || []).map((entry) => ({
    ...entry,
    obligation: obligationById.get(entry.obligation_id)?.obligation_type
      ? { obligation_type: obligationById.get(entry.obligation_id)?.obligation_type }
      : null,
  })) as RecommendationPlannerEntry[]
  const resolvedSleepRecords = (sleepRecords || []) as RecommendationSleepRecord[]
  const activityEvidence = getActivityLearningEvidence(
    resolvedPlannerEntries,
    energyImpacts || [],
    (habitHistory || []) as HabitStatusHistoryRecord[],
    (userPatterns || []) as LearningPatternRecord[],
    resolvedSleepRecords,
  )

  return {
    obligations: resolvedObligations,
    plannerEntries: resolvedPlannerEntries,
    activityEvidence,
    sleepRecords: resolvedSleepRecords,
    error: obligationsError || plannerError || habitHistoryError || sleepError || patternsError || impactsError,
  }
}

export function sortAndLimitRecommendations(recommendations: Recommendation[]) {
  return [...recommendations]
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .slice(0, 3)
}
