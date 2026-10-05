import { supabase } from './supabase';

// Columnas usadas por las consultas y escrituras de bloques planificados.
const PLANNER_FIELDS = 'id, user_id, date, start_time, end_time, task_id, habit_id, status, notes, created_at';
// Orden numérico de prioridades, usado para ordenar tareas sin mutar la lista original.
const PRIORITY_SCORE = { high: 0, medium: 1, low: 2 };

// Normaliza fechas de entrada a mediodía para evitar desplazamientos por zona horaria.
function toDate(value) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00`);
}

// Da formato YYYY-MM-DD para las fechas persistidas por el planificador.
export function formatDate(value) {
  const date = toDate(value);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

// Calcula la hora final a partir de una hora inicial y una duración en minutos.
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

// Devuelve los siete días consecutivos a partir de la fecha de inicio recibida.
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

// Ajusta una fecha al lunes de su semana y limpia la parte horaria.
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Desplaza la semana en bloques de siete días y vuelve a normalizar al lunes.
export function shiftWeek(weekStart, amount) {
  const date = weekStart instanceof Date
    ? new Date(weekStart)
    : new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + amount * 7)
  return getWeekStart(date)
}

// Carga, ordenados por fecha y hora, los bloques del usuario para los siete días.
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

// Carga en paralelo tareas y hábitos que la interfaz puede programar.
export async function getPlannerContext(userId) {
  const [{ data: tasks, error: tasksError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('habits').eq('user_id', userId).maybeSingle(),
  ]);

  return { tasks: tasks || [], habits: profile?.habits || { recommended: [], custom: [] }, error: tasksError || profileError };
}

// Lee sesiones semanales y, si la tabla no está disponible, adapta actividad completada.
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

// Crea un bloque semanal vinculado a una tarea existente.
export async function scheduleTask(task, date, startTime, endTime, userId = task.user_id, notes = '') {
  const payload = { user_id: userId, date: formatDate(date), start_time: startTime, end_time: endTime, task_id: task.id, habit_id: null, status: 'scheduled', notes };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

// Crea un bloque semanal vinculado a un hábito existente.
export async function scheduleHabit(habit, date, startTime, endTime, userId, notes = '') {
  const payload = { user_id: userId, date: formatDate(date), start_time: startTime, end_time: endTime, task_id: null, habit_id: habit.id || habit.title, status: 'scheduled', notes };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

// Persiste cambios parciales en un bloque y devuelve su versión actualizada.
export async function updatePlannerEntry(id, changes) {
  const { data, error } = await supabase.from('weekly_planner').update(changes).eq('id', id).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

// Cambia fecha y horario de una entrada y la marca como movida.
export async function moveTask(entryId, taskId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, task_id: taskId, status: 'moved' });
}

// Mueve cualquier bloque conservando sus vínculos y actualizando su estado.
export async function movePlannerEntry(entryId, newDate, newStart, newEnd) {
  return updatePlannerEntry(entryId, { date: formatDate(newDate), start_time: newStart, end_time: newEnd, status: 'moved' });
}

// Cambia las horas de inicio y fin de un bloque sin alterar su fecha.
export async function resizePlannerEntry(entryId, newStart, newEnd) {
  return updatePlannerEntry(entryId, { start_time: newStart, end_time: newEnd });
}

// Borra un bloque semanal concreto.
export async function deletePlannerEntry(entryId) {
  const { error } = await supabase.from('weekly_planner').delete().eq('id', entryId);
  return { error };
}

// Borra todos los bloques de un usuario para una fecha normalizada.
export async function deletePlannerDay(userId, date) {
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).eq('date', formatDate(date));
  return { error };
}

// Borra los bloques del usuario cuyo día cae dentro de la semana indicada.
export async function deletePlannerWeek(userId, weekStart) {
  const dates = getWeekDates(weekStart);
  const { error } = await supabase.from('weekly_planner').delete().eq('user_id', userId).gte('date', dates[0]).lte('date', dates[dates.length - 1]);
  return { error };
}

// Lista tareas que aún no se han completado para ofrecerlas al planificador.
export async function getOpenTasks(userId) {
  const { data, error } = await supabase.from('tasks').select('id, user_id, title, description, priority, status, related_value, created_at').eq('user_id', userId).neq('status', 'completed').order('created_at');
  return { tasks: data || [], error };
}

// Busca un día libre posterior al lunes y asigna un horario según prioridad.
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

// Inserta una tarea pendiente y crea el bloque que la agenda en la misma operación de flujo.
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

// Añade un hábito personalizado al JSON del perfil y lo agenda en la semana.
export async function createHabitAndSchedule(habitData, date, startTime, endTime, userId) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('habits')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) return { entry: null, error: profileError };

  const currentHabits = profile?.habits || { recommended: [], custom: [] };
  const newHabit = {
    id: `habit-${Date.now()}`,
    title: habitData.title,
    description: habitData.description || '',
    color: habitData.color || '#6366f1',
    frequency: habitData.frequency || 'daily',
    duration: habitData.duration || 30,
    active: true,
    created_at: new Date().toISOString(),
  };

  const updatedHabits = {
    recommended: currentHabits.recommended || [],
    custom: [...(currentHabits.custom || []), newHabit],
  };

  const { error: updateError } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, habits: updatedHabits }, { onConflict: 'user_id' });

  if (updateError) return { entry: null, error: updateError };

  return { ...await scheduleHabit(newHabit, date, startTime, endTime, userId, habitData.notes || ''), habit: newHabit };
}

// Crea un bloque de recordatorio independiente, sin tarea ni hábito asociado.
export async function createReminder(reminderData, date, startTime, endTime, userId) {
  const payload = {
    user_id: userId,
    date: formatDate(date),
    start_time: startTime,
    end_time: endTime,
    task_id: null,
    habit_id: null,
    status: 'scheduled',
    notes: reminderData.notes || '',
  };
  const { data, error } = await supabase.from('weekly_planner').insert(payload).select(PLANNER_FIELDS).single();
  return { entry: data, error };
}

// Resume cuántos bloques hay por estado y cuántas sesiones de enfoque hubo.
export async function getWeeklySummary(userId, weekStart) {
  const [{ entries, error }, { sessions }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getFocusSessions(userId, weekStart)]);
  const plannedEntries = entries.filter((entry) => entry.task_id || entry.habit_id);
  return { summary: { scheduled: plannedEntries.filter((entry) => entry.status === 'scheduled').length, completed: plannedEntries.filter((entry) => entry.status === 'completed').length, failed: plannedEntries.filter((entry) => entry.status === 'failed').length, moved: plannedEntries.filter((entry) => entry.status === 'moved').length, focusSessions: sessions.length }, error };
}

// Añade al resumen semanal la tasa porcentual de bloques completados.
export async function getWeeklyProgress(userId, weekStart) {
  const { summary, error } = await getWeeklySummary(userId, weekStart);
  const total = summary.completed + summary.failed + summary.moved + summary.scheduled;
  return { progress: { ...summary, completionRate: total ? Math.round((summary.completed / total) * 100) : 0 }, error };
}

// Calcula por hábito cuántos bloques se programaron, completaron o fallaron.
export async function getHabitConsistency(userId, weekStart) {
  const [{ entries, error }, { habits }] = await Promise.all([getWeeklyPlanner(userId, weekStart), getPlannerContext(userId)]);
  const habitList = [...(habits?.recommended || []), ...(habits?.custom || [])].filter((habit) => habit.active !== false);
  const consistency = habitList.map((habit) => {
    const scheduled = entries.filter((entry) => entry.habit_id === habit.id || entry.habit_id === habit.title);
    return { ...habit, scheduled: scheduled.length, completed: scheduled.filter((entry) => entry.status === 'completed').length, failed: scheduled.filter((entry) => entry.status === 'failed').length };
  });
  return { consistency, error };
}

// Recupera el historial de cambios de estado de hábitos dentro de un intervalo.
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

// Ordena por prioridad en una copia para no modificar la colección recibida.
export function sortTasksByPriority(tasks) {
  return [...tasks].sort((left, right) => (PRIORITY_SCORE[left.priority] ?? 1) - (PRIORITY_SCORE[right.priority] ?? 1));
}