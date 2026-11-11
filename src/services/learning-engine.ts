import { supabase } from './supabase'
import type { EnergyLevelSample } from './energy-insights'
import {
  detectEnergyAdaptation,
  getEnergyImpactHistoryStart,
  getEnergyImpacts,
  summarizeEnergyImpacts,
} from './energy-impact-engine'
import type { EnergyImpact } from './energy-impact-engine'

export type LearningPatternType =
  | 'time_preference'
  | 'duration_preference'
  | 'energy_correlation'
  | 'completion_rate'
  | 'friction_point'

export interface UserPattern {
  id: string
  user_id: string
  pattern_type: LearningPatternType
  pattern_data: Record<string, unknown>
  confidence: number
  created_at: string
  updated_at: string
}

export interface LearningPlannerEntry {
  id: string
  date: string
  start_time: string
  end_time: string
  task_id: string | null
  status: string
}

export interface LearningTask {
  id: string
  title?: string
  status: string
  priority?: string | null
  energy_cost?: number | null
  cognitive_load?: string | null
  estimated_duration?: number | null
  actual_duration?: number | null
}

export interface LearningActivity {
  id: string
  title: string
}

export interface TaskEnergyCorrelation {
  id: string
  task_id: string | null
  energy_level_at_completion: number | null
  duration_minutes: number | null
  completed_at: string
}

export interface LearningSleepRecord {
  sleep_date: string
  hours_slept: number
  sleep_quality: number
}

export interface LearningData {
  plannerEntries: LearningPlannerEntry[]
  tasks: LearningTask[]
  energySamples: EnergyLevelSample[]
  correlations: TaskEnergyCorrelation[]
  sleepRecords: LearningSleepRecord[]
  energyImpacts: EnergyImpact[]
  habits: LearningActivity[]
  obligations: LearningActivity[]
}

export interface DetectedPattern {
  pattern_type: LearningPatternType
  pattern_data: Record<string, unknown> & { key: string; summary: string }
  confidence: number
}

const PATTERN_TYPES: LearningPatternType[] = [
  'time_preference',
  'duration_preference',
  'energy_correlation',
  'completion_rate',
  'friction_point',
]
const MIN_CONFIDENCE = 0.5
const MIN_PATTERN_SAMPLES = 5
const LEARNING_HISTORY_DAYS = 90
const LEARNING_PAGE_SIZE = 1000
const PATTERN_FIELDS = 'id, user_id, pattern_type, pattern_data, confidence, created_at, updated_at'
const DURATION_BUCKETS = [30, 45, 60, 90]

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function getConfidence(sampleCount: number) {
  if (!Number.isInteger(sampleCount) || sampleCount < MIN_PATTERN_SAMPLES) return 0
  return Math.min(0.95, sampleCount / (sampleCount + MIN_PATTERN_SAMPLES))
}

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function formatTime(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function getDurationBucket(duration: number) {
  if (!Number.isFinite(duration) || duration < 15 || duration > 120) return null
  if (duration <= 37) return 30
  if (duration <= 52) return 45
  if (duration <= 75) return 60
  return 90
}

function getCompletedTaskEntries(data: LearningData) {
  const taskIds = new Set(data.tasks.map((task) => task.id))
  return data.plannerEntries.filter((entry) =>
    entry.status === 'completed' && entry.task_id && taskIds.has(entry.task_id),
  )
}

function getEnergyAverageByHour(samples: EnergyLevelSample[]) {
  const values = Array.from({ length: 24 }, () => [] as number[])
  for (const sample of samples) {
    if (Number.isInteger(sample.hour) && sample.hour >= 0 && sample.hour <= 23
      && isValidNumber(sample.energy_level) && sample.energy_level >= 1 && sample.energy_level <= 10) {
      values[sample.hour].push(sample.energy_level)
    }
  }
  return values.map((hourValues) => hourValues.length >= 3
    ? hourValues.reduce((sum, value) => sum + value, 0) / hourValues.length
    : null)
}

export function detectTimePreferences(data: LearningData): DetectedPattern[] {
  const completedEntries = getCompletedTaskEntries(data)
  const confidence = getConfidence(completedEntries.length)
  if (confidence < MIN_CONFIDENCE) return []

  const completedByHour = Array.from({ length: 24 }, () => 0)
  for (const entry of completedEntries) {
    const startMinutes = parseTime(entry.start_time)
    if (startMinutes !== null) completedByHour[Math.floor(startMinutes / 60)] += 1
  }

  const energyByHour = getEnergyAverageByHour(data.energySamples)
  const windows = Array.from({ length: 21 }, (_, startHour) => {
    const completedCount = completedByHour
      .slice(startHour, startHour + 4)
      .reduce((sum, count) => sum + count, 0)
    const energyValues = energyByHour.slice(startHour, startHour + 4).filter(isValidNumber)
    const averageEnergy = energyValues.length
      ? energyValues.reduce((sum, value) => sum + value, 0) / energyValues.length
      : null
    return { startHour, endHour: startHour + 4, completedCount, averageEnergy }
  })
  const bestWindow = windows.reduce((best, window) =>
    window.completedCount > best.completedCount
      || (window.completedCount === best.completedCount
        && (window.averageEnergy || 0) > (best.averageEnergy || 0))
      ? window
      : best,
  windows[0])
  if (!bestWindow.completedCount) return []

  return [{
    pattern_type: 'time_preference',
    pattern_data: {
      key: 'completed-task-window',
      summary: `Completas más tareas entre ${formatTime(bestWindow.startHour)} y ${formatTime(bestWindow.endHour)}.`,
      start_time: formatTime(bestWindow.startHour),
      end_time: formatTime(bestWindow.endHour),
      completed_count: bestWindow.completedCount,
      total_completed: completedEntries.length,
      average_energy: bestWindow.averageEnergy,
      energy_sample_count: energyByHour
        .slice(bestWindow.startHour, bestWindow.endHour)
        .filter(isValidNumber).length,
    },
    confidence,
  }]
}

function correlateCompletionDurations(data: LearningData) {
  const completedEntries = getCompletedTaskEntries(data)
  const correlationByTaskAndDate = new Map<string, TaskEnergyCorrelation>()
  for (const correlation of data.correlations) {
    if (!correlation.task_id) continue
    const date = correlation.completed_at.slice(0, 10)
    correlationByTaskAndDate.set(`${correlation.task_id}:${date}`, correlation)
  }

  return completedEntries.map((entry) => {
    const correlation = entry.task_id
      ? correlationByTaskAndDate.get(`${entry.task_id}:${entry.date}`)
      : undefined
    const entryStart = parseTime(entry.start_time)
    const entryEnd = parseTime(entry.end_time)
    const plannerDuration = entryStart !== null && entryEnd !== null && entryEnd > entryStart
      ? entryEnd - entryStart
      : null
    const duration = correlation?.duration_minutes
      ?? (entry.task_id
        ? data.tasks.find((task) => task.id === entry.task_id)?.actual_duration
        : null)
      ?? plannerDuration
    return { entry, duration }
  }).filter((item): item is { entry: LearningPlannerEntry; duration: number } =>
    isValidNumber(item.duration) && item.duration > 0 && item.duration <= 1440,
  )
}

export function detectDurationPreferences(data: LearningData): DetectedPattern[] {
  const outcomes = new Map(DURATION_BUCKETS.map((bucket) => [bucket, { completed: 0, attempts: 0 }]))

  for (const item of correlateCompletionDurations(data)) {
    const bucket = getDurationBucket(item.duration)
    if (!bucket) continue
    outcomes.get(bucket)!.completed += 1
    outcomes.get(bucket)!.attempts += 1
  }
  for (const entry of data.plannerEntries) {
    if (!entry.task_id || !['failed', 'moved'].includes(entry.status)) continue
    const start = parseTime(entry.start_time)
    const end = parseTime(entry.end_time)
    const duration = start !== null && end !== null && end > start ? end - start : null
    const bucket = duration === null ? null : getDurationBucket(duration)
    if (!bucket) continue
    outcomes.get(bucket)!.attempts += 1
  }

  const candidates = [...outcomes.entries()]
    .map(([duration, outcome]) => ({
      duration,
      ...outcome,
      rate: outcome.attempts ? outcome.completed / outcome.attempts : 0,
    }))
    .filter((item) => item.attempts >= MIN_PATTERN_SAMPLES && item.completed > 0)
    .sort((left, right) => right.rate - left.rate || right.completed - left.completed)
  const best = candidates[0]
  if (!best) return []

  return [{
    pattern_type: 'duration_preference',
    pattern_data: {
      key: 'successful-task-duration',
      summary: `Los bloques de ${best.duration} minutos tienen tu mayor tasa de finalización registrada (${Math.round(best.rate * 100)}%).`,
      duration_minutes: best.duration,
      completed_count: best.completed,
      attempt_count: best.attempts,
      completion_rate: best.rate,
    },
    confidence: getConfidence(best.attempts),
  }]
}

export function detectEnergyCorrelation(data: LearningData): DetectedPattern[] {
  const taskIds = new Set(data.tasks.map((task) => task.id))
  const validCorrelations = data.correlations.filter((item) =>
    item.task_id
    && taskIds.has(item.task_id)
    && isValidNumber(item.energy_level_at_completion)
    && item.energy_level_at_completion >= 1
    && item.energy_level_at_completion <= 10,
  )
  const completionConfidence = getConfidence(validCorrelations.length)
  const patterns: DetectedPattern[] = []
  if (completionConfidence >= MIN_CONFIDENCE) {
    const averageEnergy = validCorrelations.reduce(
      (sum, item) => sum + Number(item.energy_level_at_completion),
      0,
    ) / validCorrelations.length
    patterns.push({
      pattern_type: 'energy_correlation',
      pattern_data: {
        key: 'energy-at-completion',
        summary: `En las tareas completadas registras una energía media de ${averageEnergy.toFixed(1)}/10.`,
        average_energy: averageEnergy,
        completion_count: validCorrelations.length,
      },
      confidence: completionConfidence,
    })
  }

  const sleepByDate = new Map(data.sleepRecords.map((record) => [record.sleep_date, record]))
  const paired = validCorrelations.flatMap((correlation) => {
    const sleep = sleepByDate.get(correlation.completed_at.slice(0, 10))
    return sleep ? [{ correlation, sleep }] : []
  })
  const rested = paired.filter(({ sleep }) => sleep.hours_slept >= 6)
  const shortSleep = paired.filter(({ sleep }) => sleep.hours_slept < 6)
  const sleepConfidence = getConfidence(paired.length)
  if (sleepConfidence >= MIN_CONFIDENCE && rested.length >= 2 && shortSleep.length >= 2) {
    const averageEnergy = (group: typeof paired) => group.reduce(
      (sum, item) => sum + Number(item.correlation.energy_level_at_completion),
      0,
    ) / group.length
    const restedEnergy = averageEnergy(rested)
    const shortSleepEnergy = averageEnergy(shortSleep)
    patterns.push({
      pattern_type: 'energy_correlation',
      pattern_data: {
        key: 'sleep-and-completion-energy',
        summary: `Tras dormir 6 horas o más, tu energía al completar tareas promedia ${restedEnergy.toFixed(1)}/10; con menos de 6 horas, ${shortSleepEnergy.toFixed(1)}/10.`,
        rested_average_energy: restedEnergy,
        short_sleep_average_energy: shortSleepEnergy,
        rested_completion_count: rested.length,
        short_sleep_completion_count: shortSleep.length,
      },
      confidence: sleepConfidence,
    })
  }

  return patterns
}

export function detectCompletionPatterns(data: LearningData): DetectedPattern[] {
  const taskIds = new Set(data.tasks.map((task) => task.id))
  const outcomes = data.plannerEntries.filter((entry) =>
    entry.task_id && taskIds.has(entry.task_id)
    && ['completed', 'failed', 'moved'].includes(entry.status),
  )
  const confidence = getConfidence(outcomes.length)
  if (confidence < MIN_CONFIDENCE) return []
  const completed = outcomes.filter((entry) => entry.status === 'completed').length
  const failed = outcomes.filter((entry) => entry.status === 'failed').length
  const moved = outcomes.filter((entry) => entry.status === 'moved').length
  const rate = completed / outcomes.length

  return [{
    pattern_type: 'completion_rate',
    pattern_data: {
      key: 'task-completion-rate',
      summary: `Has completado el ${Math.round(rate * 100)}% de tus bloques de tarea registrados en los últimos 90 días.`,
      completion_rate: rate,
      completed_count: completed,
      failed_count: failed,
      moved_count: moved,
      outcome_count: outcomes.length,
    },
    confidence,
  }]
}

export function detectFrictionPoints(data: LearningData): DetectedPattern[] {
  const taskById = new Map(data.tasks.map((task) => [task.id, task]))
  const taskEntries = data.plannerEntries.filter((entry) =>
    entry.task_id && ['failed', 'moved'].includes(entry.status),
  )
  const moved = taskEntries.filter((entry) => entry.status === 'moved')
  const complexFailed = taskEntries.filter((entry) => {
    if (entry.status !== 'failed' || !entry.task_id) return false
    const task = taskById.get(entry.task_id)
    return task?.cognitive_load === 'high' || (Number(task?.energy_cost) || 0) >= 4
  })
  const energyByHour = getEnergyAverageByHour(data.energySamples)
  const lowEnergyOutcomes = taskEntries.filter((entry) => {
    const start = parseTime(entry.start_time)
    if (start === null) return false
    const average = energyByHour[Math.floor(start / 60)]
    return isValidNumber(average) && average <= 4
  })
  const candidates: Array<{ key: string; summary: string; sampleCount: number; extra: Record<string, unknown> }> = []
  if (moved.length >= MIN_PATTERN_SAMPLES) {
    candidates.push({
      key: 'frequently-moved-tasks',
      summary: `Has movido ${moved.length} bloques de tarea en los últimos 90 días.`,
      sampleCount: moved.length,
      extra: { moved_count: moved.length },
    })
  }
  if (complexFailed.length >= MIN_PATTERN_SAMPLES) {
    candidates.push({
      key: 'complex-task-failures',
      summary: `${complexFailed.length} bloques de tareas de alta carga o coste terminaron como fallidos.`,
      sampleCount: complexFailed.length,
      extra: { failed_count: complexFailed.length },
    })
  }
  if (lowEnergyOutcomes.length >= MIN_PATTERN_SAMPLES) {
    candidates.push({
      key: 'low-energy-outcomes',
      summary: `${lowEnergyOutcomes.length} bloques movidos o fallidos coincidieron con horas de energía media igual o inferior a 4/10.`,
      sampleCount: lowEnergyOutcomes.length,
      extra: { low_energy_outcome_count: lowEnergyOutcomes.length },
    })
  }

  return candidates.map((candidate) => ({
    pattern_type: 'friction_point' as const,
    pattern_data: {
      key: candidate.key,
      summary: candidate.summary,
      sample_count: candidate.sampleCount,
      ...candidate.extra,
    },
    confidence: getConfidence(candidate.sampleCount),
  })).filter((pattern) => pattern.confidence >= MIN_CONFIDENCE)
}

export function detectEnergyImpactPatterns(data: LearningData, now = new Date()): DetectedPattern[] {
  const impacts = data.energyImpacts || []
  const adaptations = new Set(detectEnergyAdaptation(impacts, now)
    .map((item) => `${item.impactType}:${item.activityId}`))
  const titles = new Map<string, string>()
  for (const item of data.tasks) titles.set(`task:${item.id}`, item.title || 'Tarea')
  for (const item of data.habits || []) titles.set(`habit:${item.id}`, item.title || 'Hábito')
  for (const item of data.obligations || []) titles.set(`obligation:${item.id}`, item.title || 'Obligación')
  return summarizeEnergyImpacts(impacts, now).map((summary) => {
    const activityKey = `${summary.impactType}:${summary.activityId}`
    const activity = titles.get(activityKey) || {
      task: 'Tarea',
      habit: 'Hábito',
      obligation: 'Obligación',
    }[summary.impactType]
    const adapting = adaptations.has(activityKey)
    const patternKind = adapting
      ? 'energy_adaptation'
      : summary.classification === 'recovery'
        ? 'energy_recovery'
        : summary.classification === 'drain'
          ? 'energy_drain'
          : 'energy_neutral'
    const impactText = `${summary.averageImpact > 0 ? '+' : ''}${summary.averageImpact.toFixed(1)}`
    const summaryText = adapting
      ? `${activity} requiere menos energía que antes (${summary.previousAverage?.toFixed(1)} → ${summary.recentAverage?.toFixed(1)}).`
      : summary.classification === 'recovery'
        ? `${activity} suele recuperar energía (impacto medio ${impactText}).`
        : summary.classification === 'drain'
          ? `${activity} suele consumir energía (impacto medio ${impactText}).`
          : `${activity} tiene un impacto energético neutro (media ${impactText}).`
    return {
      pattern_type: 'energy_correlation' as const,
      pattern_data: {
        key: `energy-impact:${activityKey}`,
        source: 'energy-impact-engine',
        kind: patternKind,
        activity,
        activity_id: summary.activityId,
        activity_type: summary.impactType,
        average_delta: summary.averageImpact,
        previous_average: summary.previousAverage,
        recent_average: summary.recentAverage,
        trend: summary.trend,
        sample_count: summary.sampleCount,
        summary: summaryText,
      },
      confidence: summary.confidence,
    }
  }).filter((pattern) => pattern.confidence >= MIN_CONFIDENCE)
}

export function detectLearningPatterns(data: LearningData, now = new Date()): DetectedPattern[] {
  return [
    ...detectTimePreferences(data),
    ...detectDurationPreferences(data),
    ...detectEnergyCorrelation(data),
    ...detectCompletionPatterns(data),
    ...detectFrictionPoints(data),
    ...detectEnergyImpactPatterns(data, now),
  ].filter((pattern) =>
    PATTERN_TYPES.includes(pattern.pattern_type)
    && pattern.confidence >= MIN_CONFIDENCE,
  )
}

function getHistoryStartDate(today: string, days = LEARNING_HISTORY_DAYS) {
  const date = new Date(`${today}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - days + 1)
  return date.toISOString().slice(0, 10)
}

async function loadAllRows<T>(
  loadPage: (start: number, end: number) => PromiseLike<{
    data: T[] | null
    error: { message: string } | null
  }>,
) {
  const rows: T[] = []
  for (let offset = 0; ; offset += LEARNING_PAGE_SIZE) {
    const { data, error } = await loadPage(offset, offset + LEARNING_PAGE_SIZE - 1)
    if (error) return { data: [], error }
    rows.push(...(data || []))
    if (!data || data.length < LEARNING_PAGE_SIZE) break
  }
  return { data: rows, error: null }
}

export async function loadLearningData(userId: string, today: string) {
  const parsedDate = new Date(`${today}T00:00:00.000Z`)
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(today)
    || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== today) {
    return {
      data: null,
      error: new Error('El usuario o la fecha para analizar patrones no son válidos.'),
    }
  }
  const startDate = getHistoryStartDate(today)
  const impactStart = getEnergyImpactHistoryStart(new Date(`${today}T12:00:00.000Z`))
  const startTimestamp = `${startDate}T00:00:00.000Z`
  const [
    plannerResult,
    tasksResult,
    energyResult,
    correlationsResult,
    sleepResult,
    impactsResult,
    habitsResult,
    obligationsResult,
  ] = await Promise.all([
    loadAllRows<LearningPlannerEntry>((start, end) => supabase.from('weekly_planner')
      .select('id, date, start_time, end_time, task_id, status')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', today)
      .order('date')
      .order('start_time')
      .order('id')
      .range(start, end)),
    loadAllRows<LearningTask>((start, end) => supabase.from('tasks')
      .select('id, title, status, priority, energy_cost, cognitive_load, estimated_duration, actual_duration')
      .eq('user_id', userId)
      .order('id')
      .range(start, end)),
    loadAllRows<EnergyLevelSample>((start, end) => supabase.from('energy_levels')
      .select('date, hour, energy_level')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', today)
      .order('date')
      .order('hour')
      .order('energy_level')
      .range(start, end)),
    loadAllRows<TaskEnergyCorrelation>((start, end) => supabase.from('task_energy_correlation')
      .select('id, task_id, energy_level_at_completion, duration_minutes, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', startTimestamp)
      .lte('completed_at', `${today}T23:59:59.999Z`)
      .order('completed_at')
      .order('id')
      .range(start, end)),
    loadAllRows<LearningSleepRecord>((start, end) => supabase.from('sleep_records')
      .select('sleep_date, hours_slept, sleep_quality')
      .eq('user_id', userId)
      .gte('sleep_date', startDate)
      .lte('sleep_date', today)
      .order('sleep_date')
      .range(start, end)),
    getEnergyImpacts(userId, impactStart),
    loadAllRows<LearningActivity>((start, end) => supabase.from('habits')
      .select('id, title')
      .eq('user_id', userId)
      .order('id')
      .range(start, end)),
    loadAllRows<LearningActivity>((start, end) => supabase.from('obligations')
      .select('id, title')
      .eq('user_id', userId)
      .order('id')
      .range(start, end)),
  ])
  const firstError = plannerResult.error
    || tasksResult.error
    || energyResult.error
    || correlationsResult.error
    || sleepResult.error
    || impactsResult.error
    || habitsResult.error
    || obligationsResult.error
  if (firstError) return { data: null, error: firstError }

  return {
    data: {
      plannerEntries: (plannerResult.data || []) as LearningPlannerEntry[],
      tasks: (tasksResult.data || []) as LearningTask[],
      energySamples: (energyResult.data || []) as EnergyLevelSample[],
      correlations: (correlationsResult.data || []) as TaskEnergyCorrelation[],
      sleepRecords: (sleepResult.data || []) as LearningSleepRecord[],
      energyImpacts: impactsResult.data || [],
      habits: habitsResult.data || [],
      obligations: obligationsResult.data || [],
    } satisfies LearningData,
    error: null,
  }
}

function patternIdentity(pattern: DetectedPattern) {
  return `${pattern.pattern_type}:${pattern.pattern_data.key}`
}

export async function savePatterns(userId: string, patterns: DetectedPattern[]) {
  if (!userId) return { patterns: [], error: new Error('El usuario es obligatorio para guardar patrones.') }
  const eligible = patterns.filter((pattern) =>
    PATTERN_TYPES.includes(pattern.pattern_type)
    && Number.isFinite(pattern.confidence)
    && pattern.confidence >= MIN_CONFIDENCE
    && typeof pattern.pattern_data.key === 'string',
  )
  const { data: existing, error: readError } = await supabase
    .from('user_patterns')
    .select(PATTERN_FIELDS)
    .eq('user_id', userId)
  if (readError) return { patterns: [], error: readError }

  const existingByIdentity = new Map<string, UserPattern>()
  for (const pattern of (existing || []) as UserPattern[]) {
    const key = pattern.pattern_data?.key
    if (typeof key === 'string' && !existingByIdentity.has(`${pattern.pattern_type}:${key}`)) {
      existingByIdentity.set(`${pattern.pattern_type}:${key}`, pattern)
    }
  }

  const saved: UserPattern[] = []
  for (const pattern of eligible) {
    const current = existingByIdentity.get(patternIdentity(pattern))
    const payload = {
      user_id: userId,
      pattern_type: pattern.pattern_type,
      pattern_data: pattern.pattern_data,
      confidence: pattern.confidence,
      updated_at: new Date().toISOString(),
    }
    const result = current
      ? await supabase.from('user_patterns')
        .update(payload)
        .eq('id', current.id)
        .eq('user_id', userId)
        .select(PATTERN_FIELDS)
        .single()
      : await supabase.from('user_patterns')
        .insert(payload)
        .select(PATTERN_FIELDS)
        .single()
    if (result.error) return { patterns: saved, error: result.error }
    if (result.data) {
      const savedPattern = result.data as UserPattern
      saved.push(savedPattern)
      existingByIdentity.set(patternIdentity(pattern), savedPattern)
    }
  }

  const activeEnergyImpactKeys = new Set(eligible
    .filter((pattern) => pattern.pattern_data.source === 'energy-impact-engine')
    .map((pattern) => pattern.pattern_data.key))
  const obsoleteEnergyPatterns = (existing || []).filter((pattern: UserPattern) =>
    pattern.pattern_type === 'energy_correlation'
    && pattern.pattern_data?.source === 'energy-impact-engine'
    && typeof pattern.pattern_data.key === 'string'
    && !activeEnergyImpactKeys.has(pattern.pattern_data.key),
  )
  for (const pattern of obsoleteEnergyPatterns) {
    const { error } = await supabase
      .from('user_patterns')
      .delete()
      .eq('id', pattern.id)
      .eq('user_id', userId)
    if (error) return { patterns: saved, error }
  }

  return { patterns: saved, error: null }
}

export async function getLearningPatterns(userId: string) {
  if (!userId) return { patterns: [], error: new Error('El usuario es obligatorio para consultar patrones.') }
  const { data, error } = await supabase
    .from('user_patterns')
    .select(PATTERN_FIELDS)
    .eq('user_id', userId)
    .gte('confidence', MIN_CONFIDENCE)
    .order('updated_at', { ascending: false })
  return {
    patterns: error ? [] : (data || []) as UserPattern[],
    error,
  }
}

export async function refreshUserPatterns(userId: string, today: string) {
  const { data, error: loadError } = await loadLearningData(userId, today)
  if (loadError || !data) return { patterns: [], error: loadError }
  const detectedPatterns = detectLearningPatterns(data, new Date(`${today}T23:59:59.999Z`))
  const { error: saveError } = await savePatterns(userId, detectedPatterns)
  if (saveError) return { patterns: [], error: saveError }
  return getLearningPatterns(userId)
}
