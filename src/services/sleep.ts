import { supabase } from './supabase'

export interface SleepRecord {
  id: string
  user_id: string
  sleep_date: string
  hours_slept: number
  sleep_quality: number
  sleep_medication: boolean
  notes: string | null
  sleep_start: string | null
  sleep_end: string | null
  created_at: string
  updated_at: string
}

export interface SleepRecordInput {
  sleep_date: string
  hours_slept: number
  sleep_quality: number
  sleep_medication: boolean
  notes?: string | null
  sleep_start?: string | null
  sleep_end?: string | null
}

const SLEEP_RECORD_FIELDS = 'id, user_id, sleep_date, hours_slept, sleep_quality, sleep_medication, notes, sleep_start, sleep_end, created_at, updated_at'

function isValidDate(sleepDate: string) {
  const date = new Date(`${sleepDate}T00:00:00.000Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(sleepDate)
    && !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === sleepDate
}

function validateSleepRecord(userId: string, input: SleepRecordInput) {
  const validTime = (time: string | null | undefined) => !time
    || /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)

  if (!userId || !isValidDate(input.sleep_date) || !Number.isFinite(input.hours_slept)
    || input.hours_slept <= 0 || input.hours_slept > 24
    || !Number.isInteger(input.sleep_quality) || input.sleep_quality < 1 || input.sleep_quality > 10
    || typeof input.sleep_medication !== 'boolean'
    || !validTime(input.sleep_start) || !validTime(input.sleep_end)
    || (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string')) {
    return new Error('El usuario o los datos del registro de sueño no son válidos.')
  }

  return null
}

function toSleepRecordPayload(input: SleepRecordInput) {
  return {
    sleep_date: input.sleep_date,
    hours_slept: input.hours_slept,
    sleep_quality: input.sleep_quality,
    sleep_medication: input.sleep_medication,
    notes: input.notes?.trim() || null,
    sleep_start: input.sleep_start || null,
    sleep_end: input.sleep_end || null,
  }
}

export async function saveSleepRecord(userId: string, input: SleepRecordInput) {
  const validationError = validateSleepRecord(userId, input)
  if (validationError) return { data: null, error: validationError }

  const { data, error } = await supabase
    .from('sleep_records')
    .insert({ user_id: userId, ...toSleepRecordPayload(input) })
    .select(SLEEP_RECORD_FIELDS)
    .single()

  return { data: data as SleepRecord | null, error }
}

export async function updateSleepRecord(userId: string, id: string, input: SleepRecordInput) {
  const validationError = validateSleepRecord(userId, input)
  if (validationError || !id) {
    return {
      data: null,
      error: validationError || new Error('El identificador del registro de sueño no es válido.'),
    }
  }

  const { data, error } = await supabase
    .from('sleep_records')
    .update(toSleepRecordPayload(input))
    .eq('id', id)
    .eq('user_id', userId)
    .select(SLEEP_RECORD_FIELDS)
    .single()

  return { data: data as SleepRecord | null, error }
}

export async function getSleepRecord(userId: string, sleepDate: string) {
  if (!userId || !isValidDate(sleepDate)) {
    return { data: null, error: new Error('El usuario o la fecha del registro de sueño no son válidos.') }
  }

  const { data, error } = await supabase
    .from('sleep_records')
    .select(SLEEP_RECORD_FIELDS)
    .eq('user_id', userId)
    .eq('sleep_date', sleepDate)
    .maybeSingle()

  return { data: data as SleepRecord | null, error }
}

export async function getSleepHistory(userId: string, limit = 30) {
  if (!userId || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { data: [], error: new Error('El usuario o el límite del historial de sueño no son válidos.') }
  }

  const { data, error } = await supabase
    .from('sleep_records')
    .select(SLEEP_RECORD_FIELDS)
    .eq('user_id', userId)
    .order('sleep_date', { ascending: false })
    .limit(limit)

  return { data: (data || []) as SleepRecord[], error }
}
