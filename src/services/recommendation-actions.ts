import {
  findObligationConflicts,
  getObligationOccurrenceDates,
  movePlannerEntry,
  scheduleTask,
} from './weekly-planner'
import type { PlannerObligation } from './weekly-planner'
import { getRecommendationAvailability } from './recommendation-engine'
import type { Recommendation, RecommendationObligation, RecommendationPlannerEntry } from './recommendation-engine'
import type { Habit, Task } from '../types'

export interface ActionableRecommendation {
  recommendationId: string
  taskId?: string
  habitId?: string
  suggestedDate: string
  suggestedStartTime: string
  suggestedEndTime: string
  confidence: 'medium' | 'high'
  reason: string
  plannerEntryId?: string
  currentDate?: string
  currentStartTime?: string
  currentEndTime?: string
  durationMinutes: number
  windowStart: string
  windowEnd: string
}

interface FindRecommendedSlotOptions {
  entries: RecommendationPlannerEntry[]
  obligations: RecommendationObligation[]
  today: string
  now: Date
  task?: Task
  habit?: Habit
  isLowEnergy: boolean
}

interface ValidateRecommendedSlotOptions {
  entries: RecommendationPlannerEntry[]
  obligations: RecommendationObligation[]
  today: string
  task?: Task
  habit?: Habit
  isLowEnergy: boolean
}

interface ApplyRecommendationOptions extends ValidateRecommendedSlotOptions {
  userId: string
  today: string
}

interface SlotValidation {
  valid: boolean
  reason: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/
const SLOT_STEP_MINUTES = 15
const DAYS_TO_SEARCH = 7
const MAX_DISPLACEMENT_MINUTES = 48 * 60

function isValidDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function offsetDate(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function parseTime(value: string) {
  const match = TIME_PATTERN.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function formatTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

function durationBetween(startTime: string, endTime: string) {
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  if (start === null || end === null || start === end) return null
  return end > start ? end - start : 1440 - start + end
}

function isMovableEntry(entry: RecommendationPlannerEntry) {
  return entry.status === 'scheduled' || entry.status === 'moved'
}

function findSourceEntry(
  recommendation: Recommendation,
  entries: RecommendationPlannerEntry[],
  today: string,
) {
  return entries
    .filter((entry) => entry.date >= today && isMovableEntry(entry))
    .filter((entry) => recommendation.taskId
      ? entry.task_id === recommendation.taskId
      : recommendation.habitId && entry.habit_id === recommendation.habitId)
    .sort((left, right) => `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`))[0]
}

function getDurationMinutes(
  recommendation: Recommendation,
  task: Task | undefined,
  sourceEntry: RecommendationPlannerEntry | undefined,
) {
  if (sourceEntry) return durationBetween(sourceEntry.start_time, sourceEntry.end_time)
  if (recommendation.taskId && Number.isFinite(task?.estimated_duration)
    && Number(task?.estimated_duration) > 0
    && Number(task?.estimated_duration) < 1440) {
    return Number(task?.estimated_duration)
  }
  return null
}

function makeObligationOccurrences(
  obligations: RecommendationObligation[],
  dates: string[],
): RecommendationPlannerEntry[] {
  return obligations.flatMap((obligation) => {
    if (!obligation.active || !obligation.recurrence_rule) return []
    const rule = obligation.recurrence_rule as PlannerObligation['recurrence_rule']
    return getObligationOccurrenceDates(rule, dates).map((date) => normalizeOvernightInterval({
      id: `obligation:${obligation.id}:${date}`,
      date,
      start_time: rule.startTime,
      end_time: rule.endTime,
      obligation_id: obligation.id,
      status: 'scheduled',
      obligation: { obligation_type: obligation.obligation_type },
    }))
  })
}

function validateIdentity(action: ActionableRecommendation): SlotValidation {
  if (action.confidence !== 'medium' && action.confidence !== 'high') {
    return { valid: false, reason: 'Esta recomendación no tiene suficiente confianza para aplicarse.' }
  }
  if (Boolean(action.taskId) === Boolean(action.habitId)) {
    return { valid: false, reason: 'La recomendación no identifica una única tarea u ocurrencia de hábito.' }
  }
  if (!isValidDate(action.suggestedDate)) {
    return { valid: false, reason: 'La fecha propuesta no es válida.' }
  }
  const start = parseTime(action.suggestedStartTime)
  const end = parseTime(action.suggestedEndTime)
  const windowStart = parseTime(action.windowStart)
  const parsedWindowEnd = parseTime(action.windowEnd)
  if (start === null || end === null || start === end
    || windowStart === null
    || parsedWindowEnd === null
    || windowStart === parsedWindowEnd
    || !Number.isFinite(action.durationMinutes)
    || action.durationMinutes <= 0
    || action.durationMinutes >= 1440
    || (start + action.durationMinutes) % 1440 !== end) {
    return { valid: false, reason: 'La duración o el horario propuestos no son válidos.' }
  }
  const windowEnd = parsedWindowEnd > windowStart ? parsedWindowEnd : parsedWindowEnd + 1440
  const normalizedStart = start < windowStart ? start + 1440 : start
  if (normalizedStart < windowStart || normalizedStart + action.durationMinutes > windowEnd) {
    return { valid: false, reason: 'El horario propuesto queda fuera de la franja recomendada.' }
  }
  return { valid: true, reason: '' }
}

function getOccupiedEntries(
  action: ActionableRecommendation,
  entries: RecommendationPlannerEntry[],
  obligations: RecommendationObligation[],
) {
  const dates = Array.from({ length: DAYS_TO_SEARCH + 2 }, (_, index) =>
    offsetDate(action.suggestedDate, index - 1),
  )
  const targetEntries = entries
    .filter((entry) => entry.id !== action.plannerEntryId)
    .map(normalizeOvernightInterval)
  return [...targetEntries, ...makeObligationOccurrences(obligations, dates)]
}

function normalizeOvernightInterval(entry: RecommendationPlannerEntry) {
  const start = parseTime(entry.start_time)
  const end = parseTime(entry.end_time)
  if (start !== null && end !== null && end < start) {
    return { ...entry, obligation: { obligation_type: 'sleep' as const } }
  }
  return entry
}

export function validateRecommendedSlot(
  action: ActionableRecommendation,
  options: ValidateRecommendedSlotOptions,
): SlotValidation {
  const identity = validateIdentity(action)
  if (!identity.valid) return identity
  if (!isValidDate(options.today)
    || action.suggestedDate < options.today
    || action.suggestedDate > offsetDate(options.today, DAYS_TO_SEARCH - 1)) {
    return { valid: false, reason: 'La fecha propuesta está fuera de los próximos siete días.' }
  }
  if (action.taskId && !options.task) {
    return { valid: false, reason: 'No se encontró la tarea asociada a esta recomendación.' }
  }
  if (action.taskId && (options.task?.id !== action.taskId || options.task.status !== 'pending')) {
    return { valid: false, reason: 'La tarea ya no está pendiente y no se puede reubicar.' }
  }
  if (action.habitId && (options.habit?.id !== action.habitId || !options.habit.active)) {
    return { valid: false, reason: 'El hábito ya no está activo para mover esta ocurrencia.' }
  }
  if (options.isLowEnergy && action.taskId
    && Number.isFinite(options.task?.energy_cost)
    && Number(options.task?.energy_cost) >= 4) {
    return { valid: false, reason: 'En un día de energía baja no se reubican tareas de alto coste.' }
  }

  if (action.plannerEntryId) {
    const source = options.entries.find((entry) => entry.id === action.plannerEntryId)
    const identityMatches = action.taskId
      ? source?.task_id === action.taskId
      : source?.habit_id === action.habitId
    if (!source || !identityMatches || !isMovableEntry(source)) {
      return { valid: false, reason: 'El bloque original ya no está disponible para mover.' }
    }
    const sourceDuration = durationBetween(source.start_time, source.end_time)
    if (sourceDuration !== action.durationMinutes) {
      return { valid: false, reason: 'La duración del bloque cambió. Actualiza la recomendación antes de aplicarla.' }
    }
    const sourceStart = Date.parse(`${source.date}T${source.start_time}Z`)
    const targetStart = Date.parse(`${action.suggestedDate}T${action.suggestedStartTime}Z`)
    if (!Number.isFinite(sourceStart) || !Number.isFinite(targetStart)
      || Math.abs(targetStart - sourceStart) > MAX_DISPLACEMENT_MINUTES * 60_000) {
      return { valid: false, reason: 'La actividad no puede desplazarse más de 48 horas de su horario original.' }
    }
  } else if (action.habitId) {
    return { valid: false, reason: 'Solo se pueden mover ocurrencias de hábito ya programadas.' }
  } else if (options.entries.some((entry) =>
    entry.task_id === action.taskId && isMovableEntry(entry),
  )) {
    return { valid: false, reason: 'La tarea ya tiene un bloque programado. Actualiza la recomendación antes de aplicarla.' }
  }

  if (action.habitId && options.entries.some((entry) =>
    entry.habit_id === action.habitId
    && entry.date === action.suggestedDate
    && entry.id !== action.plannerEntryId,
  )) {
    return { valid: false, reason: 'Este hábito ya aparece en el planificador ese día.' }
  }

  const candidate = normalizeOvernightInterval({
    date: action.suggestedDate,
    start_time: action.suggestedStartTime,
    end_time: action.suggestedEndTime,
  })
  const conflicts = findObligationConflicts(
    candidate,
    getOccupiedEntries(action, options.entries, options.obligations),
  )
  if (conflicts.length) {
    return { valid: false, reason: 'Ese horario se solapa con una tarea, hábito u obligación.' }
  }
  return { valid: true, reason: '' }
}

export function findRecommendedSlot(
  recommendation: Recommendation,
  options: FindRecommendedSlotOptions,
): ActionableRecommendation | null {
  if ((recommendation.confidence !== 'medium' && recommendation.confidence !== 'high')
    || (!recommendation.taskId && !recommendation.habitId)
    || (recommendation.taskId && recommendation.habitId)
    || !recommendation.recommendedWindow
    || !isValidDate(options.today)
    || options.isLowEnergy && recommendation.taskId
      && Number.isFinite(options.task?.energy_cost)
      && Number(options.task?.energy_cost) >= 4
    || recommendation.taskId && options.task?.status !== 'pending'
    || recommendation.habitId && (options.habit?.id !== recommendation.habitId || !options.habit.active)
    || !recommendation.taskId && !recommendation.habitId) return null

  const windowStart = parseTime(recommendation.recommendedWindow.start)
  const parsedWindowEnd = parseTime(recommendation.recommendedWindow.end)
  if (windowStart === null || parsedWindowEnd === null || windowStart === parsedWindowEnd) return null
  const windowEnd = parsedWindowEnd > windowStart ? parsedWindowEnd : parsedWindowEnd + 1440
  const sourceEntry = findSourceEntry(recommendation, options.entries, options.today)
  if (recommendation.habitId && !sourceEntry) return null
  const durationMinutes = getDurationMinutes(recommendation, options.task, sourceEntry)
  if (!durationMinutes || durationMinutes > windowEnd - windowStart) return null

  const todayMinutes = options.now.getHours() * 60 + options.now.getMinutes()
  for (let dayOffset = 0; dayOffset < DAYS_TO_SEARCH; dayOffset += 1) {
    const date = offsetDate(options.today, dayOffset)
    for (let start = windowStart; start + durationMinutes <= windowEnd; start += SLOT_STEP_MINUTES) {
      if (dayOffset === 0 && start < todayMinutes) continue
      const action: ActionableRecommendation = {
        recommendationId: recommendation.id,
        ...(recommendation.taskId ? { taskId: recommendation.taskId } : {}),
        ...(recommendation.habitId ? { habitId: recommendation.habitId } : {}),
        suggestedDate: date,
        suggestedStartTime: formatTime(start),
        suggestedEndTime: formatTime(start + durationMinutes),
        confidence: recommendation.confidence,
        reason: recommendation.reason,
        ...(sourceEntry?.id ? {
          plannerEntryId: sourceEntry.id,
          currentDate: sourceEntry.date,
          currentStartTime: sourceEntry.start_time,
          currentEndTime: sourceEntry.end_time,
        } : {}),
        durationMinutes,
        windowStart: recommendation.recommendedWindow.start,
        windowEnd: recommendation.recommendedWindow.end,
      }
      if (validateRecommendedSlot(action, options).valid) return action
    }
  }

  return null
}

export function getRecommendationUnavailableReason(
  recommendation: Recommendation,
  options: FindRecommendedSlotOptions,
) {
  if (options.isLowEnergy && recommendation.taskId
    && Number.isFinite(options.task?.energy_cost)
    && Number(options.task?.energy_cost) >= 4) {
    return 'Hoy es un día de energía baja; esta tarea de alto coste se mantiene como recomendación informativa.'
  }
  if (recommendation.habitId
    && !findSourceEntry(recommendation, options.entries, options.today)) {
    return 'No hay una ocurrencia actual de este hábito en el planner para mover.'
  }
  if (recommendation.taskId && !getDurationMinutes(
    recommendation,
    options.task,
    findSourceEntry(recommendation, options.entries, options.today),
  )) {
    return 'No se conoce una duración válida para encontrar un hueco.'
  }
  return 'No se encontró un hueco libre en los próximos siete días que respete tareas, hábitos y obligaciones.'
}

export async function applyRecommendation(
  action: ActionableRecommendation,
  options: ApplyRecommendationOptions,
) {
  if (!options.userId) {
    return { entry: null, error: new Error('Debes iniciar sesión para aplicar esta recomendación.') }
  }
  const { obligations, plannerEntries, error: availabilityError } =
    await getRecommendationAvailability(options.userId, options.today)
  if (availabilityError) return { entry: null, error: availabilityError }

  const validation = validateRecommendedSlot(action, {
    entries: plannerEntries,
    obligations,
    today: options.today,
    task: options.task,
    habit: options.habit,
    isLowEnergy: options.isLowEnergy,
  })
  if (!validation.valid) return { entry: null, error: new Error(validation.reason) }

  if (action.plannerEntryId) {
    return movePlannerEntry(
      action.plannerEntryId,
      action.suggestedDate,
      action.suggestedStartTime,
      action.suggestedEndTime,
    )
  }
  if (action.taskId && options.task) {
    return scheduleTask(
      options.task,
      action.suggestedDate,
      action.suggestedStartTime,
      action.suggestedEndTime,
      options.userId,
    )
  }
  return { entry: null, error: new Error('No se puede aplicar esta recomendación sin un bloque o tarea válido.') }
}
