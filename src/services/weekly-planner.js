import { supabase } from './supabase';
import { getCurrentProfile } from './auth';
import { normalizeHabits } from '../lib/habits';

const PLANNER_FIELDS = 'id, user_id, date, start_time, end_time, task_id, habit_id, status, notes, created_at, energy_level, is_creative_block, focus_session_id';

const PRIORITY_SCORE = { high: 0, medium: 1, low: 2 };

function toDate(value) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
}

export function formatDate(value) {
  const date = toDate(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function getTimeRange(startTime, durationMinutes = 30) {
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

export function getWeekDates(weekStart) {
  const start = new Date(weekStart);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function shiftWeek(weekStart, amount) {
  const date = weekStart instanceof Date
    ? new Date(weekStart)
    : new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return getWeekStart(date);
}

export async function getWeeklyPlanner(userId, weekStart) {
  const dates = getWeekDates(weekStart);
  const { data, error } = await supabase
    .from('weekly_planner')
    .select(PLANNER_FIELDS)
    .eq('user_id', userId)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
    .order('date')
    .order('start_time');

  return { entries: data || [], error };
}

export async function getPlannerContext(userId) {
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

export async function getFocusSessions(userId, weekStart) {
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

export async function scheduleTask(task, date, startTime, endTime, userId = task.user_id, notes = '', options = {}) {
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

export async function scheduleHabit(habit, date, startTime, endTime, userId, notes = '', options = {}) {
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

export async function updatePlannerEntry(id, changes) {
  const { data, error } = await supabase.from('weekly_planner').update(changes).eq('id', id).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

export async function moveTask(entryId, taskId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, task_id: taskId, status: 'moved' });
}

export async function movePlannerEntry(entryId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, status: 'moved' });
}

export async function resizePlannerEntry(entryId, newStart, newEnd) {
  return updatePlannerEntry(entryId, { start_time: newStart, end_time: newEnd });
}

export async function deletePlannerEntry(entryId) {
  const { error } = await supabase.from('weekly_planner').delete().eq('id', entryId);
  return { error };
}

export async function deletePlannerDay(userId, date) {
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).eq('date', formatDate(date));
  return { error };
}

export async function deletePlannerWeek(userId, weekStart) {
  const dates = getWeekDates(weekStart);
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).gte('date', dates[0]).lte('date', dates[dates.length - 1]);
  return { error };
}

export async function getOpenTasks(userId) {
  const { data, error } = await supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, created_at').eq('user_id', userId).neq('status', 'completed').order('created_at');
  return { tasks: data || [], error };
}

export async function autoReschedule(taskId, userId, weekStart = getWeekStart()) {
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

export async function createTaskAndSchedule(taskData, date, startTime, endTime, userId) {
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

export async function createHabitAndSchedule(habitData, date, startTime, endTime, userId) {
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

export async function createReminder(reminderData, date, startTime, endTime, userId) {
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

export async function scheduleCreativeBlock(blockData, date, startTime, endTime, userId) {
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

export async function getWeeklySummary(userId, weekStart) {
  const [{ entries, error }, { sessions }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getFocusSessions(userId, weekStart)]);
  const plannedEntries = entries.filter((entry) => entry.task_id || entry.habit_id);
  return { summary: { scheduled: plannedEntries.filter((entry) => entry.status === 'scheduled').length, completed: plannedEntries.filter((entry) => entry.status === 'completed').length, failed: plannedEntries.filter((entry) => entry.status === 'failed').length, moved: plannedEntries.filter((entry) => entry.status === 'moved').length, focusSessions: sessions.length }, error };
}

export async function getWeeklyProgress(userId, weekStart) {
  const { summary, error } = await getWeeklySummary(userId, weekStart);
  const total = summary.completed + summary.failed + summary.moved + summary.scheduled;
  return { progress: { ...summary, completionRate: total ? Math.round((summary.completed / total) * 100) : 0 }, error };
}

export async function getHabitConsistency(userId, weekStart) {
  const [{ entries, error }, { data: habits }] = await Promise.all([getWeeklyPlanner(userId, weekStart), supabase.from('habits').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false })]);
  const habitList = (habits || []).filter((habit) => habit.active !== false);
  const consistency = habitList.map((habit) => {
    const scheduled = entries.filter((entry) => entry.habit_id === habit.id || entry.habit_id === habit.title);
    return { ...habit, scheduled: scheduled.length, completed: scheduled.filter((entry) => entry.status === 'completed').length, failed: scheduled.filter((entry) => entry.status === 'failed').length };
  });
  return { consistency, error };
}

export async function getHabitStatusHistory(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('habit_status_history')
    .select('id, planner_entry_id, habit_id, habit_title, planned_date, previous_status, status, event_type, changed_at')
    .eq('user_id', userId)
    .gte('planned_date', formatDate(startDate))
    .lte('planned_date', formatDate(endDate))
    .order('changed_at', { ascending: false });

  return { events: data || [], error };
}

export function sortTasksByPriority(tasks) {
  return [...tasks].sort((left, right) => (PRIORITY_SCORE[left.priority] ?? 1) - (PRIORITY_SCORE[right.priority] ?? 1));
}