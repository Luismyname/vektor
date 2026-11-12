import { supabase } from './supabase'

export type EnergyImpactType = 'task' | 'habit' | 'obligation'
export type EnergyImpactPhase = 'start' | 'finish'
export type EnergyImpactClassification = 'recovery' | 'drain' | 'neutral'
export type EnergyImpactTrendDirection = 'improving' | 'worsening' | 'stable'

export interface EnergyImpact {
  id: string
  user_id: string
  task_id: string | null
  habit_id: string | null
  obligation_id: string | null
  impact_type: EnergyImpactType
  energy_before: number | null
  energy_after: number | null
  energy_delta: number | null
  duration_minutes: number | null
  started_at: string
  finished_at: string | null
  created_at: string
}

export interface EnergyImpactSummary {
  activityId: string
  impactType: EnergyImpactType
  averageImpact: number
  sampleCount: number
  confidence: number
  classification: EnergyImpactClassification
  trend: EnergyImpactTrendDirection | null
  previousAverage: number | null
  recentAverage: number | null
}

interface ActivityReference {
  impactType: EnergyImpactType
  activityId: string
}

const IMPACT_FIELDS = 'id, user_id, task_id, habit_id, obligation_id, impact_type, energy_before, energy_after, energy_delta, duration_minutes, started_at, finished_at, created_at'
const IMPACT_PAGE_SIZE = 1000
const MIN_IMPACT_SAMPLES = 5
const IMPACT_HISTORY_DAYS = 180
const CHANGE_THRESHOLD = 0.5
export const ENERGY_IMPACT_UPDATED_EVENT = 'vektor:energy-impact-updated'

function isEnergyLevel(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 10
}

function getActivityId(impact: EnergyImpact, impactType: EnergyImpactType) {
  if (impact.impact_type !== impactType) return null
  if (impactType === 'task') return impact.task_id
  if (impactType === 'habit') return impact.habit_id
  return impact.obligation_id
}

function getCompletedImpacts(impacts: EnergyImpact[]) {
  return impacts.filter((impact) =>
    impact.finished_at
    && isEnergyLevel(Number(impact.energy_before))
    && isEnergyLevel(Number(impact.energy_after))
    && impact.energy_delta !== null
    && Number.isFinite(Number(impact.energy_delta))
    && Number(impact.energy_delta) === Number(impact.energy_after) - Number(impact.energy_before),
  )
}

function getActivityGroups(impacts: EnergyImpact[]) {
  const groups = new Map<string, { reference: ActivityReference; impacts: EnergyImpact[] }>()
  for (const impact of getCompletedImpacts(impacts)) {
    const activityId = getActivityId(impact, impact.impact_type)
    if (!activityId) continue
    const key = `${impact.impact_type}:${activityId}`
    const group = groups.get(key) || {
      reference: { impactType: impact.impact_type, activityId },
      impacts: [],
    }
    group.impacts.push(impact)
    groups.set(key, group)
  }
  return groups
}

function getAverage(impacts: EnergyImpact[]) {
  return impacts.reduce((sum, impact) => sum + Number(impact.energy_delta), 0) / impacts.length
}

function getConfidence(sampleCount: number) {
  return Math.min(0.95, sampleCount / (sampleCount + MIN_IMPACT_SAMPLES))
}

function getTrendDirection(change: number): EnergyImpactTrendDirection {
  if (change > CHANGE_THRESHOLD) return 'improving'
  if (change < -CHANGE_THRESHOLD) return 'worsening'
  return 'stable'
}

function splitImpactPeriods(impacts: EnergyImpact[], now: Date) {
  const currentPeriodStart = now.getTime() - 90 * 24 * 60 * 60 * 1000
  const previousPeriodStart = now.getTime() - IMPACT_HISTORY_DAYS * 24 * 60 * 60 * 1000
  const previous = impacts.filter((impact) => {
    const time = new Date(impact.finished_at || '').getTime()
    return time >= previousPeriodStart && time < currentPeriodStart
  })
  const recent = impacts.filter((impact) => (
    new Date(impact.finished_at || '').getTime() >= currentPeriodStart
    && new Date(impact.finished_at || '').getTime() <= now.getTime()
  ))
  return { previous, recent }
}

function classifyImpact(averageImpact: number): EnergyImpactClassification {
  if (averageImpact > CHANGE_THRESHOLD) return 'recovery'
  if (averageImpact < -CHANGE_THRESHOLD) return 'drain'
  return 'neutral'
}

function announceEnergyImpactUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ENERGY_IMPACT_UPDATED_EVENT))
  }
}

export function calculateAverageImpact(impacts: EnergyImpact[]) {
  const completed = getCompletedImpacts(impacts)
  return completed.length ? getAverage(completed) : null
}

export function calculateImpactTrend(impacts: EnergyImpact[], now = new Date()) {
  if (Number.isNaN(now.getTime())) return null
  const completed = getCompletedImpacts(impacts)
  const { previous, recent } = splitImpactPeriods(completed, now)
  if (previous.length < MIN_IMPACT_SAMPLES || recent.length < MIN_IMPACT_SAMPLES) return null
  const previousAverage = getAverage(previous)
  const recentAverage = getAverage(recent)
  const change = recentAverage - previousAverage
  return {
    previousAverage,
    recentAverage,
    change,
    direction: getTrendDirection(change),
    confidence: Math.min(getConfidence(previous.length), getConfidence(recent.length)),
    previousSampleCount: previous.length,
    recentSampleCount: recent.length,
  }
}

export function summarizeEnergyImpacts(impacts: EnergyImpact[], now = new Date()): EnergyImpactSummary[] {
  if (Number.isNaN(now.getTime())) return []
  return [...getActivityGroups(impacts).values()]
    .filter(({ impacts: activityImpacts }) => activityImpacts.length >= MIN_IMPACT_SAMPLES)
    .map(({ reference, impacts: activityImpacts }) => {
      const { previous, recent } = splitImpactPeriods(activityImpacts, now)
      const previousAverage = previous.length >= MIN_IMPACT_SAMPLES ? getAverage(previous) : null
      const recentAverage = recent.length >= MIN_IMPACT_SAMPLES ? getAverage(recent) : null
      const trend = previousAverage !== null && recentAverage !== null
        ? getTrendDirection(recentAverage - previousAverage)
        : null
      const averageImpact = getAverage(activityImpacts)
      return {
        activityId: reference.activityId,
        impactType: reference.impactType,
        averageImpact,
        sampleCount: activityImpacts.length,
        confidence: getConfidence(activityImpacts.length),
        classification: classifyImpact(averageImpact),
        trend,
        previousAverage,
        recentAverage,
      }
    })
    .sort((left, right) => right.sampleCount - left.sampleCount)
}

export function detectEnergyAdaptation(impacts: EnergyImpact[], now = new Date()) {
  if (Number.isNaN(now.getTime())) return []
  return [...getActivityGroups(impacts).values()].flatMap(({ reference, impacts: activityImpacts }) => {
    const { previous, recent } = splitImpactPeriods(activityImpacts, now)
    if (previous.length < MIN_IMPACT_SAMPLES || recent.length < MIN_IMPACT_SAMPLES) return []
    const previousAverage = getAverage(previous)
    const recentAverage = getAverage(recent)
    const change = recentAverage - previousAverage
    if (change <= CHANGE_THRESHOLD) return []
    return [{
      activityId: reference.activityId,
      impactType: reference.impactType,
      previousAverage,
      recentAverage,
      change,
      trend: 'improving' as const,
      confidence: Math.min(getConfidence(previous.length), getConfidence(recent.length)),
      previousSampleCount: previous.length,
      recentSampleCount: recent.length,
    }]
  })
}

async function recordImpact(
  userId: string,
  impactType: EnergyImpactType,
  activityId: string,
  phase: EnergyImpactPhase,
  energyLevel: number,
  impactId?: string,
) {
  if (!userId || !activityId || !isEnergyLevel(energyLevel)) {
    return { data: null, error: new Error('El usuario, la actividad o el nivel de energía no son válidos.') }
  }

  const activityField = `${impactType}_id`
  if (phase === 'start') {
    const payload = {
      user_id: userId,
      [activityField]: activityId,
      impact_type: impactType,
      energy_before: energyLevel,
      energy_after: null,
      duration_minutes: null,
      started_at: new Date().toISOString(),
      finished_at: null,
    }
    console.log('energy_impacts payload', payload)
    const { data, error } = await supabase
      .from('energy_impacts')
      .insert(payload)
      .select(IMPACT_FIELDS)
      .single()
    console.log('energy_impacts response', error)
    return { data: data as EnergyImpact | null, error }
  }

  let lookup = supabase
    .from('energy_impacts')
    .select('id, energy_before, started_at')
    .eq('user_id', userId)
    .eq(activityField, activityId)
    .eq('impact_type', impactType)
    .is('finished_at', null)
    .not('energy_before', 'is', null)
  lookup = impactId
    ? lookup.eq('id', impactId)
    : lookup.order('started_at', { ascending: false }).limit(1)
  const { data: startedImpact, error: findError } = await lookup.maybeSingle()
  if (findError) return { data: null, error: findError }
  if (!startedImpact || !isEnergyLevel(Number(startedImpact.energy_before))) {
    return { data: null, error: null, skipped: true }
  }

  const finishedAt = new Date()
  const startedAt = new Date(startedImpact.started_at)
  const elapsedMinutes = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000)
  const durationMinutes = Number.isFinite(elapsedMinutes) && elapsedMinutes >= 0
    ? Math.max(1, elapsedMinutes)
    : null
  const { data, error } = await supabase
    .from('energy_impacts')
    .update({
      energy_after: energyLevel,
      duration_minutes: durationMinutes,
      finished_at: finishedAt.toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', startedImpact.id)
    .eq(activityField, activityId)
    .eq('impact_type', impactType)
    .select(IMPACT_FIELDS)
    .single()
  if (!error && data) announceEnergyImpactUpdate()
  return { data: data as EnergyImpact | null, error }
}

export function recordTaskImpact(
  userId: string,
  taskId: string,
  phase: EnergyImpactPhase,
  energyLevel: number,
  impactId?: string,
) {
  return recordImpact(userId, 'task', taskId, phase, energyLevel, impactId)
}

export function recordHabitImpact(
  userId: string,
  habitId: string,
  phase: EnergyImpactPhase,
  energyLevel: number,
  impactId?: string,
) {
  return recordImpact(userId, 'habit', habitId, phase, energyLevel, impactId)
}

export function recordObligationImpact(
  userId: string,
  obligationId: string,
  phase: EnergyImpactPhase,
  energyLevel: number,
  impactId?: string,
) {
  return recordImpact(userId, 'obligation', obligationId, phase, energyLevel, impactId)
}

export async function getEnergyImpacts(userId: string, since: string) {
  if (!userId || Number.isNaN(new Date(since).getTime())) {
    return { data: [], error: new Error('El usuario o la fecha para consultar impactos no son válidos.') }
  }
  const impacts: EnergyImpact[] = []
  for (let offset = 0; ; offset += IMPACT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('energy_impacts')
      .select(IMPACT_FIELDS)
      .eq('user_id', userId)
      .gte('started_at', since)
      .order('started_at', { ascending: true })
      .order('id')
      .range(offset, offset + IMPACT_PAGE_SIZE - 1)
    if (error) return { data: [], error }
    impacts.push(...(data || []) as EnergyImpact[])
    if (!data || data.length < IMPACT_PAGE_SIZE) break
  }
  return { data: impacts, error: null }
}

export function getEnergyImpactHistoryStart(now = new Date()) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() - IMPACT_HISTORY_DAYS)
  return date.toISOString()
}

export function getEnergyImpactConfidence(sampleCount: number) {
  return getConfidence(sampleCount)
}
