export interface PlannerScheduleEntry {
  id?: string
  date: string
  start_time: string
  end_time: string
  task_id?: string | null
  habit_id?: string | null
  obligation_id?: string | null
  obligation?: { obligation_type?: string | null } | null
  status?: string
}

export interface PlannerSlot {
  date: string
  startTime: string
  endTime: string
}

const DAY_MINUTES = 24 * 60
const MAX_AUTOMATIC_SHIFT_MINUTES = 48 * 60
const SLOT_STEP_MINUTES = 15

function dateIndex(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : Math.floor(date.getTime() / 60000)
}

function timeMinutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function getInterval(entry: PlannerScheduleEntry) {
  const day = dateIndex(entry.date)
  const start = timeMinutes(entry.start_time)
  const end = timeMinutes(entry.end_time)
  if (day === null || start === null || end === null || start === end) return null
  const startAt = day + start
  const crossesMidnight = end < start && entry.obligation?.obligation_type === 'sleep'
  if (end < start && !crossesMidnight) return null
  return { start: startAt, end: day + end + (crossesMidnight ? DAY_MINUTES : 0) }
}

function formatDateIndex(value: number) {
  return new Date(value * 60000).toISOString().slice(0, 10)
}

function formatTimeMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function getPlannerEntryDuration(entry: PlannerScheduleEntry) {
  const interval = getInterval(entry)
  return interval ? interval.end - interval.start : null
}

export function findPlannerConflicts(
  candidate: PlannerScheduleEntry,
  entries: PlannerScheduleEntry[],
) {
  const candidateInterval = getInterval(candidate)
  if (!candidateInterval) return []
  return entries.filter((entry) => {
    if (entry.id && candidate.id === entry.id) return false
    const interval = getInterval(entry)
    return interval !== null
      && candidateInterval.start < interval.end
      && interval.start < candidateInterval.end
  })
}

export function hasHabitOnDate(
  habitId: string,
  date: string,
  entries: PlannerScheduleEntry[],
  excludeEntryId?: string,
) {
  return entries.some((entry) =>
    entry.habit_id === habitId
    && entry.date === date
    && entry.id !== excludeEntryId,
  )
}

export function findNextAvailablePlannerSlot(
  entry: PlannerScheduleEntry,
  entries: PlannerScheduleEntry[],
  maxShiftMinutes = MAX_AUTOMATIC_SHIFT_MINUTES,
  notBefore?: { date: string; time: string },
  skipOriginalSlot = false,
): PlannerSlot | null {
  const original = getInterval(entry)
  const duration = getPlannerEntryDuration(entry)
  if (!original || !duration || duration > DAY_MINUTES) return null

  const earliest = Math.max(original.start + (skipOriginalSlot ? SLOT_STEP_MINUTES : 0), notBefore
    ? (dateIndex(notBefore.date) ?? original.start) + (timeMinutes(notBefore.time) ?? 0)
    : original.start)
  const firstSlot = Math.ceil(Math.max(original.start, earliest) / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES
  const lastStart = Math.min(original.start + maxShiftMinutes, original.start + MAX_AUTOMATIC_SHIFT_MINUTES)
  for (let start = firstSlot; start <= lastStart; start += SLOT_STEP_MINUTES) {
    const date = formatDateIndex(Math.floor(start / DAY_MINUTES) * DAY_MINUTES)
    const startOfDay = Math.floor(start / DAY_MINUTES) * DAY_MINUTES
    const startMinute = start - startOfDay
    const endMinute = startMinute + duration
    if (endMinute >= DAY_MINUTES) continue

    const candidate: PlannerScheduleEntry = {
      ...entry,
      date,
      start_time: formatTimeMinutes(startMinute),
      end_time: formatTimeMinutes(endMinute),
    }
    if (entry.habit_id && hasHabitOnDate(entry.habit_id, date, entries, entry.id)) continue
    if (!findPlannerConflicts(candidate, entries).length) {
      return {
        date,
        startTime: candidate.start_time,
        endTime: candidate.end_time,
      }
    }
  }
  return null
}
