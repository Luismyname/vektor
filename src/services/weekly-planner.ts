import { supabase } from './supabase';
import { getCurrentProfile } from './auth';
import { normalizeHabits } from '../lib/habits';
import type { Habit, Task, TaskPriority } from '../types';

type PlannerTask = Pick<Task, 'id' | 'user_id'> & Partial<Task>;

interface ScheduleOptions {
  energyLevel?: number | null;
  isCreativeBlock?: boolean;
  focusSessionId?: string | null;
}

interface TaskScheduleInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  relatedValue?: string | null;
  notes?: string;
}

interface HabitScheduleInput {
  title: string;
  description?: string;
  duration?: number;
  color?: string;
  frequency?: string;
  notes?: string;
}

interface ReminderInput {
  title?: string;
  notes?: string;
}

interface CreativeBlockScheduleInput {
  plannedTaskId?: string | null;
  notes?: string;
  energyLevel?: number | null;
  blockType?: string;
  qualityScore?: number | null;
  interruptions?: number;
}

export type ObligationType = 'work' | 'class' | 'sleep' | 'appointment';

export interface ObligationRecurrenceRule {
  frequency: 'once' | 'weekly';
  startsOn: string;
  startTime: string;
  endTime: string;
  byDay: number[];
}

type ObligationInterval = Parameters<typeof getObligationSegments>[0] & { id?: string };

export interface PlannerObligation {
  id: string;
  user_id: string;
  title: string;
  obligation_type: ObligationType;
  active: boolean;
  timezone: string;
  recurrence_rule: ObligationRecurrenceRule;
}

interface CreateObligationInput {
  title: string;
  obligationType: ObligationType;
  startTime: string;
  endTime: string;
  recurrence: 'once' | 'weekly';
  byDay: number[];
}

const PLANNER_FIELDS = 'id, user_id, date, start_time, end_time, task_id, habit_id, obligation_id, obligation_occurrence_date, status, notes, created_at, energy_level, is_creative_block, focus_session_id';

const PRIORITY_SCORE: Record<string, number> = { high: 0, medium: 1, low: 2 };

function toDate(value: Date | string) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
}

export function formatDate(value: Date | string) {
  const date = toDate(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

/**
 * Parsea una cadena de hora (HH:MM o HH:MM:SS) y devuelve { hours, minutes }.
 * Compatible con el tipo time without time zone de PostgreSQL/Supabase.
 */
export function parseTime(timeString: string | null | undefined) {
  if (!timeString) return { hours: 0, minutes: 0 };
  const parts = String(timeString).split(':');
  const hours = Number.isFinite(Number(parts[0])) ? Number(parts[0]) : 0;
  const minutes = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : 0;
  return { hours, minutes };
}

function dateOffset(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getIsoWeekday(dateString: string) {
  const weekday = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getObligationOccurrenceDates(
  rule: ObligationRecurrenceRule,
  dates: string[],
) {
  return dates.filter((date) => {
    if (date < rule.startsOn) return false;
    if (rule.frequency === 'once') return date === rule.startsOn;
    return rule.byDay.includes(getIsoWeekday(date));
  });
}

export interface ObligationSegment {
  date: string;
  segment: 'full' | 'start' | 'end';
  startMinutes: number;
  endMinutes: number;
  label: string;
}

export function getObligationSegments(entry: {
  date: string;
  start_time: string;
  end_time: string;
  obligation?: Pick<PlannerObligation, 'obligation_type'> | null;
}): ObligationSegment[] {
  const start = parseTime(entry.start_time);
  const end = parseTime(entry.end_time);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  const formatMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  if (entry.obligation?.obligation_type !== 'sleep' || endMinutes >= startMinutes) {
    return [{
      date: entry.date,
      segment: 'full',
      startMinutes,
      endMinutes,
      label: `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`,
    }];
  }

  return [
    {
      date: entry.date,
      segment: 'start',
      startMinutes,
      endMinutes: 1440,
      label: `${formatMinutes(startMinutes)} - 24:00`,
    },
    {
      date: dateOffset(entry.date, 1),
      segment: 'end',
      startMinutes: 0,
      endMinutes,
      label: `00:00 - ${formatMinutes(endMinutes)}`,
    },
  ];
}

export function findObligationConflicts(
  candidate: ObligationInterval,
  entries: ObligationInterval[],
) {
  const candidateSegments = getObligationSegments(candidate);
  return entries.filter((entry) => {
    if (entry.id && 'id' in candidate && entry.id === candidate.id) return false;
    return candidateSegments.some((candidateSegment) =>
      getObligationSegments(entry).some((entrySegment) =>
        candidateSegment.date === entrySegment.date
        && candidateSegment.startMinutes < entrySegment.endMinutes
        && entrySegment.startMinutes < candidateSegment.endMinutes),
    );
  });
}

export function getTimeRange(startTime: string, durationMinutes: number = 30) {
  const normalized = String(startTime || '00:00');
  const [hours, minutes] = normalized.split(':').map(Number);
  const totalMinutes = hours * 60 + (Number.isFinite(minutes) ? minutes : 0) + Number(durationMinutes || 0);

  const endMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const formatMinutes = (value) => {
    const safeValue = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
    const displayHours = Math.floor(safeValue / 60);
    const displayMinutes = safeValue % 60;
    return `${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;
  };

  return {
    startTime: normalized.length === 5 ? normalized : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    endTime: formatMinutes(endMinutes),
  };
}

async function loadObligations(userId: string) {
  const { data, error } = await supabase
    .from('obligations')
    .select('id, user_id, title, obligation_type, active, timezone, recurrence_rule')
    .eq('user_id', userId);

  return { obligations: (data || []) as PlannerObligation[], error };
}

async function materializeObligations(
  userId: string,
  dates: string[],
  obligations: PlannerObligation[],
) {
  const activeObligations = obligations.filter((obligation) => obligation.active);
  if (!activeObligations.length) return { error: null };

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const { data: existing, error: existingError } = await supabase
    .from('weekly_planner')
    .select('obligation_id, obligation_occurrence_date')
    .eq('user_id', userId)
    .in('obligation_id', activeObligations.map(({ id }) => id))
    .gte('obligation_occurrence_date', firstDate)
    .lte('obligation_occurrence_date', lastDate);

  if (existingError) return { error: existingError };

  const existingKeys = new Set((existing || []).map((entry) => `${entry.obligation_id}:${entry.obligation_occurrence_date}`));
  for (const obligation of activeObligations) {
    const rule = obligation.recurrence_rule;
    const startMinutes = rule && isValidTime(rule.startTime) ? parseTime(rule.startTime).hours * 60 + parseTime(rule.startTime).minutes : -1;
    const endMinutes = rule && isValidTime(rule.endTime) ? parseTime(rule.endTime).hours * 60 + parseTime(rule.endTime).minutes : -1;
    if (!rule
      || !['once', 'weekly'].includes(rule.frequency)
      || !/^\d{4}-\d{2}-\d{2}$/.test(rule.startsOn)
      || startMinutes < 0
      || endMinutes < 0
      || startMinutes === endMinutes
      || (endMinutes < startMinutes && obligation.obligation_type !== 'sleep')
      || (rule.frequency === 'weekly' && (!Array.isArray(rule.byDay) || !rule.byDay.length || rule.byDay.some((day) => day < 1 || day > 7)))) {
      return { error: new Error(`La regla de repetición de "${obligation.title}" no es válida.`) };
    }

    for (const occurrenceDate of getObligationOccurrenceDates(rule, dates)) {
      const key = `${obligation.id}:${occurrenceDate}`;
      if (existingKeys.has(key)) continue;

      const { error } = await supabase.from('weekly_planner').insert({
        user_id: userId,
        date: occurrenceDate,
        start_time: rule.startTime,
        end_time: rule.endTime,
        task_id: null,
        habit_id: null,
        obligation_id: obligation.id,
        obligation_occurrence_date: occurrenceDate,
        status: 'scheduled',
        notes: '',
      });

      if (error && error.code !== '23505') return { error };
      existingKeys.add(key);
    }
  }

  return { error: null };
}

export function getWeekDates(weekStart: Date | string) {
  const start = new Date(weekStart);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getWeekStart(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function shiftWeek(weekStart: Date | string, amount: number) {
  const date = weekStart instanceof Date
    ? new Date(weekStart)
    : new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return getWeekStart(date);
}

export async function getWeeklyPlanner(userId: string, weekStart: Date | string) {
  const dates = getWeekDates(weekStart);
  const { obligations, error: obligationsError } = await loadObligations(userId);
  if (obligationsError) return { entries: [], error: obligationsError };

  const { error: materializeError } = await materializeObligations(userId, dates, obligations);
  if (materializeError) return { entries: [], error: materializeError };

  const previousDate = dateOffset(dates[0], -1);
  const [{ data, error }, { data: previousEntries, error: previousError }] = await Promise.all([
    supabase
    .from('weekly_planner')
    .select(PLANNER_FIELDS)
    .eq('user_id', userId)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
    .order('date')
    .order('start_time'),
    supabase
      .from('weekly_planner')
      .select(PLANNER_FIELDS)
      .eq('user_id', userId)
      .eq('date', previousDate)
      .not('obligation_id', 'is', null),
  ]);

  if (error || previousError) return { entries: [], error: error || previousError };

  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));
  const attachObligation = (entry) => ({
    ...entry,
    obligation: obligationById.get(entry.obligation_id) || null,
  });
  const currentEntries = (data || []).map(attachObligation);
  const overnightEntries = (previousEntries || [])
    .map(attachObligation)
    .filter((entry) => entry.obligation?.obligation_type === 'sleep'
      && parseTime(entry.end_time).hours * 60 + parseTime(entry.end_time).minutes
        < parseTime(entry.start_time).hours * 60 + parseTime(entry.start_time).minutes);

  return { entries: [...overnightEntries, ...currentEntries], error: null };
}

export async function getPlannerContext(userId: string) {
  const [
    { data: tasks, error: tasksError },
    { data: habitsData, error: habitsError },
    { data: plannerLinks, error: plannerError },
    { profile, error: profileError },
  ] = await Promise.all([
    supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }),
    supabase.from('weekly_planner').select('task_id').eq('user_id', userId).not('task_id', 'is', null),
    getCurrentProfile(userId),
  ]);

  const habits = { recommended: [], custom: [] };
  (habitsData || []).forEach(habit => {
    if (habit.source === 'recommended') habits.recommended.push(habit);
    else habits.custom.push(habit);
  });
  const selectedHabits = normalizeHabits(profile?.habits);
  const selectedHabitsList = [...selectedHabits.recommended, ...selectedHabits.custom]
    .filter((habit) => habit.active === true);

  return {
    tasks: tasks || [],
    habits,
    selectedHabits: selectedHabitsList,
    plannedTaskIds: plannerError ? null : (plannerLinks || []).map(({ task_id }) => task_id),
    error: tasksError || habitsError || plannerError || profileError,
  };
}

export async function getFocusSessions(userId: string, weekStart: Date | string) {
  const dates = getWeekDates(weekStart);
  const start = new Date(`${dates[0]}T00:00:00`).toISOString();
  const end = new Date(`${dates[dates.length - 1]}T23:59:59.999`).toISOString();
  const focusQuery = await supabase.from('focus_sessions').select('id, user_id, task_id, started_at, ended_at, duration_seconds, status').eq('user_id', userId).gte('started_at', start).lte('started_at', end);
  if (!focusQuery.error) {
    return {
      sessions: (focusQuery.data || []).map((session) => ({
        ...session,
        duration_minutes: Math.round((session.duration_seconds || 0) / 60),
      })),
      error: null,
    };
  }

  const { data, error } = await supabase.from('activity').select('id, user_id, task_id, title, created_at, duration, type').eq('user_id', userId).eq('type', 'completed').gte('created_at', start).lte('created_at', end);
  return { sessions: (data || []).map((session) => ({ ...session, started_at: session.created_at, ended_at: session.created_at, duration_minutes: session.duration || 0, status: 'completed' })), error };
}

export async function scheduleTask(
  task: PlannerTask,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string = task.user_id,
  notes: string = '',
  options: ScheduleOptions = {}
) {
  const { energyLevel, isCreativeBlock, focusSessionId } = options;
  const payload = {
    user_id: userId,
    date: formatDate(date),
    start_time: startTime,
    end_time: endTime,
    task_id: task.id,
    habit_id: null,
    status: 'scheduled',
    notes,
    energy_level: energyLevel,
    is_creative_block: isCreativeBlock || false,
    focus_session_id: focusSessionId,
  };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function scheduleHabit(
  habit: Pick<Habit, 'id'>,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string,
  notes: string = '',
  options: ScheduleOptions = {}
) {
  const { energyLevel, isCreativeBlock, focusSessionId } = options;
  const payload = {
    user_id: userId,
    date: formatDate(date),
    start_time: startTime,
    end_time: endTime,
    task_id: null,
    habit_id: habit.id,
    status: 'scheduled',
    notes,
    energy_level: energyLevel,
    is_creative_block: isCreativeBlock || false,
    focus_session_id: focusSessionId,
  };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function updatePlannerEntry(id: string, changes: Record<string, unknown>) {
  const { data, error } = await supabase.from('weekly_planner').update(changes).eq('id', id).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function completeHabitOccurrence(entryId: string, userId: string) {
  if (!entryId || !userId) {
    return { entry: null, error: new Error('Falta la ocurrencia o el usuario para completar el hábito.') };
  }

  const { data, error } = await supabase
    .from('weekly_planner')
    .update({ status: 'completed' })
    .eq('id', entryId)
    .eq('user_id', userId)
    .not('habit_id', 'is', null)
    .neq('status', 'completed')
    .select(PLANNER_FIELDS)
    .single();

  if (error) return { entry: null, error };
  if (!data || data.id !== entryId || data.user_id !== userId || !data.habit_id || data.status !== 'completed') {
    return { entry: null, error: new Error('La ocurrencia actualizada no coincide con el usuario o el hábito solicitado.') };
  }

  return { entry: data, error: null };
}

export async function completePlannerAction(entryId: string, userId: string, type: string) {
  if (!entryId || !userId || !['task', 'habit'].includes(type)) {
    return { entry: null, error: new Error('Falta la acción programada, el usuario o el tipo de acción.') };
  }

  const query = supabase
    .from('weekly_planner')
    .update({ status: 'completed' })
    .eq('id', entryId)
    .eq('user_id', userId)
    .neq('status', 'completed')
    .not(type === 'task' ? 'task_id' : 'habit_id', 'is', null);
  const { data, error } = await query.select(PLANNER_FIELDS).single();

  if (error) return { entry: null, error };
  if (!data
    || data.id !== entryId
    || data.user_id !== userId
    || data.status !== 'completed'
    || (type === 'task' ? !data.task_id : !data.habit_id)) {
    return { entry: null, error: new Error('La acción completada no coincide con la ocurrencia solicitada.') };
  }

  return { entry: data, error: null };
}

export async function moveTask(entryId: string, taskId: string, newDate: Date | string, newStart: string, newEnd: string) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, task_id: taskId, status: 'moved' });
}

export async function movePlannerEntry(entryId: string, newDate: Date | string, newStart: string, newEnd: string) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, status: 'moved' });
}

export async function resizePlannerEntry(entryId: string, newStart: string, newEnd: string) {
  return updatePlannerEntry(entryId, { start_time: newStart, end_time: newEnd });
}

export async function deletePlannerEntry(entryId: string) {
  const { error } = await supabase.from('weekly_planner').delete().eq('id', entryId);
  return { error };
}

export async function deletePlannerDay(userId: string, date: Date | string) {
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).eq('date', formatDate(date)).is('obligation_id', null);
  return { error };
}

export async function deletePlannerWeek(userId: string, weekStart: Date | string) {
  const dates = getWeekDates(weekStart);
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).gte('date', dates[0]).lte('date', dates[dates.length - 1]).is('obligation_id', null);
  return { error };
}

export async function getOpenTasks(userId: string) {
  const { data, error } = await supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, created_at').eq('user_id', userId).neq('status', 'completed').order('created_at');
  return { tasks: data || [], error };
}

export async function autoReschedule(taskId: string, userId: string, weekStart: Date | string = getWeekStart()) {
  const { tasks, error: tasksError } = await getOpenTasks(userId);
  if (tasksError) return { entry: null, error: tasksError };
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return { entry: null, error: new Error('No se encontró la tarea pendiente.') };

  const dates = getWeekDates(weekStart).slice(1);
  const { entries, error: entriesError } = await getWeeklyPlanner(userId, weekStart);
  if (entriesError) return { entry: null, error: entriesError };
  const occupiedDates = new Set(entries.filter((entry) => entry.task_id).map((entry) => entry.date));
  const targetDate = dates.find((date) => !occupiedDates.has(date)) || dates[dates.length - 1];
  const durationMinutes = 60;
  const startMinutes = task.priority === 'high' ? 9 * 60 : 11 * 60;
  const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:00`;
  const endTime = `${String(Math.floor((startMinutes + durationMinutes) / 60)).padStart(2, '0')}:00`;
  return scheduleTask(task, targetDate, startTime, endTime, userId, `Reprogramada automáticamente por prioridad ${task.priority || 'medium'}.`);
}

export async function createTaskAndSchedule(
  taskData: TaskScheduleInput,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string
) {
  const { data: task, error: taskError } = await supabase.from('tasks').insert({
    user_id: userId,
    title: taskData.title,
    description: taskData.description || '',
    priority: taskData.priority || 'medium',
    status: 'pending',
    related_value: taskData.relatedValue || null,
  }).select('id, user_id, title, description, priority, status, related_value, created_at').single();

  if (taskError) return { entry: null, error: taskError };

  return scheduleTask(task, date, startTime, endTime, userId, taskData.notes || '');
}

export async function createHabitAndSchedule(
  habitData: HabitScheduleInput,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string
) {
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      title: habitData.title,
      description: habitData.description || '',
      duration_minutes: habitData.duration || 30,
      color: habitData.color || '#6366f1',
      frequency: habitData.frequency || 'daily',
      active: true,
      source: 'custom',
    })
    .select()
    .single();

  if (habitError) return { entry: null, error: habitError };

  return { ...await scheduleHabit(habit, date, startTime, endTime, userId, habitData.notes || ''), habit };
}

export async function createReminder(
  reminderData: ReminderInput,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string
) {
  const payload = {
    user_id: userId,
    date: formatDate(date),
    start_time: startTime,
    end_time: endTime,
    task_id: null,
    habit_id: null,
    status: 'scheduled',
    notes: reminderData.title || reminderData.notes || '',
  };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function createObligation(
  input: CreateObligationInput,
  date: Date | string,
  userId: string
) {
  const occurrenceDate = formatDate(date);
  if (!input.title.trim()) {
    return { entry: null, error: new Error('El nombre de la obligación es obligatorio.') };
  }
  if (!isValidDate(occurrenceDate)) {
    return { entry: null, error: new Error('La fecha de inicio de la obligación no es válida.') };
  }
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)
    || !['once', 'weekly'].includes(input.recurrence)
    || !['work', 'class', 'sleep', 'appointment'].includes(input.obligationType)
    || (input.recurrence === 'weekly' && (!Array.isArray(input.byDay) || !input.byDay.length || input.byDay.some((day) => !Number.isInteger(day) || day < 1 || day > 7)))) {
    return { entry: null, error: new Error('La fecha, el horario o la repetición de la obligación no son válidos.') };
  }
  const startMinutes = parseTime(input.startTime).hours * 60 + parseTime(input.startTime).minutes;
  const endMinutes = parseTime(input.endTime).hours * 60 + parseTime(input.endTime).minutes;
  const crossesMidnight = endMinutes < startMinutes;
  if (startMinutes === endMinutes || (crossesMidnight && input.obligationType !== 'sleep')) {
    return { entry: null, error: new Error('Solo una obligación de sueño puede cruzar la medianoche.') };
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const recurrenceRule: ObligationRecurrenceRule = {
    frequency: input.recurrence,
    startsOn: occurrenceDate,
    startTime: input.startTime,
    endTime: input.endTime,
    byDay: input.recurrence === 'weekly' ? input.byDay : [],
  };
  const { data: obligation, error: obligationError } = await supabase
    .from('obligations')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      obligation_type: input.obligationType,
      active: true,
      timezone,
      recurrence_rule: recurrenceRule,
    })
    .select('id, user_id, title, obligation_type, active, timezone, recurrence_rule')
    .single();

  if (obligationError) return { entry: null, error: obligationError };

  const hasOccurrence = input.recurrence === 'once'
    || input.byDay.includes(getIsoWeekday(occurrenceDate));
  if (!hasOccurrence) return { entry: null, error: null };

  const { data: entry, error } = await supabase
    .from('weekly_planner')
    .insert({
      user_id: userId,
      date: occurrenceDate,
      start_time: input.startTime,
      end_time: input.endTime,
      task_id: null,
      habit_id: null,
      obligation_id: obligation.id,
      obligation_occurrence_date: occurrenceDate,
      status: 'scheduled',
      notes: '',
    })
    .select(PLANNER_FIELDS)
    .single();

  if (error) {
    const { error: cleanupError } = await supabase.from('obligations').delete().eq('id', obligation.id);
    if (cleanupError) {
      return {
        entry: null,
        error: new Error(`${error.message} No se pudo revertir la definición creada: ${cleanupError.message}`),
      };
    }
    return { entry: null, error };
  }

  return { entry: { ...entry, obligation }, error: null };
}

export async function updateObligation(id: string, changes: { title: string }) {
  const { data, error } = await supabase
    .from('obligations')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, user_id, title, obligation_type, active, timezone, recurrence_rule')
    .single();

  return { obligation: data as PlannerObligation | null, error };
}

export async function scheduleCreativeBlock(
  blockData: CreativeBlockScheduleInput,
  date: Date | string,
  startTime: string,
  endTime: string,
  userId: string
) {
  const payload = {
    user_id: userId,
    date: formatDate(date),
    start_time: startTime,
    end_time: endTime,
    task_id: blockData.plannedTaskId || null,
    habit_id: null,
    status: 'scheduled',
    notes: blockData.notes || '',
    energy_level: blockData.energyLevel || null,
    is_creative_block: true,
    focus_session_id: null,
    block_type: blockData.blockType,
    quality_score: blockData.qualityScore,
    interruptions: blockData.interruptions,
  };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function getWeeklySummary(userId: string, weekStart: Date | string) {
  const [{ entries, error }, { sessions }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getFocusSessions(userId, weekStart)]);
  const plannedEntries = entries.filter((entry) => entry.task_id || entry.habit_id);
  return { summary: { scheduled: plannedEntries.filter((entry) => entry.status === 'scheduled').length, completed: plannedEntries.filter((entry) => entry.status === 'completed').length, failed: plannedEntries.filter((entry) => entry.status === 'failed').length, moved: plannedEntries.filter((entry) => entry.status === 'moved').length, focusSessions: sessions.length }, error };
}

export async function getWeeklyProgress(userId: string, weekStart: Date | string) {
  const { summary, error } = await getWeeklySummary(userId, weekStart);
  const total = summary.completed + summary.failed + summary.moved + summary.scheduled;
  return { progress: { ...summary, completionRate: total ? Math.round((summary.completed / total) * 100) : 0 }, error };
}

export async function getHabitConsistency(userId: string, weekStart: Date | string) {
  const [{ entries, error }, { data: habits }] = await Promise.all([getWeeklyPlanner(userId, weekStart), supabase.from('habits').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false })]);
  const habitList = (habits || []).filter((habit) => habit.active !== false);
  const consistency = habitList.map((habit) => {
    const scheduled = entries.filter((entry) => entry.habit_id === habit.id || entry.habit_id === habit.title);
    return { ...habit, scheduled: scheduled.length, completed: scheduled.filter((entry) => entry.status === 'completed').length, failed: scheduled.filter((entry) => entry.status === 'failed').length };
  });
  return { consistency, error };
}

export async function getHabitStatusHistory(userId: string, startDate: Date | string, endDate: Date | string) {
  const { data, error } = await supabase
    .from('habit_status_history')
    .select('id, planner_entry_id, habit_id, habit_title, planned_date, previous_status, status, event_type, changed_at')
    .eq('user_id', userId)
    .gte('planned_date', formatDate(startDate))
    .lte('planned_date', formatDate(endDate))
    .order('changed_at', { ascending: false });

  return { events: data || [], error };
}

export function sortTasksByPriority(tasks: Array<Pick<Task, 'priority'>>) {
  return [...tasks].sort((left, right) => (PRIORITY_SCORE[left.priority] ?? 1) - (PRIORITY_SCORE[right.priority] ?? 1));
}